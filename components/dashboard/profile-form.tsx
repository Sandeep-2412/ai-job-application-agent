"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Briefcase01Icon,
  Certificate01Icon,
  CodeIcon,
  GraduationCapIcon,
  Link01Icon,
  PlusSignIcon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { ProfileCompletenessCard } from "@/components/dashboard/profile-completeness-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

export type ProfileFormValue = {
  fullName: string
  email: string
  phone: string
  location: string
  portfolioUrl: string
  linkedinUrl: string
  githubUrl: string
  professionalSummary: string
  skills: string[]
  workExperience: Array<{
    companyName: string
    jobTitle: string
    duration: string
    responsibilities: string[]
    location: string
  }>
  education: Array<{
    school: string
    degree: string
    field: string
    duration: string
    details: string[]
  }>
  projects: Array<{
    name: string
    description: string
    url: string
    technologies: string[]
  }>
  certifications: Array<{ name: string; issuer: string; date: string }>
  links: Array<{ label: string; url: string }>
}

const defaultProfileForm: ProfileFormValue = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  portfolioUrl: "",
  linkedinUrl: "",
  githubUrl: "",
  professionalSummary: "",
  skills: [],
  workExperience: [{ companyName: "", jobTitle: "", duration: "", responsibilities: [], location: "" }],
  education: [{ school: "", degree: "", field: "", duration: "", details: [] }],
  projects: [{ name: "", description: "", url: "", technologies: [] }],
  certifications: [{ name: "", issuer: "", date: "" }],
  links: [{ label: "", url: "" }],
}

function parseSkills(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string")
  }
  if (typeof value === "string") {
    return value.split(",").map((entry) => entry.trim()).filter(Boolean)
  }
  return []
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : ""
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function recordValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value ? value as Record<string, unknown> : {}
}

function normalizeProfile(raw: Record<string, unknown> | null | undefined): ProfileFormValue {
  const data = raw ?? {}
  const nestedProfile = recordValue(data.profile)
  const value = (key: string, nestedKey = key) =>
    stringValue(data[key]) || stringValue(nestedProfile[nestedKey])

  const workExperience = Array.isArray(data.workExperience)
    ? data.workExperience.map((entry) => {
        const item = recordValue(entry)
        return {
          companyName: stringValue(item.companyName),
          jobTitle: stringValue(item.jobTitle),
          duration: stringValue(item.duration),
          responsibilities: stringArray(item.responsibilities),
          location: stringValue(item.location),
        }
      })
    : []

  const education = Array.isArray(data.education)
    ? data.education.map((entry) => {
        const item = recordValue(entry)
        return {
          school: stringValue(item.school),
          degree: stringValue(item.degree),
          field: stringValue(item.field),
          duration: stringValue(item.duration),
          details: stringArray(item.details),
        }
      })
    : []

  const projects = Array.isArray(data.projects)
    ? data.projects.map((entry) => {
        const item = recordValue(entry)
        return {
          name: stringValue(item.name),
          description: stringValue(item.description),
          url: stringValue(item.url),
          technologies: stringArray(item.technologies),
        }
      })
    : []

  const certifications = Array.isArray(data.certifications)
    ? data.certifications.map((entry) => {
        const item = recordValue(entry)
        return { name: stringValue(item.name), issuer: stringValue(item.issuer), date: stringValue(item.date) }
      })
    : []

  const links = Array.isArray(data.links)
    ? data.links.map((entry) => {
        const item = recordValue(entry)
        return { label: stringValue(item.label), url: stringValue(item.url) }
      })
    : []

  return {
    fullName: value("fullName", "full_name"),
    email: value("email"),
    phone: value("phone"),
    location: value("location"),
    portfolioUrl: stringValue(data.portfolioUrl) || value("portfolio") || value("website"),
    linkedinUrl: stringValue(data.linkedinUrl) || value("linkedin") || value("linkedinUrl"),
    githubUrl: stringValue(data.githubUrl) || value("github") || value("githubUrl"),
    professionalSummary: stringValue(data.professionalSummary) || stringValue(data.summary),
    skills: parseSkills(data.skills ?? data.skillSet),
    workExperience: workExperience.length ? workExperience : defaultProfileForm.workExperience,
    education: education.length ? education : defaultProfileForm.education,
    projects: projects.length ? projects : defaultProfileForm.projects,
    certifications: certifications.length ? certifications : defaultProfileForm.certifications,
    links: links.length ? links : defaultProfileForm.links,
  }
}

