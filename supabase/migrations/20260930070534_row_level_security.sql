-- LIVRE schema 4/5: Row Level Security on every table (brief §7, B3).
--   Public: active catalog, approved non-sample reviews, active promotions
--           and collections, public settings.
--   Customer: her own profile and orders (once customer login exists).
--   Staff: according to staff_permissions; the owner can do everything.
-- Server code uses the secret key (service_role), which bypasses RLS, and
-- recalculates every price itself (see place_order).

do $$
declare
  t text;
begin
  foreach t in array array[
    'staff', 'staff_permissions', 'categories', 'materials', 'fonts', 'products',
    'product_materials', 'product_options', 'product_fonts', 'product_media',
    'product_categories', 'areas', 'collections', 'collection_products',
    'promotions', 'reviews', 'site_settings', 'customers', 'coupons', 'orders',
    'order_items', 'order_adjustments', 'manual_entries', 'imported_orders',
    'audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- Defence in depth: the public role has no business with private tables.
revoke all on
  public.staff, public.staff_permissions, public.customers, public.coupons,
  public.orders, public.order_items, public.order_adjustments,
  public.manual_entries, public.imported_orders, public.audit_log,
  public.daily_sales
from anon;
-- Nobody edits the audit log through the API (triggers write it).
revoke insert, update, delete on public.audit_log from authenticated;

-- Staff and permissions -------------------------------------------------

create policy "staff see themselves, owner sees all" on public.staff
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_owner()));
create policy "owner manages staff" on public.staff
  for all to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));

create policy "staff see own permissions, owner sees all" on public.staff_permissions
  for select to authenticated
  using (staff_id = (select private.current_staff_id()) or (select private.is_owner()));
create policy "owner manages permissions" on public.staff_permissions
  for all to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));

-- Catalog: public reads what is active, staff read everything -------------

create policy "public reads active categories" on public.categories
  for select to anon, authenticated
  using (is_active or (select private.is_staff()));
create policy "public reads active materials" on public.materials
  for select to anon, authenticated
  using (is_active or (select private.is_staff()));
create policy "public reads active fonts" on public.fonts
  for select to anon, authenticated
  using (is_active or (select private.is_staff()));
create policy "public reads active areas" on public.areas
  for select to anon, authenticated
  using (is_active or (select private.is_staff()));
create policy "public reads active products" on public.products
  for select to anon, authenticated
  using (status = 'active' or (select private.is_staff()));

do $$
declare
  t text;
begin
  foreach t in array array[
    'product_materials', 'product_options', 'product_fonts', 'product_media',
    'product_categories'
  ] loop
    execute format($f$
      create policy "public reads parts of active products" on public.%I
        for select to anon, authenticated
        using (exists (
          select 1 from public.products p
          where p.id = product_id
            and (p.status = 'active' or (select private.is_staff()))
        ))
    $f$, t);
    execute format($f$
      create policy "staff edit product parts" on public.%I
        for all to authenticated
        using ((select private.has_permission('products.edit')))
        with check ((select private.has_permission('products.edit')))
    $f$, t);
  end loop;

  foreach t in array array['categories', 'materials', 'fonts'] loop
    execute format($f$
      create policy "staff manage %s" on public.%I
        for all to authenticated
        using ((select private.has_permission('products.edit')))
        with check ((select private.has_permission('products.edit')))
    $f$, t, t);
  end loop;
end;
$$;

create policy "staff add products" on public.products
  for insert to authenticated
  with check ((select private.has_permission('products.create')));
create policy "staff edit products" on public.products
  for update to authenticated
  using ((select private.has_permission('products.edit')))
  with check ((select private.has_permission('products.edit')));
create policy "staff delete products" on public.products
  for delete to authenticated
  using ((select private.has_permission('products.delete')));

create policy "staff manage areas" on public.areas
  for all to authenticated
  using ((select private.has_permission('settings.manage')))
  with check ((select private.has_permission('settings.manage')));

-- Collections, promotions, reviews, settings ------------------------------

