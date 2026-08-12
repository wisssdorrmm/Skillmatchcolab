-- Additive only: new table + RLS policies, doesn't touch anything existing.

create table if not exists saved_projects (
  user_id uuid not null references profiles(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  saved_at timestamp with time zone default now(),
  primary key (user_id, project_id)
);

alter table saved_projects enable row level security;

create policy "Users can view their own saved projects"
  on saved_projects for select
  using (auth.uid() = user_id);

create policy "Users can save projects for themselves"
  on saved_projects for insert
  with check (auth.uid() = user_id);

create policy "Users can unsave their own saved projects"
  on saved_projects for delete
  using (auth.uid() = user_id);

create index if not exists idx_saved_projects_user on saved_projects (user_id);
