-- =====================================================================
--  COBUILD — 007: Hackathons + security hardening
-- ---------------------------------------------------------------------
--  PART A — Hackathons
--    * A Hackathons section with 126 real, currently open hackathons
--      (Devpost + a few checked by hand), an "I'm in" button so members
--      can find teammates, and a #hackathons community room.
--
--  PART B — Security ("nothing leaks")
--    * Logged-out visitors can read nothing and run nothing.
--    * Private answers ("how did you hear about us") and hidden
--      "last seen" times move to a table only admins can reach.
--    * Profile pictures must be real uploads to your own storage
--      (no outside tracking images), images only, 5 MB max, and the
--      avatar folder can no longer be listed.
--    * Projects can only be created/edited through the checked forms.
--    * Links are cleaned (no "javascript:" links), text has length caps.
--    * Nobody can pose as Cobuild / admin / support.
--    * Anti-spam speed limits on posts, messages, hypes and applications.
--    * Every old leftover rule is removed and replaced with a known set.
--
--  Safe to run more than once. It all applies together or not at all.
--  When it finishes you get a short checklist — every line should say ✅.
-- =====================================================================

begin;

-- =====================================================================
-- PART A — HACKATHONS
-- =====================================================================

create table if not exists public.hackathons (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 2 and 160),
  organizer text,
  url text not null check (url ~ '^https://[^\s<>"''`\\]{4,}$' and char_length(url) <= 500),
  source text not null default 'Cobuild',
  location text,
  is_online boolean not null default true,
  starts_on date,
  ends_on date,
  prize_text text,
  prize_usd int,
  themes text[] not null default '{}',
  participants int not null default 0,
  image_url text check (image_url is null or (image_url ~ '^https://[^\s<>"''`\\]{4,}$' and char_length(image_url) <= 500)),
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists hackathons_url_key on public.hackathons (url);
create index if not exists idx_hackathons_ends on public.hackathons (ends_on);
alter table public.hackathons enable row level security;

-- "I'm in": members who are joining a hackathon, so others can team up with them.
create table if not exists public.hackathon_interest (
  hackathon_id uuid not null references public.hackathons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (hackathon_id, user_id)
);
create index if not exists idx_hackathon_interest_user on public.hackathon_interest (user_id, created_at desc);
alter table public.hackathon_interest enable row level security;

grant select, insert, update, delete on public.hackathons to authenticated;
grant select, insert, delete on public.hackathon_interest to authenticated;

-- A place to find teammates.
insert into public.community_rooms (slug, name, description, category, is_locked, position)
values ('hackathons', 'hackathons', 'Joining a hackathon? Say which one and find teammates here.', 'Opportunities', false, 22)
on conflict (slug) do nothing;


-- =====================================================================
-- PART B — SECURITY
-- =====================================================================

-- ---------------------------------------------------------------------
-- B1. Small helpers
-- ---------------------------------------------------------------------

-- Passes for admins, and for the SQL editor / server key. Everyone else is refused.
create or replace function public.cb_require_admin_or_system()
returns void language plpgsql stable security definer set search_path = public as $$
declare claims text := nullif(current_setting('request.jwt.claims', true), '');
begin
  if claims is null then return; end if;                                   -- SQL editor
  if (claims::jsonb ->> 'role') = 'service_role' then return; end if;      -- server key
  perform public.cb_require_admin();
end $$;

-- Only plain http(s) web links are kept. "javascript:", "data:" and friends become empty.
create or replace function public.cb_safe_url(u text)
returns text language sql immutable as $$
  select case
    when u is null or btrim(u) = '' then null
    when char_length(btrim(u)) > 300 then null
    when btrim(u) ~ '[\s<>"''`\\]' then null
    when btrim(u) ~* '^https?://[a-z0-9]' then btrim(u)
    when btrim(u) ~* '^[a-z][a-z0-9+.-]*:' then null
    when btrim(u) ~ '^[/.]' then null
    else 'https://' || btrim(u)
  end;
$$;

create or replace function public.cb_clean_url(u text)
returns text language sql immutable security definer set search_path = public as $$
  select public.cb_safe_url(u);
$$;

-- Speed limit for any table. Arguments: user column, time column, seconds, max rows.
create or replace function public.cb_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  n int;
begin
  if uid is null or public.is_admin() then return new; end if;
  execute format('select count(*) from %s where %I = $1 and %I > now() - make_interval(secs => $2)',
                 tg_relid::regclass, tg_argv[0], tg_argv[1])
    into n using uid, tg_argv[2]::int;
  if n >= tg_argv[3]::int then
    raise exception 'You''re doing that too fast. Please wait a little and try again.';
  end if;
  return new;
end $$;


-- ---------------------------------------------------------------------
-- B2. Private profile details (only admins can reach these)
-- ---------------------------------------------------------------------
create table if not exists public.profile_private (
  user_id uuid primary key references public.profiles(id) on delete cascade deferrable initially deferred,
  referral_source text,
  last_seen_at timestamptz
);
alter table public.profile_private enable row level security;
-- no policies on purpose: the app can never read or write this table directly

insert into public.profile_private (user_id, referral_source, last_seen_at)
select id, referral_source, last_seen_at from public.profiles
on conflict (user_id) do update set
  referral_source = coalesce(excluded.referral_source, profile_private.referral_source),
  last_seen_at = greatest(excluded.last_seen_at, profile_private.last_seen_at);


-- ---------------------------------------------------------------------
-- B3. Profiles: what a member can and can't change about themselves
-- ---------------------------------------------------------------------
create or replace function public.cb_profiles_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  prev public.profiles%rowtype;
  has_prev boolean := false;
  is_user boolean := auth.uid() is not null and not public.is_admin();
  iss text;
  base text;
  flat text;
begin
  if tg_op = 'UPDATE' then
    prev := old;
    has_prev := true;
  else
    select * into prev from public.profiles where id = new.id;
    has_prev := found;
  end if;

  -- Private answers never stay on the public profile row.
  if new.referral_source is not null then
    insert into public.profile_private (user_id, referral_source)
    values (new.id, left(new.referral_source, 60))
    on conflict (user_id) do update set referral_source = excluded.referral_source;
    new.referral_source := null;
  end if;

  -- "Show when I'm online" off = no last-seen time stored on the profile at all.
  if not coalesce(new.show_online, true) then
    new.last_seen_at := null;
  end if;

  if not is_user then
    return new;
  end if;

  -- Badges and dates are not self-service.
  new.is_verified := case when has_prev then prev.is_verified else false end;
  new.is_official := case when has_prev then prev.is_official else false end;
  new.created_at := case when has_prev then prev.created_at else now() end;
  if coalesce(current_setting('cb.presence', true), '') <> '1' and coalesce(new.show_online, true) then
    new.last_seen_at := case when has_prev then prev.last_seen_at end;
  end if;

  -- Names: no fake ticks, no posing as the team.
  new.name := nullif(left(btrim(regexp_replace(regexp_replace(coalesce(new.name, ''), '[✓✔☑✅🔵🛡]', '', 'g'), '\s+', ' ', 'g')), 80), '');
  if new.name is not null and (not has_prev or new.name is distinct from prev.name) then
    flat := regexp_replace(lower(new.name), '[^a-z0-9]', '', 'g');
    if flat ~ '^(cobuild.*|admin|administrator|support|moderator|official)$' then
      raise exception 'That name is reserved. Please use your own name.';
    end if;
  end if;
  if new.username is not null and (not has_prev or new.username is distinct from prev.username) then
    flat := replace(lower(new.username), '_', '');
    if flat ~ '^(cobuild.*|admin[0-9]*|administrator|official.*|support|help|moderator|mod|staff|team|root|system|security|everyone|here|all|null|undefined)$' then
      raise exception 'That username is reserved. Try another one.';
    end if;
  end if;

  -- Length caps (the forms already stop far below these).
  new.bio := nullif(left(coalesce(new.bio, ''), 600), '');
  new.primary_role := nullif(left(btrim(coalesce(new.primary_role, '')), 60), '');
  new.goal := nullif(left(coalesce(new.goal, ''), 300), '');
  new.country := nullif(left(btrim(coalesce(new.country, '')), 60), '');
  new.experience_level := nullif(left(btrim(coalesce(new.experience_level, '')), 40), '');
  new.availability := nullif(left(btrim(coalesce(new.availability, '')), 40), '');
  new.interests := coalesce((select array_agg(left(i, 40)) from (select i from unnest(new.interests) as i limit 20) s), '{}');

  -- Links.
  new.github_url := public.cb_safe_url(new.github_url);
  new.website_url := public.cb_safe_url(new.website_url);
  new.x_handle := substring(regexp_replace(coalesce(new.x_handle, ''), '^\s*(https?://)?(www\.)?(x|twitter)\.com/', '', 'i') from '^@*([A-Za-z0-9_]{1,15})');

  -- Profile picture: only a file this member uploaded to this app's own storage.
  -- (An outside image address could be used to track everyone who sees it.)
  if new.avatar_url is not null and new.avatar_url is distinct from (case when has_prev then prev.avatar_url end) then
    iss := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'iss';
    base := case when iss ~ '^https?://[^/\s]+/auth/v1/?$' then regexp_replace(iss, '/auth/v1/?$', '') end;
    if char_length(new.avatar_url) > 400
       or new.avatar_url ~ '[\s<>"''`\\]'
       or not (
         case
           when base is not null then
             left(new.avatar_url, char_length(base || '/storage/v1/object/public/avatars/' || new.id || '/'))
               = base || '/storage/v1/object/public/avatars/' || new.id || '/'
           else
             new.avatar_url ~ ('^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/avatars/' || new.id || '/')
         end
       ) then
      new.avatar_url := case when has_prev then prev.avatar_url end;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists cb_profiles_guard on public.profiles;
create trigger cb_profiles_guard before insert or update on public.profiles
  for each row execute function public.cb_profiles_guard();

-- Clean what is already stored.
update public.profiles set referral_source = null where referral_source is not null;
update public.profiles set last_seen_at = null where not show_online and last_seen_at is not null;
update public.profiles set github_url = public.cb_safe_url(github_url)
 where github_url is not null and github_url is distinct from public.cb_safe_url(github_url);
update public.profiles set website_url = public.cb_safe_url(website_url)
 where website_url is not null and website_url is distinct from public.cb_safe_url(website_url);
update public.projects set repo_url = public.cb_safe_url(repo_url)
 where repo_url is not null and repo_url is distinct from public.cb_safe_url(repo_url);
update public.projects set demo_url = public.cb_safe_url(demo_url)
 where demo_url is not null and demo_url is distinct from public.cb_safe_url(demo_url);

-- Presence: the real time goes to the private table; the profile only shows it if the member allows.
create or replace function public.touch_presence()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  if not exists (select 1 from public.profiles where id = auth.uid()) then return; end if;
  insert into public.profile_private (user_id, last_seen_at) values (auth.uid(), now())
  on conflict (user_id) do update set last_seen_at = excluded.last_seen_at;
  perform set_config('cb.presence', '1', true);
  update public.profiles set last_seen_at = now() where id = auth.uid() and show_online;
  perform set_config('cb.presence', '', true);
  insert into public.user_visits (user_id, day) values (auth.uid(), current_date) on conflict do nothing;
