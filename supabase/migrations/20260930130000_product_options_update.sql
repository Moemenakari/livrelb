-- Phase 3 part A: new metals and prices, free gift box, 15 fonts.

-- Metals --------------------------------------------------------------------
-- Silver, Gold and Rose Gold all cost the product's gold price (the "base
-- price"); Double Gold Stainless Steel costs three times it. 14K Gold and
-- 14K White Gold are gone.

update public.materials set name_en = 'Silver', name_ar = 'فضة', sort_order = 0
where key = 'silver';
update public.materials set key = 'gold', name_en = 'Gold', name_ar = 'ذهب', sort_order = 1
where key = 'gold18';
update public.materials set name_en = 'Rose Gold', name_ar = 'ذهب وردي', sort_order = 2
where key = 'rose';

insert into public.materials (key, name_en, name_ar, tone, swatch, sort_order)
values ('doubleGold', 'Double Gold Stainless Steel', 'ستانلس ستيل بطلاء ذهب مزدوج', 'gold', '#c9a04f', 3)
on conflict (key) do update set
  name_en = excluded.name_en, name_ar = excluded.name_ar, tone = excluded.tone,
  swatch = excluded.swatch, sort_order = excluded.sort_order, is_active = true;

-- Every product has a gold price: it becomes the base price.
update public.product_materials pm
set price_cents = g.price_cents, compare_at_price_cents = g.compare_at_price_cents
from public.product_materials g, public.materials gm, public.materials m
where g.product_id = pm.product_id and gm.id = g.material_id and gm.key = 'gold'
  and m.id = pm.material_id and m.key in ('silver', 'rose');

delete from public.product_materials pm
using public.materials m
where m.id = pm.material_id and m.key in ('gold14', 'whiteGold14');
delete from public.materials where key in ('gold14', 'whiteGold14');

-- A product left without a default metal falls back to gold.
update public.product_materials pm set is_default = true
from public.materials m
where m.id = pm.material_id and m.key = 'gold'
  and not exists (
    select 1 from public.product_materials d where d.product_id = pm.product_id and d.is_default
  );

-- Double Gold Stainless Steel on every product, at 3x the base price.
insert into public.product_materials
  (product_id, material_id, price_cents, compare_at_price_cents, is_default, sort_order)
select g.product_id, d.id, g.price_cents * 3, g.compare_at_price_cents * 3, false, 3
from public.product_materials g
join public.materials gm on gm.id = g.material_id and gm.key = 'gold'
cross join public.materials d
where d.key = 'doubleGold'
on conflict (product_id, material_id) do update set
  price_cents = excluded.price_cents,
  compare_at_price_cents = excluded.compare_at_price_cents;

update public.product_materials pm set sort_order = m.sort_order
from public.materials m
where m.id = pm.material_id;

-- Material texts on the product pages.
update public.products set
  details_en = E'Pendant height: about 1.5 cm for capital letters, width depends on the name.\nChain: fine cable chain, 1 mm, with a 5 cm extender on 35–45 cm.\nSilver: sterling silver 925. Gold and Rose Gold: sterling silver with a thick gold or rose gold plating. Double Gold Stainless Steel: stainless steel with a double layer of gold, water resistant and made to last.',
  details_ar = E'ارتفاع الحرف الكبير نحو 1.5 سم، ويختلف العرض حسب الاسم.\nالسلسلة: سلسلة ناعمة 1 ملم، مع وصلة تطويل 5 سم للمقاسات 35–45 سم.\nالفضة: فضة إسترلينية 925. الذهب والذهب الوردي: فضة إسترلينية بطلاء سميك من الذهب أو الذهب الوردي. ستانلس ستيل بطلاء ذهب مزدوج: ستانلس ستيل بطبقتين من الذهب، مقاوم للماء ويدوم طويلاً.'
where details_en like 'Pendant height:%';

update public.products set
  details_en = E'Coin pendant: 2 cm, both faces of the 1975 1 Livre coin in relief.\nChain: 1.5 mm cable chain.\nStainless steel core with silver, gold or rose gold plating. Double Gold Stainless Steel has a double layer of gold for extra wear. Water resistant.',
  details_ar = E'ميدالية الليرة: 2 سم، بوجهَي ليرة 1975 البارزين.\nالسلسلة: 1.5 ملم.\nأساس من الستانلس ستيل مطلي بالفضة أو الذهب أو الذهب الوردي. ستانلس ستيل بطلاء ذهب مزدوج فيه طبقتان من الذهب لتدوم أكثر. مقاوم للماء.'
where details_en like 'Coin pendant:%';

