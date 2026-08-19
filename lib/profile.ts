import type { ResumeParsedData } from "@/lib/resume-parser"

export type ProfileRowLike = {
  full_name?: string | null
  email?: string | null
  profile_data?: unknown
}

export type ProfilePayload = {
  fullName: string
  email: string
  phone: string
  location: string
  portfolioUrl: string
  linkedinUrl: string
  githubUrl: string
  professionalSummary: string
  skills: string[]
  workExperience: unknown[]
  education: unknown[]
  projects: unknown[]
  certifications: unknown[]
  links: unknown[]
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function asObjectArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/**
 * Builds the flat `profile_data` JSON that gets saved to `profiles`.
 *
 * Parsed resume values always win when present; otherwise we fall back to the
 * existing stored profile (so re-uploads don't wipe out manually edited
 * fields), and finally to the authenticated user's email for the contact row.
 */
export function buildProfilePayload(
  parsed: ResumeParsedData,
  profileRow: ProfileRowLike | null | undefined,
  authEmail: string | null | undefined
): ProfilePayload {
  const existingData = asRecord(profileRow?.profile_data)

  return {
    fullName:
      parsed.profile.fullName || profileRow?.full_name || asString(existingData.fullName),
    email:
      parsed.profile.email || profileRow?.email || authEmail || asString(existingData.email),
    phone: parsed.profile.phone || asString(existingData.phone),
    location: parsed.profile.location || asString(existingData.location),
    portfolioUrl:
      parsed.profile.portfolio ||
      parsed.profile.website ||
      asString(existingData.portfolioUrl),
    linkedinUrl: parsed.profile.linkedin || asString(existingData.linkedinUrl),
    githubUrl: parsed.profile.github || asString(existingData.githubUrl),
    professionalSummary:
      parsed.professionalSummary || asString(existingData.professionalSummary),
    skills:
      parsed.skills.length > 0 ? parsed.skills : asStringArray(existingData.skills),
    workExperience:
      parsed.workExperience.length > 0
        ? parsed.workExperience
        : asObjectArray(existingData.workExperience),
    education:
      parsed.education.length > 0
        ? parsed.education
        : asObjectArray(existingData.education),
    projects:
      parsed.projects.length > 0 ? parsed.projects : asObjectArray(existingData.projects),
    certifications:
      parsed.certifications.length > 0
        ? parsed.certifications
        : asObjectArray(existingData.certifications),
    links:
      parsed.links.length > 0 ? parsed.links : asObjectArray(existingData.links),
  }
}
