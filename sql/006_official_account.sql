-- =====================================================================
--  COBUILD — 006: official Cobuild account, welcome posts and @mentions
-- ---------------------------------------------------------------------
--  1. Members-only profiles/projects (same as 004 — harmless if 004 ran).
--  2. @mentions: tagging @username in a community post notifies that person.
--  3. When someone finishes signing up, the official Cobuild account
--     welcomes them in #general and tags them.
--  4. Sets up the official account (wisdomudoudo24+cobuild@gmail.com) and
--     sends Wisdom a test welcome so you can see it working.
--  Safe to run more than once (nobody is welcomed twice).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Members-only: remove old "anyone can read" rules (from 004)
-- ---------------------------------------------------------------------
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


-- ---------------------------------------------------------------------
-- Official Cobuild account + welcome posts + @mentions
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists is_verified boolean not null default false;
alter table public.profiles add column if not exists is_official boolean not null default false;

-- Only admins can change verified/official on anyone's profile.
create or replace function public.cb_profiles_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.is_verified := false;
      new.is_official := false;
    else
      new.is_verified := old.is_verified;
      new.is_official := old.is_official;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists cb_profiles_guard on public.profiles;
create trigger cb_profiles_guard before insert or update on public.profiles
  for each row execute function public.cb_profiles_guard();

-- Who has already been welcomed (so nobody is greeted twice).
create table if not exists public.cb_welcomed (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  welcomed_at timestamptz not null default now()
);
alter table public.cb_welcomed enable row level security;

