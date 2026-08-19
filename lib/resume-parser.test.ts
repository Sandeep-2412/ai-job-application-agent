import { beforeEach, describe, expect, it, vi } from "vitest"

import { buildProfilePayload } from "@/lib/profile"
import { parseResumeFile, type ResumeParsedData } from "@/lib/resume-parser"

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
}))

vi.mock("@google/genai", () => ({
  // Use a plain (constructable) function so `new GoogleGenAI()` works.
  GoogleGenAI: function GoogleGenAI() {
    return { models: { generateContent: mocks.generateContent } }
  },
}))

const SAMPLE_RESUME = `Jane Smith
Senior Software Engineer
jane.smith@example.com | +1 (555) 123-4567 | San Francisco, CA
linkedin.com/in/janesmith | github.com/janesmith

PROFESSIONAL SUMMARY
Experienced engineer building scalable web applications with React and Node.js.

SKILLS
JavaScript, TypeScript, React, Node.js, PostgreSQL, AWS

WORK EXPERIENCE
Acme Corp | Senior Software Engineer | Jan 2020 - Present
• Built a design system used across 20+ teams
• Led migration to TypeScript

Globex Inc | Software Engineer | Jun 2017 - Dec 2019
• Developed REST APIs serving millions of requests

EDUCATION
University of California, Berkeley | B.S. Computer Science | 2013 - 2017

CERTIFICATIONS
AWS Certified Solutions Architect | Amazon | 2022
`

