-- Delivery times, the admin activity page and phone notifications.
-- Safe to run twice (it is pasted into the Supabase SQL Editor).
--
-- 1. Making time (we design and handmake each piece: 3–4 days) in
--    site_settings, and delivery days per area (Tripoli: 2 days). An area
--    without its own days uses the shop's default delivery days.
-- 2. page_views: views per page per day (no personal data, no cookie), for
--    the admin activity page. record_page_view() is called by the shop and
--    only counts pages that really exist.
-- 3. push_subscriptions: the phones of staff who pressed "Notify me".
-- 4. Every new order and every audit_log line (staff changes, new reviews)
--    goes into push_outbox and pings /api/push/ping, which sends the
--    notifications. The ping carries a secret that only the database and
--    the shop's server check (push_config), so nobody else can trigger it.

-- 1. Delivery times ------------------------------------------------------------

alter table public.site_settings
  add column if not exists processing_days_min integer not null default 3,
  add column if not exists processing_days_max integer not null default 4;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'site_settings_processing_days') then
    alter table public.site_settings
      add constraint site_settings_processing_days check (
        processing_days_min between 0 and 60 and processing_days_max between processing_days_min and 60
      );
  end if;
end;
$$;

alter table public.areas
  add column if not exists delivery_days_min integer,
  add column if not exists delivery_days_max integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'areas_delivery_days') then
    alter table public.areas
      add constraint areas_delivery_days check (
        (delivery_days_min is null and delivery_days_max is null)
        or (delivery_days_min between 0 and 60 and delivery_days_max between delivery_days_min and 90)
      );
  end if;
end;
$$;

insert into public.areas (slug, name_en, name_ar, sort_order, delivery_days_min, delivery_days_max)
values ('tripoli', 'Tripoli', 'طرابلس', -1, 2, 2)
on conflict (slug) do update set delivery_days_min = 2, delivery_days_max = 2, is_active = true;

-- 2. Page views ----------------------------------------------------------------

create table if not exists public.page_views (
  day date not null,
  -- Without the language: /product/cursive-name-necklace, / for home.
  path text not null check (char_length(path) between 1 and 200),
  product_slug text,
  views integer not null default 0,
  -- First page of the day for a browser (counted once per browser per day).
  visitors integer not null default 0,
  primary key (day, path)
);
create index if not exists page_views_product_idx on public.page_views (product_slug, day) where product_slug is not null;

alter table public.page_views enable row level security;
drop policy if exists "owner reads page views" on public.page_views;
create policy "owner reads page views" on public.page_views
  for select to authenticated using ((select private.is_owner()));
revoke all on public.page_views from anon;
grant select on public.page_views to authenticated;

/*
  Counts one view of a shop page. Only pages that exist are counted (fixed
  pages, and products / categories / seasons that are in the database), so
  nobody can fill the table with made-up addresses.
*/
create or replace function public.record_page_view(p_path text, p_new_visitor boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
  v_slug text;
  v_ok boolean := false;
begin
  if p_path is null or char_length(p_path) > 200 or p_path !~ '^/(en|ar)(/[a-z0-9-]+)*/?$' then
    return;
  end if;
  v_path := coalesce(nullif(rtrim(regexp_replace(p_path, '^/(en|ar)', ''), '/'), ''), '/');

  if v_path in ('/', '/about', '/faq', '/contact', '/size-guide', '/charms',
                '/policies/shipping', '/policies/returns', '/policies/privacy', '/policies/terms') then
    v_ok := true;
  elsif v_path ~ '^/product/[a-z0-9-]+$' then
    v_slug := substring(v_path from '^/product/([a-z0-9-]+)$');
    v_ok := exists (select 1 from public.products where slug = v_slug and status = 'active');
  elsif v_path ~ '^/category/[a-z0-9-]+$' then
    v_ok := exists (select 1 from public.categories where slug = substring(v_path from '^/category/([a-z0-9-]+)$'));
  elsif v_path ~ '^/[a-z0-9-]+$' then
    -- A season page: /mothers-day.
    v_ok := exists (select 1 from public.collections where slug = substring(v_path from '^/([a-z0-9-]+)$'));
  end if;
  if not v_ok then
    return;
  end if;

  insert into public.page_views (day, path, product_slug, views, visitors)
  values ((now() at time zone 'Asia/Beirut')::date, v_path, v_slug, 1, case when p_new_visitor then 1 else 0 end)
  on conflict (day, path) do update set
    views = public.page_views.views + 1,
    visitors = public.page_views.visitors + excluded.visitors;
end;
$$;
revoke execute on function public.record_page_view(text, boolean) from public;
grant execute on function public.record_page_view(text, boolean) to anon, authenticated;

-- 3. Push subscriptions --------------------------------------------------------

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_staff_idx on public.push_subscriptions (staff_id);

alter table public.push_subscriptions enable row level security;
drop policy if exists "staff manage their own phones" on public.push_subscriptions;
create policy "staff manage their own phones" on public.push_subscriptions
  for all to authenticated
  using (staff_id = (select private.current_staff_id()))
  with check (staff_id = (select private.current_staff_id()));
revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- 4. Notifications -------------------------------------------------------------

-- Events waiting to be sent: one row per new order and per audit_log line.
-- /api/push/ping takes them out (delete ... returning), so each one is sent
-- once, even when two pings run at the same time. Server code only (service
-- key; no policy).
create table if not exists public.push_outbox (
  id bigint generated always as identity primary key,
  audit_id bigint references public.audit_log (id) on delete cascade,
  order_id uuid references public.orders (id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((audit_id is null) <> (order_id is null))
);
alter table public.push_outbox enable row level security;
revoke all on public.push_outbox from anon, authenticated;

-- The secret of the ping, made here once and never shown to the website: the
-- trigger sends it, and the shop's server asks check_push_secret() whether it
-- is the right one. Not exposed through the API (private schema).
create table if not exists private.push_config (
  id integer primary key default 1 check (id = 1),
  secret text not null
);
insert into private.push_config (id, secret)
values (1, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (id) do nothing;

create or replace function public.check_push_secret(p_secret text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select p_secret is not null and exists (select 1 from private.push_config where id = 1 and secret = p_secret);
$$;
revoke execute on function public.check_push_secret(text) from public, anon, authenticated;
grant execute on function public.check_push_secret(text) to service_role;

create extension if not exists pg_net;

/*
  Queues the event and, once per transaction, pings /api/push/ping. pg_net
  sends the request after the transaction commits, so the endpoint always
  sees the new rows. The ping carries only the secret: the endpoint reads the
  outbox itself.
*/
create or replace function private.push_enqueue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'orders' then
    insert into public.push_outbox (order_id) values (new.id);
  else
    insert into public.push_outbox (audit_id) values (new.id);
  end if;

  if coalesce(current_setting('livre.push_ping', true), '') <> 'queued' then
    perform set_config('livre.push_ping', 'queued', true);
    begin
      perform net.http_post(
        url := 'https://shop.livrelb.workers.dev/api/push/ping',
        body := '{}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-push-secret', (select secret from private.push_config where id = 1)
        ),
        timeout_milliseconds := 10000
      );
    exception when others then
      -- Never block an order or an admin change because of a notification.
      null;
    end;
  end if;
  return null;
end;
$$;

drop trigger if exists audit_log_push on public.audit_log;
create trigger audit_log_push after insert on public.audit_log
  for each row execute function private.push_enqueue();
drop trigger if exists orders_push on public.orders;
create trigger orders_push after insert on public.orders
  for each row execute function private.push_enqueue();