end $$;


-- ---------------------------------------------------------------------
-- B4. Admin tools read the private table
-- ---------------------------------------------------------------------
create or replace function public.admin_overview()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  perform public.cb_require_admin();
  return json_build_object(
    'members_total', (select count(*) from public.profiles),
    'members_onboarded', (select count(*) from public.profiles where onboarded_at is not null),
    'members_new_7d', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'members_new_30d', (select count(*) from public.profiles where created_at >= now() - interval '30 days'),
    'members_prev_30d', (select count(*) from public.profiles where created_at >= now() - interval '60 days' and created_at < now() - interval '30 days'),
    'online_now', (select count(*) from public.profile_private where last_seen_at > now() - interval '3 minutes'),
    'dau', (select count(*) from public.user_visits where day = current_date),
    'wau', (select count(distinct user_id) from public.user_visits where day > current_date - 7),
    'mau', (select count(distinct user_id) from public.user_visits where day > current_date - 30),
    'admins', (select count(*) from public.app_admins),
    'projects_total', (select count(*) from public.projects),
    'projects_community', (select count(*) from public.projects where source = 'community'),
    'projects_github', (select count(*) from public.projects where source <> 'community'),
    'projects_new_7d', (select count(*) from public.projects where source = 'community' and created_at >= now() - interval '7 days'),
    'projects_completed', (select count(*) from public.projects where source = 'community' and progress >= 100),
    'avg_progress', (select coalesce(round(avg(progress)), 0) from public.projects where source = 'community'),
    'steps_done_7d', (select count(*) from public.project_milestones where is_done and done_at >= now() - interval '7 days'),
    'posts_7d', (select count(*) from public.community_messages where created_at >= now() - interval '7 days'),
    'dms_7d', (select count(*) from public.conversation_messages where created_at >= now() - interval '7 days'),
    'applications_pending', (select count(*) from public.applications where status::text = 'pending'),
    'funding_pending', (select count(*) from public.funding_applications where status in ('submitted', 'under_review')),
    'funding_total', (select count(*) from public.funding_applications),
    'funding_requested', (select coalesce(sum(amount_requested), 0) from public.funding_applications where status in ('submitted', 'under_review')),
    'hackathons_open', (select count(*) from public.hackathons where is_active and (ends_on is null or ends_on >= current_date)),
    'hackathon_joins', (select count(*) from public.hackathon_interest)
  );
end $$;

create or replace function public.admin_list_members(p_search text default null, p_limit int default 50, p_offset int default 0)
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
      select p.id, p.name, p.username, p.avatar_url, p.primary_role, p.experience_level, p.availability, p.country,
             p.interests, p.created_at, p.onboarded_at, p.is_verified,
             pp.referral_source as referral_source,
             coalesce(pp.last_seen_at, p.last_seen_at) as last_seen_at,
             u.email::text as email, u.last_sign_in_at as last_sign_in_at
      from public.profiles p
      left join public.profile_private pp on pp.user_id = p.id
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

create or replace function public.admin_insights()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  perform public.cb_require_admin();
  return json_build_object(
    'total', (select count(*) from public.profiles),
    'onboarded', (select count(*) from public.profiles where onboarded_at is not null),
    'roles', (select coalesce(json_agg(json_build_object('label', label, 'count', n) order by n desc), '[]'::json)
              from (select coalesce(primary_role, 'Not set') label, count(*)::int n from public.profiles group by 1) x),
    'experience', (select coalesce(json_agg(json_build_object('label', label, 'count', n) order by n desc), '[]'::json)
              from (select coalesce(experience_level, 'Not set') label, count(*)::int n from public.profiles group by 1) x),
    'availability', (select coalesce(json_agg(json_build_object('label', label, 'count', n) order by n desc), '[]'::json)
              from (select coalesce(availability, 'Not set') label, count(*)::int n from public.profiles group by 1) x),
    'countries', (select coalesce(json_agg(json_build_object('label', label, 'count', n) order by n desc), '[]'::json)
              from (select coalesce(country, 'Not set') label, count(*)::int n from public.profiles group by 1) x),
    'referral', (select coalesce(json_agg(json_build_object('label', label, 'count', n) order by n desc), '[]'::json)
              from (select coalesce(pp.referral_source, 'Not set') label, count(*)::int n
                    from public.profiles p left join public.profile_private pp on pp.user_id = p.id group by 1) x),
    'interests', (select coalesce(json_agg(json_build_object('label', label, 'count', n) order by n desc), '[]'::json)
              from (select i label, count(*)::int n from public.profiles, unnest(interests) i group by 1) x),
    'skills', (select coalesce(json_agg(json_build_object('label', label, 'count', n) order by n desc), '[]'::json)
              from (select s.name label, count(*)::int n from public.user_skills us join public.skills s on s.id = us.skill_id
                    group by 1 order by 2 desc limit 20) x),
    'categories', (select coalesce(json_agg(json_build_object('label', label, 'count', n) order by n desc), '[]'::json)
              from (select coalesce(category, 'Uncategorised') label, count(*)::int n from public.projects
                    where source = 'community' group by 1) x)
  );
end $$;

-- The "first admin" shortcut only works while there are no admins at all,
-- so nobody can ever claim admin just by registering an email address.
create or replace function public.cb_grant_bootstrap_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.app_admins) and exists (
    select 1 from auth.users u
    join public.admin_bootstrap_emails b on lower(b.email) = lower(u.email)
    where u.id = new.id
  ) then
    insert into public.app_admins (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end $$;


-- ---------------------------------------------------------------------
-- B5. Projects, applications, funding, messages: tighter checks
-- ---------------------------------------------------------------------
create or replace function public.cb_validate_project(p jsonb)
returns void language plpgsql as $$
declare total int; n int;
begin
  if coalesce(btrim(p->>'title'), '') = '' then raise exception 'Give your project a name.'; end if;
  if char_length(btrim(p->>'title')) > 80 then raise exception 'Project name must be 80 characters or less.'; end if;
  if coalesce(btrim(p->>'description'), '') = '' then raise exception 'Describe what you''re building.'; end if;
  if char_length(p->>'description') > 4000 then raise exception 'Description must be 4000 characters or less.'; end if;
  if char_length(coalesce(p->>'tagline', '')) > 160 then raise exception 'Tagline must be 160 characters or less.'; end if;
  if char_length(coalesce(p->>'category', '')) > 60 then raise exception 'Pick a valid category.'; end if;
  if coalesce(p->>'stage', 'building') not in ('idea', 'building', 'beta', 'launched') then raise exception 'Pick a valid stage.'; end if;
  if coalesce(p->>'status', 'open') not in ('open', 'in_progress', 'closed') then raise exception 'Pick a valid status.'; end if;
  if jsonb_typeof(p->'roles') = 'array' then
    if jsonb_array_length(p->'roles') > 15 then raise exception 'A project can list at most 15 roles.'; end if;
    if exists (select 1 from jsonb_array_elements_text(p->'roles') r where char_length(r) > 60) then
      raise exception 'Role names must be 60 characters or less.';
    end if;
  end if;
  if jsonb_typeof(p->'tech_stack') = 'array' then
    if jsonb_array_length(p->'tech_stack') > 25 then raise exception 'A project can list at most 25 tools.'; end if;
    if exists (select 1 from jsonb_array_elements_text(p->'tech_stack') t where char_length(t) > 40) then
      raise exception 'Tool names must be 40 characters or less.';
    end if;
  end if;
  if jsonb_typeof(p->'milestones') is distinct from 'array' or jsonb_array_length(p->'milestones') = 0 then
    raise exception 'Add at least one roadmap step.';
  end if;
  n := jsonb_array_length(p->'milestones');
  if n > 30 then raise exception 'A roadmap can have at most 30 steps.'; end if;
  if exists (select 1 from jsonb_array_elements(p->'milestones') x
             where coalesce(btrim(x->>'title'), '') = '' or char_length(x->>'title') > 140) then
    raise exception 'Every roadmap step needs a name (max 140 characters).';
  end if;
  if exists (select 1 from jsonb_array_elements(p->'milestones') x where char_length(coalesce(x->>'description', '')) > 1000) then
    raise exception 'Roadmap step notes must be 1000 characters or less.';
  end if;
  if exists (select 1 from jsonb_array_elements(p->'milestones') x
             where case when coalesce(x->>'weight', '') ~ '^[0-9]{1,3}$'
                        then (x->>'weight')::int not between 1 and 100 else true end) then
    raise exception 'Each roadmap step must be worth between 1%% and 100%%.';
  end if;
  select coalesce(sum((x->>'weight')::int), 0) into total from jsonb_array_elements(p->'milestones') x;
  if total <> 100 then
    raise exception '%', format('Roadmap steps must add up to exactly 100%% (yours add up to %s%%).', total);
  end if;
end $$;

-- Applications: you apply as "pending"; afterwards only the status can change.
create or replace function public.cb_applications_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from public.projects where id = new.project_id and (source <> 'community' or owner_id is null)) then
      raise exception 'This project is run outside Cobuild — use its link to contribute.';
    end if;
    if exists (select 1 from public.projects where id = new.project_id and owner_id = new.applicant_id) then
      raise exception 'You already own this project.';
    end if;
    if auth.uid() is not null then
      new.status := 'pending';
    end if;
    new.message := nullif(left(btrim(coalesce(new.message, '')), 2000), '');
  elsif auth.uid() is not null and not public.is_admin() then
    new.project_id := old.project_id;
    new.applicant_id := old.applicant_id;
    new.message := old.message;
    new.created_at := old.created_at;
    if new.status::text not in ('pending', 'accepted', 'rejected') then
      raise exception 'Pick a valid status.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists cb_applications_guard on public.applications;
create trigger cb_applications_guard before insert or update on public.applications
  for each row execute function public.cb_applications_guard();

create or replace function public.cb_funding_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'submitted';
    new.admin_note := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    if new.project_id is not null and not exists (
      select 1 from public.projects where id = new.project_id and owner_id = new.user_id
    ) then
      raise exception 'You can only request funding for projects you own.';
    end if;
    if auth.uid() is not null and (
      select count(*) from public.funding_applications
      where user_id = new.user_id and status in ('submitted', 'under_review')
    ) >= 5 then
      raise exception 'You already have 5 applications waiting for review.';
    end if;
  end if;
  new.traction := nullif(left(coalesce(new.traction, ''), 4000), '');
  new.team := nullif(left(coalesce(new.team, ''), 4000), '');
  new.links := nullif(left(coalesce(new.links, ''), 2000), '');
  new.contact_email := case when coalesce(new.contact_email, '') ~ '^[^@\s<>"'']{1,100}@[^@\s<>"'']{1,150}$' then btrim(new.contact_email) end;
  new.admin_note := nullif(left(coalesce(new.admin_note, ''), 2000), '');
  new.updated_at := now();
  return new;
end $$;

-- A member can list at most 50 skills.
create or replace function public.cb_user_skills_cap()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.user_skills where user_id = new.user_id) >= 50 then
    raise exception 'You can add up to 50 skills.';
  end if;
  return new;
end $$;

