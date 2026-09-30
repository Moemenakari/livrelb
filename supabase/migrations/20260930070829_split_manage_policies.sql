-- Split the "manage" (for all) policies into insert / update / delete, so
-- each table has a single SELECT policy (Supabase advisor: multiple
-- permissive policies). Who can do what is unchanged.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('areas', 'staff manage areas', '(select private.has_permission(''settings.manage''))'),
      ('categories', 'staff manage categories', '(select private.has_permission(''products.edit''))'),
      ('materials', 'staff manage materials', '(select private.has_permission(''products.edit''))'),
      ('fonts', 'staff manage fonts', '(select private.has_permission(''products.edit''))'),
      ('product_materials', 'staff edit product parts', '(select private.has_permission(''products.edit''))'),
      ('product_options', 'staff edit product parts', '(select private.has_permission(''products.edit''))'),
      ('product_fonts', 'staff edit product parts', '(select private.has_permission(''products.edit''))'),
      ('product_media', 'staff edit product parts', '(select private.has_permission(''products.edit''))'),
      ('product_categories', 'staff edit product parts', '(select private.has_permission(''products.edit''))'),
      ('collections', 'staff manage collections', '(select private.has_permission(''collections.manage''))'),
      ('collection_products', 'staff manage collection products', '(select private.has_permission(''collections.manage''))'),
      ('promotions', 'staff manage promotions', '(select private.has_permission(''coupons.manage''))'),
      ('reviews', 'staff manage reviews', '(select private.has_permission(''reviews.manage''))'),
      ('order_items', 'staff edit order items', '(select private.has_permission(''orders.edit''))'),
      ('manual_entries', 'owner manages manual entries', '(select private.is_owner())'),
      ('imported_orders', 'owner manages imported orders', '(select private.is_owner())'),
      ('staff', 'owner manages staff', '(select private.is_owner())'),
      ('staff_permissions', 'owner manages permissions', '(select private.is_owner())')
    ) as t (tbl, policy, rule)
  loop
    execute format('drop policy %I on public.%I', r.policy, r.tbl);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (%s)',
      r.policy || ' (insert)', r.tbl, r.rule);
    execute format(
      'create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
      r.policy || ' (update)', r.tbl, r.rule, r.rule);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (%s)',
      r.policy || ' (delete)', r.tbl, r.rule);
  end loop;
end;
$$;
