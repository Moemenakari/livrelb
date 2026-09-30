-- add_order_adjustment runs as the caller, so RLS (orders.edit on orders
-- and order_adjustments) applies on top of its own permission check.
-- (Supabase advisor: signed-in users can execute a SECURITY DEFINER function.)
alter function public.add_order_adjustment(uuid, public.adjustment_type, numeric, text) security invoker;