const primaryActionClass = "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"

function SectionHeading({ title, description, onAdd, addLabel }: {
  title: string
  description: string
  onAdd: () => void
  addLabel: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Button type="button" size="sm" className={primaryActionClass} onClick={onAdd}>
        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
        {addLabel}
      </Button>
    </div>
  )
}

export function ProfileForm({ initialProfile, email }: { initialProfile?: Record<string, unknown> | null; email?: string }) {
  const router = useRouter()
  const resolvedInitial = useMemo(
    () => normalizeProfile({ ...initialProfile, email: stringValue(initialProfile?.email) || email || "" }),
    [initialProfile, email]
  )
  const [form, setForm] = useState<ProfileFormValue>(resolvedInitial)
  const [previousInitial, setPreviousInitial] = useState(resolvedInitial)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  if (resolvedInitial !== previousInitial) {
    setPreviousInitial(resolvedInitial)
    setForm(resolvedInitial)
  }

  function setField<K extends keyof ProfileFormValue>(key: K, value: ProfileFormValue[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  type ArrayKey = "workExperience" | "education" | "projects" | "certifications" | "links"
  function updateArrayItem<K extends ArrayKey>(key: K, index: number, nextItem: ProfileFormValue[K][number]) {
    setForm((current) => {
      const next = [...current[key]] as ProfileFormValue[K]
      next[index] = nextItem
      return { ...current, [key]: next }
    })
  }
  function appendArrayItem<K extends ArrayKey>(key: K, value: ProfileFormValue[K][number]) {
    setForm((current) => ({ ...current, [key]: [...current[key], value] }))
  }
  function removeArrayItem<K extends ArrayKey>(key: K, index: number) {
    setForm((current) => ({ ...current, [key]: current[key].filter((_, itemIndex) => itemIndex !== index) }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setStatus(null)
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const payload = await response.json().catch(() => null) as { error?: string } | null
      if (!response.ok) throw new Error(payload?.error ?? "Unable to save profile.")
      setStatus("Profile saved successfully.")
      router.refresh()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save profile.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
      <div className="min-w-0">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="overview" className="space-y-5">
            <TabsList variant="line" className="w-full justify-start gap-1 overflow-x-auto border-b border-border/70 pb-1">
              <TabsTrigger value="overview" className="min-w-fit px-3 py-2"><HugeiconsIcon icon={UserCircleIcon} strokeWidth={2} />Overview</TabsTrigger>
              <TabsTrigger value="experience" className="min-w-fit px-3 py-2"><HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} />Experience</TabsTrigger>
              <TabsTrigger value="education" className="min-w-fit px-3 py-2"><HugeiconsIcon icon={GraduationCapIcon} strokeWidth={2} />Education</TabsTrigger>
              <TabsTrigger value="projects" className="min-w-fit px-3 py-2"><HugeiconsIcon icon={CodeIcon} strokeWidth={2} />Projects</TabsTrigger>
              <TabsTrigger value="credentials" className="min-w-fit px-3 py-2"><HugeiconsIcon icon={Certificate01Icon} strokeWidth={2} />Credentials</TabsTrigger>
              <TabsTrigger value="links" className="min-w-fit px-3 py-2"><HugeiconsIcon icon={Link01Icon} strokeWidth={2} />Links</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1"><label className="text-xs font-medium">Full name</label><Input value={form.fullName} onChange={(event) => setField("fullName", event.target.value)} /></div>
                <div className="space-y-1"><label className="text-xs font-medium">Email</label><Input value={form.email} onChange={(event) => setField("email", event.target.value)} /></div>
                <div className="space-y-1"><label className="text-xs font-medium">Phone</label><Input value={form.phone} onChange={(event) => setField("phone", event.target.value)} /></div>
                <div className="space-y-1"><label className="text-xs font-medium">Location</label><Input value={form.location} onChange={(event) => setField("location", event.target.value)} /></div>
                <div className="space-y-1"><label className="text-xs font-medium">Portfolio URL</label><Input value={form.portfolioUrl} onChange={(event) => setField("portfolioUrl", event.target.value)} /></div>
                <div className="space-y-1"><label className="text-xs font-medium">LinkedIn</label><Input value={form.linkedinUrl} onChange={(event) => setField("linkedinUrl", event.target.value)} /></div>
                <div className="space-y-1 md:col-span-2"><label className="text-xs font-medium">GitHub</label><Input value={form.githubUrl} onChange={(event) => setField("githubUrl", event.target.value)} /></div>
              </div>
              <div className="space-y-2"><label className="text-xs font-medium">Professional summary</label><Textarea value={form.professionalSummary} onChange={(event) => setField("professionalSummary", event.target.value)} rows={5} /></div>
              <div className="space-y-2"><label className="text-xs font-medium">Skills <span className="font-normal text-muted-foreground">(comma separated)</span></label><Textarea value={form.skills.join(", ")} onChange={(event) => setField("skills", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} rows={3} /></div>
            </TabsContent>

            <TabsContent value="experience" className="space-y-4">
              <SectionHeading title="Work experience" description="Show the impact you made in each role." addLabel="Add role" onAdd={() => appendArrayItem("workExperience", { companyName: "", jobTitle: "", duration: "", responsibilities: [""], location: "" })} />
              {form.workExperience.map((entry, index) => (
                <div key={`experience-${index}`} className="space-y-3 rounded-xl border bg-card p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input value={entry.companyName} onChange={(event) => updateArrayItem("workExperience", index, { ...entry, companyName: event.target.value })} placeholder="Company" />
                    <Input value={entry.jobTitle} onChange={(event) => updateArrayItem("workExperience", index, { ...entry, jobTitle: event.target.value })} placeholder="Job title" />
                    <Input value={entry.duration} onChange={(event) => updateArrayItem("workExperience", index, { ...entry, duration: event.target.value })} placeholder="Duration" />
                    <Input value={entry.location} onChange={(event) => updateArrayItem("workExperience", index, { ...entry, location: event.target.value })} placeholder="Location" />
                  </div>
                  <Textarea value={entry.responsibilities.join("\n")} onChange={(event) => updateArrayItem("workExperience", index, { ...entry, responsibilities: event.target.value.split(/\n|•/).map((item) => item.trim()).filter(Boolean) })} placeholder="Responsibilities / bullet points" rows={4} />
                  {form.workExperience.length > 1 ? <div className="flex justify-end"><Button type="button" variant="ghost" size="sm" onClick={() => removeArrayItem("workExperience", index)}>Remove</Button></div> : null}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="education" className="space-y-4">
              <SectionHeading title="Education" description="Add degrees, courses, and academic highlights." addLabel="Add education" onAdd={() => appendArrayItem("education", { school: "", degree: "", field: "", duration: "", details: [] })} />
              {form.education.map((entry, index) => (
                <div key={`education-${index}`} className="space-y-3 rounded-xl border bg-card p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input value={entry.school} onChange={(event) => updateArrayItem("education", index, { ...entry, school: event.target.value })} placeholder="School" />
                    <Input value={entry.degree} onChange={(event) => updateArrayItem("education", index, { ...entry, degree: event.target.value })} placeholder="Degree" />
                    <Input value={entry.field} onChange={(event) => updateArrayItem("education", index, { ...entry, field: event.target.value })} placeholder="Field" />
                    <Input value={entry.duration} onChange={(event) => updateArrayItem("education", index, { ...entry, duration: event.target.value })} placeholder="Duration" />
                  </div>
                  <Textarea value={entry.details.join("\n")} onChange={(event) => updateArrayItem("education", index, { ...entry, details: event.target.value.split(/\n|•/).map((item) => item.trim()).filter(Boolean) })} placeholder="Additional notes" rows={3} />
                  {form.education.length > 1 ? <div className="flex justify-end"><Button type="button" variant="ghost" size="sm" onClick={() => removeArrayItem("education", index)}>Remove</Button></div> : null}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="projects" className="space-y-4">
              <SectionHeading title="Projects" description="Highlight work that demonstrates your strengths." addLabel="Add project" onAdd={() => appendArrayItem("projects", { name: "", description: "", url: "", technologies: [] })} />
              {form.projects.map((entry, index) => (
                <div key={`project-${index}`} className="space-y-3 rounded-xl border bg-card p-3">
                  <div className="grid gap-3 md:grid-cols-2"><Input value={entry.name} onChange={(event) => updateArrayItem("projects", index, { ...entry, name: event.target.value })} placeholder="Project name" /><Input value={entry.url} onChange={(event) => updateArrayItem("projects", index, { ...entry, url: event.target.value })} placeholder="Project URL" /></div>
                  <Textarea value={entry.description} onChange={(event) => updateArrayItem("projects", index, { ...entry, description: event.target.value })} placeholder="Project description" rows={3} />
                  <Input value={entry.technologies.join(", ")} onChange={(event) => updateArrayItem("projects", index, { ...entry, technologies: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="Technologies" />
                  {form.projects.length > 1 ? <div className="flex justify-end"><Button type="button" variant="ghost" size="sm" onClick={() => removeArrayItem("projects", index)}>Remove</Button></div> : null}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="credentials" className="space-y-4">
              <SectionHeading title="Certifications" description="Keep licenses and credentials current." addLabel="Add certification" onAdd={() => appendArrayItem("certifications", { name: "", issuer: "", date: "" })} />
              {form.certifications.map((entry, index) => (
                <div key={`certificate-${index}`} className="grid gap-3 rounded-xl border bg-card p-3 md:grid-cols-3">
                  <Input value={entry.name} onChange={(event) => updateArrayItem("certifications", index, { ...entry, name: event.target.value })} placeholder="Certification" />
                  <Input value={entry.issuer} onChange={(event) => updateArrayItem("certifications", index, { ...entry, issuer: event.target.value })} placeholder="Issuer" />
                  <div className="flex gap-2"><Input value={entry.date} onChange={(event) => updateArrayItem("certifications", index, { ...entry, date: event.target.value })} placeholder="Date" />{form.certifications.length > 1 ? <Button type="button" variant="ghost" size="sm" onClick={() => removeArrayItem("certifications", index)}>Remove</Button> : null}</div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="links" className="space-y-4">
              <SectionHeading title="Links" description="Add the places where people can learn more about you." addLabel="Add link" onAdd={() => appendArrayItem("links", { label: "", url: "" })} />
              {form.links.map((entry, index) => (
                <div key={`link-${index}`} className="grid gap-3 rounded-xl border bg-card p-3 md:grid-cols-[160px_1fr_auto]"><Input value={entry.label} onChange={(event) => updateArrayItem("links", index, { ...entry, label: event.target.value })} placeholder="Label" /><Input value={entry.url} onChange={(event) => updateArrayItem("links", index, { ...entry, url: event.target.value })} placeholder="URL" />{form.links.length > 1 ? <Button type="button" variant="ghost" size="sm" onClick={() => removeArrayItem("links", index)}>Remove</Button> : null}</div>
              ))}
            </TabsContent>
          </Tabs>

          {status ? <p className={status.includes("success") ? "text-xs text-emerald-600" : "text-xs text-destructive"}>{status}</p> : null}
          <div className="flex justify-end border-t border-border/70 pt-5"><Button type="submit" disabled={isSaving} className={primaryActionClass}>{isSaving ? "Saving..." : "Save profile"}</Button></div>
        </form>
      </div>
      <ProfileCompletenessCard profile={form} />
    </div>
  )
}
