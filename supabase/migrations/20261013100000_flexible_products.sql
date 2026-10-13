-- Flexible products: gifts, boxes, bouquets and earrings, not only name necklaces.
--
-- 1. products gets four yes/no switches, one per group of choices the product page asks for:
--    the metal or color, the size or chain length, the design (one ring or both sides) and the
--    name or letters to engrave. All four default to true, so every product that exists today
--    keeps asking for everything, exactly as before.
-- 2. materials gets one neutral row, "standard": the single price of a simple product (a gift box).
--    A color made in the admin (red, blue...) is also just a row of this table; those come from the admin.
-- 3. private.price_item (the server's price of one cart line) and public.admin_save_product (the admin's
--    save) are updated by patching the definition that is live right now, so nothing else about them changes.
--    A hidden group is not asked for and not priced: the cart, the quote and the order work without it.
--
-- Nothing is dropped, renamed or rewritten. Everything below runs as one batch: if any check fails,
-- the whole batch is rolled back. The last step compares the old and the new price_item on every
-- active product (every metal, every size, with and without text) and stops if a single price differs.

alter table public.products
  add column if not exists ask_material boolean not null default true,
  add column if not exists ask_size boolean not null default true,
  add column if not exists ask_connection boolean not null default true,
  add column if not exists ask_personalization boolean not null default true;

insert into public.materials (key, name_en, name_ar, tone, swatch, sort_order, is_active)
values ('standard', 'Standard', 'عادي', 'silver', '#d8d4cc', 99, true)
on conflict (key) do nothing;

-- Replaces one piece of text in a function definition, and refuses to go on if it is not there exactly once.
create function pg_temp.patch_once(src text, pat text, repl text)
returns text
language plpgsql
as $f$
begin
  if (length(src) - length(replace(src, pat, ''))) / length(pat) <> 1 then
    raise exception 'flexible_products: expected exactly one "%" in the live function', pat;
  end if;
  return replace(src, pat, repl);
end
$f$;

do $$
declare
  d text;
  n text;
begin
  -- The price of one cart line. The live definition is copied to price_item_v1 first, only to compare below.
  d := pg_get_functiondef('private.price_item(jsonb)'::regprocedure);
  execute regexp_replace(d, 'private\.price_item\(', 'private.price_item_v1(');

  n := d;
  -- A product that does not ask for a metal or color has ONE price: its default row (else its first).
  -- A product that does ask can never sell the neutral "standard" row (it is only for simple products).
  n := pg_temp.patch_once(n,
    'and m.key = item ->> ''material'' and m.is_active;',
    E'and m.is_active\n    and (not v_product.ask_material or (m.key = item ->> ''material'' and m.key <> ''standard''))\n  order by pm.is_default desc, pm.sort_order\n  limit 1;');
  -- Sizes: a hidden size adds nothing and is not required.
  n := pg_temp.patch_once(n,
    'if exists (select 1 from public.product_options where product_id = v_product.id) then',
    'if v_product.ask_size and exists (select 1 from public.product_options where product_id = v_product.id) then');
  -- Engraving: a hidden name needs no text and no font.
  n := pg_temp.patch_once(n,
    'if v_product.personalization is not null then',
    'if v_product.personalization is not null and v_product.ask_personalization then');
  -- Design (one ring or both sides): a hidden design is not chosen.
  n := pg_temp.patch_once(n,
    'if cardinality(v_product.chain_connections) > 0 then',
    'if v_product.ask_connection and cardinality(v_product.chain_connections) > 0 then');
  execute n;

  -- The admin's product save: the same four switches travel with the product.
  d := pg_get_functiondef('public.admin_save_product(jsonb)'::regprocedure);
  n := regexp_replace(d, 'free_delivery, free_gift_box(\s*)\)',
    'free_delivery, free_gift_box, ask_material, ask_size, ask_connection, ask_personalization\1)');
  n := regexp_replace(n, '(coalesce\(\(p ->> ''free_gift_box''\)::boolean, true\))(\s*)\)(\s*)returning',
    '\1, coalesce((p ->> ''ask_material'')::boolean, true), coalesce((p ->> ''ask_size'')::boolean, true), coalesce((p ->> ''ask_connection'')::boolean, true), coalesce((p ->> ''ask_personalization'')::boolean, true)\2)\3returning');
  n := regexp_replace(n, '(free_gift_box = coalesce\(\(p ->> ''free_gift_box''\)::boolean, true\))(\s*)where',
    '\1, ask_material = coalesce((p ->> ''ask_material'')::boolean, true), ask_size = coalesce((p ->> ''ask_size'')::boolean, true), ask_connection = coalesce((p ->> ''ask_connection'')::boolean, true), ask_personalization = coalesce((p ->> ''ask_personalization'')::boolean, true)\2where');
  if n = d
    or position('free_gift_box, ask_material, ask_size, ask_connection, ask_personalization' in n) = 0
    or position('ask_personalization = coalesce' in n) = 0
    or position('''ask_personalization'')::boolean, true)' in n) = 0
    or (length(n) - length(replace(n, '''ask_size''', ''))) / length('''ask_size''') <> 2 then
    raise exception 'flexible_products: admin_save_product not patched';
  end if;
  execute n;
end
$$;

-- Self-check: for every active product, every metal, every size, with and without engraving text, the new
-- price_item gives exactly what the old one gave (all switches are on today). Any difference stops everything.
do $$
declare
  r record;
  item jsonb;
  old_result jsonb;
  new_result jsonb;
  checked integer := 0;
begin
  for r in
    select p.slug, p.personalization, m.key as material, o.value as size
    from public.products p
    join public.product_materials pm on pm.product_id = p.id
    join public.materials m on m.id = pm.material_id
    left join public.product_options o on o.product_id = p.id
    where p.status = 'active'
  loop
    item := jsonb_build_object('product', r.slug, 'material', r.material, 'qty', 2);
    if r.size is not null then
      item := item || jsonb_build_object('size', r.size::text);
    end if;
    if r.personalization is not null then
      item := item || jsonb_build_object('text', 'A');
    end if;
    if r.slug = 'charm-design' then
      item := item || jsonb_build_object('charms', jsonb_build_array('heart'));
    end if;
    old_result := private.price_item_v1(item);
    new_result := private.price_item(item);
    if old_result is distinct from new_result then
      raise exception 'flexible_products: price_item changed for % (%): old % new %', r.slug, r.material, old_result, new_result;
    end if;
    checked := checked + 1;
  end loop;

  -- Unknown product, unknown metal and a bad quantity must still give the same errors.
  foreach item in array array[
    '{"product": "no-such-piece", "material": "gold"}'::jsonb,
    '{"product": "name-necklace", "material": "nothing"}'::jsonb,
    '{"product": "name-necklace", "material": "gold", "qty": 99}'::jsonb,
    '"not an object"'::jsonb
  ] loop
    if private.price_item_v1(item) is distinct from private.price_item(item) then
      raise exception 'flexible_products: price_item answers % differently', item;
    end if;
    checked := checked + 1;
  end loop;
  raise notice 'flexible_products: % price checks, old and new price_item agree', checked;
end
$$;

drop function private.price_item_v1(jsonb);
