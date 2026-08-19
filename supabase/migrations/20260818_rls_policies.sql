-- Enable Row Level Security on user_resumes
alter table public.user_resumes enable row level security;

-- Allow authenticated users to SELECT their own resume rows
drop policy if exists "Users can view own resumes" on public.user_resumes;
create policy "Users can view own resumes"
  on public.user_resumes
  for select
  using (auth.uid() = user_id);

-- Allow authenticated users to INSERT rows where user_id matches their own auth UID
drop policy if exists "Users can insert own resumes" on public.user_resumes;
create policy "Users can insert own resumes"
  on public.user_resumes
  for insert
  with check (auth.uid() = user_id);

-- Allow authenticated users to UPDATE their own resume rows
drop policy if exists "Users can update own resumes" on public.user_resumes;
create policy "Users can update own resumes"
  on public.user_resumes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow authenticated users to DELETE their own resume rows
drop policy if exists "Users can delete own resumes" on public.user_resumes;
create policy "Users can delete own resumes"
  on public.user_resumes
  for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- Ensure profiles table also has RLS + policies (guards upsert path)
-- ----------------------------------------------------------------
alter table public.profiles enable row level security;

-- Users can read their own profile
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Users can insert their own profile row (needed for first-time upsert)
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Users can update their own profile
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