drop trigger if exists cb_user_skills_cap on public.user_skills;
create trigger cb_user_skills_cap before insert on public.user_skills
  for each row execute function public.cb_user_skills_cap();

-- One "your project got hyped" alert per person per day (no on/off spam).
create or replace function public.cb_on_project_upvote()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pr record;
  msg text;
begin
  select id, title, owner_id into pr from public.projects where id = new.project_id;
  if pr.owner_id is not null and pr.owner_id <> new.user_id then
    msg := coalesce((select name from public.profiles where id = new.user_id), 'Someone') || ' hyped ' || pr.title;
    if not exists (
      select 1 from public.notifications n
      where n.user_id = pr.owner_id and n.type = 'project_upvote' and n.project_id = pr.id
        and n.body = msg and n.created_at > now() - interval '1 day'
    ) then
      insert into public.notifications (user_id, type, title, body, project_id, link)
      values (pr.owner_id, 'project_upvote', 'Your project got hyped', msg, pr.id, '/project/' || pr.id);
    end if;
  end if;
  return new;
end $$;

-- Starting brand-new chats is capped per day (stops mass cold messaging).
create or replace function public.start_conversation(p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  conv uuid;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if p_other is null or p_other = uid then raise exception 'Pick someone else to message.'; end if;
  if not exists (select 1 from public.profiles where id = p_other) then raise exception 'That builder doesn''t exist.'; end if;
  select id into conv from public.conversations where user_a = least(uid, p_other) and user_b = greatest(uid, p_other);
  if conv is not null then return conv; end if;
  if not public.is_admin() and (
    select count(*) from public.conversations
    where uid in (user_a, user_b) and created_at > now() - interval '1 day'
  ) >= 40 then
    raise exception 'You''ve started a lot of new chats today. Please try again tomorrow.';
  end if;
  insert into public.conversations (user_a, user_b) values (least(uid, p_other), greatest(uid, p_other))
  on conflict (user_a, user_b) do nothing;
  select id into conv from public.conversations where user_a = least(uid, p_other) and user_b = greatest(uid, p_other);
  return conv;
end $$;

-- Length caps on older chat tables (new rows only; old rows are left alone).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'messages_text_len') then
    alter table public.messages add constraint messages_text_len check (char_length(text) between 1 and 4000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'direct_messages_text_len') then
    alter table public.direct_messages add constraint direct_messages_text_len check (char_length(text) between 1 and 4000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'deletion_reason_len') then
    alter table public.account_deletion_requests add constraint deletion_reason_len check (char_length(coalesce(reason, '')) <= 2000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'project_members_role_len') then
    alter table public.project_members add constraint project_members_role_len check (char_length(coalesce(role, '')) <= 60) not valid;
  end if;
end $$;

create index if not exists idx_conversation_messages_sender on public.conversation_messages (sender_id, created_at desc);
create index if not exists idx_direct_messages_sender on public.direct_messages (sender_id, created_at desc);
create index if not exists idx_messages_sender on public.messages (sender_id, created_at desc);
create index if not exists idx_applications_applicant on public.applications (applicant_id, created_at desc);
create index if not exists idx_project_upvotes_user on public.project_upvotes (user_id, created_at desc);
create index if not exists idx_message_likes_user on public.community_message_likes (user_id, created_at desc);

-- Speed limits (admins are exempt).
drop trigger if exists cb_rate_minute on public.community_messages;
create trigger cb_rate_minute before insert on public.community_messages
  for each row execute function public.cb_rate_limit('user_id', 'created_at', '60', '10');
drop trigger if exists cb_rate_day on public.community_messages;
create trigger cb_rate_day before insert on public.community_messages
  for each row execute function public.cb_rate_limit('user_id', 'created_at', '86400', '400');
drop trigger if exists cb_rate_minute on public.conversation_messages;
create trigger cb_rate_minute before insert on public.conversation_messages
  for each row execute function public.cb_rate_limit('sender_id', 'created_at', '60', '30');
drop trigger if exists cb_rate_minute on public.direct_messages;
create trigger cb_rate_minute before insert on public.direct_messages
  for each row execute function public.cb_rate_limit('sender_id', 'created_at', '60', '20');
drop trigger if exists cb_rate_minute on public.messages;
create trigger cb_rate_minute before insert on public.messages
  for each row execute function public.cb_rate_limit('sender_id', 'created_at', '60', '30');
drop trigger if exists cb_rate_day on public.applications;
create trigger cb_rate_day before insert on public.applications
  for each row execute function public.cb_rate_limit('applicant_id', 'created_at', '86400', '40');
drop trigger if exists cb_rate_day on public.projects;
create trigger cb_rate_day before insert on public.projects
  for each row execute function public.cb_rate_limit('owner_id', 'created_at', '86400', '8');
drop trigger if exists cb_rate_hour on public.project_upvotes;
create trigger cb_rate_hour before insert on public.project_upvotes
  for each row execute function public.cb_rate_limit('user_id', 'created_at', '3600', '120');
drop trigger if exists cb_rate_hour on public.community_message_likes;
create trigger cb_rate_hour before insert on public.community_message_likes
  for each row execute function public.cb_rate_limit('user_id', 'created_at', '3600', '300');
drop trigger if exists cb_rate_hour on public.hackathon_interest;
create trigger cb_rate_hour before insert on public.hackathon_interest
  for each row execute function public.cb_rate_limit('user_id', 'created_at', '3600', '120');


-- ---------------------------------------------------------------------
-- B6. Hackathon import (admin button + the list below)
-- ---------------------------------------------------------------------
-- items: [{ t: title, o: organiser, u: link, l: place, on: online?, s: start, e: end (YYYY-MM-DD),
--           p: prize as shown, pu: rough prize in USD (sorting only), th: [themes], n: sign-ups, src: where from, img: picture }]
-- "Hidden" and "featured" choices made by an admin are kept when a hackathon is re-imported.
create or replace function public.admin_import_hackathons(p_items jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare
  item jsonb;
  n int := 0;
begin
  perform public.cb_require_admin_or_system();
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Expected a list of hackathons.'; end if;
  if jsonb_array_length(p_items) > 1000 then raise exception 'That list is too long (max 1000).'; end if;

  for item in select * from jsonb_array_elements(p_items) loop
    continue when coalesce(item->>'u', '') !~ '^https://[^\s<>"''`\\]{4,}$'
               or char_length(item->>'u') > 500
               or char_length(btrim(coalesce(item->>'t', ''))) < 2;

    insert into public.hackathons (title, organizer, url, source, location, is_online, starts_on, ends_on,
                                   prize_text, prize_usd, themes, participants, image_url)
    values (
      left(btrim(item->>'t'), 160),
      nullif(left(btrim(coalesce(item->>'o', '')), 100), ''),
      item->>'u',
      coalesce(nullif(left(btrim(coalesce(item->>'src', '')), 40), ''), 'Web'),
      nullif(left(btrim(coalesce(item->>'l', '')), 100), ''),
      coalesce(item->>'on', '') = 'true',
      case when coalesce(item->>'s', '') ~ '^20[0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$' then (item->>'s')::date end,
      case when coalesce(item->>'e', '') ~ '^20[0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$' then (item->>'e')::date end,
      nullif(left(btrim(coalesce(item->>'p', '')), 40), ''),
      case when coalesce(item->>'pu', '') ~ '^[0-9]{1,9}$' then (item->>'pu')::int end,
      coalesce((select array_agg(left(btrim(x), 40)) from (
                  select x from jsonb_array_elements_text(case when jsonb_typeof(item->'th') = 'array' then item->'th' else '[]'::jsonb end) x
                  where btrim(x) <> '' limit 6) t), '{}'),
      case when coalesce(item->>'n', '') ~ '^[0-9]{1,9}$' then (item->>'n')::int else 0 end,
      case when coalesce(item->>'img', '') ~ '^https://[^\s<>"''`\\]{4,}$' and char_length(item->>'img') <= 500 then item->>'img' end
    )
    on conflict (url) do update set
      title = excluded.title,
      organizer = excluded.organizer,
      source = excluded.source,
      location = excluded.location,
      is_online = excluded.is_online,
      starts_on = excluded.starts_on,
      ends_on = excluded.ends_on,
      prize_text = excluded.prize_text,
      prize_usd = excluded.prize_usd,
      themes = excluded.themes,
      participants = greatest(excluded.participants, hackathons.participants),
      image_url = coalesce(excluded.image_url, hackathons.image_url),
      updated_at = now();

    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.cb_hackathons_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists cb_hackathons_touch on public.hackathons;
create trigger cb_hackathons_touch before update on public.hackathons
  for each row execute function public.cb_hackathons_touch();


-- ---------------------------------------------------------------------
-- B7. Access rules: remove every old rule, then add the known set
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles', 'skills', 'user_skills', 'projects', 'project_roles_needed', 'project_members', 'applications',
        'messages', 'saved_projects', 'direct_messages', 'notifications', 'chat_reads', 'account_deletion_requests',
        'app_admins', 'admin_bootstrap_emails', 'activity_days', 'user_visits', 'project_milestones', 'project_upvotes',
        'community_rooms', 'community_messages', 'community_message_likes', 'community_room_reads', 'cb_welcomed',
        'cb_migrations', 'conversations', 'conversation_messages', 'funding_programs', 'funding_applications',
        'hackathons', 'hackathon_interest', 'profile_private'
      )
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Profiles
create policy "cb: profiles readable" on public.profiles for select to authenticated using (true);
create policy "cb: insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "cb: update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Skills
create policy "cb: skills readable" on public.skills for select to authenticated using (true);
create policy "cb: user_skills readable" on public.user_skills for select to authenticated using (true);
create policy "cb: add own skills" on public.user_skills for insert to authenticated with check (auth.uid() = user_id);
create policy "cb: remove own skills" on public.user_skills for delete to authenticated using (auth.uid() = user_id);

-- Projects: read-only from the app. Creating, editing and deleting go through the
-- checked functions (create_project / update_project / delete_project).
create policy "cb: projects readable" on public.projects for select to authenticated using (true);
create policy "cb: roles readable" on public.project_roles_needed for select to authenticated using (true);
create policy "cb: milestones readable" on public.project_milestones for select to authenticated using (true);

-- Teams: an owner can only add someone who actually applied.
create policy "cb: members readable" on public.project_members for select to authenticated using (true);
create policy "cb: owners add applicants" on public.project_members for insert to authenticated
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
    and (
      user_id = auth.uid()
      or exists (select 1 from public.applications a where a.project_id = project_members.project_id and a.applicant_id = project_members.user_id)
    )
  );
