-- Extend an existing jobs table created by 20260819_jobs.sql.
alter table public.jobs drop constraint if exists jobs_platform_check;
alter table public.jobs
  add constraint jobs_platform_check
  check (platform in ('greenhouse', 'lever', 'workable', 'wellfound', 'ashby', 'enterprise'));
