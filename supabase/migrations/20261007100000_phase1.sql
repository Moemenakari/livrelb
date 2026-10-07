-- Phase 1 (storefront), ONE file. It joins what was applied in three runs on 2026-10-07 (home page controls,
-- home section items, then charms / menu / personalization / payment columns). Already applied on the live
-- database: do not run it again. The payment columns at the end (orders.deposit_cents, payment_*, site_settings.
-- transfer_*, pay_*, deposit_percent) are no longer used by the shop; they can be dropped in the Phase 3 cleanup.

-- Phase 1, section 1: the homepage is controlled from the admin.
-- Only adds columns, tables and rows; nothing is dropped or changed.
--
-- 1. categories: show_on_home + home_sort decide the "Shop by style" tiles
--    (the tile photo is the existing image_url).
-- 2. products: best_seller_sort orders the Best sellers grid.
-- 3. home_sections: one row per homepage section (title, text, visibility).
-- 4. home_section_products: the products picked by hand for a section, in
--    order (the Lira Collection section).
-- 5. site_settings.deposit_percent: the part of a "cash on delivery" order
--    paid now by transfer (section 6 of the storefront work); the homepage
--    already mentions it.
-- 6. The new "500 & 250 Lira Collection" category.

-- 1. Category tiles ---------------------------------------------------------

alter table public.categories
  add column show_on_home boolean not null default false,
  add column home_sort integer not null default 0;

-- 2. Best sellers order -----------------------------------------------------

alter table public.products
  add column best_seller_sort integer not null default 0;

-- 3. Sections ----------------------------------------------------------------

