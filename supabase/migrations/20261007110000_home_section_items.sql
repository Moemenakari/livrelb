-- Phase 1, section 1 (follow-up): the texts of the items inside a homepage
-- section, starting with the three "How it works" steps. Only adds a table;
-- nothing is dropped or changed. Needs 20261007100000_home_page_controls.sql
-- (home_sections) first.
--
-- One row per item: section_key + position (1, 2, 3). An empty text means the
-- default text of the language files, so a missing row changes nothing.

create table public.home_section_items (
  section_key text not null references public.home_sections (key) on delete cascade,
  position smallint not null check (position between 1 and 12),
  title_en text not null default '',
  title_ar text not null default '',
  text_en text not null default '',
  text_ar text not null default '',
  updated_at timestamptz not null default now(),
  primary key (section_key, position)
);

create trigger home_section_items_updated_at before update on public.home_section_items
  for each row execute function private.set_updated_at();

alter table public.home_section_items enable row level security;

create policy "public reads home section items" on public.home_section_items
  for select to anon, authenticated using (true);
create policy "staff manage home section items (insert)" on public.home_section_items
  for insert to authenticated with check ((select private.has_permission('collections.manage')));
create policy "staff manage home section items (update)" on public.home_section_items
  for update to authenticated
  using ((select private.has_permission('collections.manage')))
  with check ((select private.has_permission('collections.manage')));
create policy "staff manage home section items (delete)" on public.home_section_items
  for delete to authenticated using ((select private.has_permission('collections.manage')));

create trigger home_section_items_audit after insert or update or delete on public.home_section_items
  for each row execute function private.audit_row();
