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

/**
 * Converts a non-null object to a record.
 *
 * @param value - The value to convert
 * @returns The value as a record, or an empty record for other values
 */
function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value ? (value as Record<string, unknown>) : {}
}

/**
 * Converts a value to a string when it is already a string.
 *
 * @param value - The value to convert
 * @returns The original string, or an empty string for other values
 */
function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

/**
 * Extracts string elements from an array-like value.
 *
 * @param value - The value to convert into a string array
 * @returns The string elements in `value`, or an empty array if `value` is not an array
 */
function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

/**
 * Converts an unknown value to an array.
 *
 * @param value - The value to convert
 * @returns The input array, or an empty array when the value is not an array
 */
function asObjectArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/**
 * Builds a normalized profile payload from parsed resume data and stored profile values.
 *
 * Parsed values take precedence over stored values. Existing profile data preserves
 * fields omitted from the parsed resume, with the authenticated email used as an
 * additional fallback for the email field.
 *
 * @returns The normalized profile payload
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
