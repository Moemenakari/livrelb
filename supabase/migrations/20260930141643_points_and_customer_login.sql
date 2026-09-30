-- Phase 3 finish: LIVRE Points, verified customers (remembered device /
-- Google login) for prefill and points, no customer lookup by phone.

-- Points settings: all editable from the admin later.
alter table public.site_settings
  add column points_enabled boolean not null default true,
  -- Points earned per $1 of an order (subtotal after discounts, no delivery).
  add column points_per_dollar integer not null default 10 check (points_per_dollar >= 0),
  add column points_per_review integer not null default 10 check (points_per_review >= 0),
  -- Redeeming: points_redeem_points points = points_redeem_cents off (100 = $1).
  add column points_redeem_points integer not null default 100 check (points_redeem_points > 0),
  add column points_redeem_cents integer not null default 100 check (points_redeem_cents >= 0);

create type public.points_reason as enum ('order', 'review', 'redeem', 'adjust');

-- Every points change, never edited: the balance is the sum of delta.
create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason public.points_reason not null,
  order_id uuid references public.orders (id) on delete set null,
  review_id uuid references public.reviews (id) on delete set null,
  note text,
  created_by uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now()
);
create index points_ledger_customer_idx on public.points_ledger (customer_id);
create index points_ledger_order_idx on public.points_ledger (order_id);
create index points_ledger_review_idx on public.points_ledger (review_id);
create index points_ledger_created_by_idx on public.points_ledger (created_by);

alter table public.points_ledger enable row level security;
-- A customer (logged in) sees only her own points; staff who can see
-- customers see all.
create policy "customer sees her points, staff see all" on public.points_ledger
  for select to authenticated
  using (
    customer_id in (select id from public.customers where auth_user_id = (select auth.uid()))
    or (select private.has_permission('customers.view'))
  );
-- Manual changes from the admin: staff only, as 'adjust', signed by them.
create policy "staff adjust points" on public.points_ledger
  for insert to authenticated
  with check (
    reason = 'adjust'
    and (select private.has_permission('orders.edit'))
    and created_by = (select private.current_staff_id())
  );
revoke all on public.points_ledger from anon;
grant select, insert on public.points_ledger to authenticated;

-- Reviews can belong to a customer, who earns points once it's approved.
alter table public.reviews
  add column customer_id uuid references public.customers (id) on delete set null;
create index reviews_customer_idx on public.reviews (customer_id);

-- Points spent on an order and the money they took off.
alter table public.orders
  add column points_used integer not null default 0 check (points_used >= 0),
  add column points_discount_cents integer not null default 0 check (points_discount_cents >= 0);

create function private.points_balance(p_customer_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(delta), 0)::integer from public.points_ledger where customer_id = p_customer_id;
$$;