create table public.home_sections (
  key text primary key check (key ~ '^[a-z_]+$'),
  -- Empty = the default text of the language files.
  title_en text not null default '',
  title_ar text not null default '',
  subtitle_en text not null default '',
  subtitle_ar text not null default '',
  -- A page of this site for the section's button (empty = its default).
  cta_href text not null default '' check (cta_href = '' or cta_href ~ '^/[A-Za-z0-9/_?=&.-]*$'),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger home_sections_updated_at before update on public.home_sections
  for each row execute function private.set_updated_at();

-- 4. Products picked by hand ---------------------------------------------------

create table public.home_section_products (
  section_key text not null references public.home_sections (key) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (section_key, product_id)
);
create index home_section_products_product_idx on public.home_section_products (product_id);

-- Row Level Security: everyone reads (the products themselves are still
-- filtered by their own policy); the team with "collections.manage" writes.
alter table public.home_sections enable row level security;
alter table public.home_section_products enable row level security;

create policy "public reads home sections" on public.home_sections
  for select to anon, authenticated using (true);
create policy "staff manage home sections (insert)" on public.home_sections
  for insert to authenticated with check ((select private.has_permission('collections.manage')));
create policy "staff manage home sections (update)" on public.home_sections
  for update to authenticated
  using ((select private.has_permission('collections.manage')))
  with check ((select private.has_permission('collections.manage')));
create policy "staff manage home sections (delete)" on public.home_sections
  for delete to authenticated using ((select private.has_permission('collections.manage')));

create policy "public reads home section products" on public.home_section_products
  for select to anon, authenticated using (true);
create policy "staff manage home section products (insert)" on public.home_section_products
  for insert to authenticated with check ((select private.has_permission('collections.manage')));
create policy "staff manage home section products (update)" on public.home_section_products
  for update to authenticated
  using ((select private.has_permission('collections.manage')))
  with check ((select private.has_permission('collections.manage')));
create policy "staff manage home section products (delete)" on public.home_section_products
  for delete to authenticated using ((select private.has_permission('collections.manage')));

create trigger home_sections_audit after insert or update or delete on public.home_sections
  for each row execute function private.audit_row();
create trigger home_section_products_audit after insert or update or delete on public.home_section_products
  for each row execute function private.audit_row();

insert into public.home_sections (key) values
  ('lira'), ('shop_by_style'), ('best_sellers'), ('steps'), ('new_arrivals'), ('try_picture'), ('create')
on conflict (key) do nothing;

-- 5. Deposit --------------------------------------------------------------------

alter table public.site_settings
  add column deposit_percent smallint not null default 50
  check (deposit_percent between 1 and 100);

-- 6. The other Lira coins, between the Lira Collection and Bracelets ----------

insert into public.categories
  (slug, name_en, name_ar, description_en, description_ar, styles, art, sort_order)
values (
  'lira-500-250',
  '500 & 250 Lira Collection',
  'مجموعة ليرة ٥٠٠ و٢٥٠',
  'The other Lebanese coins we grew up with: the 500 and the golden 250, made into pieces you can wear every day.',
  'الليرات اللبنانية الثانية يلي كبرنا معها: ٥٠٠ والـ٢٥٠ الذهبية، بقطع تلبسينها كل يوم.',
  '{}'::text[],
  '{"kind":"coin","variant":"necklace","coin":250}'::jsonb,
  10
)
on conflict (slug) do nothing;

-- The tiles of "Shop by style" as they are today, plus the new category.
update public.categories c set show_on_home = true, home_sort = v.pos
from (values
  ('name-necklaces', 0),
  ('lira-collection', 1),
  ('lira-500-250', 2),
  ('bracelets', 3),
  ('rings', 4),
  ('earrings', 5),
  ('gifts', 6),
  ('mens-jewelry', 7)
) as v (slug, pos)
where c.slug = v.slug;


-- Phase 1, section 1 (follow-up): the texts of the items inside a homepage
-- section, starting with the three "How it works" steps. Only adds a table;
-- nothing is dropped or changed. Needs 20261007100000_home_page_controls.sql
-- (home_sections) first.
--
-- One row per item: section_key + position (1, 2, 3). An empty text means the
-- default text of the language files, so a missing row changes nothing.

create table public.home_section_items (
  section_key text not null references public.home_sections (key) on delete cascade,
  position smallint not null check (position between 1 and 12),
  title_en text not null default '',
  title_ar text not null default '',
  text_en text not null default '',
  text_ar text not null default '',
  updated_at timestamptz not null default now(),
  primary key (section_key, position)
);

create trigger home_section_items_updated_at before update on public.home_section_items
  for each row execute function private.set_updated_at();

alter table public.home_section_items enable row level security;

create policy "public reads home section items" on public.home_section_items
  for select to anon, authenticated using (true);
create policy "staff manage home section items (insert)" on public.home_section_items
  for insert to authenticated with check ((select private.has_permission('collections.manage')));
create policy "staff manage home section items (update)" on public.home_section_items
  for update to authenticated
  using ((select private.has_permission('collections.manage')))
  with check ((select private.has_permission('collections.manage')));
create policy "staff manage home section items (delete)" on public.home_section_items
  for delete to authenticated using ((select private.has_permission('collections.manage')));

create trigger home_section_items_audit after insert or update or delete on public.home_section_items
  for each row execute function private.audit_row();


-- Phase 1 (storefront): EVERYTHING left in ONE file. Run it once, at the end of the
-- work, after 20261007100000 and 20261007110000 (already applied).
--
-- It only ADDS columns, tables and rows. The only existing data it touches (all
-- of it numbers the owner can change again in the admin):
--   * the price of one charm goes from $13 to $9.50 (site_settings.charm_price_cents);
--   * letter pieces take up to 2 characters instead of 1 (to carry a number);
--   * delivery: the shop fee $4 becomes $5, Tripoli $2 (only where nothing was set).
-- The storefront and the admin work without it (they fall back to the previous
-- behaviour), so there is no hurry.
--
-- Sections, in order (each part below says which section it belongs to):
--   2.   Menu order.
--   3.   Charms (pricing, import columns, the charm-design product).
--   4.   Personalization (letter, number, zodiac sign) and two more letter pieces.
--   5-6. Account and payment (deposit, transfer, receipts), delivery fees.

-- 2. Menu order -----------------------------------------------------------------
--
-- categories.nav_sort: place of the category in the menu (header and phone
-- drawer), smaller first. site_settings.charms_nav_sort: place of the Charms
-- page, which is a page, not a category, so it has its own number.

alter table public.categories
  add column nav_sort integer not null default 1000;

alter table public.site_settings
  add column charms_nav_sort integer not null default 20;

-- The menu as it is agreed: Name Necklaces, Charms, Necklaces, Lira Collection,
-- 500 & 250 Lira, Bracelets, Men's Jewelry, Rings, Earrings, Gifts, Best Sellers, New.
update public.categories c set nav_sort = v.pos
from (values
  ('name-necklaces', 10),
  ('necklaces', 30),
  ('lira-collection', 40),
  ('lira-500-250', 50),
  ('bracelets', 60),
  ('mens-jewelry', 70),
  ('rings', 80),
  ('earrings', 90),
  ('gifts', 100),
  ('bestsellers', 110),
  ('new', 120)
) as v (slug, pos)
where c.slug = v.slug;

update public.site_settings set charms_nav_sort = 20 where id = 1;

-- 3. Charms ---------------------------------------------------------------------
--
-- Pricing (all editable in the admin): the base chain is the price of the
-- product "charm-design" (Products), each charm is site_settings.charm_price_cents
-- (a charm of the stock list can have its own price), and the most charms on one
-- chain is site_settings.charm_max. The design goes to the cart like any piece
-- and is priced again here, never taken from the browser.

alter table public.site_settings
  add column charm_max smallint not null default 12 check (charm_max between 1 and 30);

-- One charm = $9.50 (it was $13). The owner changes it in Settings.
alter table public.site_settings alter column charm_price_cents set default 950;
update public.site_settings set charm_price_cents = 950 where id = 1;

-- The imported charm photos (transparent PNG, file name family_metal_code.png):
-- the family ("charms" or "turkish"), the metal and the code come from the name.
alter table public.charm_items
  add column family text not null default 'turkish' check (family in ('charms', 'turkish')),
  add column metal text check (metal in ('gold', 'silver')),
  add column code text check (code ~ '^[a-z0-9-]{1,60}$');
create unique index charm_items_import_key on public.charm_items (family, metal, code) where code is not null;

-- The product that carries a charm design in the cart: the chain, in gold or
-- silver, as a necklace (chain sizes) or a bracelet (bracelet sizes).
insert into public.products (slug, name_en, name_ar, summary_en, summary_ar, status, art, sort_order)
values (
  'charm-design',
  'Charm necklace or bracelet',
  'قلادة أو سوار تشارمز',
  'Your own charms on a fine chain.',
  'التشارمز التي تختارينها على سلسلة ناعمة.',
  'active',
  '{"kind":"cedar"}'::jsonb,
  9999
)
on conflict (slug) do nothing;

insert into public.product_materials (product_id, material_id, price_cents, is_default, sort_order)
select p.id, m.id, 1400, m.key = 'gold', case m.key when 'gold' then 0 else 1 end
from public.products p
join public.materials m on m.key in ('gold', 'silver')
where p.slug = 'charm-design'
on conflict do nothing;

insert into public.product_options (product_id, kind, value, price_modifier_cents, is_default, sort_order)
select p.id, v.kind::public.size_kind, v.value, 0, v.is_default, v.sort
from public.products p
cross join (values
  ('chain', 40, false, 0),
  ('chain', 45, true, 1),
  ('chain', 50, false, 2),
  ('bracelet', 15, false, 100),
  ('bracelet', 16, false, 101),
  ('bracelet', 17, false, 102),
  ('bracelet', 18, false, 103),
  ('bracelet', 19, false, 104)
) as v (kind, value, is_default, sort)
where p.slug = 'charm-design'
  and not exists (select 1 from public.product_options o where o.product_id = p.id);

-- price_item (pricing of one cart line): the same as before, plus the charms of
-- a charm design. unit price = chain + every charm; the charms' names are kept
-- on the order line (custom_text) so the team sees what to make.
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
  v_charm_unit integer;
  v_charm_max integer;
  v_charm public.charm_items;
  v_key text;
  v_count integer := 0;
  v_names text[] := '{}';
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

  -- A charm design: the chain above plus each charm. A drawn shape costs the
  -- charm price; a charm of the stock list costs its own price, else the same.
  if v_product.slug = 'charm-design' then
    if jsonb_typeof(item -> 'charms') is distinct from 'array' then
      return jsonb_build_object('error', 'charms_invalid');
    end if;
    select charm_price_cents, charm_max into v_charm_unit, v_charm_max
    from public.site_settings where id = 1;
    for v_key in select jsonb_array_elements_text(item -> 'charms') loop
      v_count := v_count + 1;
      if v_count > v_charm_max then
        return jsonb_build_object('error', 'charms_invalid');
      end if;
      if v_key ~ '^stock:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        select * into v_charm from public.charm_items
        where id = substr(v_key, 7)::uuid and is_active and in_stock;
        if not found then
          return jsonb_build_object('error', 'charms_invalid');
        end if;
        v_unit := v_unit + coalesce(v_charm.price_cents, v_charm_unit);
        v_names := v_names || v_charm.name_en;
      elsif v_key ~ '^[a-z0-9-]{1,40}$' then
        v_unit := v_unit + v_charm_unit;
        v_names := v_names || v_key;
      else
        return jsonb_build_object('error', 'charms_invalid');
      end if;
    end loop;
    if v_count = 0 then
      return jsonb_build_object('error', 'charms_invalid');
    end if;
    v_text := left(array_to_string(v_names, ', '), 500);
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

revoke execute on function private.price_item(jsonb) from public, anon, authenticated;

-- 4. Personalization: letter, number or zodiac sign ---------------------------------
--
-- A letter piece can also carry a number (two digits, e.g. a birth day), so its
-- most characters go from 1 to 2. The customer picks the kind on the product page
-- (name, letter, number, zodiac sign); the order keeps the text only.
update public.products set max_length = 2 where personalization = 'initial' and max_length = 1;

-- Two more letter pieces so Necklaces, Rings and Bracelets each have one:
-- an initial bracelet and a zodiac necklace. They copy the metals, sizes and fonts
-- of the pieces they are based on, so the prices stay editable in Products.
insert into public.products
  (slug, name_en, name_ar, summary_en, summary_ar, description_en, description_ar,
   details_en, details_ar, status, style, personalization, max_length, sample_text,
   chain_connections, art, sort_order)
select
  'initial-bracelet', 'Initial Bracelet', 'سوار بحرف',
  'Your letter, number or zodiac sign on a fine bracelet.',
  'حرفكِ أو رقمكِ أو برجكِ على سوار ناعم.',
  'A single letter, a number or your zodiac sign, cut in metal and worn on a fine bracelet. Made to order in Lebanon and checked by hand.',
  'حرف واحد أو رقم أو برجكِ، مقصوص بالمعدن ومعلّق على سوار ناعم. يُصنع حسب الطلب في لبنان ويُفحص يدوياً.',
  b.details_en, b.details_ar, 'active', 'initial', 'initial', 2, 'A',
  n.chain_connections, '{"kind":"name","variant":"bracelet"}'::jsonb, n.sort_order + 1
from public.products n, public.products b
where n.slug = 'initial-necklace' and b.slug = 'name-bracelet'
on conflict (slug) do nothing;

insert into public.products
  (slug, name_en, name_ar, summary_en, summary_ar, description_en, description_ar,
   details_en, details_ar, status, style, personalization, max_length, sample_text,
   chain_connections, art, sort_order)
select
  'zodiac-necklace', 'Zodiac Necklace', 'قلادة البرج',
  'Your zodiac sign in metal, on a fine chain.',
  'برجكِ بالمعدن على سلسلة ناعمة.',
  'Choose your zodiac sign (or a letter or number) and we cut it in metal on a fine chain. Made to order in Lebanon and checked by hand.',
  'اختاري برجكِ (أو حرفاً أو رقماً) ونقصّه بالمعدن على سلسلة ناعمة. يُصنع حسب الطلب في لبنان ويُفحص يدوياً.',
  n.details_en, n.details_ar, 'active', 'initial', 'initial', 2, '♌',
  n.chain_connections, n.art, n.sort_order + 2
from public.products n
where n.slug = 'initial-necklace'
on conflict (slug) do nothing;

insert into public.product_materials (product_id, material_id, price_cents, compare_at_price_cents, is_default, sort_order)
select np.id, pm.material_id, pm.price_cents, pm.compare_at_price_cents, pm.is_default, pm.sort_order
from (values ('initial-bracelet', 'initial-necklace'), ('zodiac-necklace', 'initial-necklace')) as v (new_slug, src_slug)
join public.products np on np.slug = v.new_slug
join public.products sp on sp.slug = v.src_slug
join public.product_materials pm on pm.product_id = sp.id
on conflict do nothing;

insert into public.product_options (product_id, kind, value, price_modifier_cents, is_default, sort_order)
select np.id, o.kind, o.value, o.price_modifier_cents, o.is_default, o.sort_order
from (values ('initial-bracelet', 'name-bracelet'), ('zodiac-necklace', 'initial-necklace')) as v (new_slug, src_slug)
join public.products np on np.slug = v.new_slug
join public.products sp on sp.slug = v.src_slug
join public.product_options o on o.product_id = sp.id
where not exists (select 1 from public.product_options x where x.product_id = np.id);

insert into public.product_fonts (product_id, font_id, sort_order)
select np.id, f.font_id, f.sort_order
from (values ('initial-bracelet'), ('zodiac-necklace')) as v (new_slug)
join public.products np on np.slug = v.new_slug
join public.products sp on sp.slug = 'initial-necklace'
join public.product_fonts f on f.product_id = sp.id
on conflict do nothing;

insert into public.product_categories (product_id, category_id, sort_order)
select p.id, c.id, v.sort
from (values
  ('initial-bracelet', 'bracelets', 90),
  ('initial-bracelet', 'gifts', 90),
  ('zodiac-necklace', 'necklaces', 90),
  ('zodiac-necklace', 'gifts', 90)
) as v (product_slug, category_slug, sort)
join public.products p on p.slug = v.product_slug
join public.categories c on c.slug = v.category_slug
on conflict do nothing;

-- 5. Account (checkout needs a login) and 6. Payment ----------------------------------
--
-- Plain cash on delivery is gone (we lost orders to fake ones). A customer pays:
--   a) all of it by a Whish / OMT / Suyool transfer to our number (payment_method
--      "whish"), or
--   b) a deposit now by transfer (deposit_percent, default 50) and the rest in cash
--      on delivery (payment_method "cod", which now always carries a deposit), or
--   c) orders on WhatsApp (no order is created).
-- The order starts "pending" (awaiting payment). She taps "I sent the transfer"
-- (optionally with a screenshot of the receipt); staff confirm the payment in the
-- admin and the order becomes "confirmed". Card stays as it is (off).

