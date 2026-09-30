-- Phase 4 part B: admin panel (/admin). Only adds triggers and functions;
-- no table or column is dropped and no data is changed.
--
-- 1. audit_row(): every admin write to the catalog, promotions, reviews,
--    settings, staff and sales tables is logged in audit_log (orders and
--    customer reassignments were already logged by their guards).
-- 2. admin_save_product(): the product editor saves a product and all its
--    parts (prices per metal, sizes, fonts, categories, photos) in one
--    transaction, as the logged-in staff member (RLS applies).
-- 3. add_order_adjustment(): gift, % discount, free delivery, extra
--    delivery fee or a note on an order; the order total follows.
-- 4. admin_sales(): sales per employee between two days (dashboard).
-- Status changes are plain updates (orders_guard checks cancel rights,
-- orders_points gives / removes the points).

-- 1. Audit log ------------------------------------------------------------------

/*
  Logs one row change: who (the logged-in staff member, null for server
  code), which table and row, and what changed ({column: [old, new]} on
  update, the whole row on insert / delete). updated_at / updated_by are
  left out; an update that changes nothing else is not logged.
*/
create function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_id text := coalesce(v_row ->> 'id', v_row ->> 'product_id', v_row ->> 'staff_id', v_row ->> 'collection_id');
  v_changes jsonb;
  k text;
begin
  if tg_op = 'UPDATE' then
    v_changes := '{}'::jsonb;
    for k in select jsonb_object_keys(v_new) loop
      if k not in ('updated_at', 'updated_by') and v_new -> k is distinct from v_old -> k then
        v_changes := v_changes || jsonb_build_object(k, jsonb_build_array(v_old -> k, v_new -> k));
      end if;
    end loop;
    if v_changes = '{}'::jsonb then
      return null;
    end if;
  else
    v_changes := v_row - 'created_at' - 'updated_at';
  end if;

  insert into public.audit_log (actor_staff_id, table_name, row_id, action, changes)
  values (
    private.current_staff_id(),
    tg_table_name,
    case when v_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_id::uuid end,
    lower(tg_op),
    v_changes
  );
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'products', 'product_materials', 'product_options', 'product_fonts', 'product_media',
    'product_categories', 'categories', 'materials', 'fonts', 'areas',
    'collections', 'collection_products', 'promotions', 'coupons', 'reviews',
    'site_settings', 'staff', 'staff_permissions', 'manual_entries',
    'order_adjustments', 'points_ledger'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function private.audit_row()',
      t || '_audit', t
    );
  end loop;
end;
$$;

-- Imports can be thousands of rows: one log line per batch instead.
create function private.audit_import_batch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor_staff_id, table_name, row_id, action, changes)
  select private.current_staff_id(), 'imported_orders', null, 'import',
         jsonb_build_object('rows', count(*), 'batch_id', min(batch_id::text), 'source', min(source))
  from new_rows;
  return null;
end;
$$;

create trigger imported_orders_audit after insert on public.imported_orders
  referencing new table as new_rows
  for each statement execute function private.audit_import_batch();

-- 2. Product editor -------------------------------------------------------------------

