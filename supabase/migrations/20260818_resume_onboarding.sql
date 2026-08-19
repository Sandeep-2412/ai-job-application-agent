create extension if not exists "uuid-ossp";

alter table public.profiles
  add column if not exists profile_data jsonb default '{}'::jsonb;

create table if not exists public.user_resumes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  file_size bigint,
  public_url text,
  uploaded_at timestamptz not null default now(),
  parsed_resume_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_resumes_user_id on public.user_resumes(user_id);
create index if not exists idx_user_resumes_uploaded_at on public.user_resumes(uploaded_at desc);
