export const JOB_PLATFORMS = ["greenhouse", "lever", "workable", "wellfound", "ashby", "enterprise"] as const

export type JobPlatform = (typeof JOB_PLATFORMS)[number]
export const JOB_FRESHNESS_OPTIONS = ["hour", "day", "week", "anytime"] as const
export type JobFreshness = (typeof JOB_FRESHNESS_OPTIONS)[number]

export type Job = {
  id: string
  user_id: string
  platform: JobPlatform
  title: string
  company: string
  company_logo: string | null
  location: string | null
  salary: string | null
  job_type: string | null
  experience_level: string | null
  description: string | null
  tags: string[]
  match_score: number
  job_url: string
  source_url: string | null
  posted_at: string | null
  applied_status: boolean
  saved_status: boolean
  fetched_at: string
  created_at: string
}

export type ProfileSearchContext = {
  fullName: string
  role: string
  skills: string[]
  experience: string[]
  education: string[]
  preferredLocation: string
  techStack: string[]
  jobType: string
}

export type ProfileCompleteness = {
  percentage: number
  completed: string[]
  missing: string[]
}

export type ActivityItem = {
  id: string
  title: string
  company: string
  status: string
  createdAt: string
}

export type JobsApiResponse = {
  jobs: Job[]
  fromCache: boolean
  fetchedAt: string | null
  profile: ProfileSearchContext & { completeness: ProfileCompleteness }
  query: Array<{ platform: JobPlatform; query: string }> | null
  activity?: ActivityItem[]
}

const SERPAPI_ENDPOINT = "https://serpapi.com/search.json"
const SERPAPI_TBS: Record<Exclude<JobFreshness, "anytime">, "qdr:h" | "qdr:d" | "qdr:w"> = {
  hour: "qdr:h",
  day: "qdr:d",
  week: "qdr:w",
}

export function isJobFreshness(value: string): value is JobFreshness {
  return (JOB_FRESHNESS_OPTIONS as readonly string[]).includes(value)
}

export function buildSerpApiSearchUrl(query: string, freshness: JobFreshness, apiKey: string, start = 0): string {
  const params = new URLSearchParams({
    engine: "google",
    api_key: apiKey,
    q: query,
    num: "20",
    start: String(start),
    location: "United States",
    gl: "us",
    hl: "en",
  })
  if (freshness !== "anytime") params.set("tbs", SERPAPI_TBS[freshness])
  return `${SERPAPI_ENDPOINT}?${params.toString()}`
}

export function freshnessDurationMs(freshness: JobFreshness): number | null {
  if (freshness === "hour") return 60 * 60 * 1000
  if (freshness === "day") return 24 * 60 * 60 * 1000
  if (freshness === "week") return 7 * 24 * 60 * 60 * 1000
  return null
}

export function filterJobsByFreshness(jobs: Job[], freshness: JobFreshness, now = Date.now()): Job[] {
  const duration = freshnessDurationMs(freshness)
  if (!duration) return jobs
  const cutoff = now - duration
  return jobs.filter((job) => {
    if (!job.posted_at) return false
    const postedAt = new Date(job.posted_at).getTime()
    return Number.isFinite(postedAt) && postedAt >= cutoff && postedAt <= now + 5 * 60 * 1000
  })
}

const PLATFORM_LABELS: Record<JobPlatform, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  workable: "Workable",
  wellfound: "Wellfound",
  ashby: "Ashby",
  enterprise: "Enterprise boards",
}

const STOP_WORDS = new Set([
  "and", "the", "with", "for", "from", "developer", "engineer", "software", "remote",
  "full", "time", "part", "level", "senior", "junior", "experience", "job",
])

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {}
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (typeof entry === "string") return [entry.trim()]
      const item = asRecord(entry)
      return [text(item.name) || text(item.title) || text(item.school) || text(item.degree)].filter(Boolean)
    }).filter(Boolean)
  }
  if (typeof value === "string") return value.split(/[,|;]/).map((item) => item.trim()).filter(Boolean)
  return []
}

function firstText(data: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = text(data[key])
    if (value) return value
  }
  return ""
}

