import { NextResponse } from "next/server"

import { buildProfilePayload } from "@/lib/profile"
import { parseResumeFile } from "@/lib/resume-parser"
import type { Json } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

/**
 * Retrieves the authenticated user's resumes or streams an owned resume file.
 *
 * @param request - The request containing optional `id` and `action` query parameters.
 * @returns A resume list, file response, or an error response.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const action = searchParams.get("action") // "download" or "view"

  const admin = (await import("@/lib/supabase/admin")).createAdminClient()

  // Handle direct file stream for download / view to bypass public bucket S3 issues
  if (id && (action === "download" || action === "view")) {
    const { data: resumeRecord, error: findError } = await admin
      .from("user_resumes")
      .select("id, file_name, mime_type, storage_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (findError || !resumeRecord) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 })
    }

    const { data: fileBlob, error: downloadError } = await admin.storage
      .from("resumes")
      .download(resumeRecord.storage_path)

    if (downloadError || !fileBlob) {
      return NextResponse.json(
        { error: downloadError?.message || "Failed to retrieve resume file from storage" },
        { status: 500 }
      )
    }

    const disposition = action === "download" ? "attachment" : "inline"
    const buffer = Buffer.from(await fileBlob.arrayBuffer())

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": resumeRecord.mime_type || "application/pdf",
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(resumeRecord.file_name)}"`,
        "Content-Length": buffer.length.toString(),
      },
    })
  }

  // Otherwise return the list of resumes
  const { data: rows, error } = await admin
    .from("user_resumes")
    .select("id, file_name, mime_type, uploaded_at, public_url, storage_path")
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ resumes: rows ?? [] })
}

/**
 * Deletes an authenticated user's resume and its associated storage file.
 *
 * @param request - The request containing the resume ID in its query parameters
 * @returns A response confirming deletion or describing the authorization, validation, not-found, or database error
 */
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  const user = userData?.user

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Resume ID is required" }, { status: 400 })
  }

  const admin = (await import("@/lib/supabase/admin")).createAdminClient()

  // 1. Find the resume record to get the storage path
  const { data: resumeRecord } = await admin
    .from("user_resumes")
    .select("id, storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!resumeRecord) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 })
  }

  // 2. Delete the file from storage
  if (resumeRecord.storage_path) {
    await admin.storage.from("resumes").remove([resumeRecord.storage_path])
  }

  // 3. Delete the record from the database
  const { error: deleteError } = await admin
    .from("user_resumes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: "Resume deleted successfully" })
}

/**
 * Uploads a resume, parses its contents, and updates the authenticated user's profile.
 *
 * @returns A response containing the parsed resume, public resume URL, and updated profile, or an error response.
 */
export async function POST(request: Request) {
  // 1. Verify the user is authenticated (uses user-scoped client)
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  const user = userData?.user

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A resume file is required." }, { status: 400 })
  }

  // 2. All storage and DB writes use the admin client to bypass RLS.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        error:
          "Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it to your .env.local file (Settings -> API -> service_role in the Supabase dashboard) and restart the dev server.",
      },
      { status: 500 }
    )
  }

  const admin = (await import("@/lib/supabase/admin")).createAdminClient()

  // Ensure storage bucket exists
  try {
    const { data: buckets } = await admin.storage.listBuckets()
    if (!buckets?.some((b) => b.name === "resumes")) {
      await admin.storage.createBucket("resumes", { public: true })
    }
  } catch (bucketCheckErr) {
    console.warn("Storage bucket check non-critical error:", bucketCheckErr)
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_") || "resume"
  const storagePath = `${user.id}/${Date.now()}-${safeName}`

  // 3. Upload file to storage using admin client (bypasses storage RLS)
  const { error: uploadError } = await admin.storage
    .from("resumes")
    .upload(storagePath, fileBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("resumes").getPublicUrl(storagePath)

  const parsedResume = await parseResumeFile(file.name, file.type || "application/octet-stream", fileBuffer)

  // 4. Fetch existing profile row via admin client
  const { data: profileRow, error: profileError } = await admin
    .from("profiles")
    .select("profile_data, full_name, email")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  const profilePayload = buildProfilePayload(parsedResume, profileRow, user.email)

  // 5. Upsert profile via admin client with newly parsed details
  const { error: profileUpdateError } = await admin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: profilePayload.email,
        full_name:
          profilePayload.fullName || profileRow?.full_name || user.email?.split("@")[0] || "",
        profile_data: profilePayload as unknown as Json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )

  if (profileUpdateError) {
    return NextResponse.json({ error: profileUpdateError.message }, { status: 500 })
  }

  // 6. Insert resume record via admin client
  const { error: resumeInsertError } = await admin.from("user_resumes").insert({
    user_id: user.id,
    file_name: safeName,
    storage_path: storagePath,
    mime_type: file.type || "application/octet-stream",
    file_size: fileBuffer.length,
    public_url: publicUrl,
    parsed_resume_data: parsedResume as unknown as Json,
    uploaded_at: new Date().toISOString(),
  })

  if (resumeInsertError) {
    return NextResponse.json({ error: resumeInsertError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    parsedResume,
    resumeUrl: publicUrl,
    profile: profilePayload,
  })
}

