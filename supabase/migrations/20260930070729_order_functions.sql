-- LIVRE schema 5/5: server-side order logic (B3). Checkout (Phase 4) calls
-- place_order from a server action with the secret key; the browser never
-- sends prices, only what the customer chose.

-- Active employees for the optional "Who helped you?" checkout field.
create function public.list_helpers()
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.name from public.staff s where s.is_active order by s.name;
$$;
revoke execute on function public.list_helpers() from public;
grant execute on function public.list_helpers() to anon, authenticated, service_role;

/*
  place_order(customer, items, ...) -> {order_id, number, totals, staff_id, ...}

  customer: {"name": "Maya", "phone": "03 123 456", "area": "beirut",
             "address": "...", "marketing_opt_in": true}
  items:    [{"product": "cursive-name-necklace", "material": "gold18",
              "qty": 1, "text": "Maya", "font": "beirut", "size": 45,
              "connection": "sides", "gift_box": false}]

  - Finds or creates the customer by phone (E.164, +961 by default).
  - Recalculates every price from the catalog: material price + size
    modifier + gift box. Rejects inactive products and invalid choices.
  - Coupon: active, in its dates, under max uses, above min order.
  - Delivery: area fee or the flat fee; free over the threshold, on the
    first order (by phone, old imported orders included) or with a
    free-delivery code.
  - Attribution priority (brief §5): employee code > "who helped you" >
    the customer's saved employee > ref link. The customer's first
    employee is saved forever.
*/
create function public.place_order(
  p_customer jsonb,
  p_items jsonb,
  p_payment_method public.payment_method default 'cod',
  p_coupon_code text default null,
  p_helper_staff_id uuid default null,
  p_ref_code text default null,
  p_notes text default null
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
  v_area public.areas;
  v_customer public.customers;
  v_first boolean;
  item jsonb;
  v_lines jsonb := '[]';
  v_product public.products;
  v_material record;
  v_option public.product_options;
  v_font public.fonts;
  v_text text;
  v_connection public.chain_connection;
  v_gift boolean;
  v_qty integer;
  v_unit integer;
  v_subtotal integer := 0;
  v_coupon public.coupons;
  v_discount integer := 0;
  v_delivery integer;
  v_staff uuid;
  v_source public.attribution_source;
  v_order_id uuid;
  v_number bigint;
begin
  select * into settings from public.site_settings where id = 1;

  if v_name = '' or char_length(v_name) > 100 then
    raise exception 'name_required' using errcode = '22023';
  end if;
  if v_phone is null or v_phone !~ '^\+[1-9][0-9]{6,14}$' then
    raise exception 'phone_invalid' using errcode = '22023';
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

  -- Customer, matched by phone.
  insert into public.customers as c (name, phone, area_id, address, marketing_opt_in)
  values (
    v_name,
    v_phone,
    v_area.id,
    nullif(btrim(p_customer ->> 'address'), ''),
    coalesce((p_customer ->> 'marketing_opt_in')::boolean, false)
  )
  on conflict (phone) do update set
    name = excluded.name,
    area_id = coalesce(excluded.area_id, c.area_id),
    address = coalesce(excluded.address, c.address),
    marketing_opt_in = c.marketing_opt_in or excluded.marketing_opt_in
  returning * into v_customer;

  v_first := not exists (
      select 1 from public.orders o
      where o.customer_id = v_customer.id and o.status <> 'cancelled'
    )
    and not exists (select 1 from public.imported_orders i where i.phone = v_phone);

  -- Lines, priced from the database.
  for item in select value from jsonb_array_elements(p_items) loop
    select * into v_product from public.products
    where slug = item ->> 'product' and status = 'active';
    if not found then
      raise exception 'product_unavailable: %', item ->> 'product' using errcode = '22023';
    end if;

    select pm.price_cents, m.id, m.name_en into v_material
    from public.product_materials pm
    join public.materials m on m.id = pm.material_id
    where pm.product_id = v_product.id and m.key = item ->> 'material' and m.is_active;
    if not found then
      raise exception 'material_unavailable' using errcode = '22023';
    end if;
    v_unit := v_material.price_cents;

    v_option := null;
    if exists (select 1 from public.product_options where product_id = v_product.id) then
      if nullif(item ->> 'size', '') is not null then
        select * into v_option from public.product_options
        where product_id = v_product.id and value = (item ->> 'size')::numeric;
      else
        select * into v_option from public.product_options
        where product_id = v_product.id and is_default;
      end if;
      if v_option.id is null then
        raise exception 'size_unavailable' using errcode = '22023';
      end if;
      v_unit := v_unit + v_option.price_modifier_cents;
    end if;

    v_text := null;
    v_font := null;
    v_connection := null;
    if v_product.personalization is not null then
      v_text := btrim(coalesce(item ->> 'text', ''));
      if v_text = '' or char_length(v_text) > v_product.max_length then
        raise exception 'text_invalid' using errcode = '22023';
      end if;
      select f.* into v_font
      from public.product_fonts pf
      join public.fonts f on f.id = pf.font_id
      where pf.product_id = v_product.id
        and (nullif(item ->> 'font', '') is null or f.key = item ->> 'font')
      order by pf.sort_order
      limit 1;
      if not found then
        raise exception 'font_unavailable' using errcode = '22023';
      end if;
      if cardinality(v_product.chain_connections) > 0 then
        v_connection := coalesce(
          (nullif(item ->> 'connection', ''))::public.chain_connection,
          v_product.chain_connections[1]
        );
        if not (v_connection = any (v_product.chain_connections)) then
          raise exception 'connection_unavailable' using errcode = '22023';
        end if;
      end if;
    end if;

    v_gift := coalesce((item ->> 'gift_box')::boolean, false);
    if v_gift then
      v_unit := v_unit + settings.gift_box_price_cents;
    end if;
    v_qty := coalesce((item ->> 'qty')::integer, 1);
    if v_qty not between 1 and 20 then
      raise exception 'qty_invalid' using errcode = '22023';
    end if;

    v_subtotal := v_subtotal + v_unit * v_qty;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id,
      'product_slug', v_product.slug,
      'product_name', v_product.name_en,
      'material_id', v_material.id,
      'material_name', v_material.name_en,
      'font_id', v_font.id,
      'font_name', v_font.name_en,
      'custom_text', v_text,
      'chain_connection', v_connection,
      'size_kind', v_option.kind,
      'size_value', v_option.value,
      'gift_box', v_gift,
      'unit_price_cents', v_unit,
      'qty', v_qty
    );
  end loop;

  -- Coupon.
  if nullif(btrim(p_coupon_code), '') is not null then
    select * into v_coupon from public.coupons c
    where c.code = upper(btrim(p_coupon_code))
      and c.is_active
      and (c.starts_at is null or c.starts_at <= now())
      and (c.ends_at is null or c.ends_at > now())
      and (c.max_uses is null or c.uses_count < c.max_uses)
    for update;
    if not found then
      raise exception 'coupon_invalid' using errcode = '22023';
    end if;
    if v_subtotal < v_coupon.min_order_cents then
      raise exception 'coupon_min_order' using errcode = '22023';
    end if;
    v_discount := case v_coupon.type
      when 'percent' then round(v_subtotal * v_coupon.value / 100.0)::integer
      when 'fixed' then least(v_coupon.value, v_subtotal)
      else 0
    end;
    update public.coupons set uses_count = uses_count + 1 where id = v_coupon.id;
  end if;

  -- Delivery.
  v_delivery := coalesce(v_area.delivery_fee_cents, settings.delivery_fee_cents);
  if v_coupon.type = 'free_delivery'
     or (settings.first_order_free_delivery and v_first)
     or v_subtotal - v_discount >= settings.free_shipping_threshold_cents then
    v_delivery := 0;
  end if;

  -- Attribution.
  if v_coupon.staff_id is not null then
    v_staff := v_coupon.staff_id;
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
    customer_name, phone, area_id, area_name, address, notes
  )
  values (
    v_customer.id, v_staff, v_source, p_payment_method, v_coupon.id, v_coupon.code,
    v_subtotal, v_discount, v_delivery, v_subtotal - v_discount + v_delivery, v_first,
    v_name, v_phone, v_area.id, v_area.name_en,
    nullif(btrim(p_customer ->> 'address'), ''), nullif(btrim(p_notes), '')
  )
  returning id, number into v_order_id, v_number;

  insert into public.order_items (
    order_id, product_id, product_slug, product_name, material_id, material_name,
    font_id, font_name, custom_text, chain_connection, size_kind, size_value,
    gift_box, unit_price_cents, qty
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
    (l ->> 'gift_box')::boolean,
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
    'attribution_source', v_source
  );
end;
$$;

-- Server only: never callable from the browser.
revoke execute on function public.place_order(
  jsonb, jsonb, public.payment_method, text, uuid, text, text
) from public, anon, authenticated;
grant execute on function public.place_order(
  jsonb, jsonb, public.payment_method, text, uuid, text, text
) to service_role;
