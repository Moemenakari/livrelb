-- Phase 4 part A: "buy on the website" details, payments, rate limits.
-- Only adds (columns, tables, functions): nothing is dropped or rewritten.

-- Shop settings ---------------------------------------------------------------

alter table public.site_settings
  -- "Estimated delivery" line; empty = "2–7 days" from delivery_days_min/max.
  add column delivery_time_en text not null default '',
  add column delivery_time_ar text not null default '',
  -- Feature flag: Whish online payment with OTP. Hidden until the Whish
  -- merchant API is connected; Whish stays manual meanwhile.
  add column whish_online_enabled boolean not null default false;

-- Products: stock is only tracked when set (null = made to order).
alter table public.products
  add column stock_qty integer check (stock_qty >= 0);

-- Coupons the storefront may advertise (deals row on the product page).
-- Staff codes and private codes stay hidden (default false).
alter table public.coupons
  add column is_public boolean not null default false;

/*
  storefront_stats() -> {"sold": {"<slug>": qty}, "coupons": [...]}
  Public numbers for the product page: pieces sold per product (orders not
  cancelled) and the public coupons running now. No customer data.
*/
create function public.storefront_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'sold', coalesce((
      select jsonb_object_agg(slug, qty) from (
        select oi.product_slug as slug, sum(oi.qty)::integer as qty
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        where o.status <> 'cancelled'
        group by oi.product_slug
      ) s
    ), '{}'::jsonb),
    'coupons', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', c.code,
        'type', c.type,
        'value', c.value,
        'min_order_cents', c.min_order_cents,
        'ends_at', c.ends_at
      ) order by c.created_at)
      from public.coupons c
      where c.is_public and c.is_active and c.staff_id is null
        and (c.starts_at is null or c.starts_at <= now())
        and (c.ends_at is null or c.ends_at > now())
        and (c.max_uses is null or c.uses_count < c.max_uses)
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.storefront_stats() from public;
grant execute on function public.storefront_stats() to anon, authenticated, service_role;
-- (Narrowed to the server in 20260930141800_storefront_stats_server_only.)

-- Payments (Whish online, later) -------------------------------------------------

create type public.payment_status as enum ('pending', 'otp_sent', 'paid', 'failed', 'cancelled');

-- One row per online payment attempt. Cash on delivery never creates one.
-- No card or wallet secrets are stored: only the provider's reference and
-- the last digits of the wallet phone.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null check (provider in ('whish')),
  status public.payment_status not null default 'pending',
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  provider_ref text,
  wallet_last4 text check (wallet_last4 ~ '^[0-9]{4}$'),
  otp_attempts smallint not null default 0,
  error_code text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);
create unique index payments_provider_ref_idx on public.payments (provider, provider_ref)
  where provider_ref is not null;

create trigger payments_updated_at before update on public.payments
  for each row execute function private.set_updated_at();

alter table public.payments enable row level security;
-- Written by the server only (secret key). Staff who see orders see them.
create policy "staff see payments" on public.payments
  for select to authenticated
  using ((select private.has_permission('orders.view')));
revoke all on public.payments from anon;
grant select on public.payments to authenticated;

-- Rate limits -------------------------------------------------------------------

-- Hits per key (a hash of the IP or phone, never the raw value) per window.
create table public.rate_limits (
  key text not null check (char_length(key) <= 100),
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;
-- No policies: only the server (secret key) uses it, through hit_rate_limit.
revoke all on public.rate_limits from anon, authenticated;

/*
  hit_rate_limit(key, limit, window_seconds) -> true if allowed.
  Counts one hit in the current fixed window and says whether it is still
  under the limit. Old windows are cleaned up now and then.
*/
create function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  v_hits integer;
begin
  insert into public.rate_limits as r (key, window_start)
  values (p_key, v_window)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;

  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
