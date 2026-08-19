import { NextResponse } from "next/server"

import type { Json } from "@/lib/supabase/database.types"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, full_name, email, profile_data, avatar_url")
    .eq("id", user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile: profile ?? null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  const user = userData?.user

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const payload = await request.json()

  const profileData = {
    fullName: typeof payload.fullName === "string" ? payload.fullName : "",
    email: typeof payload.email === "string" ? payload.email : user.email ?? "",
    phone: typeof payload.phone === "string" ? payload.phone : "",
    location: typeof payload.location === "string" ? payload.location : "",
    portfolioUrl: typeof payload.portfolioUrl === "string" ? payload.portfolioUrl : "",
    linkedinUrl: typeof payload.linkedinUrl === "string" ? payload.linkedinUrl : "",
    githubUrl: typeof payload.githubUrl === "string" ? payload.githubUrl : "",
    professionalSummary:
      typeof payload.professionalSummary === "string" ? payload.professionalSummary : "",
    skills: Array.isArray(payload.skills) ? payload.skills : [],
    workExperience: Array.isArray(payload.workExperience) ? payload.workExperience : [],
    education: Array.isArray(payload.education) ? payload.education : [],
    projects: Array.isArray(payload.projects) ? payload.projects : [],
    certifications: Array.isArray(payload.certifications) ? payload.certifications : [],
    links: Array.isArray(payload.links) ? payload.links : [],
  }

  const data = {
    id: user.id,
    email: typeof payload.email === "string" ? payload.email : user.email ?? "",
    full_name:
      typeof payload.fullName === "string" && payload.fullName.trim()
        ? payload.fullName
        : user.email?.split("@")[0] ?? "",
    profile_data: profileData as unknown as Json,
    updated_at: new Date().toISOString(),
  }

  const admin = createAdminClient()
  const { error } = await admin.from("profiles").upsert(data, { onConflict: "id" })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, profile: profileData })
}