export function buildProfileSearchContext(raw: unknown, fallbackName = "there"): ProfileSearchContext {
  const data = asRecord(raw)
  const nested = asRecord(data.profile)
  const merged = { ...nested, ...data }
  const workExperience = Array.isArray(data.workExperience) ? data.workExperience.map(asRecord) : []
  const education = Array.isArray(data.education) ? data.education.map(asRecord) : []
  const latestRole = workExperience.find((item) => text(item.jobTitle))
  const role = firstText(merged, ["preferredRole", "targetRole", "role", "jobTitle", "desiredTitle"]) || text(latestRole?.jobTitle)
  const skills = stringList(data.skills ?? data.skillSet)
  const techStack = stringList(data.techStack ?? data.technologies ?? data.tools)
  const experience = workExperience.flatMap((item) => [text(item.jobTitle), text(item.companyName), text(item.location)]).filter(Boolean)
  const educationDetails = education.flatMap((item) => [text(item.degree), text(item.field), text(item.school)]).filter(Boolean)

  return {
    fullName: firstText(merged, ["fullName", "full_name", "name"]) || fallbackName,
    role,
    skills,
    experience,
    education: educationDetails,
    preferredLocation: firstText(merged, ["preferredLocation", "location", "desiredLocation", "workLocation"]),
    techStack,
    jobType: firstText(merged, ["jobType", "preferredJobType", "employmentType"]),
  }
}

export function buildPlatformQuery(platform: JobPlatform, profile: ProfileSearchContext): string {
  const role = profile.role || profile.skills.slice(0, 2).join(" ") || "software engineer"
  const roleQuery = `"${role.replace(/"/g, "")}"`
  const skillTerms = [...new Set([...profile.skills, ...profile.techStack])]
    .filter(Boolean)
    .slice(0, 3)
  const contextTerms = [
    profile.preferredLocation ? `"${profile.preferredLocation.replace(/"/g, "")}"` : "",
    skillTerms.length ? `(${skillTerms.join(" OR ")})` : "",
  ].filter(Boolean).join(" ")

  if (platform === "greenhouse") {
    return `(site:job-boards.greenhouse.io OR site:boards.greenhouse.io) ${roleQuery} ${contextTerms}`.trim()
  }

  if (platform === "lever") {
    return `(site:jobs.lever.co OR site:lever.co) ${roleQuery} ${contextTerms}`.trim()
  }

  if (platform === "ashby") {
    return `site:jobs.ashbyhq.com ${roleQuery} ${contextTerms}`.trim()
  }

  if (platform === "enterprise") {
    return `(site:myworkdayjobs.com OR site:greenhouse.io OR site:lever.co OR site:icims.com) ${roleQuery} ${contextTerms}`.trim()
  }

  const domains: Record<Exclude<JobPlatform, "greenhouse" | "lever" | "ashby" | "enterprise">, string> = {
    workable: "workable.com/jobs",
    wellfound: "wellfound.com/jobs",
  }
  return `site:${domains[platform]} ${roleQuery} ${contextTerms}`.trim()
}

export function buildPlatformQueryVariants(platform: JobPlatform, profile: ProfileSearchContext): string[] {
  const primaryQuery = buildPlatformQuery(platform, profile)
  if ((platform !== "ashby" && platform !== "enterprise") || !profile.role || /software engineer/i.test(profile.role)) {
    return [primaryQuery]
  }

  // The two requested sources are broad software-engineering portals. Keep the
  // profile role query, then add a second Software Engineer query so those
  // listings are not missed when a profile uses a narrower title.
  const softwareEngineerQuery = buildPlatformQuery(platform, {
    ...profile,
    role: "Software Engineer",
  })
  return [...new Set([primaryQuery, softwareEngineerQuery])]
}

export function platformLabel(platform: JobPlatform): string {
  return PLATFORM_LABELS[platform]
}

export function isJobPlatform(value: string): value is JobPlatform {
  return (JOB_PLATFORMS as readonly string[]).includes(value)
}

