-- LIVRE schema 1/5: shared types, helpers, staff and permissions.
-- Money is stored in USD cents. Phones are E.164 (+9613123456).

-- Security-definer helpers live in a schema the Data API does not expose.
create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

create type public.staff_role as enum ('owner', 'staff');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.metal_tone as enum ('gold', 'silver', 'rose');
create type public.media_type as enum ('image', 'video');
create type public.size_kind as enum ('chain', 'bracelet', 'ring');
create type public.personalization_kind as enum ('name', 'initial');
create type public.chain_connection as enum ('sides', 'center');
create type public.order_status as enum (
  'pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled'
);
create type public.payment_method as enum ('cod', 'whish');
-- Brief §5: which signal gave an order its employee.
create type public.attribution_source as enum ('code', 'checkout', 'customer_history', 'link');
create type public.adjustment_type as enum (
  'gift', 'discount_percent', 'half_off', 'buy_one_get_one',
  'free_delivery', 'extra_delivery', 'other'
);
create type public.coupon_type as enum ('percent', 'fixed', 'free_delivery');
create type public.review_source as enum ('website', 'instagram', 'whatsapp');

create domain public.e164 as text check (value ~ '^\+[1-9][0-9]{6,14}$');

-- Lebanese numbers typed without a country code get +961.
-- '03 123 456' -> +9613123456, '70123456' -> +96170123456, '0033...' -> +33...
create function private.normalize_phone(raw text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  digits text;
begin
  if raw is null then
    return null;
  end if;
  digits := regexp_replace(raw, '\D', '', 'g');
  if digits = '' then
    return null;
  elsif left(btrim(raw), 1) = '+' then
    return '+' || digits;
  elsif left(digits, 2) = '00' then
    return '+' || substr(digits, 3);
  elsif left(digits, 3) = '961' and length(digits) >= 10 then
    return '+' || digits;
  elsif left(digits, 1) = '0' then
    return '+961' || substr(digits, 2);
  end if;
  return '+961' || digits;
end;
$$;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Staff: the owner (Nour) and employees. Login is Supabase Auth, linked by
-- user_id; the phone is what they type to log in.
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null check (btrim(name) <> ''),
  phone public.e164 not null unique,
  -- Personal link livrelb.com/r/<ref_code>
  ref_code text not null unique check (ref_code ~ '^[a-z0-9-]{2,30}$'),
  role public.staff_role not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index staff_single_owner on public.staff (role) where role = 'owner';

-- Everything is allowed by default; the owner switches permissions off per
-- employee (a row with allowed = false). Managing staff is owner-only.
create table public.staff_permissions (
  staff_id uuid not null references public.staff (id) on delete cascade,
  permission text not null check (permission in (
    'products.create', 'products.edit', 'products.delete',
    'orders.view', 'orders.edit', 'orders.cancel',
    'customers.view', 'customers.export',
    'coupons.manage', 'reviews.manage', 'collections.manage',
    'sales.view', 'settings.manage'
  )),
  allowed boolean not null default true,
  updated_by uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (staff_id, permission)
);

create trigger staff_updated_at before update on public.staff
  for each row execute function private.set_updated_at();
create trigger staff_permissions_updated_at before update on public.staff_permissions
  for each row execute function private.set_updated_at();

-- Who is calling (for RLS). Security definer so policies can read staff
-- without granting access to the staff table itself.
create function private.current_staff_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.staff where user_id = (select auth.uid()) and is_active;
$$;

create function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff where user_id = (select auth.uid()) and is_active
  );
$$;

create function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff
    where user_id = (select auth.uid()) and is_active and role = 'owner'
  );
$$;

create function private.has_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff s
    where s.user_id = (select auth.uid())
      and s.is_active
      and (
        s.role = 'owner'
        or coalesce(
          (select p.allowed from public.staff_permissions p
           where p.staff_id = s.id and p.permission = permission_key),
          true
        )
      )
  );
$$;

-- Fills created_by / updated_by from the logged-in staff member.
create function private.stamp_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.current_staff_id();
begin
  if actor is not null then
    if tg_op = 'INSERT' then
      new.created_by := coalesce(new.created_by, actor);
    end if;
    new.updated_by := actor;
  end if;
  return new;
end;
$$;

grant execute on function
  private.normalize_phone(text),
  private.current_staff_id(),
  private.is_staff(),
  private.is_owner(),
  private.has_permission(text)
to anon, authenticated, service_role;
