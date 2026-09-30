-- Phase 3 part B: cart quotes and checkout.
--
-- The cart and checkout never trust browser prices: quote_order prices a
-- cart for display, place_order prices it again when the order is saved.
-- Both use the same helpers below, so they always agree.

-- One order per checkout attempt: a double tap or a retried request with
-- the same request_id returns the first order instead of a second one.
alter table public.orders add column request_id uuid unique;

-- A phone's first website order (old imported orders count too).
create function private.is_first_order(p_phone text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
      select 1 from public.orders o
      join public.customers c on c.id = o.customer_id
      where c.phone = p_phone and o.status <> 'cancelled'
    )
    and not exists (select 1 from public.imported_orders i where i.phone = p_phone);
$$;

/*
  One cart line priced from the catalog:
    {"product": "cursive-name-necklace", "material": "gold", "qty": 1,
     "text": "Maya", "font": "beirut", "size": 45, "connection": "sides"}
  Returns the priced line, or {"error": "..."} when the product, metal,
  size, font, text or quantity is not valid (any more).
*/
create function private.price_item(item jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_product public.products;
  v_material record;
  v_option public.product_options;
  v_font public.fonts;
  v_text text;
  v_connection public.chain_connection;
  v_qty integer;
  v_unit integer;
begin
  if jsonb_typeof(item) is distinct from 'object' then
    return jsonb_build_object('error', 'product_unavailable');
  end if;

  select * into v_product from public.products
  where slug = item ->> 'product' and status = 'active';
  if not found then
    return jsonb_build_object('error', 'product_unavailable');
  end if;

  select pm.price_cents, m.id, m.key, m.name_en into v_material
  from public.product_materials pm
  join public.materials m on m.id = pm.material_id
  where pm.product_id = v_product.id and m.key = item ->> 'material' and m.is_active;
  if not found then
    return jsonb_build_object('error', 'material_unavailable');
  end if;
  v_unit := v_material.price_cents;

  if exists (select 1 from public.product_options where product_id = v_product.id) then
    if nullif(item ->> 'size', '') is null then
      select * into v_option from public.product_options
      where product_id = v_product.id and is_default;
    elsif (item ->> 'size') ~ '^[0-9]{1,3}(\.[0-9])?$' then
      select * into v_option from public.product_options
      where product_id = v_product.id and value = (item ->> 'size')::numeric;
    end if;
    if v_option.id is null then
      return jsonb_build_object('error', 'size_unavailable');
    end if;
    v_unit := v_unit + v_option.price_modifier_cents;
  end if;

  if v_product.personalization is not null then
    v_text := btrim(coalesce(item ->> 'text', ''));
    if v_text = '' or char_length(v_text) > v_product.max_length then
      return jsonb_build_object('error', 'text_invalid');
    end if;
    select f.* into v_font
    from public.product_fonts pf
    join public.fonts f on f.id = pf.font_id
    where pf.product_id = v_product.id and f.is_active
      and (nullif(item ->> 'font', '') is null or f.key = item ->> 'font')
    order by pf.sort_order
    limit 1;
    if not found then
      return jsonb_build_object('error', 'font_unavailable');
    end if;
    if cardinality(v_product.chain_connections) > 0 then
      if coalesce(item ->> 'connection', '') not in ('', 'sides', 'center') then
        return jsonb_build_object('error', 'connection_unavailable');
      end if;
      v_connection := coalesce(
        (nullif(item ->> 'connection', ''))::public.chain_connection,
        v_product.chain_connections[1]
      );
      if not (v_connection = any (v_product.chain_connections)) then
        return jsonb_build_object('error', 'connection_unavailable');
      end if;
    end if;
  end if;

  if coalesce(item ->> 'qty', '1') !~ '^[0-9]{1,2}$' then
    return jsonb_build_object('error', 'qty_invalid');
  end if;
  v_qty := coalesce((item ->> 'qty')::integer, 1);
  if v_qty not between 1 and 20 then
    return jsonb_build_object('error', 'qty_invalid');
  end if;

  return jsonb_build_object(
    'product_id', v_product.id,
    'product_slug', v_product.slug,
    'product_name', v_product.name_en,
    'material_id', v_material.id,
    'material_key', v_material.key,
    'material_name', v_material.name_en,
    'font_id', v_font.id,
    'font_key', v_font.key,
    'font_name', v_font.name_en,
    'custom_text', v_text,
    'chain_connection', v_connection,
    'size_kind', v_option.kind,
    'size_value', v_option.value,
    'unit_price_cents', v_unit,
    'qty', v_qty,
    'line_total_cents', v_unit * v_qty
  );
end;
$$;

/*
  A coupon code checked against a subtotal. Returns
  {"id", "code", "type", "staff_id", "discount_cents"} or {"error": ...}.
  p_lock: place_order locks the coupon row so max_uses can't be overrun.
*/
create function private.apply_coupon(p_code text, p_subtotal integer, p_lock boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coupon public.coupons;
  v_code text := upper(btrim(coalesce(p_code, '')));
begin
  if v_code = '' then
    return null;
  end if;
  if p_lock then
    select * into v_coupon from public.coupons c where c.code = v_code for update;
  else
    select * into v_coupon from public.coupons c where c.code = v_code;
  end if;
  if not found
     or not v_coupon.is_active
     or (v_coupon.starts_at is not null and v_coupon.starts_at > now())
     or (v_coupon.ends_at is not null and v_coupon.ends_at <= now())
     or (v_coupon.max_uses is not null and v_coupon.uses_count >= v_coupon.max_uses) then
    return jsonb_build_object('code', v_code, 'error', 'coupon_invalid');
  end if;
  if p_subtotal < v_coupon.min_order_cents then
    return jsonb_build_object(
      'code', v_code, 'error', 'coupon_min_order', 'min_order_cents', v_coupon.min_order_cents
    );
  end if;
  return jsonb_build_object(
    'id', v_coupon.id,
    'code', v_coupon.code,
    'type', v_coupon.type,
    'value', v_coupon.value,
    'staff_id', v_coupon.staff_id,
    'discount_cents', case v_coupon.type
      when 'percent' then round(p_subtotal * v_coupon.value / 100.0)::integer
      when 'fixed' then least(v_coupon.value, p_subtotal)
      else 0
    end
  );
end;
$$;

revoke execute on function private.is_first_order(text) from public, anon, authenticated;
revoke execute on function private.price_item(jsonb) from public, anon, authenticated;
revoke execute on function private.apply_coupon(text, integer, boolean) from public, anon, authenticated;

/*
  quote_order(items, coupon, phone, area) -> the cart priced for display:
  {"lines": [line | {"error"}], "subtotal_cents", "coupon", "discount_cents",
   "delivery_fee_cents", "is_first_order" (null without a phone), "total_cents",
   "free_shipping_threshold_cents"}
  Read only: no customer is created and no coupon use is counted.
*/
create function public.quote_order(
  p_items jsonb,
  p_coupon_code text default null,
  p_phone text default null,
  p_area text default null
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
    'delivery_fee_cents', v_delivery,
    'is_first_order', v_first,
    'total_cents', v_subtotal - v_discount + v_delivery,
    'free_shipping_threshold_cents', settings.free_shipping_threshold_cents,
    'first_order_free_delivery', settings.first_order_free_delivery
  );
end;
$$;

revoke execute on function public.quote_order(jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.quote_order(jsonb, text, text, text) to service_role;

-- place_order: same pricing as quote_order, plus request_id.
drop function public.place_order(jsonb, jsonb, public.payment_method, text, uuid, text, text);

/*
  place_order(customer, items, ...) -> {order_id, number, totals, staff_id, ...}

  customer: {"name": "Maya", "phone": "03 123 456", "area": "beirut",
             "address": "...", "marketing_opt_in": true}
  items:    see private.price_item.

  - Finds or creates the customer by phone (E.164, +961 by default).
  - Prices every line from the catalog; any invalid line rejects the order.
  - Coupon: active, in its dates, under max uses, above min order.
  - Delivery: area fee or the flat fee; free over the threshold, on the
    first order (by phone, old imported orders included) or with a
    free-delivery code.
  - Attribution priority (brief §5): employee code > "who helped you" >
    the customer's saved employee > ref link. The customer's first
    employee is saved forever.
  - p_request_id: the same id twice returns the first order (double submit).
*/
create function public.place_order(
  p_customer jsonb,
  p_items jsonb,
  p_payment_method public.payment_method default 'cod',
  p_coupon_code text default null,
  p_helper_staff_id uuid default null,
  p_ref_code text default null,
  p_notes text default null,
  p_request_id uuid default null
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
  v_delivery integer;
  v_staff uuid;
  v_source public.attribution_source;
  v_existing public.orders;
  v_order_id uuid;
  v_number bigint;
begin
  if p_request_id is not null then
    select * into v_existing from public.orders where request_id = p_request_id;
    if found then
      return jsonb_build_object(
        'order_id', v_existing.id,
        'number', v_existing.number,
        'subtotal_cents', v_existing.subtotal_cents,
        'discount_cents', v_existing.discount_cents,
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
    subtotal_cents, discount_cents, delivery_fee_cents, total_cents, is_first_order,
    customer_name, phone, area_id, area_name, address, notes, request_id
  )
  values (
    v_customer.id, v_staff, v_source, p_payment_method,
    (v_coupon ->> 'id')::uuid, v_coupon ->> 'code',
    v_subtotal, v_discount, v_delivery, v_subtotal - v_discount + v_delivery, v_first,
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

  return jsonb_build_object(
    'order_id', v_order_id,
    'number', v_number,
    'subtotal_cents', v_subtotal,
    'discount_cents', v_discount,
    'delivery_fee_cents', v_delivery,
    'total_cents', v_subtotal - v_discount + v_delivery,
    'is_first_order', v_first,
    'staff_id', v_staff,
    'attribution_source', v_source,
    'duplicate', false
  );
end;
$$;

-- Server only: never callable from the browser.
revoke execute on function public.place_order(
  jsonb, jsonb, public.payment_method, text, uuid, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.place_order(
  jsonb, jsonb, public.payment_method, text, uuid, text, text, uuid
) to service_role;
