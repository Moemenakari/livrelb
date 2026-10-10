-- Admin redesign (Phase 2): the ONE database update for the whole admin job.
-- Additive: no table or column is dropped and no data is deleted. The only
-- thing removed is the "one owner only" index, so both Moemen and Nour can be
-- Admins (role 'owner').
--
-- 1. Two admins        2. Staff: soft delete
-- 3. Orders: soft delete (red line), automatic LIVRE Points on delivery
-- 4. Tracking notes: edit / delete    5. Customers: last visit, who verified
-- 6. Home page: order of the sections

-- 1. Two admins ----------------------------------------------------------------
drop index if exists public.staff_single_owner;

-- 2. Staff: soft delete ----------------------------------------------------------
-- A deleted employee disappears from the lists but their name stays on old
-- orders, customers and the activity log. (is_active = false is "Suspended".)
alter table public.staff add column deleted_at timestamptz;

-- 3. Orders -----------------------------------------------------------------------
alter table public.orders
  add column deleted_at timestamptz,
  add column deleted_by uuid references public.staff (id) on delete set null,
  add column delete_reason text check (delete_reason in ('test', 'error', 'other')),
  add column delete_note text check (char_length(delete_note) <= 500),
  -- The one-use thank-you coupon made when the points are given.
  add column reward_coupon_code text,
  add constraint orders_deleted_reason_check check ((deleted_at is null) = (delete_reason is null));
create index orders_deleted_by_idx on public.orders (deleted_by);

-- Staff edits to orders: only the owner may reassign, cancelling and deleting
-- need orders.cancel, every real change is logged. Server code (no logged-in
-- user) is not restricted.
create or replace function private.guard_order_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.current_staff_id();
begin
  if (select auth.uid()) is not null then
    if new.staff_id is distinct from old.staff_id and not private.is_owner() then
      raise exception 'Only the owner can reassign an order' using errcode = '42501';
    end if;
    if new.status = 'cancelled' and old.status <> 'cancelled'
       and not private.has_permission('orders.cancel') then
      raise exception 'Not allowed to cancel orders' using errcode = '42501';
    end if;
    if new.deleted_at is distinct from old.deleted_at
       and not private.has_permission('orders.cancel') then
      raise exception 'Not allowed to delete orders' using errcode = '42501';
    end if;
  end if;
  if actor is not null then
    new.updated_by := actor;
  end if;
  -- A deleted order keeps who deleted it and why; restoring clears them.
  if new.deleted_at is not null and old.deleted_at is null then
    new.deleted_by := actor;
  elsif new.deleted_at is null and old.deleted_at is not null then
    new.deleted_by := null;
    new.delete_reason := null;
    new.delete_note := null;
  end if;
  -- Points bookkeeping (points_approved_at, reward_coupon_code) is not news.
  if new.status is distinct from old.status
     or new.staff_id is distinct from old.staff_id
     or new.total_cents is distinct from old.total_cents
     or new.deleted_at is distinct from old.deleted_at
     or new.carrier is distinct from old.carrier
     or new.tracking_number is distinct from old.tracking_number then
    insert into public.audit_log (actor_staff_id, table_name, row_id, action, changes)
    values (
      actor, 'orders', new.id, 'update',
      jsonb_build_object(
        'status', jsonb_build_array(old.status, new.status),
        'staff_id', jsonb_build_array(old.staff_id, new.staff_id),
        'total_cents', jsonb_build_array(old.total_cents, new.total_cents),
        'deleted_at', jsonb_build_array(old.deleted_at, new.deleted_at)
      )
    );
  end if;
  return new;
end;
$$;

-- Deleted orders are not sales.
create or replace view public.daily_sales
with (security_invoker = true)
as
select
  (o.created_at at time zone 'Asia/Beirut')::date as day,
  o.staff_id,
  'website'::text as source,
  count(*)::integer as orders_count,
  sum(o.total_cents)::integer as sales_cents
from public.orders o
where o.status <> 'cancelled' and o.deleted_at is null
group by 1, 2
union all
select
  m.entry_date,
  m.staff_id,
  'manual',
  sum(m.orders_count)::integer,
  sum(m.sales_cents)::integer
from public.manual_entries m
group by 1, 2;

-- A deleted (test) order is not a customer's first order.
create or replace function private.is_first_order(p_phone text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
      select 1 from public.orders o
      join public.customers c on c.id = o.customer_id
      where c.phone = p_phone and o.status <> 'cancelled' and o.deleted_at is null
    )
    and not exists (select 1 from public.imported_orders i where i.phone = p_phone);
$$;

