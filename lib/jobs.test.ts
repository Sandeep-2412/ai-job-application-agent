import { describe, expect, it } from "vitest"

import {
  buildSerpApiSearchUrl,
  buildPlatformQuery,
  buildPlatformQueryVariants,
  buildProfileSearchContext,
  getProfileCompleteness,
  normalizeSearchResult,
} from "@/lib/jobs"

describe("job search utilities", () => {
  const profile = buildProfileSearchContext({
    fullName: "Jane Smith",
    preferredRole: "React Frontend Developer",
    preferredLocation: "San Francisco, CA",
    jobType: "Remote",
    skills: ["React", "TypeScript"],
    techStack: ["Next.js", "Tailwind"],
    workExperience: [{ jobTitle: "Frontend Engineer", companyName: "Acme" }],
    education: [{ degree: "B.S.", field: "Computer Science", school: "UC Berkeley" }],
  })

  it("builds platform-specific search queries from profile data", () => {
    expect(buildPlatformQuery("greenhouse", profile)).toContain(
      '(site:job-boards.greenhouse.io OR site:boards.greenhouse.io) "React Frontend Developer"'
    )
    expect(buildPlatformQuery("greenhouse", profile)).toContain('"San Francisco, CA"')
    expect(buildPlatformQuery("greenhouse", profile)).toContain("React OR TypeScript")
    expect(buildPlatformQuery("lever", profile)).toContain("site:jobs.lever.co OR site:lever.co")
    expect(buildPlatformQuery("workable", profile)).toContain("site:workable.com/jobs")
    expect(buildPlatformQuery("wellfound", profile)).toContain("site:wellfound.com/jobs")
    expect(buildPlatformQuery("ashby", profile)).toContain('site:jobs.ashbyhq.com "React Frontend Developer"')
    expect(buildPlatformQuery("enterprise", profile)).toContain(
      '(site:myworkdayjobs.com OR site:greenhouse.io OR site:lever.co OR site:icims.com) "React Frontend Developer"'
    )
    expect(buildPlatformQueryVariants("ashby", profile)).toEqual(expect.arrayContaining([
      expect.stringContaining('site:jobs.ashbyhq.com "React Frontend Developer"'),
      expect.stringContaining('site:jobs.ashbyhq.com "Software Engineer"'),
    ]))
    expect(buildPlatformQueryVariants("enterprise", profile)).toEqual(expect.arrayContaining([
      expect.stringContaining('"Software Engineer"'),
    ]))

    const serpUrl = new URL(buildSerpApiSearchUrl(
      '(site:jobs.ashbyhq.com OR site:myworkdayjobs.com) "Software Engineer"',
      "week",
      "test-key"
    ))
    expect(serpUrl.searchParams.get("engine")).toBe("google")
    expect(serpUrl.searchParams.get("q")).toContain("site:jobs.ashbyhq.com")
    expect(serpUrl.searchParams.get("num")).toBe("20")
    expect(serpUrl.searchParams.get("location")).toBe("United States")
    expect(serpUrl.searchParams.get("tbs")).toBe("qdr:w")
  })

  it("normalizes a search result into a storable job record", () => {
    const job = normalizeSearchResult({
      title: "React Frontend Developer - Acme",
      url: "https://boards.greenhouse.io/acme/jobs/123",
      description: "Remote full-time senior role using React and TypeScript. $140k - $170k",
    }, "greenhouse", profile)

    expect(job).toMatchObject({
      title: "React Frontend Developer",
      company: "Acme",
      location: "Remote",
      salary: "$140k - $170k",
      job_type: "Full time",
      experience_level: "Senior",
      job_url: "https://boards.greenhouse.io/acme/jobs/123",
      company_logo: "https://www.google.com/s2/favicons?domain=acme.com&sz=128",
    })
    expect(job?.tags).toEqual(expect.arrayContaining(["React", "TypeScript"]))
    expect(job?.match_score).toBeGreaterThan(55)

    const airbnbJob = normalizeSearchResult({
      title: "Software Engineer, Secure Development Engineering",
      url: "https://job-boards.greenhouse.io/airbnb/jobs/456",
      description: "United States role with Java, Kotlin, Python, Go, JavaScript, and TypeScript.",
    }, "greenhouse", profile)
    expect(airbnbJob).toMatchObject({
      company: "Airbnb",
      company_logo: "https://www.google.com/s2/favicons?domain=airbnb.com&sz=128",
    })

    expect(normalizeSearchResult({
      title: "Software Engineer - Global team",
      url: "https://example.com/jobs/456",
      description: "Join our engineering team in Berlin, Germany.",
    }, "greenhouse", profile)).toBeNull()
  })

  it("reports profile completeness from actual profile data", () => {
    const complete = getProfileCompleteness(profile)
    expect(complete.percentage).toBe(100)
    expect(complete.missing).toEqual([])

    const sparse = getProfileCompleteness(buildProfileSearchContext({ skills: ["React"] }))
    expect(sparse.percentage).toBeLessThan(50)
    expect(sparse.missing).toEqual(expect.arrayContaining(["Role", "Location", "Job type"]))
  })
})
