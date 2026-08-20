alter table public.jobs
  add column if not exists posted_at timestamptz;

create index if not exists jobs_posted_at_idx
  on public.jobs(user_id, posted_at desc);
