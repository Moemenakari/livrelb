-- Phase 5: points approved by staff (per $20, after delivery) with a reward
-- coupon, order tracking timeline, hero slides, charm requests, card
-- payments and analytics IDs. Everything is additive except the points rule:
-- points are no longer given automatically when an order is Confirmed.

-- 1. Points settings ---------------------------------------------------------
alter table public.site_settings
  -- Points are counted per full step of this size ($20): $45 = 2 steps.
  add column points_step_cents integer not null default 2000 check (points_step_cents > 0),
  -- Reward coupon made when staff approve an order's points.
  add column reward_coupon_percent integer not null default 10 check (reward_coupon_percent between 1 and 100),
  add column reward_coupon_days integer not null default 20 check (reward_coupon_days between 1 and 365),
  -- Card payments (hidden until on AND the gateway variables are set).
  add column card_online_enabled boolean not null default false,
  -- Analytics: empty = off. Loaded only after the visitor accepts cookies.
  add column meta_pixel_id text not null default '' check (meta_pixel_id ~ '^[0-9]{0,20}$'),
  add column ga4_id text not null default '' check (ga4_id ~ '^(G-[A-Z0-9]{4,20})?$');

alter table public.orders
  add column points_approved_at timestamptz,
  add column points_approved_by uuid references public.staff (id) on delete set null,
  add column tracking_number text,
  add column carrier text;
create index orders_points_approved_by_idx on public.orders (points_approved_by);

