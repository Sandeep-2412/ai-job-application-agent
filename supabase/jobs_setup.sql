-- JobBuddy AI: complete Jobs schema setup
-- Safe to run in Supabase SQL Editor multiple times.
-- Requires the existing public.profiles table.

create extension if not exists "uuid-ossp";

create table if not exists public.jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('greenhouse', 'lever', 'workable', 'wellfound', 'ashby', 'enterprise')),
  title text not null,
  company text not null,
  company_logo text,
  location text,
  salary text,
  job_type text,
  experience_level text,
  description text,
  tags jsonb not null default '[]'::jsonb,
  match_score integer not null default 0 check (match_score between 0 and 100),
  job_url text not null,
  source_url text,
  posted_at timestamptz,
  applied_status boolean not null default false,
  saved_status boolean not null default false,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Upgrade a jobs table created by an earlier version of the feature.
alter table public.jobs
  add column if not exists posted_at timestamptz;

-- Keep the platform list current when an older four-platform constraint exists.
alter table public.jobs drop constraint if exists jobs_platform_check;
alter table public.jobs
  add constraint jobs_platform_check
  check (platform in ('greenhouse', 'lever', 'workable', 'wellfound', 'ashby', 'enterprise'));

create unique index if not exists jobs_user_platform_url_key
  on public.jobs(user_id, platform, job_url);
create index if not exists jobs_user_fetched_at_idx
  on public.jobs(user_id, fetched_at desc);
create index if not exists jobs_user_platform_idx
  on public.jobs(user_id, platform);
create index if not exists jobs_posted_at_idx
  on public.jobs(user_id, posted_at desc);

alter table public.jobs enable row level security;

drop policy if exists "Users can view own jobs" on public.jobs;
create policy "Users can view own jobs"
  on public.jobs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own jobs" on public.jobs;
create policy "Users can insert own jobs"
  on public.jobs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own jobs" on public.jobs;
create policy "Users can update own jobs"
  on public.jobs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own jobs" on public.jobs;
create policy "Users can delete own jobs"
  on public.jobs for delete
  using (auth.uid() = user_id);

-- Verify after running:
-- select to_regclass('public.jobs');
-- select column_name from information_schema.columns
-- where table_schema = 'public' and table_name = 'jobs'
-- order by ordinal_position;
