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
-- 6. The new "1500 & 250 Lira Collection" category.

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
  'lira-1500-250',
  '1500 & 250 Lira Collection',
  'مجموعة ليرة ١٥٠٠ و٢٥٠',
  'The other Lebanese coins we grew up with: the 1500 and the golden 250, made into pieces you can wear every day.',
  'الليرات اللبنانية الثانية يلي كبرنا معها: ١٥٠٠ والـ٢٥٠ الذهبية، بقطع تلبسينها كل يوم.',
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
  ('lira-1500-250', 2),
  ('bracelets', 3),
  ('rings', 4),
  ('earrings', 5),
  ('gifts', 6),
  ('mens-jewelry', 7)
) as v (slug, pos)
where c.slug = v.slug;