-- Points an amount earns: per full step of points_step_cents, at
-- points_per_dollar points for every dollar in that step ($20 -> 200).
create or replace function private.points_for(p_cents integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when s.points_enabled then
    ((greatest(p_cents, 0) / s.points_step_cents) * s.points_step_cents * s.points_per_dollar / 100)::integer
  else 0 end
  from public.site_settings s where s.id = 1;
$$;

/*
  Order points follow the status (safe to call any time) but earning is now
  manual: staff approve them after delivery (approve_order_points).
  Here: cancelling removes earned points and gives back the ones spent.
*/
create or replace function private.sync_order_points(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  v_earned integer;
  v_redeemed integer;
  v_want integer;
begin
  select * into o from public.orders where id = p_order_id;
  if not found then
    return;
  end if;

  select coalesce(sum(delta) filter (where reason = 'order'), 0),
         coalesce(sum(delta) filter (where reason = 'redeem'), 0)
  into v_earned, v_redeemed
  from public.points_ledger where order_id = o.id;

  if o.status = 'cancelled' and v_earned <> 0 then
    insert into public.points_ledger (customer_id, delta, reason, order_id, note)
    values (o.customer_id, -v_earned, 'order', o.id, 'order cancelled');
  end if;

  v_want := case when o.status = 'cancelled' then 0 else -o.points_used end;
  if v_redeemed <> v_want then
    insert into public.points_ledger (customer_id, delta, reason, order_id, note)
    values (
      o.customer_id, v_want - v_redeemed, 'redeem', o.id,
      case when o.status = 'cancelled' then 'order cancelled' end
    );
  end if;
end;
$$;

/*
  Staff approve an order's points: the order must be Delivered, it can be
  approved once, and the customer gets a one-use reward coupon that lasts
  reward_coupon_days days. Returns what the admin needs to message her.
*/
create function public.approve_order_points(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  c public.customers;
  s public.site_settings;
  v_actor uuid := private.current_staff_id();
  v_points integer;
  v_code text;
  v_ends timestamptz;
begin
  if v_actor is null or not private.has_permission('orders.edit') then
    raise exception 'Not allowed to approve points' using errcode = '42501';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if o.status <> 'delivered' then
    raise exception 'Points can be approved once the order is Delivered';
  end if;
  if o.points_approved_at is not null then
    raise exception 'Points were already approved for this order';
  end if;

  select * into s from public.site_settings where id = 1;
  select * into c from public.customers where id = o.customer_id;
  v_points := private.points_for(o.subtotal_cents - o.discount_cents - o.points_discount_cents);
  if v_points <= 0 then
    raise exception 'This order is under the points step, nothing to give';
  end if;

  insert into public.points_ledger (customer_id, delta, reason, order_id, created_by, note)
  values (o.customer_id, v_points, 'order', o.id, v_actor, 'approved after delivery');

  v_ends := now() + make_interval(days => s.reward_coupon_days);
  loop
    v_code := 'THX-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.coupons where code = v_code);
  end loop;
  insert into public.coupons (code, type, value, starts_at, ends_at, max_uses, created_by)
  values (v_code, 'percent', s.reward_coupon_percent, now(), v_ends, 1, v_actor);

  update public.orders set points_approved_at = now(), points_approved_by = v_actor where id = o.id;

  return jsonb_build_object(
    'points', v_points,
    'balance', private.points_balance(o.customer_id),
    'coupon_code', v_code,
    'coupon_percent', s.reward_coupon_percent,
    'coupon_ends_at', v_ends,
    'customer_name', c.name,
    'customer_phone', c.phone,
    'order_number', o.number
  );
end;
$$;
revoke execute on function public.approve_order_points(uuid) from public, anon;
grant execute on function public.approve_order_points(uuid) to authenticated;

-- 2. Tracking timeline (like a parcel app) ------------------------------------
create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- Status change that made it, or null for a note from staff.
  status public.order_status,
  -- Shown to the customer, in both languages.
  title_en text not null,
  title_ar text not null,
  note_en text,
  note_ar text,
  created_by uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);
create index order_events_created_by_idx on public.order_events (created_by);

alter table public.order_events enable row level security;
create policy "staff read tracking" on public.order_events
  for select to authenticated using ((select private.has_permission('orders.view')));
create policy "staff add tracking notes" on public.order_events
  for insert to authenticated
  with check (
    status is null
    and (select private.has_permission('orders.edit'))
    and created_by = (select private.current_staff_id())
  );
revoke all on public.order_events from anon;
grant select, insert on public.order_events to authenticated;

-- A line on the timeline for the order being placed and for each status.
create function private.order_event_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_en text;
  v_ar text;
begin
  v_en := case new.status when 'pending' then 'Order placed' when 'confirmed' then 'Order confirmed'
    when 'in_production' then 'Being handcrafted' when 'shipped' then 'Out for delivery'
    when 'delivered' then 'Delivered' else 'Order cancelled' end;
  v_ar := case new.status when 'pending' then 'تم استلام طلبك' when 'confirmed' then 'تم تأكيد طلبك'
    when 'in_production' then 'قيد التصنيع' when 'shipped' then 'خرج للتوصيل'
    when 'delivered' then 'تم التسليم' else 'تم إلغاء الطلب' end;
  insert into public.order_events (order_id, status, title_en, title_ar, created_by)
  values (new.id, new.status, v_en, v_ar, private.current_staff_id());
  return null;
end;
$$;
create trigger orders_event_insert after insert on public.orders
  for each row execute function private.order_event_trigger();
create trigger orders_event_status after update of status on public.orders
  for each row when (old.status is distinct from new.status)
  execute function private.order_event_trigger();
revoke execute on function private.order_event_trigger() from public, anon, authenticated;

-- Orders that already exist get their first line.
insert into public.order_events (order_id, status, title_en, title_ar, created_at)
select o.id, o.status,
  case o.status when 'pending' then 'Order placed' when 'confirmed' then 'Order confirmed'
    when 'in_production' then 'Being handcrafted' when 'shipped' then 'Out for delivery'
    when 'delivered' then 'Delivered' else 'Order cancelled' end,
  case o.status when 'pending' then 'تم استلام طلبك' when 'confirmed' then 'تم تأكيد طلبك'
    when 'in_production' then 'قيد التصنيع' when 'shipped' then 'خرج للتوصيل'
    when 'delivered' then 'تم التسليم' else 'تم إلغاء الطلب' end,
  o.updated_at
from public.orders o;

-- 3. Hero slides (photos and videos from the admin) ----------------------------
alter table public.promotions
  drop constraint promotions_placement_check,
  add constraint promotions_placement_check check (placement in ('promo_bar', 'hero', 'hero_slide')),
  add column media_url text check (media_url is null or media_url ~ '^https://'),
  add column media_type public.media_type,
  add column link_url text check (link_url is null or link_url ~ '^/[^/]');

-- 4. Charm requests (from the Charms page) --------------------------------------
create table public.charm_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  phone public.e164 not null,
  -- Shape slugs picked from the gallery, plus the letters / word wanted.
  shapes text[] not null default '{}' check (cardinality(shapes) <= 12),
  letters text check (char_length(letters) <= 40),
  metal public.metal_tone not null default 'gold',
  note text check (char_length(note) <= 1000),
  -- Photo the customer uploaded (R2), for staff to look at.
  image_url text check (image_url is null or image_url ~ '^https://'),
  status text not null default 'new' check (status in ('new', 'contacted', 'done')),
  handled_by uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now()
);
create index charm_requests_handled_by_idx on public.charm_requests (handled_by);
create index charm_requests_status_idx on public.charm_requests (status, created_at desc);

alter table public.charm_requests enable row level security;
create policy "staff read charm requests" on public.charm_requests
  for select to authenticated using ((select private.has_permission('orders.view')));
create policy "staff update charm requests" on public.charm_requests
  for update to authenticated
  using ((select private.has_permission('orders.edit')))
  with check ((select private.has_permission('orders.edit')));
revoke all on public.charm_requests from anon;
grant select, update on public.charm_requests to authenticated;

-- 5. Card payments ------------------------------------------------------------
alter type public.payment_method add value if not exists 'card';
alter table public.payments drop constraint payments_provider_check;
alter table public.payments add constraint payments_provider_check check (provider in ('whish', 'card'));
