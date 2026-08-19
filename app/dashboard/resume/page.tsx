import { File01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { ResumeManager } from "@/components/dashboard/resume-manager"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export default async function ResumePage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()

  if (!userData?.user) {
    return null
  }

  // Use admin client to read resumes — bypasses RLS so the list always loads
  const admin = createAdminClient()

  const { data: resumes } = await admin
    .from("user_resumes")
    .select("id, file_name, mime_type, uploaded_at, public_url")
    .eq("user_id", userData.user.id)
    .order("uploaded_at", { ascending: false })

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-foreground">
          <HugeiconsIcon icon={File01Icon} strokeWidth={2} className="size-5" />
          <h1 className="text-xl font-semibold tracking-tight">Resume</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload, review, and manage your resume files and parsed profile data.
        </p>
      </div>

      <ResumeManager
        initialFiles={
          (resumes ?? []).map((resume) => ({
            ...resume,
            mime_type: resume.mime_type ?? "application/octet-stream",
            uploaded_at: resume.uploaded_at ?? new Date().toISOString(),
            public_url: resume.public_url ?? null,
          }))
        }
      />
    </div>
  )
}