create policy "public reads active collections" on public.collections
  for select to anon, authenticated
  using (is_active or (select private.is_staff()));
create policy "staff manage collections" on public.collections
  for all to authenticated
  using ((select private.has_permission('collections.manage')))
  with check ((select private.has_permission('collections.manage')));

create policy "public reads products of active collections" on public.collection_products
  for select to anon, authenticated
  using (exists (
    select 1 from public.collections c
    where c.id = collection_id and (c.is_active or (select private.is_staff()))
  ));
create policy "staff manage collection products" on public.collection_products
  for all to authenticated
  using ((select private.has_permission('collections.manage')))
  with check ((select private.has_permission('collections.manage')));

create policy "public reads active promotions" on public.promotions
  for select to anon, authenticated
  using (is_active or (select private.is_staff()));
create policy "staff manage promotions" on public.promotions
  for all to authenticated
  using ((select private.has_permission('coupons.manage')))
  with check ((select private.has_permission('coupons.manage')));

create policy "public reads approved real reviews" on public.reviews
  for select to anon, authenticated
  using ((is_approved and not is_sample) or (select private.has_permission('reviews.manage')));
create policy "staff manage reviews" on public.reviews
  for all to authenticated
  using ((select private.has_permission('reviews.manage')))
  with check ((select private.has_permission('reviews.manage')));

create policy "public reads settings" on public.site_settings
  for select to anon, authenticated
  using (true);
create policy "staff edit settings" on public.site_settings
  for update to authenticated
  using ((select private.has_permission('settings.manage')))
  with check ((select private.has_permission('settings.manage')));

-- Customers and orders ----------------------------------------------------

create policy "customer sees herself, staff with permission see all" on public.customers
  for select to authenticated
  using (
    auth_user_id = (select auth.uid())
    or (select private.has_permission('customers.view'))
  );
create policy "staff edit customers" on public.customers
  for update to authenticated
  using ((select private.has_permission('orders.edit')))
  with check ((select private.has_permission('orders.edit')));
create policy "owner deletes customers" on public.customers
  for delete to authenticated
  using ((select private.is_owner()));

create policy "customer sees her orders, staff with permission see all" on public.orders
  for select to authenticated
  using (
    customer_id in (select id from public.customers where auth_user_id = (select auth.uid()))
    or (select private.has_permission('orders.view'))
  );
create policy "staff edit orders" on public.orders
  for update to authenticated
  using ((select private.has_permission('orders.edit')))
  with check ((select private.has_permission('orders.edit')));
create policy "owner deletes orders" on public.orders
  for delete to authenticated
  using ((select private.is_owner()));

create policy "order items follow their order" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy "staff edit order items" on public.order_items
  for all to authenticated
  using ((select private.has_permission('orders.edit')))
  with check ((select private.has_permission('orders.edit')));

create policy "staff see adjustments" on public.order_adjustments
  for select to authenticated
  using ((select private.has_permission('orders.view')));
create policy "staff add adjustments" on public.order_adjustments
  for insert to authenticated
  with check ((select private.has_permission('orders.edit')));
create policy "owner edits adjustments" on public.order_adjustments
  for update to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));
create policy "owner deletes adjustments" on public.order_adjustments
  for delete to authenticated
  using ((select private.is_owner()));

create policy "staff manage coupons" on public.coupons
  for all to authenticated
  using ((select private.has_permission('coupons.manage')))
  with check ((select private.has_permission('coupons.manage')));

-- Sales records -------------------------------------------------------------

create policy "staff see manual entries" on public.manual_entries
  for select to authenticated
  using ((select private.has_permission('sales.view')));
create policy "owner manages manual entries" on public.manual_entries
  for all to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));

create policy "staff see imported orders" on public.imported_orders
  for select to authenticated
  using ((select private.has_permission('sales.view')));
create policy "owner manages imported orders" on public.imported_orders
  for all to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));

create policy "owner reads the audit log" on public.audit_log
  for select to authenticated
  using ((select private.is_owner()));
