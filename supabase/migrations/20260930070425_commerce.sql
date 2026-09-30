-- LIVRE schema 3/5: customers, coupons, orders and sales records.

-- Customers sign in with phone + name only (no email, no OTP for now).
-- auth_user_id and phone_verified_at are ready for WhatsApp OTP later.
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  name text not null check (btrim(name) <> ''),
  phone public.e164 not null unique,
  phone_verified_at timestamptz,
  area_id uuid references public.areas (id) on delete set null,
  address text,
  birthday date,
  marketing_opt_in boolean not null default false,
  -- The first employee who brought her: kept forever (brief §5).
  referred_by_staff_id uuid references public.staff (id) on delete set null,
  referred_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_referred_by_idx on public.customers (referred_by_staff_id);
create index customers_area_idx on public.customers (area_id);

-- A staff_id makes it an employee's personal code (AMAL10).
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9-]{3,30}$'),
  type public.coupon_type not null,
  -- Percent (1-100) for percent coupons, cents for fixed ones, 0 for free delivery.
  value integer not null default 0 check (value >= 0),
  min_order_cents integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer check (max_uses > 0),
  uses_count integer not null default 0,
  staff_id uuid references public.staff (id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references public.staff (id) on delete set null,
  updated_by uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type <> 'percent' or value between 1 and 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index coupons_staff_idx on public.coupons (staff_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  -- Human order number for WhatsApp and the delivery company.
  number bigint generated always as identity (start with 1001) unique,
  customer_id uuid not null references public.customers (id) on delete restrict,
  -- Attribution (brief §5): who gets the sale, and why.
  staff_id uuid references public.staff (id) on delete set null,
  attribution_source public.attribution_source,
  status public.order_status not null default 'pending',
  payment_method public.payment_method not null default 'cod',
  coupon_id uuid references public.coupons (id) on delete set null,
  coupon_code text,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  -- Sum of order_adjustments (staff changes after the order).
  adjustments_cents integer not null default 0,
  total_cents integer not null check (total_cents >= 0),
  is_first_order boolean not null default false,
  -- Snapshot at order time, so later profile edits don't change history.
  customer_name text not null,
  phone public.e164 not null,
  area_id uuid references public.areas (id) on delete set null,
  area_name text,
  address text,
  notes text,
  updated_by uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_customer_idx on public.orders (customer_id);
create index orders_staff_idx on public.orders (staff_id, created_at);
create index orders_status_idx on public.orders (status, created_at);
create index orders_created_idx on public.orders (created_at);
create index orders_coupon_idx on public.orders (coupon_id);
create index orders_area_idx on public.orders (area_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  -- Snapshots: names and price at order time.
  product_slug text not null,
  product_name text not null,
  material_id uuid references public.materials (id) on delete set null,
  material_name text not null,
  font_id uuid references public.fonts (id) on delete set null,
  font_name text,
  custom_text text,
  chain_connection public.chain_connection,
  size_kind public.size_kind,
  size_value numeric(5, 1),
  gift_box boolean not null default false,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  qty smallint not null default 1 check (qty between 1 and 20),
  line_total_cents integer generated always as (unit_price_cents * qty) stored,
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);
create index order_items_material_idx on public.order_items (material_id);
create index order_items_font_idx on public.order_items (font_id);

-- Staff changes after the order: gift, discount, extra delivery...
-- amount_cents is signed: negative lowers the total.
create table public.order_adjustments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  type public.adjustment_type not null,
  value numeric(10, 2),
  amount_cents integer not null default 0,
  note text,
  created_by uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_adjustments_order_idx on public.order_adjustments (order_id);
create index order_adjustments_created_by_idx on public.order_adjustments (created_by);

-- Sales that happened outside the website, typed in by Nour (brief §8.5).
create table public.manual_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  orders_count integer not null default 0 check (orders_count >= 0),
  sales_cents integer not null default 0 check (sales_cents >= 0),
  staff_id uuid references public.staff (id) on delete set null,
  note text,
  created_by uuid references public.staff (id) on delete set null,
  updated_by uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index manual_entries_date_idx on public.manual_entries (entry_date);
create index manual_entries_staff_idx on public.manual_entries (staff_id);

-- Old orders from the delivery company (CSV/Excel import), kept apart
-- from website orders. Their phones count for "first order" checks.
create table public.imported_orders (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_ref text,
  batch_id uuid,
  order_date date,
  customer_name text,
  phone_raw text,
  phone public.e164,
  area text,
  address text,
  items text,
  total_cents integer,
  status text,
  raw jsonb,
  imported_by uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source, external_ref)
);
create index imported_orders_phone_idx on public.imported_orders (phone);
create index imported_orders_imported_by_idx on public.imported_orders (imported_by);

-- Who changed what (reassignments, cancellations, price edits).
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_staff_id uuid references public.staff (id) on delete set null,
  table_name text not null,
  row_id uuid,
  action text not null,
  changes jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_row_idx on public.audit_log (table_name, row_id);
create index audit_log_actor_idx on public.audit_log (actor_staff_id);

do $$
declare
  t text;
begin
  foreach t in array array['customers', 'coupons', 'orders', 'manual_entries'] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.set_updated_at()',
      t || '_updated_at', t
    );
  end loop;
  foreach t in array array['coupons', 'manual_entries'] loop
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function private.stamp_actor()',
      t || '_actor', t
    );
  end loop;