-- "Sold" counters on the product pages skip deleted orders too.
create or replace function public.storefront_stats()
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
        where o.status <> 'cancelled' and o.deleted_at is null
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

/*
  An order's points follow its status (safe to call any time):
  - Delivered: the points are given automatically, once (per full step of
    points_step_cents), together with a one-use thank-you coupon;
  - Cancelled or deleted: earned points are taken back and the points spent on
    the order are given back.
*/
create or replace function private.sync_order_points(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  s public.site_settings;
  v_actor uuid := private.current_staff_id();
  v_dead boolean;
  v_earned integer;
  v_redeemed integer;
  v_want integer;
  v_code text;
begin
  select * into o from public.orders where id = p_order_id;
  if not found then
    return;
  end if;
  v_dead := o.status = 'cancelled' or o.deleted_at is not null;

  select coalesce(sum(delta) filter (where reason = 'order'), 0),
         coalesce(sum(delta) filter (where reason = 'redeem'), 0)
  into v_earned, v_redeemed
  from public.points_ledger where order_id = o.id;

  if v_dead and v_earned <> 0 then
    insert into public.points_ledger (customer_id, delta, reason, order_id, note)
    values (o.customer_id, -v_earned, 'order', o.id,
            case when o.deleted_at is not null then 'order deleted' else 'order cancelled' end);
  end if;

  v_want := case when v_dead then 0 else -o.points_used end;
  if v_redeemed <> v_want then
    insert into public.points_ledger (customer_id, delta, reason, order_id, note)
    values (
      o.customer_id, v_want - v_redeemed, 'redeem', o.id,
      case when v_dead then 'order cancelled' end
    );
  end if;

  if not v_dead and o.status = 'delivered' and v_earned = 0 then
    v_want := private.points_for(o.subtotal_cents - o.discount_cents - o.points_discount_cents);
    if v_want > 0 then
      insert into public.points_ledger (customer_id, delta, reason, order_id, created_by, note)
      values (o.customer_id, v_want, 'order', o.id, v_actor, 'delivered');

      v_code := o.reward_coupon_code;
      if v_code is null then
        select * into s from public.site_settings where id = 1;
        loop
          v_code := 'THX-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
          exit when not exists (select 1 from public.coupons where code = v_code);
        end loop;
        insert into public.coupons (code, type, value, starts_at, ends_at, max_uses, created_by)
        values (v_code, 'percent', s.reward_coupon_percent, now(),
                now() + make_interval(days => s.reward_coupon_days), 1, v_actor);
      end if;
      update public.orders
      set points_approved_at = now(), points_approved_by = v_actor, reward_coupon_code = v_code
      where id = o.id;
    end if;
  end if;
end;
$$;
revoke execute on function private.sync_order_points(uuid) from public, anon, authenticated;

-- Also runs when an order is deleted or restored.
create or replace trigger orders_points
  after update of status, deleted_at on public.orders
  for each row
  when (old.status is distinct from new.status or old.deleted_at is distinct from new.deleted_at)
  execute function private.order_points_trigger();

-- 4. Tracking notes: staff can fix or remove a line they wrote ------------------
create policy "staff edit tracking notes" on public.order_events
  for update to authenticated
  using (status is null and (select private.has_permission('orders.edit')))
  with check (status is null and (select private.has_permission('orders.edit')));
create policy "staff delete tracking notes" on public.order_events
  for delete to authenticated
  using (status is null and (select private.has_permission('orders.edit')));
grant update, delete on public.order_events to authenticated;

-- 5. Customers: last visit and who verified the phone ----------------------------
alter table public.customers
  add column last_seen_at timestamptz,
  add column phone_verified_by uuid references public.staff (id) on delete set null;
create index customers_phone_verified_by_idx on public.customers (phone_verified_by);

-- 6. Home page: order of the sections ---------------------------------------------
-- The Hero and the Lira Collection are fixed (they carry the 3D coin); the rest
-- follow sort_order, lowest first.
alter table public.home_sections add column sort_order integer not null default 0;
insert into public.home_sections (key, sort_order) values
  ('shop_by_style', 10),
  ('best_sellers', 20),
  ('steps', 30),
  ('try_picture', 40),
  ('reviews', 50),
  ('new_arrivals', 60),
  ('why_us', 70),
  ('create', 80),
  ('trust', 90)
on conflict (key) do update set sort_order = excluded.sort_order;

-- 7. Storefront: an account exists from the first sign-in -------------------------
-- A customer who signed in with Google or an email link has no phone yet; it is asked
-- once at her first order. Several accounts may have no phone (a unique column allows
-- many nulls).
alter table public.customers alter column phone drop not null;
