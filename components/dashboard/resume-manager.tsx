"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type ResumeFileRecord = {
  id: string
  file_name: string
  mime_type: string | null
  uploaded_at: string | null
  public_url?: string | null
}

export function ResumeManager({ initialFiles }: { initialFiles: ResumeFileRecord[] }) {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedFile) {
      setError("Choose a resume file to upload.")
      return
    }

    setIsUploading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await fetch("/api/resume", {
        method: "POST",
        body: formData,
      })

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; success?: boolean }
        | null

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to upload resume.")
      }

      setSelectedFile(null)
      setSuccessMessage("Resume uploaded and parsed successfully! Profile details have been auto-populated.")
      router.push("/dashboard/profile")
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "There was a problem uploading your resume."
      )
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this resume?")) {
      return
    }

    setDeletingId(id)
    setError(null)

    try {
      const response = await fetch(`/api/resume?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to delete resume.")
      }

      router.refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete resume.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <form onSubmit={handleUpload} className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-foreground">Upload new resume</label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md,.rtf"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null)
                setSuccessMessage(null)
              }}
              className="file:mr-2 file:rounded-md file:border file:border-border file:bg-background file:px-2.5 file:py-1 file:text-xs"
            />
          </div>
          <Button type="submit" disabled={isUploading || !selectedFile} className="min-w-28">
            {isUploading ? "Uploading & Parsing..." : "Upload Resume"}
          </Button>
        </form>

        {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
        {successMessage ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-700 dark:text-emerald-400">
            <span>{successMessage}</span>
            <Link href="/dashboard/profile" className="font-semibold underline underline-offset-2">
              View Profile &rarr;
            </Link>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Uploaded resumes ({initialFiles.length})</h2>
        </div>

        {initialFiles.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            No resumes uploaded yet. Upload your resume above to get started.
          </div>
        ) : (
          <ul className="space-y-3">
            {initialFiles.map((resume) => (
              <li
                key={resume.id}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-border/80 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{resume.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {resume.uploaded_at
                      ? new Date(resume.uploaded_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Recently uploaded"}{" "}
                    · {resume.mime_type || "document"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* View in new tab */}
                  <a
                    href={`/api/resume?action=view&id=${encodeURIComponent(resume.id)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline" size="sm" type="button" className="h-8 px-3 text-xs">
                      View
                    </Button>
                  </a>

                  {/* Direct Download */}
                  <a
                    href={`/api/resume?action=download&id=${encodeURIComponent(resume.id)}`}
                    download={resume.file_name}
                  >
                    <Button variant="outline" size="sm" type="button" className="h-8 px-3 text-xs">
                      Download
                    </Button>
                  </a>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    disabled={deletingId === resume.id}
                    onClick={() => handleDelete(resume.id)}
                    className="h-8 px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    {deletingId === resume.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

