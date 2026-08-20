import { NextResponse } from "next/server"

import {
  JOB_PLATFORMS,
  buildPlatformQuery,
  buildSerpApiSearchUrl,
  buildPlatformQueryVariants,
  filterJobsByFreshness,
  isJobFreshness,
  buildProfileSearchContext,
  getProfileCompleteness,
  isJobPlatform,
  normalizeSearchResult,
  type ActivityItem,
  type Job,
  type JobFreshness,
  type JobPlatform,
  type ProfileSearchContext,
} from "@/lib/jobs"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/lib/supabase/database.types"

const CACHE_WINDOW_MS = 6 * 60 * 60 * 1000

function apiError(error: unknown): { message: string; status: number } {
  const message = error instanceof Error ? error.message : "Unable to load jobs."
  if (message.includes("public.jobs") || message.includes("jobs") && message.includes("schema cache")) {
    return {
      message: "The jobs table is not available in Supabase. Run supabase/migrations/20260819_jobs.sql, then supabase/migrations/20260820_job_sources.sql in the Supabase SQL Editor and retry.",
      status: 503,
    }
  }
  return { message, status: 500 }
}

function requestedFreshness(request: Request): JobFreshness {
  const value = new URL(request.url).searchParams.get("freshness")
  return value && isJobFreshness(value) ? value : "week"
}

function requestedSearch(request: Request) {
  const searchParams = new URL(request.url).searchParams
  return {
    role: searchParams.get("role")?.trim() ?? "",
    location: searchParams.get("location")?.trim() ?? "",
  }
}

function requestedPlatforms(request: Request): JobPlatform[] {
  const value = new URL(request.url).searchParams.get("platforms")
  if (!value) return [...JOB_PLATFORMS]
  const selected = value.split(",").filter(isJobPlatform)
  return selected.length ? [...new Set(selected)] : [...JOB_PLATFORMS]
}

function normalizeJob(row: Record<string, unknown>): Job {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    platform: isJobPlatform(String(row.platform)) ? String(row.platform) as JobPlatform : "greenhouse",
    title: String(row.title ?? "Untitled role"),
    company: String(row.company ?? "Company"),
    company_logo: typeof row.company_logo === "string" ? row.company_logo : null,
    location: typeof row.location === "string" ? row.location : null,
    salary: typeof row.salary === "string" ? row.salary : null,
    job_type: typeof row.job_type === "string" ? row.job_type : null,
    experience_level: typeof row.experience_level === "string" ? row.experience_level : null,
    description: typeof row.description === "string" ? row.description : null,
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : [],
    match_score: typeof row.match_score === "number" ? row.match_score : 0,
    job_url: String(row.job_url),
    source_url: typeof row.source_url === "string" ? row.source_url : null,
    posted_at: typeof row.posted_at === "string" ? row.posted_at : null,
    applied_status: Boolean(row.applied_status),
    saved_status: Boolean(row.saved_status),
    fetched_at: String(row.fetched_at),
    created_at: String(row.created_at),
  }
}

async function getProfileContext(userId: string, fallbackName: string) {
  const admin = createAdminClient()
  const { data: profile, error } = await admin
    .from("profiles")
    .select("full_name, profile_data")
    .eq("id", userId)
    .maybeSingle()

  if (error) throw new Error(error.message)

  const context = buildProfileSearchContext(profile?.profile_data, profile?.full_name || fallbackName)
  return { admin, context, completeness: getProfileCompleteness(context) }
}

type SerpApiOrganicResult = {
  title?: string
  link?: string
  snippet?: string
  date?: string
  thumbnail?: string
}

function serpApiItemToSearchResult(item: SerpApiOrganicResult, freshness: JobFreshness) {
  return {
    title: item.title,
    url: item.link,
    description: item.snippet,
    // SerpAPI's tbs filter already constrains bounded searches. Treat a
    // missing date as current so valid listings without date metadata remain visible.
    age: item.date || (freshness === "anytime" ? undefined : "just now"),
    profile: { img: item.thumbnail },
  }
}