-- The official account greets a builder in #general, tagging their @username.
create or replace function public.cb_post_welcome(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  official uuid;
  room uuid;
  p record;
  who text;
  intro text;
begin
  select id into official from public.profiles where is_official order by created_at limit 1;
  if official is null or official = p_user then return; end if;
  select id into room from public.community_rooms where slug = 'general';
  if room is null then return; end if;
  select name, username, primary_role, country into p from public.profiles where id = p_user;
  if p.name is null then return; end if;

  insert into public.cb_welcomed (user_id) values (p_user) on conflict do nothing;
  if not found then return; end if;  -- already welcomed

  who := coalesce('@' || p.username, p.name);
  intro := p.name
        || case when p.primary_role is not null then ' just joined as a ' || p.primary_role else ' just joined' end
        || case when p.country is not null then ' from ' || p.country else '' end || '.';
  insert into public.community_messages (room_id, user_id, body) values (room, official,
    'Welcome to Cobuild, ' || who || '! 👋' || chr(10) || chr(10) ||
    intro || ' Say hi and tell them what you''re building.' || chr(10) || chr(10) ||
    who || ', a great first step: introduce yourself in #introductions, then post your project with the + button or join one in Explore.');
end $$;

create or replace function public.cb_on_profile_onboarded()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.onboarded_at is not null and (tg_op = 'INSERT' or old.onboarded_at is null) and not new.is_official then
    begin
      perform public.cb_post_welcome(new.id);
    exception when others then
      raise warning 'Welcome post skipped: %', sqlerrm;  -- never block someone's onboarding
    end;
  end if;
  return new;
end $$;

drop trigger if exists cb_on_profile_onboarded on public.profiles;
create trigger cb_on_profile_onboarded after insert or update of onboarded_at on public.profiles
  for each row execute function public.cb_on_profile_onboarded();

-- Community posts: streaks, reply notifications, and now @mention notifications.
create or replace function public.cb_on_community_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  parent_author uuid;
  room_name text;
  room_slug text;
  author_name text;
  author_official boolean;
begin
  perform public.cb_mark_active(new.user_id);
  select name, slug into room_name, room_slug from public.community_rooms where id = new.room_id;
  select coalesce(name, 'Someone'), is_official into author_name, author_official from public.profiles where id = new.user_id;

  if new.reply_to is not null then
    select user_id into parent_author from public.community_messages where id = new.reply_to;
    if parent_author is not null and parent_author <> new.user_id then
      insert into public.notifications (user_id, type, title, body, link)
      values (parent_author, 'community_reply', author_name || ' replied in #' || room_name,
              left(new.body, 140), '/community/' || room_slug);
    end if;
  end if;

  -- Tag people with @username (up to 5 per post).
  insert into public.notifications (user_id, type, title, body, link)
  select pr.id, 'mention',
         case when author_official and new.body ilike 'welcome%' then author_name || ' welcomed you in #' || room_name
              else author_name || ' mentioned you in #' || room_name end,
         left(new.body, 140), '/community/' || room_slug
  from (select distinct lower(m[1]) as handle
        from regexp_matches(new.body, '@([A-Za-z0-9_]{3,20})', 'g') as m limit 5) h
  join public.profiles pr on lower(pr.username) = h.handle
  where pr.id <> new.user_id
    and pr.id is distinct from parent_author;
  return new;
end $$;

drop trigger if exists cb_on_community_message on public.community_messages;
create trigger cb_on_community_message after insert on public.community_messages
  for each row execute function public.cb_on_community_message();

-- The official account never appears on the leaderboard.
drop function if exists public.get_leaderboard(text, int);
create function public.get_leaderboard(p_period text default 'all', p_limit int default 20)
returns table (user_id uuid, name text, avatar_url text, username text, primary_role text, is_verified boolean,
               xp int, projects int, steps int, rank int)
language sql stable security definer set search_path = public as $$
  select x.user_id, p.name, p.avatar_url, p.username, p.primary_role, p.is_verified, x.xp, x.projects, x.steps,
         (row_number() over (order by x.xp desc, p.created_at asc))::int
  from public.cb_xp_table(case p_period
                            when 'week' then now() - interval '7 days'
                            when 'month' then now() - interval '30 days'
                            else '-infinity'::timestamptz end) x
  join public.profiles p on p.id = x.user_id
  where x.xp > 0 and p.name is not null and not p.is_official
  order by x.xp desc, p.created_at asc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

revoke all on function public.get_leaderboard(text, int) from public, anon;
grant execute on function public.get_leaderboard(text, int) to authenticated, service_role;
revoke all on function public.cb_post_welcome(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- One-time: turn wisdomudoudo24+cobuild@gmail.com into the official
-- Cobuild account, then send Wisdom a test welcome in #general.
-- ---------------------------------------------------------------------
do $$
declare
  official uuid;
  me uuid;
  handle text := 'cobuild';
begin
  select id into official from auth.users where lower(email) = lower('wisdomudoudo24+cobuild@gmail.com');
  if official is null then
    raise notice 'Official account wisdomudoudo24+cobuild@gmail.com not found. Sign it up in the app, then run this again.';
    return;
  end if;
  insert into public.profiles (id) values (official) on conflict do nothing;
  if exists (select 1 from public.profiles where lower(username) = 'cobuild' and id <> official) then
    handle := 'cobuild_official';
  end if;

  update public.profiles set
    name = 'Cobuild',
    username = handle,
    primary_role = 'Official account',
    bio = 'The official Cobuild account. News, tips and a warm welcome for every new builder.',
    avatar_url = 'https://skillmatchcolab.vercel.app/icon.svg',
    is_verified = true,
    is_official = true,
    show_online = false,
    onboarded_at = coalesce(onboarded_at, now())
  where id = official;

  -- Test run: welcome Wisdom now, exactly like a new sign-up would be welcomed.
  select id into me from auth.users where lower(email) = lower('wisdomudoudo24@gmail.com');
  if me is not null then
    perform public.cb_post_welcome(me);
  end if;
end $$;

-- What you should see: the official account and the test welcome post.
select pr.name, '@' || pr.username as handle, pr.is_official, pr.is_verified,
       (select left(c.body, 80) from public.community_messages c
          join public.community_rooms r on r.id = c.room_id
         where r.slug = 'general' and c.user_id = pr.id
         order by c.created_at desc limit 1) as latest_welcome
from public.profiles pr
where pr.is_official;

notify pgrst, 'reload schema';
