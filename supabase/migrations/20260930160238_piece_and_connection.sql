-- Necklace or bracelet, and the chain connection, for every chain piece.
--
-- A necklace can also be ordered as a bracelet (and a bracelet as a
-- necklace): the other piece's sizes are product_options rows of the other
-- kind, with a price_modifier_cents. Chain sizes (35-60 cm) and bracelet
-- sizes (15-19 cm) never overlap, so price_item keeps finding the option by
-- its value and stores its kind on the order line.
--
-- Change: the chain connection was only read for personalized pieces. It is
-- now read for any product with chain_connections (coins, cedars too).

create or replace function private.price_item(item jsonb)
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
  end if;

  -- Any piece with chain connections (names, coins, cedars) keeps the
  -- customer's choice: one ring on top (center) or both sides.
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
