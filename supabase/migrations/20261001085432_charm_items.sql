-- Charms page: the Turkish charms in stock (added by staff, with a photo),
-- the price of one charm (Settings) and the estimated total of a request.
-- Additive only.

alter table public.site_settings
  add column charm_price_cents integer not null default 1300 check (charm_price_cents >= 0);

alter table public.charm_requests
  add column total_cents integer check (total_cents is null or total_cents >= 0);

create table public.charm_items (
  id uuid primary key default gen_random_uuid(),
  name_en text not null check (char_length(name_en) between 1 and 80),
  name_ar text not null check (char_length(name_ar) between 1 and 80),
  image_url text not null check (image_url ~ '^https://'),
  -- null = the default price of one charm (site_settings.charm_price_cents).
  price_cents integer check (price_cents is null or price_cents >= 0),
  in_stock boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.staff (id) on delete set null,
  updated_by uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index charm_items_created_by_idx on public.charm_items (created_by);
create index charm_items_updated_by_idx on public.charm_items (updated_by);
create index charm_items_active_idx on public.charm_items (is_active, sort_order);

create trigger charm_items_updated_at before update on public.charm_items
  for each row execute function private.set_updated_at();
create trigger charm_items_actor before insert or update on public.charm_items
  for each row execute function private.stamp_actor();

alter table public.charm_items enable row level security;
create policy "anyone sees active charms" on public.charm_items
  for select to anon, authenticated
  using (is_active or (select private.has_permission('products.edit')));
create policy "staff add charms" on public.charm_items
  for insert to authenticated with check ((select private.has_permission('products.edit')));
create policy "staff edit charms" on public.charm_items
  for update to authenticated
  using ((select private.has_permission('products.edit')))
  with check ((select private.has_permission('products.edit')));
create policy "staff delete charms" on public.charm_items
  for delete to authenticated using ((select private.has_permission('products.edit')));
grant select on public.charm_items to anon;
grant select, insert, update, delete on public.charm_items to authenticated;

-- Changes are logged like the rest of the catalog.
create trigger charm_items_audit after insert or update or delete on public.charm_items
  for each row execute function private.audit_row();