end;
$$;

-- Staff edits to orders and customers: only the owner may reassign the
-- employee (brief §5), cancelling needs orders.cancel, and every change is
-- logged. Server code (no logged-in user) is not restricted.
create function private.guard_order_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.current_staff_id();
begin
  if (select auth.uid()) is not null then
    if new.staff_id is distinct from old.staff_id and not private.is_owner() then
      raise exception 'Only the owner can reassign an order' using errcode = '42501';
    end if;
    if new.status = 'cancelled' and old.status <> 'cancelled'
       and not private.has_permission('orders.cancel') then
      raise exception 'Not allowed to cancel orders' using errcode = '42501';
    end if;
  end if;
  if actor is not null then
    new.updated_by := actor;
  end if;
  insert into public.audit_log (actor_staff_id, table_name, row_id, action, changes)
  values (
    actor, 'orders', new.id, 'update',
    jsonb_build_object(
      'status', jsonb_build_array(old.status, new.status),
      'staff_id', jsonb_build_array(old.staff_id, new.staff_id),
      'total_cents', jsonb_build_array(old.total_cents, new.total_cents)
    )
  );
  return new;
end;
$$;

create trigger orders_guard before update on public.orders
  for each row execute function private.guard_order_change();

create function private.guard_customer_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.referred_by_staff_id is distinct from old.referred_by_staff_id then
    if (select auth.uid()) is not null and not private.is_owner() then
      raise exception 'Only the owner can reassign a customer' using errcode = '42501';
    end if;
    insert into public.audit_log (actor_staff_id, table_name, row_id, action, changes)
    values (
      private.current_staff_id(), 'customers', new.id, 'reassign',
      jsonb_build_object('referred_by_staff_id',
        jsonb_build_array(old.referred_by_staff_id, new.referred_by_staff_id))
    );
  end if;
  return new;
end;
$$;

create trigger customers_guard before update on public.customers
  for each row execute function private.guard_customer_change();

-- Daily sales for the dashboard: website orders (Beirut time, cancelled
-- excluded) plus manual entries. No profit, by design (brief §8.5).
create view public.daily_sales
with (security_invoker = true)
as
select
  (o.created_at at time zone 'Asia/Beirut')::date as day,
  o.staff_id,
  'website'::text as source,
  count(*)::integer as orders_count,
  sum(o.total_cents)::integer as sales_cents
from public.orders o
where o.status <> 'cancelled'
group by 1, 2
union all
select
  m.entry_date,
  m.staff_id,
  'manual',
  sum(m.orders_count)::integer,
  sum(m.sales_cents)::integer
from public.manual_entries m
group by 1, 2;
