-- Cards that drift behind the Lira coin on the homepage.
-- Admin > Settings > "Cards behind the coin": notes (icon, text, stars, price) and real reviews.
-- One new column on the single settings row. Nothing is dropped or changed; the default is an
-- empty list, and with no cards the homepage keeps showing the approved reviews.

alter table public.site_settings
  add column if not exists hero_cards jsonb not null default '[]'::jsonb;
