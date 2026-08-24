"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

/**
 * Displays a required onboarding dialog for uploading a resume.
 *
 * @param open - Whether the onboarding dialog is visible.
 */
export function OnboardingDialog({ open }: { open: boolean }) {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileName = useMemo(
    () => selectedFile?.name ?? "No file selected",
    [selectedFile]
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedFile) {
      setError("Please upload a resume file before continuing.")
      return
    }

    setIsUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append("file", selectedFile)

    try {
      const response = await fetch("/api/resume", {
        method: "POST",
        body: formData,
      })

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to upload resume.")
      }

      // Take the user straight to the auto-populated, editable profile form.
      router.push("/dashboard/profile")
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Upload failed. Please try again."
      )
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-xl rounded-2xl border border-border/80 bg-background px-5 py-5"
      >
        <DialogHeader className="gap-2">
          <DialogTitle className="text-lg font-semibold">Complete your onboarding</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Upload your resume to unlock the dashboard and let us auto-populate your profile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3">
            <label className="flex cursor-pointer flex-col gap-2 text-sm">
              <span className="font-medium text-foreground">Resume file</span>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md,.rtf"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                className="cursor-pointer border-none bg-transparent px-0 py-0 file:mr-2 file:rounded-md file:border file:border-border file:bg-background file:px-2 file:py-1 file:text-xs"
              />
            </label>
            <p className="mt-2 text-xs text-muted-foreground">Selected file: {fileName}</p>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={isUploading || !selectedFile} className="min-w-32">
              {isUploading ? "Uploading..." : "Upload resume"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