create policy "cb: owners or self remove members" on public.project_members for delete to authenticated
  using (auth.uid() = user_id or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

-- Applications
create policy "cb: applicant or owner reads application" on public.applications for select to authenticated
  using (auth.uid() = applicant_id or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "cb: apply as yourself" on public.applications for insert to authenticated with check (auth.uid() = applicant_id);
create policy "cb: owner decides application" on public.applications for update to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "cb: applicant withdraws" on public.applications for delete to authenticated using (auth.uid() = applicant_id);

-- Team chat
create policy "cb: team reads chat" on public.messages for select to authenticated
  using (exists (select 1 from public.project_members m where m.project_id = messages.project_id and m.user_id = auth.uid()));
create policy "cb: team writes chat" on public.messages for insert to authenticated
  with check (auth.uid() = sender_id and exists (select 1 from public.project_members m where m.project_id = messages.project_id and m.user_id = auth.uid()));

-- Saved projects
create policy "cb: own saved read" on public.saved_projects for select to authenticated using (auth.uid() = user_id);
create policy "cb: own saved add" on public.saved_projects for insert to authenticated with check (auth.uid() = user_id);
create policy "cb: own saved remove" on public.saved_projects for delete to authenticated using (auth.uid() = user_id);

-- Applicant <-> owner threads
create policy "cb: thread read" on public.direct_messages for select to authenticated
  using (auth.uid() = applicant_id or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "cb: thread send" on public.direct_messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id is not null
        and (auth.uid() = p.owner_id or (auth.uid() = applicant_id and applicant_id <> p.owner_id))
    )
  );

-- Notifications: yours only. Nobody can create one from the app.
create policy "cb: own notifications read" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "cb: own notifications mark read" on public.notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Read markers
create policy "cb: own chat reads" on public.chat_reads for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cb: own room reads" on public.community_room_reads for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Account deletion requests
create policy "cb: own deletion request read" on public.account_deletion_requests for select to authenticated
  using (auth.uid() = user_id or public.is_admin());
create policy "cb: own deletion request add" on public.account_deletion_requests for insert to authenticated
  with check (auth.uid() = user_id);

-- Admin list (so members can tell who is really staff)
create policy "cb: admins list readable" on public.app_admins for select to authenticated using (true);

-- Activity: your own streak days only (leaderboards use checked functions)
create policy "cb: own activity readable" on public.activity_days for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- Hypes
create policy "cb: upvotes readable" on public.project_upvotes for select to authenticated using (true);
create policy "cb: upvote as yourself" on public.project_upvotes for insert to authenticated with check (auth.uid() = user_id);
create policy "cb: remove own upvote" on public.project_upvotes for delete to authenticated using (auth.uid() = user_id);

-- Community
create policy "cb: rooms readable" on public.community_rooms for select to authenticated using (true);
create policy "cb: admins manage rooms" on public.community_rooms for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "cb: posts readable" on public.community_messages for select to authenticated using (true);
create policy "cb: post as yourself" on public.community_messages for insert to authenticated
  with check (
    auth.uid() = user_id
    and (public.is_admin() or not exists (select 1 from public.community_rooms r where r.id = room_id and r.is_locked))
  );
create policy "cb: delete own post or admin" on public.community_messages for delete to authenticated
  using (auth.uid() = user_id or public.is_admin());
create policy "cb: likes readable" on public.community_message_likes for select to authenticated using (true);
create policy "cb: like as yourself" on public.community_message_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "cb: unlike own" on public.community_message_likes for delete to authenticated using (auth.uid() = user_id);

-- Private messages
create policy "cb: participants read conversation" on public.conversations for select to authenticated
  using (auth.uid() in (user_a, user_b));
create policy "cb: participants read messages" on public.conversation_messages for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)));
create policy "cb: participants send messages" on public.conversation_messages for insert to authenticated
  with check (auth.uid() = sender_id
              and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)));

-- Funding
create policy "cb: programs readable" on public.funding_programs for select to authenticated using (is_active or public.is_admin());
create policy "cb: admins manage programs" on public.funding_programs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "cb: read own or admin funding apps" on public.funding_applications for select to authenticated
  using (auth.uid() = user_id or public.is_admin());
create policy "cb: apply for funding as yourself" on public.funding_applications for insert to authenticated
  with check (auth.uid() = user_id);
create policy "cb: withdraw own pending funding app" on public.funding_applications for delete to authenticated
  using (auth.uid() = user_id and status = 'submitted');

-- Hackathons
create policy "cb: hackathons readable" on public.hackathons for select to authenticated using (is_active or public.is_admin());
create policy "cb: admins manage hackathons" on public.hackathons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "cb: hackathon joins readable" on public.hackathon_interest for select to authenticated using (true);
create policy "cb: join as yourself" on public.hackathon_interest for insert to authenticated with check (auth.uid() = user_id);
create policy "cb: leave own" on public.hackathon_interest for delete to authenticated using (auth.uid() = user_id);

-- (no rules at all = invisible to the app) admin_bootstrap_emails, user_visits,
-- cb_welcomed, cb_migrations, profile_private

-- Any other table in the database gets row-level security switched on too.
do $$
declare t record;
begin
  for t in
    select c.oid::regclass as tbl from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
  loop
    begin
      execute format('alter table %s enable row level security', t.tbl);
    exception when others then
      raise notice 'Could not enable row-level security on % (%).', t.tbl, sqlerrm;
    end;
  end loop;

  -- Views follow the rules of the person looking, never of the view's owner.
  for t in
    select c.oid::regclass as tbl from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
  loop
    begin
      execute format('alter view %s set (security_invoker = true)', t.tbl);
    exception when others then
      raise notice 'Could not lock down view % (%).', t.tbl, sqlerrm;
    end;
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- B8. Profile pictures: images only, 5 MB max, no folder listing
-- ---------------------------------------------------------------------
do $$
begin
  update storage.buckets
     set public = true,
         file_size_limit = 5242880,
         allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
   where id = 'avatars';
exception when others then
  raise notice 'Avatar size/type limits were not changed (%).', sqlerrm;
end $$;

do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%avatars%' or coalesce(with_check, '') ilike '%avatars%')
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;

  -- Pictures still load for members through their public link; these rules only
  -- cover uploading/replacing your own, and stop anyone listing the folder.
  create policy "cb: avatars read own files" on storage.objects for select to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  create policy "cb: avatars upload own" on storage.objects for insert to authenticated
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
                and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp', 'gif'));
  create policy "cb: avatars replace own" on storage.objects for update to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
                and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp', 'gif'));
  create policy "cb: avatars delete own" on storage.objects for delete to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
exception when others then
  raise notice 'Avatar storage rules were not changed (%).', sqlerrm;
end $$;


-- ---------------------------------------------------------------------
-- B9. Permissions: closed by default
-- ---------------------------------------------------------------------

-- Logged-out visitors get nothing from the database, now and for future tables.
revoke all on all tables in schema public from anon, public;
revoke all on all sequences in schema public from anon, public;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- Tables the app must never touch directly, even when signed in.
revoke all on public.profile_private, public.admin_bootstrap_emails, public.user_visits,
              public.cb_welcomed, public.cb_migrations from anon, authenticated;

-- Functions: only the ones the app really calls stay open to signed-in members.
do $$
declare
  f record;
  allow text[] := array[
    'is_admin', 'touch_presence', 'get_online_count', 'create_project', 'update_project', 'delete_project',
    'set_milestone_done', 'list_rooms', 'mark_room_read', 'start_conversation', 'list_conversations',
    'mark_conversation_read', 'get_unread_dm_count', 'get_leaderboard', 'get_user_stats', 'get_platform_stats',
    'admin_overview', 'admin_member_growth', 'admin_active_series', 'admin_list_members', 'admin_set_admin',
    'admin_add_admin_by_email', 'admin_insights', 'admin_recent_activity', 'admin_set_featured',
    'admin_review_funding', 'admin_broadcast', 'admin_import_projects', 'admin_set_verified',
    'admin_import_hackathons'
  ];
  used_elsewhere boolean;
  was_open boolean;
begin
  for f in
    select p.oid, p.oid::regprocedure as sig, p.proname, p.prosecdef, p.proconfig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')   -- leave extensions alone
  loop
    begin
      was_open := has_function_privilege('authenticated', f.oid, 'execute');
      execute format('revoke all on routine %s from public, anon', f.sig);

      if f.proname = any(allow) then
        execute format('grant execute on routine %s to authenticated, service_role', f.sig);
      else
        -- Keep helpers that rules, column defaults, views or caller-rights functions depend on.
        used_elsewhere :=
          exists (select 1 from pg_policies pol
                  where (coalesce(pol.qual, '') || ' ' || coalesce(pol.with_check, '')) ilike '%' || f.proname || '(%')
          or exists (select 1 from pg_attrdef ad where pg_get_expr(ad.adbin, ad.adrelid) ilike '%' || f.proname || '(%')
          or exists (select 1 from pg_constraint c where c.contype = 'c' and pg_get_constraintdef(c.oid) ilike '%' || f.proname || '(%')
          or exists (select 1 from pg_views v where v.schemaname = 'public' and v.definition ilike '%' || f.proname || '(%')
          or exists (select 1 from pg_proc p2 join pg_namespace n2 on n2.oid = p2.pronamespace
                     where n2.nspname = 'public' and p2.oid <> f.oid and not p2.prosecdef
                       and p2.prosrc ilike '%' || f.proname || '(%');
        if used_elsewhere then
          if was_open then
            execute format('grant execute on routine %s to authenticated, service_role', f.sig);
          end if;
        else
          execute format('revoke all on routine %s from authenticated', f.sig);
        end if;
      end if;

    exception when others then
      raise notice 'Skipped % (%).', f.sig, sqlerrm;
    end;

    -- Functions that run with elevated rights always use a fixed lookup path.
    if f.prosecdef and not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      begin
        execute format('alter routine %s set search_path = public, extensions', f.sig);
      exception when others then
        raise notice 'Could not pin the lookup path of % (%).', f.sig, sqlerrm;
      end;
    end if;
  end loop;
end $$;


