-- Phase 1, section 5.3: LIVRE Points given once when a customer verifies her phone
-- on WhatsApp. Only adds one column. The checkout works without it (it then gives
-- the default of 10 points, which is $1 off with the current "10 points = $1" rule).

alter table public.site_settings
  add column phone_verify_points integer not null default 10 check (phone_verify_points between 0 and 10000);

-- The reward is given once per customer, even if the verification and the order arrive at
-- the same moment: the second insert is refused by this index (the app ignores it).
create unique index points_ledger_phone_verified_once
  on public.points_ledger (customer_id) where note = 'Phone verified';