update public.products set
  details_en = 'Sterling silver 925, plain or plated with gold or rose gold, or Double Gold Stainless Steel with a double layer of gold. Hypoallergenic and nickel free.',
  details_ar = 'فضة إسترلينية 925، طبيعية أو مطلية بالذهب أو الذهب الوردي، أو ستانلس ستيل بطلاء ذهب مزدوج. لا تسبب الحساسية وخالية من النيكل.'
where details_en like 'Sterling silver 925, plain or plated%';

-- Gift box: free with every order -------------------------------------------

alter table public.site_settings drop column gift_box_price_cents;
alter table public.order_items drop column gift_box;

update public.categories set
  description_en = 'Personal gifts they''ll wear every day. Every order comes in our special LIVRE gift box, free.',
  description_ar = 'هدايا شخصية تُلبس كل يوم. كل طلبية تصل في علبة هدية خاصة من LIVRE، مجاناً.'
where slug = 'gifts';

-- The WhatsApp number and Instagram page are not decided yet: empty hides
-- every WhatsApp / Instagram button until the owner sets them in the admin.
update public.site_settings set whatsapp_number = '', instagram_url = '' where id = 1;

-- Fonts -----------------------------------------------------------------------
-- 15 Google Fonts under Lebanese place names. script decides which names a
-- font is offered for (Arabic fonts only show for Arabic names).

alter table public.fonts
  add column script text not null default 'latin' check (script in ('latin', 'arabic'));

insert into public.fonts (key, name_en, name_ar, font_family, script, sort_order) values
  ('beirut', 'Beirut', 'بيروت', 'Great Vibes', 'latin', 0),
  ('byblos', 'Byblos', 'جبيل', 'Allura', 'latin', 1),
  ('batroun', 'Batroun', 'البترون', 'Parisienne', 'latin', 2),
  ('tyre', 'Tyre', 'صور', 'Alex Brush', 'latin', 3),
  ('saida', 'Saida', 'صيدا', 'Pinyon Script', 'latin', 4),
  ('jounieh', 'Jounieh', 'جونية', 'Dancing Script', 'latin', 5),
  ('zahle', 'Zahle', 'زحلة', 'Sacramento', 'latin', 6),
  ('ehden', 'Ehden', 'إهدن', 'Italianno', 'latin', 7),
  ('faraya', 'Faraya', 'فاريا', 'Pacifico', 'latin', 8),
  ('bcharre', 'Bcharre', 'بشري', 'Satisfy', 'latin', 9),
  ('baalbek', 'Baalbek', 'بعلبك', 'Cinzel', 'latin', 10),
  ('anjar', 'Anjar', 'عنجر', 'Playfair Display', 'latin', 11),
  ('tripoli', 'Tripoli', 'طرابلس', 'Aref Ruqaa', 'arabic', 12),
  ('harissa', 'Harissa', 'حريصا', 'Reem Kufi', 'arabic', 13),
  ('deir-el-qamar', 'Deir el Qamar', 'دير القمر', 'Amiri', 'arabic', 14)
on conflict (key) do update set
  name_en = excluded.name_en, name_ar = excluded.name_ar, font_family = excluded.font_family,
  script = excluded.script, sort_order = excluded.sort_order, is_active = true;

-- Name necklaces and bracelets allow all 15; the first one is the product's
-- default (cards, category preview, homepage hero).
delete from public.product_fonts pf
using public.products p
where p.id = pf.product_id and p.personalization = 'name';

insert into public.product_fonts (product_id, font_id, sort_order)
select p.id, f.id,
  case
    when f.key = case
      when p.slug in ('arabic-name-necklace', 'arabic-name-bracelet', 'mens-arabic-name-necklace') then 'tripoli'
      when p.slug = 'bold-name-necklace' then 'faraya'
      else 'beirut'
    end then 0
    else f.sort_order + 1
  end
from public.products p
cross join public.fonts f
where p.personalization = 'name';

-- The Arabic letter necklace: the three Arabic fonts.
delete from public.product_fonts pf using public.products p
where p.id = pf.product_id and p.slug = 'arabic-letter-necklace';
insert into public.product_fonts (product_id, font_id, sort_order)
select p.id, f.id, f.sort_order
from public.products p
cross join public.fonts f
where p.slug = 'arabic-letter-necklace' and f.script = 'arabic';

-- Orders: no gift box price any more --------------------------------------------

