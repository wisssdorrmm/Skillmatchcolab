-- Additive only. Three new tables, no changes to existing ones.

-------------------------------------------------------------------
-- 1. Direct messages (pre-acceptance, owner <-> applicant, either side)
-------------------------------------------------------------------
create table if not exists direct_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  applicant_id uuid not null references profiles(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  text text not null,
  created_at timestamp with time zone default now()
);

alter table direct_messages enable row level security;

-- Only the project owner or the specific applicant in that thread can read it.
create policy "Owner or applicant can view their thread"
  on direct_messages for select
  using (
    auth.uid() = applicant_id
    or auth.uid() = (select owner_id from projects where id = project_id)
  );

-- Either side can send, but only as themselves, and only if they're actually
-- a party to this thread (owner or the applicant).
create policy "Owner or applicant can send in their thread"
  on direct_messages for insert
  with check (
    auth.uid() = sender_id
    and (
      auth.uid() = applicant_id
      or auth.uid() = (select owner_id from projects where id = project_id)
    )
  );

create index if not exists idx_direct_messages_thread
  on direct_messages (project_id, applicant_id, created_at);

-------------------------------------------------------------------
-- 2. Notifications
-------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null, -- 'application_received' | 'application_status' | 'direct_message'
  title text not null,
  body text,
  project_id uuid references projects(id) on delete cascade,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

alter table notifications enable row level security;

create policy "Users can view their own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Users can mark their own notifications read"
  on notifications for update
  using (auth.uid() = user_id);

create index if not exists idx_notifications_user on notifications (user_id, created_at desc);

-- Trigger: notify project owner when someone applies
create or replace function notify_owner_on_application()
returns trigger as $$
begin
  insert into notifications (user_id, type, title, body, project_id)
  select p.owner_id, 'application_received', 'New application',
         (select name from profiles where id = new.applicant_id) || ' applied to ' || p.title,
         p.id
  from projects p where p.id = new.project_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_owner_on_application on applications;
create trigger trg_notify_owner_on_application
  after insert on applications
  for each row execute function notify_owner_on_application();

-- Trigger: notify applicant when their application status changes
create or replace function notify_applicant_on_status_change()
returns trigger as $$
begin
  if new.status is distinct from old.status and new.status in ('accepted', 'rejected') then
    insert into notifications (user_id, type, title, body, project_id)
    select new.applicant_id, 'application_status',
           case when new.status = 'accepted' then 'Application accepted' else 'Application update' end,
           'Your application to ' || p.title || ' was ' || new.status,
           p.id
    from projects p where p.id = new.project_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_applicant_on_status on applications;
create trigger trg_notify_applicant_on_status
  after update on applications
  for each row execute function notify_applicant_on_status_change();

-- Trigger: notify the other party on a new direct message
create or replace function notify_on_direct_message()
returns trigger as $$
declare
  recipient uuid;
  owner uuid;
begin
  select owner_id into owner from projects where id = new.project_id;
  recipient := case when new.sender_id = new.applicant_id then owner else new.applicant_id end;

  insert into notifications (user_id, type, title, body, project_id)
  values (recipient, 'direct_message', 'New message', new.text, new.project_id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_on_direct_message on direct_messages;
create trigger trg_notify_on_direct_message
  after insert on direct_messages
  for each row execute function notify_on_direct_message();

-------------------------------------------------------------------
-- 3. Chat read tracking (for unread indicators on team chat threads)
-------------------------------------------------------------------
create table if not exists chat_reads (
  user_id uuid not null references profiles(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  last_read_at timestamp with time zone default now(),
  primary key (user_id, project_id)
);

alter table chat_reads enable row level security;

create policy "Users can view their own read state"
  on chat_reads for select
  using (auth.uid() = user_id);

create policy "Users can upsert their own read state"
  on chat_reads for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own read state"
  on chat_reads for update
  using (auth.uid() = user_id);

-------------------------------------------------------------------
-- 4. Avatar storage bucket policy check (run this to verify/fix)
-------------------------------------------------------------------
-- If avatar uploads are failing, it's almost always because the 'avatars'
-- storage bucket either doesn't exist or lacks these policies. This is
-- idempotent-ish: safe to run even if the bucket/policies already exist
-- (will just error harmlessly on "already exists" — ignore that specific error).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