/*
  admin_save_product(product) -> product id
  {
    "id": uuid | null (null = new product),
    "slug", "name_en", "name_ar", "summary_en", "summary_ar",
    "description_en", "description_ar", "details_en", "details_ar",
    "status": "draft" | "active" | "archived", "style",
    "is_best_seller", "is_new", "is_featured",
    "personalization": "name" | "initial" | null, "max_length", "sample_text",
    "chain_connections": ["sides", "center"], "art": {...}, "stock_qty",
    "materials": [{"key", "price_cents", "compare_at_price_cents", "is_default"}],
    "options": [{"kind", "value", "price_modifier_cents", "is_default"}],
    "fonts": ["beirut", ...]            (first = default),
    "categories": ["name-necklaces", ...],
    "media": [{"url", "type", "alt_en", "alt_ar"}]   (first = main photo)
  }
  Security invoker: the caller's permissions (RLS) decide what is allowed.
  The parts are replaced as a whole, in one transaction.
*/
create function public.admin_save_product(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_art jsonb := coalesce(p -> 'art', '{"kind": "name", "variant": "necklace"}'::jsonb);
  v_personalization public.personalization_kind := nullif(p ->> 'personalization', '')::public.personalization_kind;
  v_connections public.chain_connection[] := coalesce(
    (select array_agg(value::public.chain_connection) from jsonb_array_elements_text(coalesce(p -> 'chain_connections', '[]'))),
    '{}'
  );
begin
  if jsonb_array_length(coalesce(p -> 'materials', '[]')) = 0 then
    raise exception 'materials_required' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(p -> 'media', '[]')) > 8 then
    raise exception 'too_many_media' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.products (
      slug, name_en, name_ar, summary_en, summary_ar, description_en, description_ar,
      details_en, details_ar, status, style, is_best_seller, is_new, is_featured,
      personalization, max_length, sample_text, chain_connections, art, stock_qty
    )
    values (
      p ->> 'slug', p ->> 'name_en', p ->> 'name_ar',
      coalesce(p ->> 'summary_en', ''), coalesce(p ->> 'summary_ar', ''),
      coalesce(p ->> 'description_en', ''), coalesce(p ->> 'description_ar', ''),
      coalesce(p ->> 'details_en', ''), coalesce(p ->> 'details_ar', ''),
      coalesce(nullif(p ->> 'status', ''), 'draft')::public.product_status,
      nullif(p ->> 'style', ''),
      coalesce((p ->> 'is_best_seller')::boolean, false),
      coalesce((p ->> 'is_new')::boolean, false),
      coalesce((p ->> 'is_featured')::boolean, false),
      v_personalization,
      case when v_personalization is null then null else coalesce((p ->> 'max_length')::smallint, 10) end,
      nullif(p ->> 'sample_text', ''),
      v_connections, v_art,
      (p ->> 'stock_qty')::integer
    )
    returning id into v_id;
  else
    update public.products set
      slug = p ->> 'slug',
      name_en = p ->> 'name_en',
      name_ar = p ->> 'name_ar',
      summary_en = coalesce(p ->> 'summary_en', ''),
      summary_ar = coalesce(p ->> 'summary_ar', ''),
      description_en = coalesce(p ->> 'description_en', ''),
      description_ar = coalesce(p ->> 'description_ar', ''),
      details_en = coalesce(p ->> 'details_en', ''),
      details_ar = coalesce(p ->> 'details_ar', ''),
      status = coalesce(nullif(p ->> 'status', ''), 'draft')::public.product_status,
      style = nullif(p ->> 'style', ''),
      is_best_seller = coalesce((p ->> 'is_best_seller')::boolean, false),
      is_new = coalesce((p ->> 'is_new')::boolean, false),
      is_featured = coalesce((p ->> 'is_featured')::boolean, false),
      personalization = v_personalization,
      max_length = case when v_personalization is null then null else coalesce((p ->> 'max_length')::smallint, 10) end,
      sample_text = nullif(p ->> 'sample_text', ''),
      chain_connections = v_connections,
      art = v_art,
      stock_qty = (p ->> 'stock_qty')::integer
    where id = v_id;
    if not found then
      raise exception 'product_not_found' using errcode = '42501';
    end if;
  end if;

  delete from public.product_materials where product_id = v_id;
  insert into public.product_materials (product_id, material_id, price_cents, compare_at_price_cents, is_default, sort_order)
  select v_id, m.id, (e.value ->> 'price_cents')::integer,
         nullif(e.value ->> 'compare_at_price_cents', '')::integer,
         coalesce((e.value ->> 'is_default')::boolean, false), e.ordinality::integer
  from jsonb_array_elements(p -> 'materials') with ordinality e
  join public.materials m on m.key = e.value ->> 'key';

  delete from public.product_options where product_id = v_id;
  insert into public.product_options (product_id, kind, value, price_modifier_cents, is_default, sort_order)
  select v_id, (e.value ->> 'kind')::public.size_kind, (e.value ->> 'value')::numeric,
         coalesce((e.value ->> 'price_modifier_cents')::integer, 0),
         coalesce((e.value ->> 'is_default')::boolean, false), e.ordinality::integer
  from jsonb_array_elements(coalesce(p -> 'options', '[]')) with ordinality e;

  delete from public.product_fonts where product_id = v_id;
  insert into public.product_fonts (product_id, font_id, sort_order)
  select v_id, f.id, e.ordinality::integer
  from jsonb_array_elements_text(coalesce(p -> 'fonts', '[]')) with ordinality e
  join public.fonts f on f.key = e.value;

  delete from public.product_categories where product_id = v_id;
  insert into public.product_categories (product_id, category_id, sort_order)
  select v_id, c.id, e.ordinality::integer
  from jsonb_array_elements_text(coalesce(p -> 'categories', '[]')) with ordinality e
  join public.categories c on c.slug = e.value;

  delete from public.product_media where product_id = v_id;
  insert into public.product_media (product_id, url, type, alt_en, alt_ar, sort_order)
  select v_id, e.value ->> 'url', coalesce(nullif(e.value ->> 'type', ''), 'image')::public.media_type,
         coalesce(e.value ->> 'alt_en', ''), coalesce(e.value ->> 'alt_ar', ''), e.ordinality::integer
  from jsonb_array_elements(coalesce(p -> 'media', '[]')) with ordinality e;

  return v_id;
