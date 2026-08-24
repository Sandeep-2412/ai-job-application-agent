"use client"

import { CheckmarkCircle02Icon, SparklesIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { ProfileFormValue } from "@/components/dashboard/profile-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Determines whether a string contains text after trimming whitespace.
 *
 * @param value - The string to evaluate
 * @returns `true` if the trimmed string contains at least one character, `false` otherwise
 */
function hasText(value: string) {
  return value.trim().length > 0
}

/**
 * Determines whether an array contains at least one meaningful item.
 *
 * @param value - The array to inspect
 * @param isMeaningful - Predicate used to identify meaningful items
 * @returns `true` if the array contains a meaningful item, `false` otherwise
 */
function hasArrayData<T>(value: T[], isMeaningful: (item: T) => boolean = () => true) {
  return value.some(isMeaningful)
}

/**
 * Evaluates the completion status of the profile's major sections.
 *
 * @param profile - The profile data to evaluate
 * @returns The completion status for each section and the overall completion percentage
 */
function getCompleteness(profile: ProfileFormValue) {
  const checks = [
    { label: "Contact details", complete: hasText(profile.fullName) && hasText(profile.email) },
    { label: "Professional summary", complete: hasText(profile.professionalSummary) },
    { label: "Skills", complete: hasArrayData(profile.skills, hasText) },
    {
      label: "Work experience",
      complete: hasArrayData(profile.workExperience, (item) => hasText(item.companyName) || hasText(item.jobTitle)),
    },
    {
      label: "Education",
      complete: hasArrayData(profile.education, (item) => hasText(item.school) || hasText(item.degree)),
    },
    {
      label: "Projects",
      complete: hasArrayData(profile.projects, (item) => hasText(item.name) || hasText(item.description)),
    },
    {
      label: "Certifications",
      complete: hasArrayData(profile.certifications, (item) => hasText(item.name)),
    },
    {
      label: "Links",
      complete: hasArrayData(profile.links, (item) => hasText(item.url)),
    },
  ]

  const completed = checks.filter((check) => check.complete).length
  return { checks, percentage: Math.round((completed / checks.length) * 100) }
}

/**
 * Selects the color, label, and text class for a profile completion percentage.
 *
 * @param percentage - The profile completion percentage.
 * @returns The display color, status label, and text class for the percentage range.
 */
function getProgressTone(percentage: number) {
  if (percentage < 40) {
    return { color: "#ef4444", label: "Getting started", className: "text-red-500" }
  }
  if (percentage < 75) {
    return { color: "#f59e0b", label: "Looking good", className: "text-amber-500" }
  }
  if (percentage < 100) {
    return { color: "#10b981", label: "Almost complete", className: "text-emerald-500" }
  }
  return { color: "#84cc16", label: "Profile complete", className: "text-lime-500" }
}

/**
 * Renders a card showing the profile's completion percentage and completed sections.
 *
 * @param profile - The profile data used to determine completion status.
 */
export function ProfileCompletenessCard({ profile }: { profile: ProfileFormValue }) {
  const { checks, percentage } = getCompleteness(profile)
  const tone = getProgressTone(percentage)

  return (
    <Card className="h-fit border-border/70 shadow-sm lg:sticky lg:top-6">
      <CardHeader className="gap-1">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4" />
          </div>
          <div>
            <CardTitle className="text-sm">Profile completeness</CardTitle>
            <CardDescription>Complete your profile to stand out.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex justify-center py-2">
          <div
            className="relative flex size-40 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(${tone.color} ${percentage}%, color-mix(in srgb, ${tone.color} 14%, transparent) ${percentage}% 100%)`,
            }}
            aria-label={`${percentage}% profile complete`}
            role="img"
          >
            <div className="flex size-32 flex-col items-center justify-center rounded-full bg-card text-center ring-1 ring-border/60">
              <span className={`text-3xl font-bold tracking-tight ${tone.className}`}>{percentage}%</span>
              <span className="text-[11px] font-medium text-muted-foreground">complete</span>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className={`font-semibold ${tone.className}`}>{tone.label}</span>
            <span className="text-muted-foreground">{checks.filter((check) => check.complete).length}/{checks.length} sections</span>
          </div>
          <ul className="space-y-2">
            {checks.map((check) => (
              <li key={check.label} className="flex items-center gap-2 text-xs">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  strokeWidth={2}
                  className={`size-4 shrink-0 ${check.complete ? "text-emerald-500" : "text-muted-foreground/35"}`}
                />
                <span className={check.complete ? "text-foreground" : "text-muted-foreground"}>{check.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