const US_LOCATION_MARKERS = /\b(?:united states|u\.s\.a?\.?|usa|remote|alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/i
const US_STATE_CODE_MARKERS = /(?:^|[\s,(/-])(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)(?=$|[\s,)./-])/
const NON_US_LOCATION_MARKERS = /\b(?:canada|india|united kingdom|uk|germany|france|australia|new zealand|ireland|singapore|europe|asia)\b/i

function parsePostedAt(result: SearchResult): string | null {
  const directDate = [result.age, result.page_age].map((value) => value ? Date.parse(value) : Number.NaN).find(Number.isFinite)
  if (directDate !== undefined) return new Date(directDate).toISOString()

  const relative = (result.age ?? result.page_age ?? "").match(/\b(an?|\d+)\s+(minute|hour|day|week|month|year)s?\s+ago\b/i)
  if (!relative) return /\bjust now\b/i.test(result.age ?? "") ? new Date().toISOString() : null
  const amount = relative[1].toLowerCase() === "a" || relative[1].toLowerCase() === "an" ? 1 : Number(relative[1])
  const units: Record<string, number> = {
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  }
  return new Date(Date.now() - amount * units[relative[2].toLowerCase()]).toISOString()
}

function isUnitedStatesResult(result: SearchResult, profile: ProfileSearchContext): boolean {
  const searchable = `${result.title ?? ""} ${result.description ?? ""} ${result.url ?? ""}`
  const preferredLocationMatches = Boolean(
    profile.preferredLocation &&
    !NON_US_LOCATION_MARKERS.test(profile.preferredLocation) &&
    searchable.toLowerCase().includes(profile.preferredLocation.toLowerCase())
  )
  const hasUsSignal = US_LOCATION_MARKERS.test(searchable) || US_STATE_CODE_MARKERS.test(searchable) || preferredLocationMatches
  // SerpAPI already targets the United States. Keep results with no explicit
  // location marker instead of dropping valid job-board pages whose snippets
  // omit the location, but reject clearly non-US-only results.
  return hasUsSignal || !NON_US_LOCATION_MARKERS.test(searchable)
}

function cleanTitle(value: string): string {
  return value.replace(/\s*[|·•]\s*(Greenhouse|Lever|Workable|Wellfound|Ashby).*$/i, "").trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function displayJobTitle(title: string, company: string): string {
  if (!company.trim()) return title.trim()
  const suffix = new RegExp(`\\s*[-–—|]\\s*${escapeRegExp(company)}\\s*$`, "i")
  return title.replace(suffix, "").trim() || title.trim()
}

function companyNameFromSlug(slug: string): string {
  return slug
    .replace(/^careers?[-_]/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getCompany(title: string, url: string, platform: JobPlatform): string {
  const urlSlug = companySlugFromJobUrl(url, platform)
  if (urlSlug) return companyNameFromSlug(urlSlug)

  const separators = title.split(/\s+[-–—|]\s+/).map((part) => part.trim()).filter(Boolean)
  if (separators.length > 1) return separators[separators.length - 1]
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "")
    return companyNameFromSlug(hostname.split(".")[0] ?? "Company")
  } catch {
    return "Company"
  }
}

function extractSalary(value: string): string | null {
  const match = value.match(/(?:\$|£|€)\s?[\d,.]+\s*(?:k|K)?(?:\s*[-–—]\s*(?:\$|£|€)?\s?[\d,.]+\s*(?:k|K)?)?/)
  return match?.[0] ?? null
}

function extractLocation(value: string, profile: ProfileSearchContext): string | null {
  if (/\bremote\b/i.test(value)) return "Remote"
  if (profile.preferredLocation && new RegExp(profile.preferredLocation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(value)) {
    return profile.preferredLocation
  }
  const match = value.match(/(?:in|at|–|-)\s+([A-Z][\w .'-]+,\s*[A-Z]{2})\b/)
  return match?.[1]?.trim() ?? null
}

function inferJobType(value: string): string | null {
  if (/part[- ]?time/i.test(value)) return "Part time"
  if (/contract|freelance/i.test(value)) return "Contract"
  if (/intern(ship)?/i.test(value)) return "Internship"
  if (/full[- ]?time/i.test(value)) return "Full time"
  return null
}

function inferExperience(value: string): string | null {
  const match = value.match(/\b(entry[- ]level|junior|mid[- ]level|senior|staff|principal|lead)\b/i)
  return match?.[1]?.replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? null
}

function getTags(value: string, profile: ProfileSearchContext): string[] {
  const source = `${value} ${profile.skills.join(" ")} ${profile.techStack.join(" ")}`
  const wanted = [...profile.skills, ...profile.techStack]
  return [...new Set(wanted.filter((tag) => new RegExp(`\\b${tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(source)))].slice(0, 6)
}

function companySlugFromJobUrl(url: string, platform: JobPlatform): string | null {
  try {
    const parsed = new URL(url)
    const segments = parsed.pathname.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment))
    let slug = ""

    if (platform === "wellfound") {
      const companyIndex = segments.findIndex((segment) => segment.toLowerCase() === "company")
      slug = companyIndex >= 0 ? segments[companyIndex + 1] ?? "" : segments[0] ?? ""
    } else if (platform === "enterprise" && /(?:myworkdayjobs\.com|icims\.com)$/i.test(parsed.hostname)) {
      slug = parsed.hostname.split(".")[0] ?? ""
    } else {
      slug = segments[0] ?? ""
    }

    if (!slug || /^(jobs?|search|careers?|company|job-listings?|en[-_]us|en|us)$/i.test(slug)) return null
    return slug
  } catch {
    return null
  }
}

function companyDomainFromJobUrl(url: string, platform: JobPlatform, company: string): string | null {
  const slug = companySlugFromJobUrl(url, platform) || company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  return slug && slug.length >= 2 ? `${slug.toLowerCase()}.com` : null
}

function scoreResult(title: string, description: string, profile: ProfileSearchContext): number {
  const haystack = `${title} ${description}`.toLowerCase()
  const terms = [profile.role, ...profile.skills, ...profile.techStack]
    .flatMap((term) => term.toLowerCase().split(/\s+/))
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term))
  const matches = terms.filter((term) => haystack.includes(term)).length
  return Math.min(98, Math.max(52, 55 + matches * 7))
}

export type SearchResult = {
  title?: string
  url?: string
  description?: string
  age?: string
  page_age?: string
  profile?: { img?: string; long_name?: string }
}

export function normalizeSearchResult(
  result: SearchResult,
  platform: JobPlatform,
  profile: ProfileSearchContext
): Omit<Job, "id" | "user_id" | "fetched_at" | "created_at" | "applied_status" | "saved_status"> | null {
  const url = text(result.url)
  if (!url || !isUnitedStatesResult(result, profile)) return null
  const title = cleanTitle(text(result.title) || "Untitled role")
  const description = text(result.description) || null
  const searchable = `${title} ${description ?? ""}`
  const company = getCompany(title, url, platform)
  return {
    platform,
    title: displayJobTitle(title, company),
    company,
    company_logo: companyLogoUrl(url, platform, company),
    location: extractLocation(searchable, profile) ?? "United States",
    salary: extractSalary(searchable),
    job_type: inferJobType(searchable),
    experience_level: inferExperience(searchable),
    description,
    tags: getTags(searchable, profile),
    match_score: scoreResult(title, description ?? "", profile),
    job_url: url,
    source_url: url,
    posted_at: parsePostedAt(result),
  }
}

const PLATFORM_LOGO_DOMAINS: Record<JobPlatform, string> = {
  greenhouse: "greenhouse.io",
  lever: "lever.co",
  workable: "workable.com",
  wellfound: "wellfound.com",
  ashby: "ashbyhq.com",
  enterprise: "myworkdayjobs.com",
}

export function googleFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
}

export function companyLogoUrl(jobUrl: string, platform: JobPlatform, company: string): string | null {
  const domain = companyDomainFromJobUrl(jobUrl, platform, company)
  return domain ? googleFaviconUrl(domain) : null
}

export function platformLogoUrl(platform: JobPlatform): string {
  return googleFaviconUrl(PLATFORM_LOGO_DOMAINS[platform])
}

export function getProfileCompleteness(profile: ProfileSearchContext): ProfileCompleteness {
  const checks: Array<[string, boolean]> = [
    ["Role", Boolean(profile.role.trim())],
    ["Skills", profile.skills.length > 0],
    ["Experience", profile.experience.length > 0],
    ["Education", profile.education.length > 0],
    ["Location", Boolean(profile.preferredLocation.trim())],
    ["Tech stack", profile.techStack.length > 0],
    ["Job type", Boolean(profile.jobType.trim())],
  ]
  const completed = checks.filter(([, done]) => done).map(([label]) => label)
  const missing = checks.filter(([, done]) => !done).map(([label]) => label)
  return { completed, missing, percentage: Math.round((completed.length / checks.length) * 100) }
}