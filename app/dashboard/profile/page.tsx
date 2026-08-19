import { UserCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { ProfileForm } from "@/components/dashboard/profile-form"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()

  if (!userData?.user) {
    return null
  }

  // Use admin client to read profile data — bypasses RLS so data is always returned
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, email, profile_data")
    .eq("id", userData.user.id)
    .maybeSingle()

  const { data: resumeRecord } = await admin
    .from("user_resumes")
    .select("parsed_resume_data")
    .eq("user_id", userData.user.id)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const initialProfile = (profile?.profile_data && typeof profile.profile_data === "object" && Object.keys(profile.profile_data).length > 0
    ? profile.profile_data
    : resumeRecord?.parsed_resume_data ?? {}) as Record<string, unknown>

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-foreground">
          <HugeiconsIcon icon={UserCircleIcon} strokeWidth={2} className="size-5" />
          <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Review and update your parsed profile details from your uploaded resume.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <ProfileForm initialProfile={initialProfile} email={profile?.email ?? userData.user.email ?? ""} />
      </div>
    </div>
  )
}
