"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowUpRight01Icon,
  Bookmark02Icon,
  Briefcase01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  File01Icon,
  Location01Icon,
  Refresh01Icon,
  SearchIcon,
  SparklesIcon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  JOB_PLATFORMS,
  companyLogoUrl,
  displayJobTitle,
  platformLabel,
  platformLogoUrl,
  type ActivityItem,
  type Job,
  type JobFreshness,
  type JobPlatform,
  type JobsApiResponse,
  type ProfileSearchContext,
} from "@/lib/jobs"

const FRESHNESS_OPTIONS: Array<{ id: JobFreshness; label: string; description: string }> = [
  { id: "hour", label: "Past one hour", description: "Latest listings" },
  { id: "day", label: "Past 24 hours", description: "Fresh today" },
  { id: "week", label: "Past week", description: "Recent roles" },
  { id: "anytime", label: "Anytime", description: "All available" },
]

const PLATFORM_OPTIONS: Array<{
  id: JobPlatform
  description: string
  mark: string
  color: string
}> = [
  { id: "greenhouse", description: "Fast-growing teams", mark: "G", color: "bg-emerald-100 text-emerald-700" },
  { id: "lever", description: "Modern tech companies", mark: "L", color: "bg-violet-100 text-violet-700" },
  { id: "workable", description: "Global opportunities", mark: "W", color: "bg-sky-100 text-sky-700" },
  { id: "wellfound", description: "Startups and founders", mark: "W", color: "bg-orange-100 text-orange-700" },
  { id: "ashby", description: "High-growth companies", mark: "A", color: "bg-rose-100 text-rose-700" },
  { id: "enterprise", description: "Large employers and teams", mark: "E", color: "bg-slate-100 text-slate-700" },
]

const JOBS_PER_PAGE = 10

type LoadState = "loading" | "ready" | "error"

type JobsResponse = JobsApiResponse & { error?: string }

type SearchOverrides = {
  role?: string
  location?: string
}

function Icon({ icon, className }: { icon: typeof Briefcase01Icon; className?: string }) {
  return <HugeiconsIcon icon={icon} strokeWidth={2} className={className} />
}

function profileName(profile: ProfileSearchContext | null) {
  return profile?.fullName && profile.fullName !== "there" ? profile.fullName.split(" ")[0] : "there"
}