end;
$$;

revoke execute on function public.admin_save_product(jsonb) from public, anon;
grant execute on function public.admin_save_product(jsonb) to authenticated;

-- 3. Order adjustments --------------------------------------------------------------

/*
  add_order_adjustment(order, type, value, note) -> adjustment id
  - gift: a free extra; value = its price in USD to take off (0 = just a note)
  - discount_percent: value % off the pieces (after coupon and points)
  - free_delivery: takes the delivery fee off (once)
  - extra_delivery: value USD added (far area, express...)
  - other: value USD, signed (+ adds, - takes off)
  The order's adjustments_cents and total_cents follow (never below 0).
  Needs orders.edit.
*/
create function public.add_order_adjustment(
  p_order_id uuid,
  p_type public.adjustment_type,
  p_value numeric default 0,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  v_amount integer;
  v_id uuid;
  v_value numeric := coalesce(p_value, 0);
begin
  if not private.has_permission('orders.edit') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if char_length(p_note) > 500 or abs(v_value) > 100000 then
    raise exception 'invalid' using errcode = '22023';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = '22023';
  end if;
  if o.status = 'cancelled' then
    raise exception 'order_cancelled' using errcode = '22023';
  end if;

  v_amount := case p_type
    when 'gift' then -round(abs(v_value) * 100)
    when 'discount_percent' then
      case when v_value <= 0 or v_value > 100 then null
      else -round((o.subtotal_cents - o.discount_cents - o.points_discount_cents) * v_value / 100) end
    when 'free_delivery' then
      case when exists (select 1 from public.order_adjustments where order_id = o.id and type = 'free_delivery')
      then null else -o.delivery_fee_cents end
    when 'extra_delivery' then round(abs(v_value) * 100)
    when 'other' then round(v_value * 100)
    else null
  end;
  if v_amount is null then
    raise exception 'invalid' using errcode = '22023';
  end if;

  insert into public.order_adjustments (order_id, type, value, amount_cents, note, created_by)
  values (o.id, p_type, v_value, v_amount, nullif(btrim(p_note), ''), private.current_staff_id())
  returning id into v_id;

  update public.orders set
    adjustments_cents = o.adjustments_cents + v_amount,
    total_cents = greatest(
      o.subtotal_cents - o.discount_cents - o.points_discount_cents + o.delivery_fee_cents
        + o.adjustments_cents + v_amount,
      0
    )
  where id = o.id;

  return v_id;
end;
$$;

revoke execute on function public.add_order_adjustment(uuid, public.adjustment_type, numeric, text) from public, anon;
grant execute on function public.add_order_adjustment(uuid, public.adjustment_type, numeric, text) to authenticated;

-- 4. Dashboard ------------------------------------------------------------------------

/*
  Sales between two days (Beirut time, inclusive): website orders (not
  cancelled) + manual entries, per employee. No profit, by design.
  Security invoker: needs sales.view (daily_sales reads orders and
  manual_entries under RLS).
*/
create function public.admin_sales(p_from date, p_to date)
returns table (staff_id uuid, orders_count bigint, sales_cents bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select d.staff_id, sum(d.orders_count)::bigint, sum(d.sales_cents)::bigint
  from public.daily_sales d
  where d.day between p_from and p_to
  group by d.staff_id;
$$;

revoke execute on function public.admin_sales(date, date) from public, anon;
grant execute on function public.admin_sales(date, date) to authenticated;
