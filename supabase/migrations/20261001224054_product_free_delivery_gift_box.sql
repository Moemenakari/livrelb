-- Per-product switches set in the admin: "free delivery with this piece" and
-- "free gift box". An order that contains a free-delivery piece pays no
-- delivery. The gift box stays free for every piece unless a piece is marked
-- otherwise. Additive only: the existing pricing and save functions are
-- patched in place (same text plus the new lines).

alter table public.products
  add column free_delivery boolean not null default false,
  add column free_gift_box boolean not null default true;

-- True when the bag holds at least one active piece marked free delivery.
create function private.items_free_delivery(p_items jsonb)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(bool_or(p.free_delivery), false)
  from jsonb_array_elements(case when jsonb_typeof(p_items) = 'array' then p_items else '[]'::jsonb end) as i
  join public.products p on p.slug = i ->> 'product' and p.status = 'active';
$$;
revoke execute on function private.items_free_delivery(jsonb) from public, anon, authenticated;

do $$
declare
  r regprocedure;
  d text;
  n text;
begin
  -- Prices and delivery: quote_order and place_order.
  foreach r in array array[
    'public.place_order(jsonb,jsonb,public.payment_method,text,uuid,text,text,uuid,uuid,boolean,uuid)'::regprocedure,
    'public.quote_order(jsonb,text,text,text,uuid,boolean)'::regprocedure
  ] loop
    d := pg_get_functiondef(r);
    n := regexp_replace(d, 'or \(settings\.first_order_free_delivery and v_first',
                        E'or private.items_free_delivery(p_items)\n     or (settings.first_order_free_delivery and v_first');
    if n = d then
      raise exception 'delivery rule not found in %', r;
    end if;
    execute n;
  end loop;

  -- The admin product editor's save function.
  r := 'public.admin_save_product(jsonb)'::regprocedure;
  d := pg_get_functiondef(r);
  n := regexp_replace(d, 'chain_connections, art, stock_qty(\s*)\)', 'chain_connections, art, stock_qty, free_delivery, free_gift_box\1)');
  n := regexp_replace(n, '\(p ->> ''stock_qty''\)::integer(\s*)\)(\s*)returning',
    '(p ->> ''stock_qty'')::integer, coalesce((p ->> ''free_delivery'')::boolean, false), coalesce((p ->> ''free_gift_box'')::boolean, true)\1)\2returning');
  n := regexp_replace(n, 'stock_qty = \(p ->> ''stock_qty''\)::integer(\s*)where',
    'stock_qty = (p ->> ''stock_qty'')::integer, free_delivery = coalesce((p ->> ''free_delivery'')::boolean, false), free_gift_box = coalesce((p ->> ''free_gift_box'')::boolean, true)\1where');
  if n = d or position('free_gift_box = coalesce' in n) = 0 or position('free_delivery, free_gift_box' in n) = 0 or position('''free_gift_box'')::boolean, true)' in n) = 0 then
    raise exception 'admin_save_product not patched';
  end if;
  execute n;
end;
$$;