create or replace function public.place_order(
  p_customer jsonb,
  p_items jsonb,
  p_payment_method public.payment_method default 'cod',
  p_coupon_code text default null,
  p_helper_staff_id uuid default null,
  p_ref_code text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.site_settings;
  v_name text := btrim(coalesce(p_customer ->> 'name', ''));
  v_phone text := private.normalize_phone(p_customer ->> 'phone');
  v_area public.areas;
  v_customer public.customers;
  v_first boolean;
  item jsonb;
  v_lines jsonb := '[]';
  v_product public.products;
  v_material record;
  v_option public.product_options;
  v_font public.fonts;
  v_text text;
  v_connection public.chain_connection;
  v_qty integer;
  v_unit integer;
  v_subtotal integer := 0;
  v_coupon public.coupons;
  v_discount integer := 0;
  v_delivery integer;
  v_staff uuid;
  v_source public.attribution_source;
  v_order_id uuid;
  v_number bigint;
begin
  select * into settings from public.site_settings where id = 1;

  if v_name = '' or char_length(v_name) > 100 then
    raise exception 'name_required' using errcode = '22023';
  end if;
  if v_phone is null or v_phone !~ '^\+[1-9][0-9]{6,14}$' then
    raise exception 'phone_invalid' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'cart_invalid' using errcode = '22023';
  end if;

  if nullif(p_customer ->> 'area', '') is not null then
    select * into v_area from public.areas where slug = p_customer ->> 'area' and is_active;
    if not found then
      raise exception 'area_invalid' using errcode = '22023';
    end if;
  end if;

  insert into public.customers as c (name, phone, area_id, address, marketing_opt_in)
  values (
    v_name,
    v_phone,
    v_area.id,
    nullif(btrim(p_customer ->> 'address'), ''),
    coalesce((p_customer ->> 'marketing_opt_in')::boolean, false)
  )
  on conflict (phone) do update set
    name = excluded.name,
    area_id = coalesce(excluded.area_id, c.area_id),
    address = coalesce(excluded.address, c.address),
    marketing_opt_in = c.marketing_opt_in or excluded.marketing_opt_in
  returning * into v_customer;

  v_first := not exists (
      select 1 from public.orders o
      where o.customer_id = v_customer.id and o.status <> 'cancelled'
    )
    and not exists (select 1 from public.imported_orders i where i.phone = v_phone);

  for item in select value from jsonb_array_elements(p_items) loop
    select * into v_product from public.products
    where slug = item ->> 'product' and status = 'active';
    if not found then
      raise exception 'product_unavailable: %', item ->> 'product' using errcode = '22023';
    end if;

    select pm.price_cents, m.id, m.name_en into v_material
    from public.product_materials pm
    join public.materials m on m.id = pm.material_id
    where pm.product_id = v_product.id and m.key = item ->> 'material' and m.is_active;
    if not found then
      raise exception 'material_unavailable' using errcode = '22023';
    end if;
    v_unit := v_material.price_cents;

    v_option := null;
    if exists (select 1 from public.product_options where product_id = v_product.id) then
      if nullif(item ->> 'size', '') is not null then
        select * into v_option from public.product_options
        where product_id = v_product.id and value = (item ->> 'size')::numeric;
      else
        select * into v_option from public.product_options
        where product_id = v_product.id and is_default;
      end if;
      if v_option.id is null then
        raise exception 'size_unavailable' using errcode = '22023';
      end if;
      v_unit := v_unit + v_option.price_modifier_cents;
    end if;

    v_text := null;
    v_font := null;
    v_connection := null;
    if v_product.personalization is not null then
      v_text := btrim(coalesce(item ->> 'text', ''));
      if v_text = '' or char_length(v_text) > v_product.max_length then
        raise exception 'text_invalid' using errcode = '22023';
      end if;
      select f.* into v_font
      from public.product_fonts pf
      join public.fonts f on f.id = pf.font_id
      where pf.product_id = v_product.id and f.is_active
        and (nullif(item ->> 'font', '') is null or f.key = item ->> 'font')
      order by pf.sort_order
      limit 1;
      if not found then
        raise exception 'font_unavailable' using errcode = '22023';
      end if;
      if cardinality(v_product.chain_connections) > 0 then
        v_connection := coalesce(
          (nullif(item ->> 'connection', ''))::public.chain_connection,
          v_product.chain_connections[1]
        );
        if not (v_connection = any (v_product.chain_connections)) then
          raise exception 'connection_unavailable' using errcode = '22023';
        end if;
      end if;
    end if;

    v_qty := coalesce((item ->> 'qty')::integer, 1);
    if v_qty not between 1 and 20 then
      raise exception 'qty_invalid' using errcode = '22023';
    end if;

    v_subtotal := v_subtotal + v_unit * v_qty;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id,
      'product_slug', v_product.slug,
      'product_name', v_product.name_en,
      'material_id', v_material.id,
      'material_name', v_material.name_en,
      'font_id', v_font.id,
      'font_name', v_font.name_en,
      'custom_text', v_text,
      'chain_connection', v_connection,
      'size_kind', v_option.kind,
      'size_value', v_option.value,
      'unit_price_cents', v_unit,
      'qty', v_qty
    );
  end loop;

  if nullif(btrim(p_coupon_code), '') is not null then
    select * into v_coupon from public.coupons c
    where c.code = upper(btrim(p_coupon_code))
      and c.is_active
      and (c.starts_at is null or c.starts_at <= now())
      and (c.ends_at is null or c.ends_at > now())
      and (c.max_uses is null or c.uses_count < c.max_uses)
    for update;
    if not found then
      raise exception 'coupon_invalid' using errcode = '22023';
    end if;
    if v_subtotal < v_coupon.min_order_cents then
      raise exception 'coupon_min_order' using errcode = '22023';
    end if;
    v_discount := case v_coupon.type
      when 'percent' then round(v_subtotal * v_coupon.value / 100.0)::integer
      when 'fixed' then least(v_coupon.value, v_subtotal)
      else 0
    end;
    update public.coupons set uses_count = uses_count + 1 where id = v_coupon.id;
  end if;

  v_delivery := coalesce(v_area.delivery_fee_cents, settings.delivery_fee_cents);
  if v_coupon.type = 'free_delivery'
     or (settings.first_order_free_delivery and v_first)
     or v_subtotal - v_discount >= settings.free_shipping_threshold_cents then
    v_delivery := 0;
  end if;

  if v_coupon.staff_id is not null then
    v_staff := v_coupon.staff_id;
    v_source := 'code';
  elsif p_helper_staff_id is not null
        and exists (select 1 from public.staff where id = p_helper_staff_id and is_active) then
    v_staff := p_helper_staff_id;
    v_source := 'checkout';
  elsif v_customer.referred_by_staff_id is not null then
    v_staff := v_customer.referred_by_staff_id;
    v_source := 'customer_history';
  elsif nullif(btrim(p_ref_code), '') is not null then
    select id into v_staff from public.staff
    where ref_code = lower(btrim(p_ref_code)) and is_active;
    if v_staff is not null then
      v_source := 'link';
    end if;
  end if;
  if v_customer.referred_by_staff_id is null and v_staff is not null then
    update public.customers
    set referred_by_staff_id = v_staff, referred_at = now()
    where id = v_customer.id;
  end if;

  insert into public.orders (
    customer_id, staff_id, attribution_source, payment_method, coupon_id, coupon_code,
    subtotal_cents, discount_cents, delivery_fee_cents, total_cents, is_first_order,
    customer_name, phone, area_id, area_name, address, notes
  )
  values (
    v_customer.id, v_staff, v_source, p_payment_method, v_coupon.id, v_coupon.code,
    v_subtotal, v_discount, v_delivery, v_subtotal - v_discount + v_delivery, v_first,
    v_name, v_phone, v_area.id, v_area.name_en,
    nullif(btrim(p_customer ->> 'address'), ''), nullif(btrim(p_notes), '')
  )
  returning id, number into v_order_id, v_number;

  insert into public.order_items (
    order_id, product_id, product_slug, product_name, material_id, material_name,
    font_id, font_name, custom_text, chain_connection, size_kind, size_value,
    unit_price_cents, qty
  )
  select
    v_order_id,
    (l ->> 'product_id')::uuid,
    l ->> 'product_slug',
    l ->> 'product_name',
    (l ->> 'material_id')::uuid,
    l ->> 'material_name',
    (l ->> 'font_id')::uuid,
    l ->> 'font_name',
    l ->> 'custom_text',
    (l ->> 'chain_connection')::public.chain_connection,
    (l ->> 'size_kind')::public.size_kind,
    (l ->> 'size_value')::numeric,
    (l ->> 'unit_price_cents')::integer,
    (l ->> 'qty')::smallint
  from jsonb_array_elements(v_lines) l;

  return jsonb_build_object(
    'order_id', v_order_id,
    'number', v_number,
    'subtotal_cents', v_subtotal,
    'discount_cents', v_discount,
    'delivery_fee_cents', v_delivery,
    'total_cents', v_subtotal - v_discount + v_delivery,
    'is_first_order', v_first,
    'staff_id', v_staff,
    'attribution_source', v_source
  );
end;
$$;
