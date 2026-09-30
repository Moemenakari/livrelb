-- LIVRE schema 2/5: catalog, content and settings (brief §7).

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_en text not null,
  name_ar text not null,
  -- Shorter navbar label ("New"), when different from the name.
  nav_name_en text,
  nav_name_ar text,
  description_en text not null default '',
  description_ar text not null default '',
  parent_id uuid references public.categories (id) on delete set null,
  -- 'bestsellers' / 'new' list products by flag instead of by link.
  rule text check (rule in ('bestsellers', 'new')),
  -- Round style thumbnails on the category page (cursive, arabic...).
  styles text[] not null default '{}',
  image_url text,
  -- Drawn tile until a photo exists: {"kind": "name", "variant": "necklace"}.
  art jsonb,
  art_sample text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index categories_parent_idx on public.categories (parent_id);

-- The metals. Prices are per product (product_materials).
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-zA-Z0-9]+$'),
  name_en text not null,
  name_ar text not null,
  tone public.metal_tone not null,
  swatch text not null check (swatch ~ '^#[0-9a-fA-F]{6}$'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Our own font names (Beirut, Byblos, Batroun). font_family is the font
-- file behind the name and never shown to customers.
create table public.fonts (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9-]+$'),
  name_en text not null,
  name_ar text not null,
  font_family text not null,
  font_file_url text,
  preview_image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_en text not null,
  name_ar text not null,
  summary_en text not null default '',
  summary_ar text not null default '',
  description_en text not null default '',
  description_ar text not null default '',
  -- "Size & Materials" tab.
  details_en text not null default '',
  details_ar text not null default '',
  status public.product_status not null default 'draft',
  -- Category-page style group (cursive, arabic, bold...).
  style text,
  is_featured boolean not null default false,
  is_best_seller boolean not null default false,
  is_new boolean not null default false,
  -- null = not personalizable.
  personalization public.personalization_kind,
  is_personalizable boolean generated always as (personalization is not null) stored,
  max_length smallint check (max_length between 1 and 20),
  -- Name drawn on the card until photos exist.
  sample_text text,
  -- Chain connection choices offered (both sides / center).
  chain_connections public.chain_connection[] not null default '{}',
  -- Drawn product art until photos exist.
  art jsonb not null,
  sort_order integer not null default 0,
  created_by uuid references public.staff (id) on delete set null,
  updated_by uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((personalization is null) = (max_length is null))
);
create index products_status_idx on public.products (status, sort_order);

-- Which metals a product comes in, each with its own price.
create table public.product_materials (
  product_id uuid not null references public.products (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete restrict,
  price_cents integer not null check (price_cents > 0),
  compare_at_price_cents integer,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  primary key (product_id, material_id),
  check (compare_at_price_cents is null or compare_at_price_cents > price_cents)
);
create unique index product_materials_one_default
  on public.product_materials (product_id) where is_default;
create index product_materials_material_idx on public.product_materials (material_id);

-- Sizes: chain length (cm), bracelet length (cm) or ring size (US).
create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  kind public.size_kind not null,
  value numeric(5, 1) not null check (value > 0),
  price_modifier_cents integer not null default 0,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  unique (product_id, kind, value)
);
create unique index product_options_one_default
  on public.product_options (product_id) where is_default;

create table public.product_fonts (
  product_id uuid not null references public.products (id) on delete cascade,
  font_id uuid not null references public.fonts (id) on delete restrict,
  sort_order integer not null default 0,
  primary key (product_id, font_id)
);
create index product_fonts_font_idx on public.product_fonts (font_id);

-- Photos and videos. Files live on Cloudflare R2, only URLs here.
create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  type public.media_type not null default 'image',
  alt_en text not null default '',
  alt_ar text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_media_product_idx on public.product_media (product_id, sort_order);

create table public.product_categories (
  product_id uuid not null references public.products (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (product_id, category_id)
);
create index product_categories_category_idx on public.product_categories (category_id);

-- Delivery areas. A null fee uses the flat fee from site_settings.
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_en text not null,
  name_ar text not null,
  delivery_fee_cents integer check (delivery_fee_cents >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Special pages: free delivery, gifts, seasons (brief §8.3b).
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title_en text not null,
  title_ar text not null,
  description_en text not null default '',
  description_ar text not null default '',
  banner_url text,
  coupon_code text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.staff (id) on delete set null,
  updated_by uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.collection_products (
  collection_id uuid not null references public.collections (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (collection_id, product_id)
);
create index collection_products_product_idx on public.collection_products (product_id);

-- Promo bar, hero headline and countdown (brief §8.1).
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  placement text not null check (placement in ('promo_bar', 'hero')),
  headline_en text,
  headline_ar text,
  code text,
  percent integer check (percent between 1 and 100),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.staff (id) on delete set null,
  updated_by uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

-- Reviews from the website, Instagram or WhatsApp, entered by staff.
-- product_id null = a review of the store. is_sample rows are placeholders
-- shown in development only; the public only ever sees approved,
-- non-sample reviews.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products (id) on delete set null,
  customer_name text not null,
  city text,
  city_ar text,
  rating smallint not null check (rating between 1 and 5),
  -- In the language the customer wrote; text_ar is an optional translation.
  text text not null,
  text_ar text,
  photo_url text,
  source public.review_source not null default 'website',
  review_date date not null default current_date,
  is_approved boolean not null default false,
  is_sample boolean not null default false,
  created_by uuid references public.staff (id) on delete set null,
  updated_by uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reviews_product_idx on public.reviews (product_id) where is_approved;

-- One row of public shop settings (brief §7 site_settings).
create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  delivery_fee_cents integer not null default 400 check (delivery_fee_cents >= 0),
  free_shipping_threshold_cents integer not null default 5000,
  first_order_free_delivery boolean not null default true,
  gift_box_price_cents integer not null default 500,
  delivery_days_min smallint not null default 2,
  delivery_days_max smallint not null default 7,
  shipping_info_en text not null default '',
  shipping_info_ar text not null default '',
  whatsapp_number text not null default '',
  instagram_url text not null default '',
  -- Announcement line: [{"en": "...", "ar": "..."}]
  announcements jsonb not null default '[]',
  updated_by uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'materials', 'fonts', 'products', 'areas', 'collections',
    'promotions', 'reviews', 'site_settings'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.set_updated_at()',
      t || '_updated_at', t
    );
  end loop;
  foreach t in array array['products', 'collections', 'promotions', 'reviews'] loop
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function private.stamp_actor()',
      t || '_actor', t
    );
  end loop;
end;
$$;

create trigger site_settings_actor before update on public.site_settings
  for each row execute function private.stamp_actor();
