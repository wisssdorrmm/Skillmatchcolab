-- =====================================================================
--  COBUILD — 004: members-only data
-- ---------------------------------------------------------------------
--  The original SkillMatch database had "anyone can read" rules on some
--  tables (profiles, skills, projects...). Every Cobuild screen needs a
--  login, so this removes those public read rules. Signed-in members keep
--  full access through the "cb: ..." rules created by full_setup.sql.
--
--  Only removes READ rules that apply to logged-out visitors (anon/public)
--  on these tables. Insert/update/delete rules are not touched.
--  Safe to run more than once.
-- =====================================================================

do $$
declare r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'user_skills', 'skills', 'projects', 'project_roles_needed',
                        'project_members', 'project_milestones', 'project_upvotes')
      and cmd = 'SELECT'
      and policyname not like 'cb:%'
      and (roles && array['public', 'anon']::name[])
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
    raise notice 'Removed public read rule "%" on %', r.policyname, r.tablename;
  end loop;
end $$;

-- Make sure signed-in members can still read everything they need.
drop policy if exists "cb: profiles readable" on public.profiles;
create policy "cb: profiles readable" on public.profiles for select to authenticated using (true);
drop policy if exists "cb: user_skills readable" on public.user_skills;
create policy "cb: user_skills readable" on public.user_skills for select to authenticated using (true);
drop policy if exists "cb: skills readable" on public.skills;
create policy "cb: skills readable" on public.skills for select to authenticated using (true);
drop policy if exists "cb: projects readable" on public.projects;
create policy "cb: projects readable" on public.projects for select to authenticated using (true);
drop policy if exists "cb: roles readable" on public.project_roles_needed;
create policy "cb: roles readable" on public.project_roles_needed for select to authenticated using (true);
drop policy if exists "cb: members readable" on public.project_members;
create policy "cb: members readable" on public.project_members for select to authenticated using (true);

-- Shows what logged-out visitors can still read (should be all zeros).
select
  (select count(*) from pg_policies where schemaname = 'public' and cmd = 'SELECT'
     and roles && array['public', 'anon']::name[]
     and tablename in ('profiles', 'user_skills', 'skills', 'projects', 'project_roles_needed', 'project_members')
     and policyname not like 'cb:%') as public_read_rules_left;
