-- =====================================================================
--  COBUILD — 005: verified badge + the Cobuild project
-- ---------------------------------------------------------------------
--  1. Adds a verified badge that only admins can give (Admin → Members).
--  2. Verifies wisdomudoudo24@gmail.com, posts "Cobuild" on that account
--     with its real progress (60%), features it, and asks for a marketer
--     in #find-a-team.
--  Run after 002/003/004. Safe to run more than once.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Verified badge: only admins can give or remove it.
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists is_verified boolean not null default false;

create or replace function public.cb_profiles_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.is_verified := false;
    else
      new.is_verified := old.is_verified;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists cb_profiles_guard on public.profiles;
create trigger cb_profiles_guard before insert or update on public.profiles
  for each row execute function public.cb_profiles_guard();

create or replace function public.admin_set_verified(p_user uuid, p_verified boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.cb_require_admin();
  update public.profiles set is_verified = coalesce(p_verified, false) where id = p_user;
  if coalesce(p_verified, false) then
    insert into public.notifications (user_id, type, title, body, link)
    values (p_user, 'verified', 'You''re verified', 'A verified badge now shows next to your name.', '/profile');
  end if;
end $$;

-- Leaderboard and admin member list now include the badge.
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
  where x.xp > 0 and p.name is not null
  order by x.xp desc, p.created_at asc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

drop function if exists public.admin_list_members(text, int, int);
create function public.admin_list_members(p_search text default null, p_limit int default 50, p_offset int default 0)
returns table (id uuid, name text, username text, email text, avatar_url text, primary_role text,
               experience_level text, availability text, country text, referral_source text, interests text[],
               created_at timestamptz, last_seen_at timestamptz, last_sign_in_at timestamptz, onboarded_at timestamptz,
               is_admin boolean, is_verified boolean, projects int, total_count int)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare q text := nullif(btrim(coalesce(p_search, '')), '');
begin
  perform public.cb_require_admin();
  return query
    with f as (
      select p.*, u.email::text as email, u.last_sign_in_at as last_sign_in_at
      from public.profiles p
      left join auth.users u on u.id = p.id
      where q is null
         or p.name ilike '%' || q || '%'
         or p.username ilike '%' || q || '%'
         or u.email ilike '%' || q || '%'
         or p.primary_role ilike '%' || q || '%'
         or p.country ilike '%' || q || '%'
    )
    select f.id, f.name, f.username, f.email, f.avatar_url, f.primary_role, f.experience_level, f.availability,
           f.country, f.referral_source, f.interests, f.created_at, f.last_seen_at, f.last_sign_in_at, f.onboarded_at,
           exists (select 1 from public.app_admins a where a.user_id = f.id),
           f.is_verified,
           (select count(*)::int from public.projects pr where pr.owner_id = f.id),
           (count(*) over ())::int
    from f
    order by f.created_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 200)) offset greatest(coalesce(p_offset, 0), 0);
end $$;

revoke all on function public.get_leaderboard(text, int) from public, anon;
grant execute on function public.get_leaderboard(text, int) to authenticated, service_role;
revoke all on function public.admin_list_members(text, int, int) from public, anon;
grant execute on function public.admin_list_members(text, int, int) to authenticated, service_role;
revoke all on function public.admin_set_verified(uuid, boolean) from public, anon;
grant execute on function public.admin_set_verified(uuid, boolean) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- One-time: verify Wisdom, post the Cobuild project with its real progress,
-- and ask for a marketer in #find-a-team. Re-running won't duplicate anything.
-- ---------------------------------------------------------------------
do $$
declare
  uid uuid;
  pid uuid;
  room uuid;
  step record;
begin
  select id into uid from auth.users where lower(email) = lower('wisdomudoudo24@gmail.com');
  if uid is null then
    raise notice 'No account uses wisdomudoudo24@gmail.com yet. Sign up in the app first, then run this file again.';
    return;
  end if;
  insert into public.profiles (id) values (uid) on conflict do nothing;
  insert into public.app_admins (user_id) values (uid) on conflict do nothing;

  -- Everything below happens as you (so it counts as your activity and XP).
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);

  update public.profiles set is_verified = true where id = uid;

  select id into pid from public.projects where owner_id = uid and lower(replace(title, ' ', '')) = 'cobuild' limit 1;
  if pid is null then
    pid := public.create_project($p${
      "title": "Cobuild",
      "tagline": "Build together. Ship faster.",
      "description": "Cobuild is where builders find teammates, share their roadmap, ship in public and get funded.\n\nPost a project with a roadmap that adds up to 100% and watch the progress bar move as you ship. Join a team, chat in the community, contribute to 900+ open-source projects that want help in every field, earn XP and streaks, and apply for grants and investment.\n\nThe product is built and in beta. Next up: launch, our first 1,000 builders, and partnerships with communities and funders across Africa and beyond.",
      "category": "Social",
      "stage": "beta",
      "status": "open",
      "tech_stack": ["React", "TypeScript", "Vite", "Tailwind CSS", "Supabase", "PostgreSQL"],
      "roles": ["Marketing / Growth"],
      "repo_url": "https://github.com/wisssdorrmm/Skillmatchcolab",
      "demo_url": "",
      "milestones": [
        {"title": "Brand and design system", "weight": 10},
        {"title": "Sign up, onboarding and profiles", "weight": 10},
        {"title": "Projects with roadmaps and progress bars", "weight": 15},
        {"title": "Community rooms, direct messages and notifications", "weight": 10},
        {"title": "Funding applications and admin panel", "weight": 10},
        {"title": "Import 900+ open projects that want help", "weight": 5},
        {"title": "Launch on the web", "weight": 5},
        {"title": "Mobile app polish (install on your phone)", "weight": 10},
        {"title": "Onboard the first 1,000 builders", "weight": 15},
        {"title": "Partnerships with communities and funders", "weight": 10}
      ]
    }$p$::jsonb);

    -- The first six steps are already done (60%).
    for step in select id from public.project_milestones where project_id = pid and position < 6 order by position loop
      perform public.set_milestone_done(step.id, true);
    end loop;

    update public.projects set is_featured = true where id = pid;

    select id into room from public.community_rooms where slug = 'find-a-team';
    if room is not null then
      insert into public.community_messages (room_id, user_id, body) values (room, uid,
        'Looking for a marketer to join Cobuild 🚀' || chr(10) || chr(10) ||
        'I''m building Cobuild, the place where builders find teammates, share their roadmap, ship in public and get funded. The product is 60% done and in beta. Next is launch, so I need someone to own marketing and growth: social media, community partnerships and getting our first 1,000 builders.' || chr(10) || chr(10) ||
        'If that''s you, open Cobuild in Explore and tap "Apply to join", or send me a message.');
    end if;
  end if;
end $$;

select p.title, p.progress, p.is_featured,
       (select string_agg(role_name, ', ') from public.project_roles_needed r where r.project_id = p.id) as looking_for,
       (select is_verified from public.profiles where id = p.owner_id) as you_are_verified
from public.projects p
join auth.users u on u.id = p.owner_id
where lower(u.email) = lower('wisdomudoudo24@gmail.com') and lower(replace(p.title, ' ', '')) = 'cobuild';

notify pgrst, 'reload schema';