async function searchSerpApi(query: string, freshness: JobFreshness) {
  const configuredApiKey = process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY
  if (!configuredApiKey) {
    throw new Error("SerpAPI is not configured. Add SERPAPI_API_KEY to your environment.")
  }
  const apiKey = configuredApiKey

  async function fetchPage(start: number) {
    const response = await fetch(buildSerpApiSearchUrl(query, freshness, apiKey, start), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
    const payload = await response.json().catch(() => null) as { error?: string; organic_results?: SerpApiOrganicResult[] } | null
    if (!response.ok) {
      throw new Error(`SerpAPI failed (${response.status}): ${payload?.error ?? "request rejected"}`)
    }
    // SerpAPI returns this as a 200 response when Google has no matches.
    // Treat it as an empty source so other selected platforms can still load.
    if (payload?.error && !payload?.organic_results) return []
    return (payload?.organic_results ?? []).map((item) => serpApiItemToSearchResult(item, freshness))
  }

  const firstPage = await fetchPage(0)
  if (firstPage.length < 20) return firstPage
  return [...firstPage, ...(await fetchPage(20))]
}

async function fetchAndSaveJobs(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  platforms: JobPlatform[],
  profile: ProfileSearchContext,
  freshness: JobFreshness,
  returnOnlyNew = false
): Promise<Job[]> {
  const fetchedAt = new Date().toISOString()
  const results = await Promise.all(platforms.map(async (platform) => {
    const braveResults = (await Promise.all(
      buildPlatformQueryVariants(platform, profile).map((query) => searchSerpApi(query, freshness))
    )).flat()
    return braveResults
      .map((result) => normalizeSearchResult(result, platform, profile))
      .filter((job): job is NonNullable<typeof job> => Boolean(job))
      .slice(0, 40)
  }))
  const normalized = results.flat()
  const uniqueJobs = [...new Map(normalized.map((job) => [`${job.platform}:${job.job_url}`, job])).values()]
  const newJobKeys = new Set(uniqueJobs.map((job) => `${job.platform}:${job.job_url}`))

  if (uniqueJobs.length) {
    const inserts = uniqueJobs.map((job) => ({
      ...job,
      user_id: userId,
      fetched_at: fetchedAt,
      tags: job.tags as unknown as Json,
    }))
    const { error } = await admin
      .from("jobs")
      .upsert(inserts, { onConflict: "user_id,platform,job_url" })
    if (error) throw new Error(error.message)
  }

  // Return all selected-platform rows so a zero-result source does not hide
  // existing jobs and new results are appended to the user's collection.
  const { data, error } = await admin
    .from("jobs")
    .select("*")
    .eq("user_id", userId)
    .in("platform", platforms)
    .order("match_score", { ascending: false })
    .order("fetched_at", { ascending: false })
  if (error) throw new Error(error.message)
  const savedJobs = (data ?? []).map((row) => normalizeJob(row as Record<string, unknown>))
  const jobsToReturn = returnOnlyNew
    ? savedJobs.filter((job) => newJobKeys.has(`${job.platform}:${job.job_url}`))
    : savedJobs
  return filterJobsByFreshness(jobsToReturn, freshness)
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: userData, error: authError } = await supabase.auth.getUser()
    const user = userData?.user
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const platforms = requestedPlatforms(request)
    const freshness = requestedFreshness(request)
    const search = requestedSearch(request)
    const hasExplicitSearch = Boolean(search.role || search.location)
    const fallbackName = user.email?.split("@")[0] || "there"
    const { admin, context } = await getProfileContext(user.id, fallbackName)
    const searchProfile = {
      ...context,
      role: search.role || context.role,
      preferredLocation: search.location || context.preferredLocation,
    }
    const completeness = getProfileCompleteness(searchProfile)
    const { data: activityRows } = await admin
      .from("job_applications")
      .select("id, job_title, company_name, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
    const activity: ActivityItem[] = (activityRows ?? []).map((row) => ({
      id: row.id,
      title: row.job_title,
      company: row.company_name,
      status: row.status,
      createdAt: row.created_at,
    }))

    const { data: cachedRows, error: jobsError } = await admin
      .from("jobs")
      .select("*")
      .eq("user_id", user.id)
      .in("platform", platforms)
      .order("match_score", { ascending: false })
      .order("fetched_at", { ascending: false })

    if (jobsError) throw new Error(jobsError.message)

    const cutoff = Date.now() - CACHE_WINDOW_MS
    const cachedJobs = (cachedRows ?? []).map((row) => normalizeJob(row as Record<string, unknown>))
    const visibleCachedJobs = filterJobsByFreshness(cachedJobs, freshness)
    const hasFreshResultsForEveryPlatform = platforms.every((platform) => {
      const fetchedRecently = cachedJobs.some((job) => job.platform === platform && new Date(job.fetched_at).getTime() >= cutoff)
      const hasMatchingPostedDate = freshness === "anytime" || visibleCachedJobs.some((job) => job.platform === platform)
      return fetchedRecently && hasMatchingPostedDate
    })

    if (!hasExplicitSearch && hasFreshResultsForEveryPlatform) {
      return NextResponse.json({
        jobs: visibleCachedJobs,
        fromCache: true,
        fetchedAt: cachedJobs[0]?.fetched_at ?? null,
        profile: { ...searchProfile, completeness },
        query: null,
        activity,
      })
    }

    const jobs = await fetchAndSaveJobs(admin, user.id, platforms, searchProfile, freshness, hasExplicitSearch)
    return NextResponse.json({
      jobs,
      fromCache: false,
      fetchedAt: jobs[0]?.fetched_at ?? new Date().toISOString(),
      profile: { ...context, completeness },
      query: platforms.map((platform) => ({ platform, query: buildPlatformQuery(platform, searchProfile) })),
      activity,
    })
  } catch (error) {
    console.error("Jobs API error:", error)
    const result = apiError(error)
    return NextResponse.json({ error: result.message }, { status: result.status })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: userData, error: authError } = await supabase.auth.getUser()
    const user = userData?.user
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const id = new URL(request.url).searchParams.get("id")
    const payload = await request.json() as { savedStatus?: unknown }
    if (!id || typeof payload.savedStatus !== "boolean") {
      return NextResponse.json({ error: "Job ID and savedStatus are required." }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("jobs")
      .update({ saved_status: payload.savedStatus })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: "Job not found." }, { status: 404 })
    return NextResponse.json({ job: normalizeJob(data as Record<string, unknown>) })
  } catch (error) {
    const result = apiError(error)
    return NextResponse.json({ error: result.message }, { status: result.status })
  }
}