alter table public.orders
  add column deposit_cents integer not null default 0 check (deposit_cents >= 0),
  add column payment_reported_at timestamptz,
  add column payment_proof_url text check (payment_proof_url is null or payment_proof_url ~ '^https://'),
  add column payment_confirmed_at timestamptz,
  add column payment_confirmed_by uuid references public.staff (id) on delete set null;
create index orders_payment_confirmed_by_idx on public.orders (payment_confirmed_by);

alter table public.site_settings
  -- The number she sends the money to (Whish, OMT and Suyool), shown after she orders.
  add column transfer_number text not null default '',
  add column transfer_name text not null default '',
  add column pay_transfer_enabled boolean not null default true,
  add column pay_deposit_enabled boolean not null default true,
  add column pay_whatsapp_enabled boolean not null default true,
  -- Checkout needs a login (Google) when Google sign-in is on in Supabase.
  add column checkout_requires_login boolean not null default true;

-- We keep her email (Google), to know the real person.
alter table public.customers add column email text;

-- Delivery: Tripoli $2, the rest of Lebanon $5, added at the end of the invoice.
-- Only where the owner has not set anything else (the old shop default was $4).
alter table public.site_settings alter column delivery_fee_cents set default 500;
update public.site_settings set delivery_fee_cents = 500 where id = 1 and delivery_fee_cents = 400;
update public.areas set delivery_fee_cents = 200 where slug = 'tripoli' and delivery_fee_cents is null;