-- =====================================================================
-- PART C — THE HACKATHON LIST (one per line)
-- =====================================================================
select public.admin_import_hackathons($json$[
{"t":"UnivaBio ($40,000 in prizes)","o":"BioCataalysis","u":"https://univabio.devpost.com/","l":"Online","on":true,"s":"2026-08-07","e":"2026-10-13","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Health","Social Good"],"n":807,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/429/151/datas/medium_square.png"},
{"t":"Multimodal AI Hackathon 2026","o":"Kamand Prompt, IIT Mandi","u":"https://multimodal-ai-hackathon-2026-7.devpost.com/","l":"Online","on":true,"s":"2026-09-29","e":"2026-10-14","p":"₹100,000","pu":1200,"th":["Machine Learning/AI"],"n":3189,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/366/176/datas/medium_square.jpg"},
{"t":"WarriorHacks 2.0","o":"Westwood Computer Science Club","u":"https://warriorhacks-2-0.devpost.com/","l":"Online","on":true,"s":"2026-09-28","e":"2026-10-14","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Machine Learning/AI","Open Ended"],"n":2254,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/267/082/datas/medium_square.png"},
{"t":"Next Founders Hackathon","o":null,"u":"https://next-founders.devpost.com/","l":"Online","on":true,"s":"2026-08-16","e":"2026-10-15","p":"$275","pu":275,"th":["Beginner Friendly","Low/No Code","Open Ended"],"n":735,"src":"Devpost","img":null},
{"t":"HACK47: OFFGRID","o":"Hack47","u":"https://hack47-offgrid.devpost.com/","l":"Online","on":true,"s":"2026-09-15","e":"2026-10-15","p":"Non-cash prizes","pu":null,"th":["Enterprise","Open Ended","Robotic Process Automation"],"n":223,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/109/822/datas/medium_square.jpeg"},
{"t":"CodeSprint by Elite Coders","o":"elite coders","u":"https://codesprint-by-elitecoders.devpost.com/","l":"Online","on":true,"s":"2026-09-25","e":"2026-10-15","p":"₹30,000","pu":360,"th":["Beginner Friendly","Open Ended","Web"],"n":205,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/380/263/datas/medium_square.png"},
{"t":"INDUX 5.0-2026","o":"vikrant university, gwalior","u":"https://indux-5-0-2026.devpost.com/","l":"Vikrant University , Gwalior","on":false,"s":"2026-09-22","e":"2026-10-15","p":"₹225,000","pu":2700,"th":["Cybersecurity","Design","Robotic Process Automation"],"n":167,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/367/159/datas/medium_square.jpeg"},
{"t":"RESPAWN","o":"MS Ramaiah University of Applied Science","u":"https://respawn.devpost.com/","l":"Online","on":true,"s":"2026-10-12","e":"2026-10-15","p":"₹15,000","pu":180,"th":["Beginner Friendly","Design","Gaming"],"n":18,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/387/001/datas/medium_square.png"},
{"t":"HacKITSnova 2026","o":"karunya University","u":"https://hackitsnova-2026-31640.devpost.com/","l":"Madawarayapuram, India","on":false,"s":"2026-10-15","e":"2026-10-15","p":"₹14,998","pu":180,"th":["Beginner Friendly","Cybersecurity","Social Good"],"n":1,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/532/000/datas/medium_square.jpeg"},
{"t":"MLAI Hackathon 2026","o":"Mạng Lưới AI","u":"https://mlai-hackathon.devpost.com/","l":"Online","on":true,"s":"2026-09-18","e":"2026-10-16","p":"Non-cash prizes","pu":null,"th":["Databases","Machine Learning/AI"],"n":971,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/165/208/datas/medium_square.jpg"},
{"t":"Hack Apertus","o":"aiLights Association","u":"https://hackapertus.devpost.com/","l":"Grand Finals 2027","on":false,"s":"2026-10-01","e":"2026-10-16","p":"€10,680","pu":11534,"th":["Education","Machine Learning/AI","Social Good"],"n":801,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/992/867/datas/medium_square.png"},
{"t":"Daytona HackSprint w/ Arize AI - NYC, October 2026","o":"daytona","u":"https://daytona-hacksprint-nyc.devpost.com/","l":"AWS, JFK27","on":false,"s":"2026-10-16","e":"2026-10-16","p":"$7,000","pu":7000,"th":["Machine Learning/AI"],"n":25,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/384/999/datas/medium_square.png"},
{"t":"MLH Hacktoberfest Hack Day Teens Delhi X ElevenLabs","o":"MLH","u":"https://hacktoberfest-teens.devpost.com/","l":"The Grandeur By Lavanya-Moti Nagar","on":false,"s":"2026-10-17","e":"2026-10-17","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Low/No Code","Social Good"],"n":88,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/373/643/datas/medium_square.png"},
{"t":"HuskyHack 2026: Phase 1","o":"SoundCreditUnion and UW Tacoma","u":"https://huskyhack2026.devpost.com/","l":"Milgard Hall","on":false,"s":"2026-10-17","e":"2026-10-17","p":"$18,000","pu":18000,"th":["Fintech"],"n":86,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/283/020/datas/medium_square.png"},
{"t":"Build-A-Thon","o":"Major League Hacking","u":"https://build-a-thon-30568.devpost.com/","l":"NCC Digital Park, University of Ibadan","on":false,"s":"2026-10-16","e":"2026-10-17","p":"Non-cash prizes","pu":null,"th":["E-commerce/Retail","Health","Low/No Code"],"n":9,"src":"Devpost","img":null},
{"t":"Blank Page","o":"Blank Page","u":"https://blankpage.devpost.com/","l":"Microsoft NERD Center","on":false,"s":"2026-10-17","e":"2026-10-17","p":"$1,000","pu":1000,"th":["Design","Productivity"],"n":5,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/392/250/datas/medium_square.png"},
{"t":"Arm + ExecuTorch: Edge AI Challenge","o":"arm","u":"https://arm-executorch.devpost.com/","l":"San Francisco State University","on":false,"s":"2026-10-17","e":"2026-10-18","p":"Non-cash prizes","pu":null,"th":["AR/VR","IoT","Machine Learning/AI"],"n":92,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/362/865/datas/medium_square.png"},
{"t":"Girls Hoo Hack 2026","o":"Girls Who Code UVA","u":"https://girls-hoo-hack-2026.devpost.com/","l":"University of Virginia - Rice Hall","on":false,"s":"2026-10-17","e":"2026-10-18","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Open Ended","Social Good"],"n":67,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/893/713/datas/medium_square.png"},
{"t":"SVYCA Youth for Earth (Y4E) Hackathon","o":"Silicon Valley Youth Climate Action","u":"https://svycay4e.devpost.com/","l":"Stanford University","on":false,"s":"2026-09-20","e":"2026-10-18","p":"$2,700","pu":2700,"th":["Social Good"],"n":16,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/173/428/datas/medium_square.png"},
{"t":"804 Hacks","o":"UW Blockchain Society","u":"https://804hacks.devpost.com/","l":"Randolph-Macon College - Birdsong Hall","on":false,"s":"2026-10-18","e":"2026-10-18","p":"$400","pu":400,"th":["Beginner Friendly","Design","Web"],"n":15,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/150/128/datas/medium_square.png"},
{"t":"SwampHacks XII","o":"SwampHacks","u":"https://swamphacks-xii.devpost.com/","l":"University of Florida - Reitz Union","on":false,"s":"2026-10-16","e":"2026-10-18","p":"$11,000","pu":11000,"th":["Beginner Friendly","Fintech","Machine Learning/AI"],"n":9,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/435/611/datas/medium_square.png"},
{"t":"Seattle GiveCamp 2026","o":"Seattle GiveCamp","u":"https://seattle-givecamp-2026.devpost.com/","l":"Microsoft Building 122","on":false,"s":"2026-10-16","e":"2026-10-18","p":"Non-cash prizes","pu":null,"th":["Design","Social Good","Web"],"n":6,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/273/994/datas/medium_square.png"},
{"t":"Lehigh Fall 2026 Collegiate Hackathon","o":"CSBA","u":"https://lehigh-hacks.devpost.com/","l":"Online","on":true,"s":"2026-10-17","e":"2026-10-18","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Productivity","Social Good"],"n":3,"src":"Devpost","img":null},
{"t":"DubHacks '26","o":"University of Washington","u":"https://dubhacks-2026.devpost.com/","l":"UW Seattle- Husky Union Building","on":false,"s":"2026-10-17","e":"2026-10-18","p":"$9,200","pu":9200,"th":["Beginner Friendly","Social Good","Open Ended"],"n":2,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/531/589/datas/medium_square.png"},
{"t":"AMD Developer Hackathon: ACT III","o":"AMD × lablab.ai","u":"https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii","l":"Online + on-site finale","on":true,"s":"2026-10-12","e":"2026-10-18","p":null,"pu":null,"th":["Machine Learning/AI"],"n":0,"src":"lablab.ai","img":null},
{"t":"Hyperbloom October- UI/UX and Web Design","o":"hyperbloom hacks","u":"https://hyperbloom-october.devpost.com/","l":"Online","on":true,"s":"2026-10-01","e":"2026-10-19","p":"$9,117","pu":9117,"th":["Design","Productivity","Web"],"n":331,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/371/968/datas/medium_square.png"},
{"t":"HEALTHHACK 48","o":"HealthHack","u":"https://healthhack-48.devpost.com/","l":"Online","on":true,"s":"2026-10-17","e":"2026-10-19","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Health","Productivity"],"n":21,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/378/664/datas/medium_square.png"},
{"t":"EurekaDev 2026","o":"Eureka Institute and UnivaDev","u":"https://eurekadev.devpost.com/","l":"Online","on":true,"s":"2026-09-27","e":"2026-10-20","p":"$19,122","pu":19122,"th":["Beginner Friendly","Open Ended","Social Good"],"n":377,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/909/442/datas/medium_square.png"},
{"t":"CapCut x EAST2046 University of Cambridge Creator Lab Free Learning Campus","o":"east2046","u":"https://cambridge-creator-lab.devpost.com/","l":"IfM, University of Cambridge","on":false,"s":"2026-10-22","e":"2026-10-22","p":"Non-cash prizes","pu":null,"th":["Machine Learning/AI","Music/Art","Web"],"n":1,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/520/913/datas/medium_square.png"},
{"t":"Build, Ship, Shape: Amazon Developer Hackathon","o":"Amazon","u":"https://amazonappdev2026.devpost.com/","l":"Online","on":true,"s":"2026-08-31","e":"2026-10-23","p":"$138,000","pu":138000,"th":["Machine Learning/AI","Open Ended","Productivity"],"n":52630,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/173/047/datas/medium_square.png"},
{"t":"Next Gen Hackathon 2026 -Bengaluru","o":"RAAIF","u":"https://next-gen-hackathon.devpost.com/","l":"Tripura Vasini Palace Grounds, Bengaluru","on":false,"s":"2026-09-01","e":"2026-10-23","p":"₹50,000","pu":600,"th":["AR/VR","IoT","Machine Learning/AI"],"n":298,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/193/778/datas/medium_square.png"},
{"t":"Neighborhood Hacks","o":null,"u":"https://neighborhood-hacks-2026.devpost.com/","l":"Online","on":true,"s":"2026-10-16","e":"2026-10-24","p":"$57,866","pu":57866,"th":["Beginner Friendly","Social Good"],"n":184,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/177/882/datas/medium_square.png"},
{"t":"Sierra Hacks 2026","o":"CodeCatalyst","u":"https://sierra-hacks-2026.devpost.com/","l":"Sierra High School","on":false,"s":"2026-10-24","e":"2026-10-24","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Machine Learning/AI","Web"],"n":6,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/173/957/datas/medium_square.png"},
{"t":"SDC Hackathon 2026","o":"Xiamen University Malaysia","u":"https://sdc-hackathon-2026.devpost.com/","l":"Xiamen University Malaysia","on":false,"s":"2026-10-19","e":"2026-10-24","p":"$5,500","pu":5500,"th":["Beginner Friendly","Machine Learning/AI","Social Good"],"n":4,"src":"Devpost","img":null},
{"t":"Gear Up Hacks 2026","o":"Gear Up Foundation","u":"https://gear-up-hacks-2026.devpost.com/","l":"Lincoln on Geer","on":false,"s":"2026-10-24","e":"2026-10-24","p":"Non-cash prizes","pu":null,"th":["Mobile","Social Good","Web"],"n":3,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/206/811/datas/medium_square.png"},
{"t":"Black Code Collective Hacktoberfest","o":"Black Code Collective","u":"https://bcc-hacktoberfest.devpost.com/","l":"Washington DC","on":false,"s":"2026-10-12","e":"2026-10-24","p":"$1,000","pu":1000,"th":["Education","Health","Social Good"],"n":2,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/520/303/datas/medium_square.jpg"},
{"t":"IEEE ClimateChain Global Hackathon","o":"IEEE Turkey","u":"https://ieee-climatechain-hack.devpost.com/","l":"Online","on":true,"s":"2026-10-05","e":"2026-10-25","p":"$3,000","pu":3000,"th":["Blockchain","Machine Learning/AI","Social Good"],"n":672,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/642/899/datas/medium_square.png"},
{"t":"Gator Hack V - AI Days 2026","o":"University of Florida","u":"https://gatorhack2026.devpost.com/","l":null,"on":false,"s":"2026-10-23","e":"2026-10-25","p":"$3,500","pu":3500,"th":["Education"],"n":96,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/288/165/datas/medium_square.png"},
{"t":"2026 AI for Good Hackathon","o":"Florida Data Science for Social Good","u":"https://2026ai4goodhackathon.devpost.com/","l":"The Link","on":false,"s":"2026-10-23","e":"2026-10-25","p":"Non-cash prizes","pu":null,"th":["Machine Learning/AI","Social Good","Music/Art"],"n":30,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/185/970/datas/medium_square.png"},
{"t":"HarborHack 2026 - Agent In The Loop","o":"Charlestonhacks","u":"https://harborhack-2026.devpost.com/","l":"College of Charleston, Harbor Walk","on":false,"s":"2026-10-23","e":"2026-10-25","p":"$1,500","pu":1500,"th":["Machine Learning/AI","Open Ended","Beginner Friendly"],"n":25,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/829/092/datas/medium_square.png"},
{"t":"HackOHI/O 2026","o":"OHI/O","u":"https://hackohio2026.devpost.com/","l":"The Ohio State University - Ohio Union","on":false,"s":"2026-10-24","e":"2026-10-25","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Machine Learning/AI","Open Ended"],"n":2,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/338/139/datas/medium_square.png"},
{"t":"Action Space","o":"university of pennsylvania","u":"https://action-space-hacks.devpost.com/","l":"Fab Lab","on":false,"s":"2026-10-24","e":"2026-10-25","p":"Non-cash prizes","pu":null,"th":["Machine Learning/AI","Robotic Process Automation"],"n":2,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/173/168/datas/medium_square.png"},
{"t":"DS+X Hackathon 2026","o":"Boston University Spark!","u":"https://ds-x-hackathon-2026.devpost.com/","l":"Boston University- CDS","on":false,"s":"2026-10-24","e":"2026-10-25","p":"$5,000","pu":5000,"th":["Databases","Health","Machine Learning/AI"],"n":1,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/541/183/datas/medium_square.png"},
{"t":"The Top 500 (UH v2)","o":"noclue","u":"https://the-top-500-uh-v2.devpost.com/","l":"Online","on":true,"s":"2026-10-23","e":"2026-10-25","p":null,"pu":null,"th":["Low/No Code","Open Ended","Social Good"],"n":1,"src":"Devpost","img":null},
{"t":"Build With AI: Basics","o":"Devpost","u":"https://learn-ai-basics.devpost.com/","l":"Online","on":true,"s":"2026-09-22","e":"2026-10-26","p":"$2,500","pu":2500,"th":["Machine Learning/AI","Beginner Friendly","Education"],"n":2902,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/366/318/datas/medium_square.png"},
{"t":"OpenCV AI Competition 2026, powered by AWS","o":"OpenCV","u":"https://opencv26.devpost.com/","l":"Online","on":true,"s":"2026-08-26","e":"2026-10-27","p":"$20,250","pu":20250,"th":["IoT","Machine Learning/AI","Serverless"],"n":4522,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/087/526/datas/medium_square.png"},
{"t":"Life After Code","o":"GitLab","u":"https://gitlab-transcend.devpost.com/","l":"Online","on":true,"s":"2026-10-05","e":"2026-10-27","p":"$45,000","pu":45000,"th":["DevOps","Machine Learning/AI","Productivity"],"n":1475,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/376/754/datas/medium_square.png"},
{"t":"HTCJ × PROOF Aviation Futures Challenge","o":"hacktheconcretejungle","u":"https://htcj-aviation-futures.devpost.com/","l":"Boston Venture Week","on":false,"s":"2026-06-25","e":"2026-10-27","p":"Non-cash prizes","pu":null,"th":["Enterprise","Machine Learning/AI","Social Good"],"n":103,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/314/895/datas/medium_square.jpg"},
{"t":"Code For DFW","o":null,"u":"https://code-for-dfw.devpost.com/","l":"Online","on":true,"s":"2026-10-20","e":"2026-10-27","p":"Non-cash prizes","pu":null,"th":["Open Ended","Social Good","Beginner Friendly"],"n":4,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/414/751/datas/medium_square.png"},
{"t":"AWS Communication Developer Services (CDS) Agentic AI Partner Hackathon","o":"AWS","u":"https://aws-cds-partner.devpost.com/","l":"Online","on":true,"s":"2026-09-14","e":"2026-10-28","p":"$40,000","pu":40000,"th":["Communication","Mobile","Machine Learning/AI"],"n":841,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/155/384/datas/medium_square.png"},
{"t":"2026 International CodeTheCure Hackathon","o":"CodeTheCure","u":"https://codethecure-hackathon-26.devpost.com/","l":"Online","on":true,"s":"2026-10-10","e":"2026-10-28","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Education","Health"],"n":48,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/363/906/datas/medium_square.png"},
{"t":"SUSTAIN-A-THON 2.0","o":"Sharda University Greater Noida","u":"https://sustain-a-thon-2-0-31534.devpost.com/","l":"Block 45, Sharda University,","on":false,"s":"2026-10-27","e":"2026-10-28","p":"$150,000","pu":150000,"th":["Blockchain","Cybersecurity","IoT"],"n":17,"src":"Devpost","img":null},
{"t":"Nebius x NVIDIA Global AI Hackathon","o":"nebius","u":"https://nebiusglobalaihackathon.devpost.com/","l":"Online","on":true,"s":"2026-08-26","e":"2026-10-30","p":"$50,000","pu":50000,"th":["Machine Learning/AI","Beginner Friendly","Robotic Process Automation"],"n":20452,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/173/025/datas/medium_square.png"},
{"t":"Qloo Agentic Hackathon","o":"Qloo","u":"https://qloo.devpost.com/","l":"Online","on":true,"s":"2026-09-30","e":"2026-10-30","p":"$25,000","pu":25000,"th":["Machine Learning/AI"],"n":909,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/363/782/datas/medium_square.png"},
{"t":"HackFW: MADE Challenge","o":"Fort Worth DAO","u":"https://hackfw.devpost.com/","l":"Fort Worth","on":false,"s":"2026-10-01","e":"2026-10-30","p":"$1,900","pu":1900,"th":["IoT","Machine Learning/AI","Robotic Process Automation"],"n":100,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/018/511/datas/medium_square.png"},
{"t":"InnovateX 2026","o":"Ecobank (Blaze)","u":"https://www.innovatex.africa/","l":"Nigeria (Lagos, Port Harcourt, Abuja) + virtual","on":false,"s":"2026-10-30","e":"2026-10-30","p":"₦20,000,000","pu":13000,"th":["Fintech","Students","Africa"],"n":0,"src":"InnovateX","img":null},
{"t":"Galuxium Nexus V2","o":"Galuxium","u":"https://galuxium-nexus-v2-29411.devpost.com/","l":"Online","on":true,"s":"2026-07-15","e":"2026-10-31","p":"$14,644","pu":14644,"th":["Enterprise","Machine Learning/AI","Productivity"],"n":956,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/684/795/datas/medium_square.png"},
{"t":"Next Byte Hacks V5","o":"Next Byte Hacks","u":"https://next-byte-hacks-v5.devpost.com/","l":"Online","on":true,"s":"2026-10-06","e":"2026-10-31","p":"$100","pu":100,"th":["Beginner Friendly","Low/No Code","Open Ended"],"n":102,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/524/008/datas/medium_square.jpg"},
{"t":"InternWell Hack2.0","o":"InternWell-SLIET","u":"https://interwell-hack2-0.devpost.com/","l":"Online","on":true,"s":"2026-10-03","e":"2026-10-31","p":"₹1,000","pu":12,"th":["Communication","Machine Learning/AI","Web"],"n":84,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/494/543/datas/medium_square.jpg"},
{"t":"RenderJuice Blender Animation & Programmatic Rendering Contest","o":"RenderJuice","u":"https://programmatic-rendering-contest.devpost.com/","l":"New York, NY","on":false,"s":"2026-10-14","e":"2026-10-31","p":"$1,500","pu":1500,"th":["Design","Music/Art","Open Ended"],"n":10,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/341/415/datas/medium_square.png"},
{"t":"LarpHacks","o":"larphacks","u":"https://larphacks.devpost.com/","l":"Toronto","on":false,"s":"2026-11-01","e":"2026-11-01","p":"$21,394","pu":21394,"th":["Beginner Friendly","Machine Learning/AI","Web"],"n":134,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/982/889/datas/medium_square.png"},
{"t":"Global Energy Hackathon 2026","o":"Anneru Solutions","u":"https://hackathon.anneru.com/","l":"Online","on":true,"s":"2026-10-30","e":"2026-11-01","p":"$10,000+","pu":10000,"th":["Energy","Open Ended","Beginner Friendly"],"n":0,"src":"Anneru","img":null},
{"t":"YouCam API Skin AI & eCommerce VTO Hackathon","o":"Perfect Corp","u":"https://youcam-api-skin-ai-ecommerce.devpost.com/","l":"Online","on":true,"s":"2026-09-29","e":"2026-11-02","p":"$6,000","pu":6000,"th":["AR/VR","E-commerce/Retail","Machine Learning/AI"],"n":758,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/375/196/datas/medium_square.png"},
{"t":"Ostad Presents YUNet AIgnite Buildathon 2026","o":"Youth Upskill Network - YUNet","u":"https://yunet-aignite26.devpost.com/","l":"Online","on":true,"s":"2026-11-01","e":"2026-11-05","p":"Non-cash prizes","pu":null,"th":["Education","Low/No Code","Machine Learning/AI"],"n":2,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/544/995/datas/medium_square.png"},
{"t":"Asymmetric Reframed Reality Hackathon & Co-Creation Workshop","o":"Goldsmiths, University of London","u":"https://arr-hackathon-co-creation.devpost.com/","l":"Caroline Graveson Building","on":false,"s":"2026-11-04","e":"2026-11-06","p":"Non-cash prizes","pu":null,"th":["AR/VR","Health","Music/Art"],"n":2,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/529/266/datas/medium_square.jpg"},
{"t":"Stupid Ideas Hackathon (Ottawa F26)","o":"stupid ideas hackathon","u":"https://stupideas-ottawa-f26.devpost.com/","l":"Ottawa, Canada","on":false,"s":"2026-11-07","e":"2026-11-07","p":"CA$917","pu":669,"th":["Beginner Friendly","Open Ended","Social Good"],"n":62,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/771/912/datas/medium_square.png"},
{"t":"ETHGlobal Mumbai","o":"ETHGlobal","u":"https://ethglobal.com/events/mumbai","l":"Mumbai, India","on":false,"s":"2026-11-05","e":"2026-11-07","p":null,"pu":null,"th":["Blockchain","Web3"],"n":0,"src":"ETHGlobal","img":null},
{"t":"Since AI 2026","o":"Since AI ry","u":"https://sinceai2026.devpost.com/","l":"Kupittaa Campus, Turku","on":false,"s":"2026-11-06","e":"2026-11-08","p":"€50,000","pu":54000,"th":["Machine Learning/AI","Open Ended","Enterprise"],"n":78,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/815/575/datas/medium_square.png"},
{"t":"EthnoHack","o":"ETHCSTWIN","u":"https://ethnohack2026.devpost.com/","l":"Online","on":true,"s":"2026-11-02","e":"2026-11-08","p":"Non-cash prizes","pu":null,"th":["Databases","Health","Machine Learning/AI"],"n":47,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/370/953/datas/medium_square.png"},
{"t":"BioHacks","o":"BioEng4Youth","u":"https://biohacksmcmaster.devpost.com/","l":"McMaster University - PGCLL","on":false,"s":"2026-11-07","e":"2026-11-08","p":"Non-cash prizes","pu":null,"th":["Health","Machine Learning/AI","Open Ended"],"n":40,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/727/866/datas/medium_square.png"},
{"t":"Hack the Change 2026","o":"Code the Change YYC","u":"https://hack-the-change-2026.devpost.com/","l":"University of Calgary","on":false,"s":"2026-11-07","e":"2026-11-08","p":"CA$5,000","pu":3650,"th":["Education","Social Good","Web"],"n":26,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/029/578/datas/medium_square.png"},
{"t":"Sheridan Datathon 2026","o":"GDG on Campus Sheridan College","u":"https://sheridandatathon2026.devpost.com/","l":"Sheridan College Hazel McCallion Campus","on":false,"s":"2026-11-07","e":"2026-11-08","p":"CA$10,000","pu":7300,"th":["Beginner Friendly","Databases","Machine Learning/AI"],"n":22,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/371/173/datas/medium_square.png"},
{"t":"HackStorm 3.0: Sense, Think and Act","o":"HackStorm","u":"https://hackstorm3.devpost.com/","l":"San Francisco, California, USA","on":false,"s":"2026-11-06","e":"2026-11-08","p":"$5,200","pu":5200,"th":["DevOps","IoT","Robotic Process Automation"],"n":22,"src":"Devpost","img":null},
{"t":"HackRPI 2026","o":"HackRPI","u":"https://hackrpi-2026.devpost.com/","l":"Darrin Communications Center","on":false,"s":"2026-11-07","e":"2026-11-08","p":"$3,550","pu":3550,"th":["Beginner Friendly"],"n":15,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/186/807/datas/medium_square.png"},
{"t":"HackCamp 2026","o":"nwPlus","u":"https://hackcamp-2026.devpost.com/","l":"Vancouver, Canada","on":false,"s":"2026-11-07","e":"2026-11-08","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Machine Learning/AI","Social Good"],"n":14,"src":"Devpost","img":null},
{"t":"MakeUC 2026","o":"IEEE@UC","u":"https://makeuc-2026-30884.devpost.com/","l":"1819 Innovation Hub","on":false,"s":"2026-11-07","e":"2026-11-08","p":"Non-cash prizes","pu":null,"th":["DevOps","IoT","Web"],"n":10,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/047/660/datas/medium_square.png"},
{"t":"CrownHacks","o":"Club for AI Research - Charlotte","u":"https://crownhacks.devpost.com/","l":"UNC Charlotte - Woodward Hall Room 106","on":false,"s":"2026-11-06","e":"2026-11-08","p":"Non-cash prizes","pu":null,"th":["Machine Learning/AI","Robotic Process Automation","Cybersecurity"],"n":9,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/185/401/datas/medium_square.png"},
{"t":"Redhawk Builds 2026","o":"Miami","u":"https://redhawk-builds-2026.devpost.com/","l":"McVey Data Science Building","on":false,"s":"2026-11-07","e":"2026-11-08","p":"$3,500","pu":3500,"th":["Fintech","Machine Learning/AI"],"n":1,"src":"Devpost","img":null},
{"t":"Vultr: Agent Rush Hackathon","o":"Vultr × lablab.ai","u":"https://lablab.ai/ai-hackathons/vultr-hackathon","l":"Online + on-site finale","on":true,"s":"2026-11-03","e":"2026-11-08","p":null,"pu":null,"th":["Machine Learning/AI"],"n":0,"src":"lablab.ai","img":null},
{"t":"PayPal AI Hackathon","o":"PayPal","u":"https://paypalaihackathon.devpost.com/","l":"Online","on":true,"s":"2026-10-01","e":"2026-11-12","p":"$67,500","pu":67500,"th":["Low/No Code","Machine Learning/AI","Web"],"n":10614,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/288/985/datas/medium_square.png"},
{"t":"Hackperimeter","o":"Georgia State University","u":"https://hackperimeter.devpost.com/","l":"GSU Perimeter College - Clarkston Campus","on":false,"s":"2026-11-13","e":"2026-11-13","p":"$1,000","pu":1000,"th":["Beginner Friendly","Open Ended","Web"],"n":1,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/534/551/datas/medium_square.png"},
{"t":"Haven Princeton Game Jam - High School","o":"Hack Club","u":"https://haven-asbury-park.devpost.com/","l":"1435 Capital","on":false,"s":"2026-11-14","e":"2026-11-14","p":"$3,551","pu":3551,"th":["Beginner Friendly","Design","Gaming"],"n":3,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/538/799/datas/medium_square.png"},
{"t":"DSH Hacks V2 ($100k+ in prizes!)","o":"STEMise","u":"https://dsh-hacks-v2.devpost.com/","l":"Online","on":true,"s":"2026-06-24","e":"2026-11-15","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Low/No Code","Open Ended"],"n":431,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/152/677/datas/medium_square.png"},
{"t":"STEMergent Hacks 2026","o":"STEMergent","u":"https://stemergent-hacks.devpost.com/","l":"Online","on":true,"s":"2026-10-31","e":"2026-11-15","p":"Non-cash prizes","pu":null,"th":["Low/No Code","Machine Learning/AI","Social Good"],"n":77,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/273/593/datas/medium_square.png"},
{"t":"IceHacks","o":"CodeStarters","u":"https://icehacks.devpost.com/","l":"Online","on":true,"s":"2026-11-08","e":"2026-11-15","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Low/No Code","Open Ended"],"n":3,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/491/441/datas/medium_square.png"},
{"t":"Meta VR Start Developer Competition 2026","o":"Meta","u":"https://start-developer-competition-26.devpost.com/","l":"Online","on":true,"s":"2026-09-24","e":"2026-11-18","p":"$1,000,000","pu":1000000,"th":["AR/VR","Machine Learning/AI","Web"],"n":2778,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/374/843/datas/medium_square.png"},
{"t":"Build with Gemma - Innovate in Windsor","o":"Google Developer Groups Windsor","u":"https://innovate-in-windsor-hackathon.devpost.com/","l":"University of Windsor","on":false,"s":"2026-11-13","e":"2026-11-20","p":null,"pu":null,"th":["Machine Learning/AI"],"n":10,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/298/521/datas/medium_square.png"},
{"t":"Bridge The Gap Hacks","o":"Bridge The Gap Hacks","u":"https://sq-hacks.devpost.com/","l":"Online","on":true,"s":"2026-11-15","e":"2026-11-21","p":null,"pu":null,"th":["Beginner Friendly","Machine Learning/AI","Social Good"],"n":34,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/826/556/datas/medium_square.png"},
{"t":"Teens Hack Houston Hackathon","o":"HackClub ✓⃝","u":"https://tripleh.devpost.com/","l":"The Post","on":false,"s":"2026-11-14","e":"2026-11-21","p":"$300","pu":300,"th":["Beginner Friendly","Low/No Code","Productivity"],"n":11,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/082/370/datas/medium_square.jpg"},
{"t":"DevFest Münster 2026: Agentic AI Hackathon","o":"GDG Münster","u":"https://devfest-ai-hackathon.devpost.com/","l":"Volkshochschule","on":false,"s":"2026-11-21","e":"2026-11-21","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Low/No Code","Machine Learning/AI"],"n":10,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/339/368/datas/medium_square.png"},
{"t":"Cutie Hack 2026","o":"ACM at UCR","u":"https://cutie-hack-2026.devpost.com/","l":"UC Riverside - Winston Chung Hall","on":false,"s":"2026-11-21","e":"2026-11-21","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Open Ended","Social Good"],"n":10,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/915/817/datas/medium_square.png"},
{"t":"FutureForge Hacks","o":"Future Forge","u":"https://futureforge-hacks.devpost.com/","l":"Pleasanton, CA","on":false,"s":"2026-11-21","e":"2026-11-21","p":null,"pu":null,"th":["Education","Machine Learning/AI","Social Good"],"n":7,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/058/924/datas/medium_square.png"},
{"t":"KUK VIRTUAL HACKATHON","o":"Kelab UMNO Korea","u":"https://kuk-virtual-hackathon.devpost.com/","l":"Online","on":true,"s":"2026-11-15","e":"2026-11-22","p":"$800","pu":800,"th":["Databases","Machine Learning/AI","Productivity"],"n":10,"src":"Devpost","img":null},
{"t":"Hack Western 13","o":"Hack Western","u":"https://hack-western-13.devpost.com/","l":"London, Canada","on":false,"s":"2026-11-20","e":"2026-11-22","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Open Ended"],"n":8,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/421/169/datas/medium_square.png"},
{"t":"AMD AI League","o":"AMD × lablab.ai","u":"https://lablab.ai/ai-hackathons/amd-lablab-ai-academy-challenge","l":"Online","on":true,"s":"2026-09-01","e":"2026-12-01","p":null,"pu":null,"th":["Machine Learning/AI","Beginner Friendly"],"n":0,"src":"lablab.ai","img":null},
{"t":"Revolution","o":"Hack Club Monterrey and High Coders MTY","u":"https://revolution-mty2026.devpost.com/","l":"Museo Del Acero Horno 3","on":false,"s":"2026-12-05","e":"2026-12-06","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","IoT","Open Ended"],"n":2,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/119/040/datas/medium_square.png"},
{"t":"2026-2027 Fall ESE Senior Design","o":"university of pennsylvania","u":"https://ese4500f26.devpost.com/","l":"Amy Gutman Hall","on":false,"s":"2026-09-22","e":"2026-12-07","p":"Non-cash prizes","pu":null,"th":["AR/VR","Fintech","Quantum"],"n":97,"src":"Devpost","img":null},
{"t":"hack::peel 2026","o":"Absolute Robotics #4308","u":"https://hack-peel.devpost.com/","l":"The Woodlands Secondary School","on":false,"s":"2026-12-12","e":"2026-12-13","p":"CA$100","pu":73,"th":["Design","Education","Open Ended"],"n":6,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/714/459/datas/medium_square.png"},
{"t":"AI Agents for Founders Challenge — HETIC 2026","o":"HETIC","u":"https://ai-agents-founders-hetic-26.devpost.com/","l":"Online","on":true,"s":"2026-11-04","e":"2026-12-18","p":"€997","pu":1077,"th":["Low/No Code","Machine Learning/AI","Productivity"],"n":52,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/366/043/datas/medium_square.png"},
{"t":"Arbiter Hacks V1","o":"Arbiter","u":"https://arbiter-hacks-v1.devpost.com/","l":"Online","on":true,"s":"2026-10-20","e":"2026-12-21","p":"$3,800","pu":3800,"th":["Beginner Friendly","Machine Learning/AI","Open Ended"],"n":244,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/995/823/datas/medium_square.jpg"},
{"t":"Cosmo Hacks","o":"Cosmo Hacks","u":"https://cosmohacks.devpost.com/","l":"Online","on":true,"s":"2026-12-18","e":"2026-12-21","p":"$142,605","pu":142605,"th":["Beginner Friendly","Open Ended","Education"],"n":213,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/321/162/datas/medium_square.png"},
{"t":"evensonarisnord","o":"HoustonHacks2026","u":"https://evensonarisnord.devpost.com/","l":"Online","on":true,"s":"2026-12-31","e":"2026-12-31","p":"$150","pu":150,"th":["Communication","Databases"],"n":113,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/003/858/918/datas/medium_square.jpeg"},
{"t":"InnovArt 2027: Art and Technology Hack Day","o":"Binnovative","u":"https://innovart2027.devpost.com/","l":"Online","on":true,"s":"2026-08-23","e":"2027-01-02","p":"Non-cash prizes","pu":null,"th":["Music/Art","Beginner Friendly","Open Ended"],"n":172,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/163/349/datas/medium_square.jpg"},
{"t":"United Hacks V8","o":"Hack United","u":"https://unitedhacksv8.devpost.com/","l":"Online","on":true,"s":"2027-01-08","e":"2027-01-10","p":"$13,700","pu":13700,"th":["Beginner Friendly","Design","Education"],"n":210,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/021/146/datas/medium_square.png"},
{"t":"checkpoint 1 — games for good","o":"Checkpoint","u":"https://checkpoint-1.devpost.com/","l":"Online","on":true,"s":"2027-01-08","e":"2027-01-10","p":"$1,400","pu":1400,"th":["Gaming","Machine Learning/AI","Social Good"],"n":24,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/239/296/datas/medium_square.png"},
{"t":"Syntax Summit","o":null,"u":"https://syntax-summit.devpost.com/","l":"Online","on":true,"s":"2026-07-18","e":"2027-01-14","p":"Non-cash prizes","pu":null,"th":["DevOps","Machine Learning/AI","Robotic Process Automation"],"n":314,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/929/208/datas/medium_square.png"},
{"t":"Code for Humanity","o":null,"u":"https://code-for-humanity.devpost.com/","l":"Online","on":true,"s":"2026-07-16","e":"2027-01-15","p":"Non-cash prizes","pu":null,"th":["Education","Machine Learning/AI","Web"],"n":547,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/909/585/datas/medium_square.png"},
{"t":"Hoya Hacks 2027","o":"Hoya Hacks","u":"https://hoya-hacks-2027.devpost.com/","l":"Healey Family Student Center","on":false,"s":"2027-01-22","e":"2027-01-24","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Open Ended","Social Good"],"n":17,"src":"Devpost","img":null},
{"t":"GoatHacks 2027","o":"WPI ACM","u":"https://goathacks-2027.devpost.com/","l":"WPI - Campus Center","on":false,"s":"2027-01-29","e":"2027-01-31","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Low/No Code","IoT"],"n":17,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/634/565/datas/medium_square.png"},
{"t":"H.A.R.D. Hack 2027","o":"HKN (Eta Kappa Nu)","u":"https://h-a-r-d-hack-2027.devpost.com/","l":"University of California - Jacobs Hall","on":false,"s":"2027-01-30","e":"2027-01-31","p":"$300","pu":300,"th":["Beginner Friendly","Education","Health"],"n":15,"src":"Devpost","img":null},
{"t":"NSH @RPI 2027","o":"NSBE-SHPE RPI","u":"https://nsh-rpi-2027.devpost.com/","l":"RPI DCC","on":false,"s":"2027-01-30","e":"2027-01-31","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Productivity","Social Good"],"n":4,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/283/061/datas/medium_square.png"},
{"t":"HackTitan","o":"IWU","u":"https://hacktitan.devpost.com/","l":"Online","on":true,"s":"2027-02-02","e":"2027-02-04","p":"$10,000","pu":10000,"th":["Beginner Friendly","Databases","DevOps"],"n":164,"src":"Devpost","img":null},
{"t":"SpartaHack 12","o":"SpartaHack","u":"https://spartahack-12.devpost.com/","l":"MSU - STEM Building","on":false,"s":"2027-02-06","e":"2027-02-07","p":null,"pu":null,"th":["Beginner Friendly","Machine Learning/AI","Social Good"],"n":8,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/856/924/datas/medium_square.jpg"},
{"t":"DeveloperWeek 2027 Hackathon","o":"DevNetwork","u":"https://developerweek-2027-hackathon.devpost.com/","l":"Santa Clara Convention Center + Online","on":false,"s":"2027-01-25","e":"2027-02-11","p":"$6,000","pu":6000,"th":["Enterprise","IoT","Machine Learning/AI"],"n":193,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/828/557/datas/medium_square.jpg"},
{"t":"NTU Beyond Binary Techathon 2027","o":"NTU Women In Tech","u":"https://ntu-beyond-binary-2027.devpost.com/","l":"Singapore","on":false,"s":"2027-02-09","e":"2027-02-13","p":"$10,000","pu":10000,"th":["Beginner Friendly","Machine Learning/AI"],"n":7,"src":"Devpost","img":null},
{"t":".devHacks 2027","o":".devClub","u":"https://devhacks-2027.devpost.com/","l":"EITC Building, University of Manitoba","on":false,"s":"2027-02-19","e":"2027-02-21","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Open Ended"],"n":4,"src":"Devpost","img":null},
{"t":"Hook Em Hacks 2027","o":"Hook Em Hacks","u":"https://hook-em-hacks-2027.devpost.com/","l":"Austin, TX, USA","on":false,"s":"2027-02-27","e":"2027-02-28","p":"$1,000","pu":1000,"th":["Open Ended"],"n":2,"src":"Devpost","img":null},
{"t":"Ticket to Hack","o":"university of virginia","u":"https://ticket-to-hack.devpost.com/","l":"Rice Hall","on":false,"s":"2027-02-27","e":"2027-02-28","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly"],"n":2,"src":"Devpost","img":null},
{"t":"WiCS Hackathon","o":"MLH","u":"https://wics-hackathon.devpost.com/","l":"Online","on":true,"s":"2027-02-28","e":"2027-03-02","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Design","Education"],"n":7,"src":"Devpost","img":null},
{"t":"Kent Hack Enough 2027","o":"HacKSU","u":"https://khe-2027.devpost.com/","l":"Kent State University - DI Hub","on":false,"s":"2027-03-06","e":"2027-03-07","p":"Non-cash prizes","pu":null,"th":["Beginner Friendly","Open Ended"],"n":5,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/719/992/datas/medium_square.png"},
{"t":"Tech to Treasure Hackathon","o":"bin to better","u":"https://techtotreasure.devpost.com/","l":"Tully Community Branch Library","on":false,"s":"2027-03-03","e":"2027-03-10","p":"$450","pu":450,"th":["Beginner Friendly","Education","Social Good"],"n":81,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/303/066/datas/medium_square.png"},
{"t":"Build Beyond Hackathon","o":"OSC","u":"https://build-beyond.devpost.com/","l":"Online","on":true,"s":"2027-03-01","e":"2027-03-15","p":"$5,000","pu":5000,"th":["Beginner Friendly","Open Ended","Productivity"],"n":7,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/500/480/datas/medium_square.png"},
{"t":"BearHacks 2027","o":"BearHacks","u":"https://bearhacks2027.devpost.com/","l":"Sheridan College Hazel McCallion Campus","on":false,"s":"2027-04-23","e":"2027-04-25","p":"CA$10,000","pu":7300,"th":["Machine Learning/AI","Mobile","Web"],"n":30,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/874/689/datas/medium_square.png"},
{"t":"Desert Dev Lab 2027","o":"NM Tech Talks","u":"https://desert-dev-lab-2027.devpost.com/","l":"Albuquerque, NM, USA","on":false,"s":"2027-04-24","e":"2027-04-25","p":"$1,000","pu":1000,"th":["Beginner Friendly","Health","Social Good"],"n":2,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/005/185/253/datas/medium_square.png"},
{"t":"hacks test","o":null,"u":"https://youtube-automation-hackathon.devpost.com/","l":"Vancouver, Canada","on":false,"s":"2027-09-09","e":"2027-12-10","p":"$1","pu":1,"th":["Beginner Friendly","Open Ended","Web"],"n":10,"src":"Devpost","img":null},
{"t":"Brewing Codes 4.0","o":"HARD MODE","u":"https://brewing-codes-4-0.devpost.com/","l":"Online","on":true,"s":"2028-03-12","e":"2028-03-27","p":"₹100,000","pu":1200,"th":["Low/No Code","Machine Learning/AI","Web"],"n":77,"src":"Devpost","img":"https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/427/203/datas/medium_square.jpeg"}
]$json$::jsonb) as hackathons_saved;

notify pgrst, 'reload schema';

commit;


-- =====================================================================
-- CHECKLIST — this is what you should see when it finishes
-- =====================================================================
select item as "Check", result as "Result" from (
  select 1 as ord, 'Hackathons in the app' as item, (select count(*)::text || ' ✅' from public.hackathons) as result
  union all
  select 2, 'Tables a logged-out visitor can read',
         coalesce((select string_agg(c.relname, ', ') from pg_class c join pg_namespace n on n.oid = c.relnamespace
                   where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm') and has_table_privilege('anon', c.oid, 'select')),
                  'None ✅')
  union all
  select 3, 'Functions a logged-out visitor can run',
         coalesce((select string_agg(p.proname, ', ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
                     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')),
                  'None ✅')
  union all
  select 4, 'Tables without row-level security',
         coalesce((select string_agg(c.relname, ', ') from pg_class c join pg_namespace n on n.oid = c.relnamespace
                   where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
                  'None ✅')
  union all
  select 5, 'Profile pictures',
         coalesce((select case when b.file_size_limit = 5242880 and b.allowed_mime_types is not null
                               then 'Images only, 5 MB max ✅' else 'Not limited yet — tell Claude' end
                   from storage.buckets b where b.id = 'avatars'), 'No avatars bucket')
  union all
  select 6, 'Avatar folder listing',
         case when exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                             and cmd = 'SELECT' and coalesce(qual, '') ilike '%avatars%' and coalesce(qual, '') not ilike '%auth.uid()%')
              then 'Still open — tell Claude' else 'Private ✅' end
  union all
  select 7, 'Private profile details moved',
         case when exists (select 1 from public.profiles where referral_source is not null)
              then 'Not yet — tell Claude' else 'Yes ✅' end
  union all
  select 8, 'Admins', (select count(*)::text from public.app_admins)
) checklist order by ord;
