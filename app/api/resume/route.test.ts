import { beforeEach, describe, expect, it, vi } from "vitest"

import { POST } from "@/app/api/resume/route"
import type { ResumeParsedData } from "@/lib/resume-parser"

const mocks = vi.hoisted(() => ({
  parseResumeFile: vi.fn(),
  getUser: vi.fn(),
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  listBuckets: vi.fn(),
  createBucket: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
  maybeSingle: vi.fn(),
  upsert: vi.fn(),
  insert: vi.fn(),
}))

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "Content-Type": "application/json" },
      }),
  },
}))

vi.mock("@/lib/resume-parser", () => ({
  parseResumeFile: mocks.parseResumeFile,
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}))

const USER = { id: "user-123", email: "jane@example.com" }

const cannedParsed: ResumeParsedData = {
  profile: {
    fullName: "Jane Smith",
    email: "jane.smith@example.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    website: "https://janesmith.dev",
    linkedin: "https://linkedin.com/in/janesmith",
    github: "https://github.com/janesmith",
    portfolio: "https://janesmith.dev",
  },
  professionalSummary: "Experienced engineer.",
  skills: ["JavaScript", "TypeScript", "React"],
  workExperience: [
    {
      companyName: "Acme Corp",
      jobTitle: "Senior Software Engineer",
      duration: "Jan 2020 - Present",
      responsibilities: ["Built a design system"],
      location: "San Francisco, CA",
    },
  ],
  education: [
    {
      school: "University of California, Berkeley",
      degree: "B.S. Computer Science",
      field: "Computer Science",
      duration: "2013 - 2017",
      details: [],
    },
  ],
  projects: [],
  certifications: [],
  links: [{ label: "LinkedIn", url: "https://linkedin.com/in/janesmith" }],
  additionalInfo: {},
}

function makeAdminClient() {
  return {
    storage: {
      listBuckets: mocks.listBuckets,
      createBucket: mocks.createBucket,
      from: vi.fn(() => ({
        upload: mocks.upload,
        getPublicUrl: mocks.getPublicUrl,
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mocks.maybeSingle,
        })),
      })),
      upsert: mocks.upsert,
      insert: mocks.insert,
    })),
  }
}

beforeEach(() => {
  vi.clearAllMocks()

  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-role"

  mocks.createClient.mockResolvedValue({ auth: { getUser: mocks.getUser } })
  mocks.getUser.mockResolvedValue({ data: { user: USER }, error: null })
  mocks.createAdminClient.mockReturnValue(makeAdminClient())

  mocks.listBuckets.mockResolvedValue({ data: [], error: null })
  mocks.createBucket.mockResolvedValue({ data: null, error: null })
  mocks.upload.mockResolvedValue({ error: null })
  mocks.getPublicUrl.mockReturnValue({
    data: { publicUrl: "https://cdn.example.com/resume.txt" },
  })
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
  mocks.upsert.mockResolvedValue({ error: null })
  mocks.insert.mockResolvedValue({ error: null })

  mocks.parseResumeFile.mockResolvedValue(cannedParsed)
})

describe("POST /api/resume", () => {
  it("uploads a sample resume and saves the parsed profile and resume record", async () => {
    const formData = new FormData()
    formData.append(
      "file",
      new File(["Jane Smith\nSenior Software Engineer"], "resume.txt", {
        type: "text/plain",
      })
    )
    const request = new Request("http://localhost/api/resume", {
      method: "POST",
      body: formData,
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      success: boolean
      profile: Record<string, unknown>
    }
    expect(body.success).toBe(true)

    // 1. File was uploaded to the resumes storage bucket.
    expect(mocks.upload).toHaveBeenCalledTimes(1)
    const [uploadPath, uploadBuffer, uploadOptions] = mocks.upload.mock.calls[0]
    expect(uploadPath).toMatch(/^user-123\/\d+-resume\.txt$/)
    expect(Buffer.isBuffer(uploadBuffer)).toBe(true)
    expect(uploadOptions.contentType).toBe("text/plain")

    // 2. Parsed profile was saved to the profiles table.
    expect(mocks.upsert).toHaveBeenCalledTimes(1)
    const upsertRow = mocks.upsert.mock.calls[0][0]
    expect(upsertRow.id).toBe(USER.id)
    expect(upsertRow.full_name).toBe("Jane Smith")
    expect(upsertRow.profile_data.fullName).toBe("Jane Smith")
    expect(upsertRow.profile_data.email).toBe("jane.smith@example.com")
    expect(upsertRow.profile_data.skills).toEqual(["JavaScript", "TypeScript", "React"])
    expect(upsertRow.profile_data.workExperience).toHaveLength(1)
    expect(upsertRow.profile_data.workExperience[0].companyName).toBe("Acme Corp")
    expect(upsertRow.profile_data.education[0].school).toBe(
      "University of California, Berkeley"
    )

    // 3. Resume record was saved to user_resumes.
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    const resumeRow = mocks.insert.mock.calls[0][0]
    expect(resumeRow.user_id).toBe(USER.id)
    expect(resumeRow.file_name).toBe("resume.txt")
    expect(resumeRow.storage_path).toBe(uploadPath)
    expect(resumeRow.public_url).toBe("https://cdn.example.com/resume.txt")
    expect(resumeRow.parsed_resume_data).toEqual(cannedParsed)

    // 4. Parser received the uploaded file name, type, and bytes.
    expect(mocks.parseResumeFile).toHaveBeenCalledWith(
      "resume.txt",
      "text/plain",
      expect.any(Buffer)
    )
  })

  it("rejects an unauthenticated request", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const request = new Request("http://localhost/api/resume", { method: "POST" })
    const response = await POST(request)

    expect(response.status).toBe(401)
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.upsert).not.toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
  })
})