function formatFetchedAt(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return `Updated ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
}

export function JobsPage() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<JobPlatform[]>([...JOB_PLATFORMS])
  const [freshness, setFreshness] = useState<JobFreshness>("week")
  const [roleSearch, setRoleSearch] = useState("")
  const [locationSearch, setLocationSearch] = useState("")
  const [activeSearch, setActiveSearch] = useState<SearchOverrides>({})
  const [searchValidationError, setSearchValidationError] = useState<string | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [profile, setProfile] = useState<(ProfileSearchContext & { completeness: JobsApiResponse["profile"]["completeness"] }) | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [fromCache, setFromCache] = useState(false)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [state, setState] = useState<LoadState>("loading")
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [savingJobId, setSavingJobId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const loadJobs = useCallback(async (platforms: JobPlatform[], range: JobFreshness = "week", search: SearchOverrides = {}) => {
    setState((current) => current === "ready" ? "ready" : "loading")
    setIsRefreshing(true)
    setError(null)
    try {
      // The server owns the six-hour cache decision; every request stays network-only here.
      const query = platforms.join(",")
      const params = new URLSearchParams({ platforms: query, freshness: range })
      if (search.role) params.set("role", search.role)
      if (search.location) params.set("location", search.location)
      const response = await fetch(`/api/jobs?${params.toString()}`, {
        cache: "no-store",
      })
      const payload = await response.json() as JobsResponse
      if (!response.ok) throw new Error(payload.error ?? "Unable to load job matches.")
      setJobs(payload.jobs ?? [])
      setCurrentPage(1)
      setProfile(payload.profile ?? null)
      setActivity(payload.activity ?? [])
      setFromCache(Boolean(payload.fromCache))
      setFetchedAt(payload.fetchedAt ?? null)
      setState("ready")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load job matches.")
      setState("error")
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadJobs([...JOB_PLATFORMS], "week"), 0)
    // Load once on mount; platform changes are applied with the explicit search action.
    return () => window.clearTimeout(timer)
  }, [loadJobs])

  function togglePlatform(platform: JobPlatform) {
    const nextPlatforms = selectedPlatforms.includes(platform)
      ? selectedPlatforms.filter((item) => item !== platform)
      : [...selectedPlatforms, platform]
    setSelectedPlatforms(nextPlatforms)
    setCurrentPage(1)
    setError(null)
    setSearchValidationError(null)

    if (nextPlatforms.length) {
      void loadJobs(nextPlatforms, freshness, activeSearch)
    } else {
      setJobs([])
      setFetchedAt(null)
      setState("ready")
    }
  }

  function searchSelectedPlatforms() {
    if (selectedPlatforms.length) void loadJobs(selectedPlatforms, freshness, activeSearch)
  }

  function selectFreshness(range: JobFreshness) {
    setFreshness(range)
    if (selectedPlatforms.length) void loadJobs(selectedPlatforms, range, activeSearch)
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const role = roleSearch.trim()
    const location = locationSearch.trim()

    if (!role && !location) {
      setSearchValidationError("Enter a job role or location before searching.")
      return
    }
    if (!selectedPlatforms.length) {
      setSearchValidationError("Select at least one job platform before searching.")
      return
    }

    const nextSearch = { role, location }
    setActiveSearch(nextSearch)
    setSearchValidationError(null)
    void loadJobs(selectedPlatforms, freshness, nextSearch)
  }

  async function toggleSaved(job: Job) {
    setSavingJobId(job.id)
    try {
      const response = await fetch(`/api/jobs?id=${encodeURIComponent(job.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savedStatus: !job.saved_status }),
      })
      const payload = await response.json() as { job?: Job; error?: string }
      if (!response.ok || !payload.job) throw new Error(payload.error ?? "Unable to save this job.")
      setJobs((current) => current.map((item) => item.id === job.id ? payload.job! : item))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this job.")
    } finally {
      setSavingJobId(null)
    }
  }

  const selectedLabel = useMemo(() => {
    if (selectedPlatforms.length === JOB_PLATFORMS.length) return "all platforms"
    return selectedPlatforms.map(platformLabel).join(", ")
  }, [selectedPlatforms])
  const totalPages = Math.max(1, Math.ceil(jobs.length / JOBS_PER_PAGE))
  const visibleJobs = jobs.slice((currentPage - 1) * JOBS_PER_PAGE, currentPage * JOBS_PER_PAGE)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 xl:p-8">
      <section className="relative overflow-hidden rounded-2xl bg-foreground px-5 py-6 text-background shadow-sm md:px-8 md:py-8">
        <div className="pointer-events-none absolute -right-16 -bottom-24 size-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
            <Icon icon={SparklesIcon} className="size-3.5" />
            AI-powered job discovery
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Welcome back, {profileName(profile)}.</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-background/65">
            Find roles that fit your experience and goals. Search by role, location, or both.
          </p>
          <form onSubmit={submitSearch} className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" noValidate>
              <Input
                value={roleSearch}
                onChange={(event) => setRoleSearch(event.target.value)}
                placeholder="Job title, e.g. Software Engineer"
                aria-label="Search by job title"
                className="border-background/15 bg-background/10 text-background placeholder:text-background/50"
              />
              <Input
                value={locationSearch}
                onChange={(event) => setLocationSearch(event.target.value)}
                placeholder="Location, e.g. New York, NY"
                aria-label="Search by location"
                className="border-background/15 bg-background/10 text-background placeholder:text-background/50"
              />
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Icon icon={SearchIcon} /> Search jobs
              </Button>
            </form>
            {searchValidationError ? <p role="alert" className="mt-2 text-xs font-medium text-red-300">{searchValidationError}</p> : null}
          </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-base font-semibold">Choose job platforms</h2>
            <p className="text-xs text-muted-foreground">Search one or more sources using your profile.</p>
          </div>
          <Button
            type="button"
            onClick={searchSelectedPlatforms}
            disabled={!selectedPlatforms.length || isRefreshing}
            className="w-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 sm:w-auto"
          >
            <Icon icon={SearchIcon} />
            {isRefreshing ? "Finding matches..." : `Find jobs on ${selectedLabel}`}
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {PLATFORM_OPTIONS.map((platform) => {
            const selected = selectedPlatforms.includes(platform.id)
            return (
              <button
                key={platform.id}
                type="button"
                aria-pressed={selected}
                onClick={() => togglePlatform(platform.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm",
                  selected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border/70"
                )}
              >
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-bold", platform.color)}>
                  <span aria-hidden="true" className="size-7 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${platformLogoUrl(platform.id)}")` }} />
                  <span className="sr-only">{platform.mark}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{platformLabel(platform.id)}</span>
                  <span className="block text-xs text-muted-foreground">{platform.description}</span>
                </span>
                <span className={cn("flex size-5 items-center justify-center rounded-full border", selected ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                  {selected ? <Icon icon={CheckmarkCircle02Icon} className="size-4" /> : null}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Job posting freshness">
          {FRESHNESS_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={freshness === option.id}
              onClick={() => selectFreshness(option.id)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition-colors hover:border-primary/50",
                freshness === option.id ? "border-primary bg-primary/10 ring-1 ring-primary/20" : "border-border/70 bg-card"
              )}
            >
              <span className="block text-xs font-semibold">{option.label}</span>
              <span className="block text-[10px] text-muted-foreground">{option.description}</span>
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <Alert variant="destructive">
          <Icon icon={File01Icon} />
          <AlertTitle>We couldn&apos;t load your job matches</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => void loadJobs(selectedPlatforms, freshness, activeSearch)}>
              <Icon icon={Refresh01Icon} /> Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <section className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Top job matches</h2>
              <p className="text-xs text-muted-foreground">
                {state === "ready" && jobs.length ? `${jobs.length} roles matched to your profile` : "Personalized recommendations from your selected platforms"}
              </p>
            </div>
            {state === "ready" && fetchedAt ? <span className="text-xs text-muted-foreground">{fromCache ? "Cached · " : "Fresh · "}{formatFetchedAt(fetchedAt)}</span> : null}
          </div>

          {state === "loading" ? <JobListSkeleton /> : null}
          {state === "error" && !jobs.length ? <JobErrorPlaceholder onRetry={() => void loadJobs(selectedPlatforms, freshness, activeSearch)} /> : null}
          {state === "ready" && !jobs.length ? <JobEmptyState onSearch={searchSelectedPlatforms} disabled={!selectedPlatforms.length || isRefreshing} /> : null}
          {state === "ready" && jobs.length ? (
            <div className="space-y-3">
              {visibleJobs.map((job) => <JobCard key={job.id} job={job} saving={savingJobId === job.id} onToggleSaved={() => void toggleSaved(job)} />)}
              {totalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-center gap-1 pt-2" aria-label="Job results pagination">
                  <Button type="button" variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                    Previous
                  </Button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <Button
                      key={page}
                      type="button"
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      aria-current={currentPage === page ? "page" : undefined}
                      onClick={() => setCurrentPage(page)}
                      className={currentPage === page ? "bg-primary text-primary-foreground hover:bg-primary/90" : undefined}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button type="button" variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
                    Next
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <ProfileCompletenessSidebar profile={profile} />
          <RecentActivity activity={activity} />
        </aside>
      </div>
    </div>
  )
}

function JobCard({ job, saving, onToggleSaved }: { job: Job; saving: boolean; onToggleSaved: () => void }) {
  const platform = PLATFORM_OPTIONS.find((option) => option.id === job.platform)
  const companyLogo = companyLogoUrl(job.job_url, job.platform, job.company)
  return (
    <article className="rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className="flex gap-3">
        <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted text-sm font-semibold text-muted-foreground">
          <span aria-hidden="true">{job.company.slice(0, 1).toUpperCase()}</span>
          {companyLogo ? <span role="img" aria-label={`${job.company} logo`} className="absolute inset-1 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${companyLogo}")` }} /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold sm:text-base">{displayJobTitle(job.title, job.company)}</h3>
            <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{job.company}</p>
            {job.location ? <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><Icon icon={Location01Icon} className="size-3.5" />{job.location}</div> : null}
          </div>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
            {job.salary ? <span className="inline-flex items-center gap-1.5"><Icon icon={Briefcase01Icon} className="size-3.5" />{job.salary}</span> : null}
            {job.job_type ? <span className="inline-flex items-center gap-1.5"><Icon icon={Clock01Icon} className="size-3.5" />{job.job_type}</span> : null}
            {job.experience_level ? <span className="inline-flex items-center gap-1.5"><Icon icon={UserCircleIcon} className="size-3.5" />{job.experience_level}</span> : null}
          </div>
        </div>
      </div>
      {job.description ? <p className="mt-4 line-clamp-2 text-xs leading-5 text-muted-foreground">{job.description}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Badge className={cn(platform?.color, "border-0")}>{platform ? platformLabel(platform.id) : job.platform}</Badge>
        <span className="rounded-full bg-primary/15 px-2 py-1 text-xs font-bold text-primary-foreground">{job.match_score}% match</span>
        {job.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
      </div>
      <div className="mt-4 flex items-center gap-3 border-t pt-3">
        <Progress value={job.match_score} className="min-w-20 flex-1 [&_[data-slot=progress-indicator]]:bg-primary" />
        <span className="text-xs font-semibold text-primary">{job.match_score}%</span>
        <Button nativeButton={false} render={<a href={job.job_url} target="_blank" rel="noreferrer" />} className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
          Apply now <Icon icon={ArrowUpRight01Icon} />
        </Button>
        <Button type="button" variant="outline" size="icon" aria-label={job.saved_status ? "Unsave job" : "Save job"} onClick={onToggleSaved} disabled={saving} className={cn(job.saved_status && "border-primary bg-primary/10 text-primary")}>
          <Icon icon={Bookmark02Icon} />
        </Button>
      </div>
    </article>
  )
}

function ProfileCompletenessSidebar({ profile }: { profile: (ProfileSearchContext & { completeness: JobsApiResponse["profile"]["completeness"] }) | null }) {
  const completeness = profile?.completeness ?? { percentage: 0, completed: [], missing: ["Role", "Skills", "Experience", "Education", "Location", "Tech stack", "Job type"] }
  const tone = completeness.percentage < 40 ? { color: "#ef4444", text: "text-red-500", label: "Getting started" } : completeness.percentage < 75 ? { color: "#f59e0b", text: "text-amber-500", label: "Looking good" } : completeness.percentage < 100 ? { color: "#10b981", text: "text-emerald-500", label: "Almost complete" } : { color: "#84cc16", text: "text-lime-500", label: "Profile complete" }
  return (
    <Card className="h-fit border-border/70 shadow-sm xl:sticky xl:top-5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Icon icon={UserCircleIcon} className="size-4" /></span>
          <div><CardTitle>Profile completeness</CardTitle><CardDescription>Improve your matches with more detail.</CardDescription></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <div className="relative flex size-32 items-center justify-center rounded-full" style={{ background: `conic-gradient(${tone.color} ${completeness.percentage}%, color-mix(in srgb, ${tone.color} 14%, transparent) ${completeness.percentage}% 100%)` }} role="img" aria-label={`${completeness.percentage}% profile complete`}>
            <div className="flex size-24 flex-col items-center justify-center rounded-full bg-card ring-1 ring-border/60"><span className={cn("text-2xl font-bold", tone.text)}>{completeness.percentage}%</span><span className="text-[10px] text-muted-foreground">complete</span></div>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs"><span className={cn("font-semibold", tone.text)}>{tone.label}</span><span className="text-muted-foreground">{completeness.completed.length}/7 sections</span></div>
        <div className="space-y-2">
          {[...completeness.completed, ...completeness.missing].map((item) => <div key={item} className="flex items-center gap-2 text-xs"><Icon icon={completeness.completed.includes(item) ? CheckmarkCircle02Icon : Clock01Icon} className={cn("size-3.5", completeness.completed.includes(item) ? "text-emerald-500" : "text-muted-foreground/40")} /><span className={completeness.completed.includes(item) ? "text-foreground" : "text-muted-foreground"}>{item}</span></div>)}
        </div>
      </CardContent>
    </Card>
  )
}

function RecentActivity({ activity }: { activity: ActivityItem[] }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-muted"><Icon icon={Clock01Icon} className="size-4" /></span><div><CardTitle>Recent activity</CardTitle><CardDescription>Your latest application updates.</CardDescription></div></div></CardHeader>
      <CardContent>
        {activity.length ? <div className="space-y-4">{activity.map((item) => <div key={item.id} className="flex gap-3"><span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><Icon icon={CheckmarkCircle02Icon} className="size-3.5" /></span><div className="min-w-0"><p className="truncate text-xs font-medium">{item.title}</p><p className="truncate text-[11px] text-muted-foreground">{item.company} · {item.status}</p><p className="mt-1 text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</p></div></div>)}</div> : <div className="rounded-lg bg-muted/50 px-3 py-4 text-center"><Icon icon={Briefcase01Icon} className="mx-auto mb-2 size-5 text-muted-foreground/60" /><p className="text-xs text-muted-foreground">No application activity yet.</p></div>}
      </CardContent>
    </Card>
  )
}

function JobListSkeleton() {
  return <div className="space-y-3">{[1, 2, 3].map((item) => <Card key={item} className="border-border/70"><CardContent className="space-y-4 p-5"><div className="flex gap-3"><Skeleton className="size-11 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></div></div><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" /><div className="flex justify-end"><Skeleton className="h-8 w-24" /></div></CardContent></Card>)}</div>
}

function JobEmptyState({ onSearch, disabled }: { onSearch: () => void; disabled: boolean }) {
  return <Empty className="min-h-72 border border-dashed"><EmptyHeader><EmptyMedia variant="icon"><Icon icon={SearchIcon} /></EmptyMedia><EmptyTitle>No matches yet</EmptyTitle><EmptyDescription>Select at least one platform and search to discover roles tailored to your profile.</EmptyDescription></EmptyHeader><Button type="button" onClick={onSearch} disabled={disabled} className="bg-primary text-primary-foreground hover:bg-primary/90"><Icon icon={SearchIcon} />Search selected platforms</Button></Empty>
}

function JobErrorPlaceholder({ onRetry }: { onRetry: () => void }) {
  return <Empty className="min-h-56 border border-dashed"><EmptyHeader><EmptyMedia variant="icon"><Icon icon={Refresh01Icon} /></EmptyMedia><EmptyTitle>Something went wrong</EmptyTitle><EmptyDescription>Try again when your search service is available.</EmptyDescription></EmptyHeader><Button type="button" variant="outline" onClick={onRetry}>Try again</Button></Empty>
}
