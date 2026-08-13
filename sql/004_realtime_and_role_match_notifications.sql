-------------------------------------------------------------------
-- 1. Enable Realtime on tables that need live updates
-------------------------------------------------------------------
-- Supabase does NOT automatically stream changes for every table — a table
-- has to be explicitly added to the `supabase_realtime` publication. This
-- was almost certainly why chat wasn't updating live: messages/direct_messages
-- were never added. Safe to run even if some are already enabled.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table direct_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;

-------------------------------------------------------------------
-- 2. Notify users when a new project needs their role or skills
-------------------------------------------------------------------
-- Fires when project_roles_needed gets a new row (which happens right after
-- a project is created, per the app's createProject flow). Set-based, not a
-- per-user loop, so it scales fine — no cron job needed for this one.
-- Guards against duplicate notifications per (user, project) even if a
-- project needs multiple roles that match the same user.

create or replace function notify_matching_users_on_role_added()
returns trigger as $$
begin
  insert into notifications (user_id, type, title, body, project_id)
  select distinct pr.id, 'project_match', 'New project matches your skills',
         (select title from projects where id = new.project_id) || ' is looking for ' || new.role_name,
         new.project_id
  from profiles pr
  join projects p on p.id = new.project_id
  where pr.id <> p.owner_id
    and (
      (pr.primary_role is not null and pr.primary_role ilike new.role_name)
      or exists (
        select 1 from user_skills us
        join skills s on s.id = us.skill_id
        where us.user_id = pr.id and s.name ilike new.role_name
      )
    )
    and not exists (
      select 1 from notifications n
      where n.user_id = pr.id and n.project_id = new.project_id and n.type = 'project_match'
    );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_matching_users on project_roles_needed;
create trigger trg_notify_matching_users
  after insert on project_roles_needed
  for each row execute function notify_matching_users_on_role_added();