const GEMINI_JSON = {
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
  professionalSummary: "Experienced engineer building scalable web applications.",
  skills: ["JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL", "AWS"],
  workExperience: [
    {
      companyName: "Acme Corp",
      jobTitle: "Senior Software Engineer",
      duration: "Jan 2020 - Present",
      responsibilities: ["Built a design system", "Led migration to TypeScript"],
      location: "San Francisco, CA",
    },
    {
      companyName: "Globex Inc",
      jobTitle: "Software Engineer",
      duration: "Jun 2017 - Dec 2019",
      responsibilities: ["Developed REST APIs serving millions of requests"],
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
  projects: [
    {
      name: "Portfolio",
      description: "Personal site",
      url: "https://janesmith.dev",
      technologies: ["React"],
    },
  ],
  certifications: [
    {
      name: "AWS Certified Solutions Architect",
      issuer: "Amazon",
      date: "2022",
    },
  ],
  links: [{ label: "LinkedIn", url: "https://linkedin.com/in/janesmith" }],
  additionalInfo: {},
}

function makeMinimalPdf(textContent: string): Buffer {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    null,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ]

  const streamContent = `BT /F1 24 Tf 72 720 Td (${textContent}) Tj ET\n`

  let pdf = "%PDF-1.4\n"
  const offsets: number[] = []
  for (let i = 1; i <= 5; i++) {
    offsets[i] = Buffer.byteLength(pdf, "utf8")
    pdf += `${i} 0 obj\n`
    if (i === 4) {
      pdf += `<< /Length ${Buffer.byteLength(streamContent, "utf8")} >>\n`
      pdf += `stream\n${streamContent}endstream\n`
    } else {
      pdf += `${objects[i - 1]}\n`
    }
    pdf += "endobj\n"
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8")
  pdf += "xref\n0 6\n0000000000 65535 f \n"
  for (let i = 1; i <= 5; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  return Buffer.from(pdf, "utf8")
}

const parsedFixture: ResumeParsedData = {
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
  professionalSummary: "Experienced engineer building scalable web applications.",
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
  links: [],
  additionalInfo: {},
}

describe("parseResumeFile", () => {
  beforeEach(() => {
    mocks.generateContent.mockReset()
    delete process.env.GEMINI_API_KEY
    delete process.env.GEMINI_MODEL
  })

  it("parses a resume through Gemini and normalizes the structured result", async () => {
    process.env.GEMINI_API_KEY = "test-key"
    process.env.GEMINI_MODEL = "gemini-2.5-flash"
    mocks.generateContent.mockResolvedValue({ text: JSON.stringify(GEMINI_JSON) })

    const result = await parseResumeFile(
      "resume.txt",
      "text/plain",
      Buffer.from(SAMPLE_RESUME)
    )

    expect(result.profile).toEqual(GEMINI_JSON.profile)
    expect(result.professionalSummary).toBe(GEMINI_JSON.professionalSummary)
    expect(result.skills).toEqual(GEMINI_JSON.skills)
    expect(result.workExperience).toEqual(GEMINI_JSON.workExperience)
    expect(result.education).toEqual(GEMINI_JSON.education)
    expect(result.projects).toEqual(GEMINI_JSON.projects)
    expect(result.certifications).toEqual(GEMINI_JSON.certifications)
    expect(result.links).toEqual(GEMINI_JSON.links)

    // The extracted resume text must be passed to the configured model.
    expect(mocks.generateContent).toHaveBeenCalledTimes(1)
    const callArgs = mocks.generateContent.mock.calls[0][0]
    expect(callArgs.model).toBe("gemini-2.5-flash")
    expect(callArgs.contents[0].parts[0].text).toContain("Jane Smith")
    expect(callArgs.contents[0].parts[0].text).toContain("Acme Corp")
  })

  it("falls back to text parsing when no Gemini key is configured", async () => {
    const result = await parseResumeFile(
      "resume.txt",
      "text/plain",
      Buffer.from(SAMPLE_RESUME)
    )

    expect(result.profile.fullName).toBe("Jane Smith")
    expect(result.profile.email).toBe("jane.smith@example.com")
    expect(result.profile.phone).toBe("+1 (555) 123-4567")
    expect(result.profile.linkedin).toBe("https://linkedin.com/in/janesmith")
    expect(result.profile.github).toBe("https://github.com/janesmith")
    expect(result.professionalSummary).toContain("Experienced engineer")
    expect(result.skills).toEqual(
      expect.arrayContaining(["JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL", "AWS"])
    )
    expect(result.workExperience).toHaveLength(2)
    expect(result.workExperience[0].companyName).toBe("Acme Corp")
    expect(result.workExperience[1].companyName).toBe("Globex Inc")
    expect(mocks.generateContent).not.toHaveBeenCalled()
  })

  it("extracts text from a PDF resume (pdf-parse worker path)", async () => {
    const pdf = makeMinimalPdf("resume.test@example.com")

    const result = await parseResumeFile("resume.pdf", "application/pdf", pdf)

    // The email can only be found if pdf-parse actually extracted the text
    // instead of returning raw PDF bytes.
    expect(result.profile.email).toBe("resume.test@example.com")
    expect(mocks.generateContent).not.toHaveBeenCalled()
  })
})

describe("buildProfilePayload", () => {
  it("saves parsed values for a brand-new user", () => {
    const payload = buildProfilePayload(parsedFixture, null, "jane@example.com")

    expect(payload.fullName).toBe("Jane Smith")
    expect(payload.email).toBe("jane.smith@example.com")
    expect(payload.phone).toBe("+1 (555) 123-4567")
    expect(payload.location).toBe("San Francisco, CA")
    expect(payload.portfolioUrl).toBe("https://janesmith.dev")
    expect(payload.linkedinUrl).toBe("https://linkedin.com/in/janesmith")
    expect(payload.githubUrl).toBe("https://github.com/janesmith")
    expect(payload.professionalSummary).toBe(
      "Experienced engineer building scalable web applications."
    )
    expect(payload.skills).toEqual(["JavaScript", "TypeScript", "React"])
    expect(payload.workExperience).toHaveLength(1)
    expect((payload.workExperience as Array<Record<string, unknown>>)[0].companyName).toBe(
      "Acme Corp"
    )
  })

  it("preserves existing profile fields that the resume does not provide", () => {
    const sparseParsed: ResumeParsedData = {
      ...parsedFixture,
      profile: { fullName: "Jane Smith" },
      professionalSummary: "",
      skills: [],
      workExperience: [],
      education: [],
      projects: [],
      certifications: [],
      links: [],
    }

    const payload = buildProfilePayload(
      sparseParsed,
      {
        full_name: "Jane S",
        email: "jane@example.com",
        profile_data: {
          phone: "111-222-3333",
          skills: ["Java"],
          workExperience: [{ companyName: "Old Corp", jobTitle: "Engineer" }],
        },
      },
      "jane@example.com"
    )

    // Parsed values win when present.
    expect(payload.fullName).toBe("Jane Smith")
    // Everything else is preserved from the existing profile.
    expect(payload.email).toBe("jane@example.com")
    expect(payload.phone).toBe("111-222-3333")
    expect(payload.skills).toEqual(["Java"])
    expect(payload.workExperience).toEqual([{ companyName: "Old Corp", jobTitle: "Engineer" }])
  })
})
