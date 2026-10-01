-- Points rule: every full step (default $15) earns points_per_step points
-- (default 10); 10 points = $1 off; an approved review = 1 point. The
-- earning function counts per step, not per dollar. Existing balances stay.
alter table public.site_settings
  add column points_per_step integer not null default 10 check (points_per_step >= 0);

create or replace function private.points_for(p_cents integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when s.points_enabled then
    ((greatest(p_cents, 0) / s.points_step_cents) * s.points_per_step)::integer
  else 0 end
  from public.site_settings s where s.id = 1;
$$;

update public.site_settings
set points_step_cents = 1500,
    points_per_step = 10,
    points_redeem_points = 10,
    points_redeem_cents = 100,
    points_per_review = 1
where id = 1;