-- Points an amount earns (cents paid for the pieces, delivery excluded).
create function private.points_for(p_cents integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when s.points_enabled then floor(greatest(p_cents, 0) * s.points_per_dollar / 100.0)::integer else 0 end
  from public.site_settings s where s.id = 1;
$$;

/*
  Keeps an order's points in line with its status (safe to call any time):
  - earned once the order is Confirmed (or further), removed if cancelled;
  - points spent on it are taken at order time and given back if cancelled.
*/
create function private.sync_order_points(p_order_id uuid)
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

  if o.status = 'cancelled' then
    if v_earned <> 0 then
      insert into public.points_ledger (customer_id, delta, reason, order_id, note)
      values (o.customer_id, -v_earned, 'order', o.id, 'order cancelled');
    end if;
  elsif o.status in ('confirmed', 'in_production', 'shipped', 'delivered') and v_earned = 0 then
    v_want := private.points_for(o.subtotal_cents - o.discount_cents - o.points_discount_cents);
    if v_want > 0 then
      insert into public.points_ledger (customer_id, delta, reason, order_id)
      values (o.customer_id, v_want, 'order', o.id);
    end if;
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

create function private.order_points_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.sync_order_points(new.id);
  return null;
end;
$$;

create trigger orders_points after update of status on public.orders
  for each row when (old.status is distinct from new.status)
  execute function private.order_points_trigger();

create function private.review_points_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_points integer;
begin
  if new.is_approved and new.customer_id is not null
     and not exists (select 1 from public.points_ledger where review_id = new.id and reason = 'review') then
    select case when points_enabled then points_per_review else 0 end into v_points
    from public.site_settings where id = 1;
    if v_points > 0 then
      insert into public.points_ledger (customer_id, delta, reason, review_id)
      values (new.customer_id, v_points, 'review', new.id);
    end if;
  end if;
  return null;
end;
$$;

create trigger reviews_points after insert or update of is_approved, customer_id on public.reviews
  for each row execute function private.review_points_trigger();

revoke execute on function private.points_balance(uuid) from public, anon, authenticated;
revoke execute on function private.points_for(integer) from public, anon, authenticated;
revoke execute on function private.sync_order_points(uuid) from public, anon, authenticated;

/*
  What the checkout knows about a verified customer (her remembered device
  or her Google login, checked by the server): saved details to prefill and
  her points. Server only. Never looked up by phone.
*/
create function public.customer_profile(p_customer_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'phone', c.phone,
    'area', a.slug,
    'address', c.address,
    'points', private.points_balance(c.id)
  )
  from public.customers c
  left join public.areas a on a.id = c.area_id
  where c.id = p_customer_id;
$$;

revoke execute on function public.customer_profile(uuid) from public, anon, authenticated;
grant execute on function public.customer_profile(uuid) to service_role;

-- Points part of a quote or an order: how many can be used and what they
-- take off (whole redeem units, never more than the amount left to pay).
create function private.points_redemption(p_customer_id uuid, p_amount_cents integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.site_settings;
  v_balance integer;
  v_units integer;
begin
  select * into s from public.site_settings where id = 1;
  v_balance := case when p_customer_id is null then 0 else private.points_balance(p_customer_id) end;
  if not s.points_enabled or v_balance <= 0 or s.points_redeem_cents = 0 then
    return jsonb_build_object('balance', greatest(v_balance, 0), 'value_cents', 0, 'points', 0, 'cents', 0);
  end if;
  v_units := least(v_balance / s.points_redeem_points, greatest(p_amount_cents, 0) / s.points_redeem_cents);
  return jsonb_build_object(
    'balance', v_balance,
    'value_cents', (v_balance / s.points_redeem_points) * s.points_redeem_cents,
    'points', v_units * s.points_redeem_points,
    'cents', v_units * s.points_redeem_cents
  );
end;
$$;
revoke execute on function private.points_redemption(uuid, integer) from public, anon, authenticated;

-- quote_order: + the verified customer's points --------------------------------

drop function public.quote_order(jsonb, text, text, text);

create function public.quote_order(
  p_items jsonb,
  p_coupon_code text default null,
  p_phone text default null,
  p_area text default null,
  p_customer_id uuid default null,
  p_use_points boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  settings public.site_settings;
  item jsonb;
  v_line jsonb;
  v_lines jsonb := '[]';
  v_subtotal integer := 0;
  v_coupon jsonb;
  v_discount integer := 0;
  v_points jsonb;
  v_points_cents integer := 0;
  v_points_used integer := 0;
  v_phone text := private.normalize_phone(p_phone);
  v_first boolean;
  v_area_fee integer;
  v_delivery integer;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 30 then
    raise exception 'cart_invalid' using errcode = '22023';
  end if;
  select * into settings from public.site_settings where id = 1;

  for item in select value from jsonb_array_elements(p_items) loop
    v_line := private.price_item(item);
    v_lines := v_lines || jsonb_build_array(v_line);
    if not v_line ? 'error' then
      v_subtotal := v_subtotal + (v_line ->> 'line_total_cents')::integer;
    end if;
  end loop;

  v_coupon := private.apply_coupon(p_coupon_code, v_subtotal, false);
  if v_coupon is not null and not v_coupon ? 'error' then
    v_discount := (v_coupon ->> 'discount_cents')::integer;
  end if;

  v_points := private.points_redemption(p_customer_id, v_subtotal - v_discount);
  if p_use_points then
    v_points_used := (v_points ->> 'points')::integer;
    v_points_cents := (v_points ->> 'cents')::integer;
  end if;

  if v_phone ~ '^\+[1-9][0-9]{6,14}$' then
    v_first := private.is_first_order(v_phone);
  end if;

  select delivery_fee_cents into v_area_fee
  from public.areas where slug = p_area and is_active;
  v_delivery := coalesce(v_area_fee, settings.delivery_fee_cents);
  if v_subtotal = 0
     or v_coupon ->> 'type' = 'free_delivery'
     or (settings.first_order_free_delivery and v_first is true)
     or v_subtotal - v_discount >= settings.free_shipping_threshold_cents then
    v_delivery := 0;
  end if;

  return jsonb_build_object(
    'lines', v_lines,
    'subtotal_cents', v_subtotal,
    'coupon', v_coupon,
    'discount_cents', v_discount,
    'points_balance', (v_points ->> 'balance')::integer,
    'points_value_cents', (v_points ->> 'value_cents')::integer,
    'points_used', v_points_used,
    'points_discount_cents', v_points_cents,
    'points_to_earn', private.points_for(v_subtotal - v_discount - v_points_cents),
    'delivery_fee_cents', v_delivery,
    'is_first_order', v_first,
    'total_cents', v_subtotal - v_discount - v_points_cents + v_delivery,
    'free_shipping_threshold_cents', settings.free_shipping_threshold_cents,
    'first_order_free_delivery', settings.first_order_free_delivery
  );
end;
$$;

revoke execute on function public.quote_order(jsonb, text, text, text, uuid, boolean) from public, anon, authenticated;
grant execute on function public.quote_order(jsonb, text, text, text, uuid, boolean) to service_role;

-- place_order: + points, verified customer, Google account link --------------

drop function public.place_order(jsonb, jsonb, public.payment_method, text, uuid, text, text, uuid);

/*
  place_order(customer, items, ...) -> {order_id, number, customer_id, totals, ...}
  As before, plus:
  - p_customer_id: the customer the server verified (remembered device or
    Google login). Only she can spend her points, and only on an order
    placed with her own phone.
  - p_use_points: spend her points (whole redeem units).
  - p_auth_user_id: her Google login, linked to the customer on first use.
  - Returns trusted: whether this browser may be remembered as her.
*/
create function public.place_order(
  p_customer jsonb,
  p_items jsonb,
  p_payment_method public.payment_method default 'cod',
  p_coupon_code text default null,
  p_helper_staff_id uuid default null,
  p_ref_code text default null,
  p_notes text default null,
  p_request_id uuid default null,
  p_customer_id uuid default null,
  p_use_points boolean default false,
  p_auth_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.site_settings;
  v_name text := btrim(coalesce(p_customer ->> 'name', ''));
  v_phone text := private.normalize_phone(p_customer ->> 'phone');
  v_address text := nullif(btrim(coalesce(p_customer ->> 'address', '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_area public.areas;
  v_customer public.customers;
  v_first boolean;
  item jsonb;
  v_line jsonb;
  v_lines jsonb := '[]';
  v_subtotal integer := 0;
  v_coupon jsonb;
  v_discount integer := 0;
  v_points jsonb;
  v_points_used integer := 0;
  v_points_cents integer := 0;
  v_delivery integer;
  v_staff uuid;
  v_source public.attribution_source;
  v_existing public.orders;
  v_new_customer boolean;
  v_trusted boolean;
  v_order_id uuid;
  v_number bigint;
begin
  if p_request_id is not null then
    select * into v_existing from public.orders where request_id = p_request_id;
    if found then
      return jsonb_build_object(
        'order_id', v_existing.id,
        'number', v_existing.number,
        'customer_id', v_existing.customer_id,
        'trusted', p_customer_id is not null and p_customer_id = v_existing.customer_id,
        'subtotal_cents', v_existing.subtotal_cents,
        'discount_cents', v_existing.discount_cents,
        'points_used', v_existing.points_used,
        'points_discount_cents', v_existing.points_discount_cents,
        'delivery_fee_cents', v_existing.delivery_fee_cents,
        'total_cents', v_existing.total_cents,
        'is_first_order', v_existing.is_first_order,
        'staff_id', v_existing.staff_id,
        'attribution_source', v_existing.attribution_source,
        'duplicate', true
      );
    end if;
  end if;

  select * into settings from public.site_settings where id = 1;

  if v_name = '' or char_length(v_name) > 100 then
    raise exception 'name_required' using errcode = '22023';
  end if;
  if v_phone is null or v_phone !~ '^\+[1-9][0-9]{6,14}$' then
    raise exception 'phone_invalid' using errcode = '22023';
  end if;
  if char_length(v_address) > 500 or char_length(v_notes) > 1000 then
    raise exception 'text_too_long' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'cart_invalid' using errcode = '22023';
  end if;

  if nullif(p_customer ->> 'area', '') is not null then
    select * into v_area from public.areas where slug = p_customer ->> 'area' and is_active;
    if not found then
      raise exception 'area_invalid' using errcode = '22023';
    end if;
  end if;

  for item in select value from jsonb_array_elements(p_items) loop
    v_line := private.price_item(item);
    if v_line ? 'error' then
      raise exception '%', v_line ->> 'error' using errcode = '22023';
    end if;
    v_lines := v_lines || jsonb_build_array(v_line);
    v_subtotal := v_subtotal + (v_line ->> 'line_total_cents')::integer;
  end loop;

  v_coupon := private.apply_coupon(p_coupon_code, v_subtotal, true);
  if v_coupon ? 'error' then
    raise exception '%', v_coupon ->> 'error' using errcode = '22023';
  end if;
  if v_coupon is not null then
    v_discount := (v_coupon ->> 'discount_cents')::integer;
    update public.coupons set uses_count = uses_count + 1 where id = (v_coupon ->> 'id')::uuid;
  end if;

  v_first := private.is_first_order(v_phone);
  v_new_customer := not exists (select 1 from public.customers where phone = v_phone);

  insert into public.customers as c (name, phone, area_id, address, marketing_opt_in)
  values (
    v_name,
    v_phone,
    v_area.id,
    v_address,
    coalesce((p_customer ->> 'marketing_opt_in')::boolean, false)
  )
  on conflict (phone) do update set
    name = excluded.name,
    area_id = coalesce(excluded.area_id, c.area_id),
    address = coalesce(excluded.address, c.address),
    marketing_opt_in = c.marketing_opt_in or excluded.marketing_opt_in
  returning * into v_customer;

  -- Nobody proves she owns a phone number (no OTP), so this browser is
  -- trusted with the customer only if the order just created her, or the
  -- server already verified this browser as her. Only then may the device
  -- be remembered, her Google login linked, and her points spent.
  v_trusted := v_new_customer or (p_customer_id is not null and p_customer_id = v_customer.id);

  -- Her Google login, linked once (never taken from another customer).
  if v_trusted and p_auth_user_id is not null and v_customer.auth_user_id is null
     and not exists (select 1 from public.customers where auth_user_id = p_auth_user_id) then
    update public.customers set auth_user_id = p_auth_user_id where id = v_customer.id;
  end if;

  -- Points: only the verified customer, on her own phone. The row lock
  -- stops two orders spending the same points.
  if p_use_points and p_customer_id is not null and p_customer_id = v_customer.id then
    perform 1 from public.customers where id = v_customer.id for update;
    v_points := private.points_redemption(v_customer.id, v_subtotal - v_discount);
    v_points_used := (v_points ->> 'points')::integer;
    v_points_cents := (v_points ->> 'cents')::integer;
  end if;

  v_delivery := coalesce(v_area.delivery_fee_cents, settings.delivery_fee_cents);
  if v_coupon ->> 'type' = 'free_delivery'
     or (settings.first_order_free_delivery and v_first)
     or v_subtotal - v_discount >= settings.free_shipping_threshold_cents then
    v_delivery := 0;
  end if;

  if v_coupon ->> 'staff_id' is not null then
    v_staff := (v_coupon ->> 'staff_id')::uuid;
    v_source := 'code';
  elsif p_helper_staff_id is not null
        and exists (select 1 from public.staff where id = p_helper_staff_id and is_active) then
    v_staff := p_helper_staff_id;
    v_source := 'checkout';
  elsif v_customer.referred_by_staff_id is not null then
    v_staff := v_customer.referred_by_staff_id;
    v_source := 'customer_history';
  elsif nullif(btrim(p_ref_code), '') is not null then
    select id into v_staff from public.staff
    where ref_code = lower(btrim(p_ref_code)) and is_active;
    if v_staff is not null then
      v_source := 'link';
    end if;
  end if;
  if v_customer.referred_by_staff_id is null and v_staff is not null then
    update public.customers
    set referred_by_staff_id = v_staff, referred_at = now()
    where id = v_customer.id;
  end if;

  insert into public.orders (
    customer_id, staff_id, attribution_source, payment_method, coupon_id, coupon_code,
    subtotal_cents, discount_cents, points_used, points_discount_cents, delivery_fee_cents,
    total_cents, is_first_order, customer_name, phone, area_id, area_name, address, notes,
    request_id
  )
  values (
    v_customer.id, v_staff, v_source, p_payment_method,
    (v_coupon ->> 'id')::uuid, v_coupon ->> 'code',
    v_subtotal, v_discount, v_points_used, v_points_cents, v_delivery,
    v_subtotal - v_discount - v_points_cents + v_delivery, v_first,
    v_name, v_phone, v_area.id, v_area.name_en, v_address, v_notes, p_request_id
  )
  returning id, number into v_order_id, v_number;

  insert into public.order_items (
    order_id, product_id, product_slug, product_name, material_id, material_name,
    font_id, font_name, custom_text, chain_connection, size_kind, size_value,
    unit_price_cents, qty
  )
  select
    v_order_id,
    (l ->> 'product_id')::uuid,
    l ->> 'product_slug',
    l ->> 'product_name',
    (l ->> 'material_id')::uuid,
    l ->> 'material_name',
    (l ->> 'font_id')::uuid,
    l ->> 'font_name',
    l ->> 'custom_text',
    (l ->> 'chain_connection')::public.chain_connection,
    (l ->> 'size_kind')::public.size_kind,
    (l ->> 'size_value')::numeric,
    (l ->> 'unit_price_cents')::integer,
    (l ->> 'qty')::smallint
  from jsonb_array_elements(v_lines) l;

  -- Takes the spent points (earned ones come when the order is Confirmed).
  perform private.sync_order_points(v_order_id);

  return jsonb_build_object(
    'order_id', v_order_id,
    'number', v_number,
    'customer_id', v_customer.id,
    'trusted', v_trusted,
    'subtotal_cents', v_subtotal,
    'discount_cents', v_discount,
    'points_used', v_points_used,
    'points_discount_cents', v_points_cents,
    'delivery_fee_cents', v_delivery,
    'total_cents', v_subtotal - v_discount - v_points_cents + v_delivery,
    'is_first_order', v_first,
    'staff_id', v_staff,
    'attribution_source', v_source,
    'duplicate', false
  );
end;
$$;

revoke execute on function public.place_order(
  jsonb, jsonb, public.payment_method, text, uuid, text, text, uuid, uuid, boolean, uuid
) from public, anon, authenticated;
grant execute on function public.place_order(
  jsonb, jsonb, public.payment_method, text, uuid, text, text, uuid, uuid, boolean, uuid
) to service_role;
