import { GoogleGenAI } from "@google/genai"
import mammoth from "mammoth"

export type ResumeProfile = {
  fullName?: string
  email?: string
  phone?: string
  location?: string
  website?: string
  linkedin?: string
  github?: string
  portfolio?: string
}

export type ResumeWorkExperience = {
  companyName: string
  jobTitle: string
  duration: string
  responsibilities: string[]
  location?: string
}

export type ResumeEducation = {
  school: string
  degree: string
  field?: string
  duration?: string
  details?: string[]
}

export type ResumeProject = {
  name: string
  description: string
  url?: string
  technologies?: string[]
}

export type ResumeCertification = {
  name: string
  issuer?: string
  date?: string
}

export type ResumeLink = {
  label: string
  url: string
}

export type ResumeParsedData = {
  profile: ResumeProfile
  professionalSummary: string
  skills: string[]
  workExperience: ResumeWorkExperience[]
  education: ResumeEducation[]
  projects: ResumeProject[]
  certifications: ResumeCertification[]
  links: ResumeLink[]
  additionalInfo: Record<string, unknown>
}

const emptyResumeData: ResumeParsedData = {
  profile: {},
  professionalSummary: "",
  skills: [],
  workExperience: [],
  education: [],
  projects: [],
  certifications: [],
  links: [],
  additionalInfo: {},
}

function cleanArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
  }

  if (typeof value === "string") {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function normalizeResumeJson(value: unknown): ResumeParsedData {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
  const profile = (source.profile as Record<string, unknown>) ?? {}

  return {
    profile: {
      fullName:
        typeof profile.fullName === "string"
          ? profile.fullName
          : typeof profile.full_name === "string"
            ? profile.full_name
            : undefined,
      email:
        typeof profile.email === "string"
          ? profile.email
          : typeof profile.emailAddress === "string"
            ? profile.emailAddress
            : undefined,
      phone:
        typeof profile.phone === "string"
          ? profile.phone
          : typeof profile.phoneNumber === "string"
            ? profile.phoneNumber
            : undefined,
      location:
        typeof profile.location === "string"
          ? profile.location
          : typeof profile.city === "string"
            ? profile.city
            : undefined,
      website:
        typeof profile.website === "string"
          ? profile.website
          : typeof profile.portfolio === "string"
            ? profile.portfolio
            : undefined,
      linkedin:
        typeof profile.linkedin === "string"
          ? profile.linkedin
          : typeof profile.linkedinUrl === "string"
            ? profile.linkedinUrl
            : undefined,
      github:
        typeof profile.github === "string"
          ? profile.github
          : typeof profile.githubUrl === "string"
            ? profile.githubUrl
            : undefined,
      portfolio:
        typeof profile.portfolio === "string"
          ? profile.portfolio
          : typeof profile.website === "string"
            ? profile.website
            : undefined,
    },
    professionalSummary:
      typeof source.professionalSummary === "string"
        ? source.professionalSummary
        : typeof source.summary === "string"
          ? source.summary
          : "",
    skills: cleanArray(source.skills ?? source.skillSet ?? source.skillset),
    workExperience: Array.isArray(source.workExperience)
      ? source.workExperience.map((entry) => {
          const item = (entry as Record<string, unknown>) ?? {}
          return {
            companyName: typeof item.companyName === "string" ? item.companyName : "",
            jobTitle: typeof item.jobTitle === "string" ? item.jobTitle : "",
            duration: typeof item.duration === "string" ? item.duration : "",
            responsibilities: cleanArray(item.responsibilities ?? item.bullets ?? item.highlights),
            location: typeof item.location === "string" ? item.location : undefined,
          }
        })
      : [],
    education: Array.isArray(source.education)
      ? source.education.map((entry) => {
          const item = (entry as Record<string, unknown>) ?? {}
          return {
            school: typeof item.school === "string" ? item.school : "",
            degree: typeof item.degree === "string" ? item.degree : "",
            field: typeof item.field === "string" ? item.field : undefined,
            duration: typeof item.duration === "string" ? item.duration : undefined,
            details: cleanArray(item.details ?? item.highlights),
          }
        })
      : [],
    projects: Array.isArray(source.projects)
      ? source.projects.map((entry) => {
          const item = (entry as Record<string, unknown>) ?? {}
          return {
            name: typeof item.name === "string" ? item.name : "",
            description: typeof item.description === "string" ? item.description : "",
            url: typeof item.url === "string" ? item.url : undefined,
            technologies: cleanArray(item.technologies ?? item.techStack),
          }
        })
      : [],
    certifications: Array.isArray(source.certifications)
      ? source.certifications.map((entry) => {
          const item = (entry as Record<string, unknown>) ?? {}
          return {
            name: typeof item.name === "string" ? item.name : "",
            issuer: typeof item.issuer === "string" ? item.issuer : undefined,
            date: typeof item.date === "string" ? item.date : undefined,
          }
        })
      : [],
    links: Array.isArray(source.links)
      ? source.links.map((entry) => {
          const item = (entry as Record<string, unknown>) ?? {}
          return {
            label: typeof item.label === "string" ? item.label : "Link",
            url: typeof item.url === "string" ? item.url : "",
          }
        })
      : [],
    additionalInfo: (source.additionalInfo as Record<string, unknown>) ?? {},
  }
}

function cleanPdfArtifacts(text: string): string {
  return text
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "")
    .replace(/Page\s+\d+(\s+of\s+\d+)?/gi, "")
    .replace(/\r/g, "")
    .trim()
}

function fallbackParseFromText(rawText: string): ResumeParsedData {
  const cleanedText = cleanPdfArtifacts(rawText)
  const lines = cleanedText.split("\n").map((l) => l.trim()).filter(Boolean)
  const normalized = cleanedText.replace(/\s+/g, " ").trim()

  // 1. Contact & URLs
  const emailMatch = normalized.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i)
  const phoneMatch = normalized.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/)
  const linkedinMatch = normalized.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i)
  const githubMatch = normalized.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i)
  const portfolioMatch = normalized.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9_-]+\.(?:dev|io|me|app|site|tech|com))(?:\/[^\s]*)?/i)
  const locationMatch = normalized.match(/(?:[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}(?:\s+\d{5})?|[A-Z][a-zA-Z\s]+,\s*(?:USA|United States|Canada|UK|India|Germany|France|Australia))/i)

  // 2. Full Name: Look for a clean name in the top 4 lines
  let extractedName: string | undefined = undefined
  for (let i = 0; i < Math.min(lines.length, 4); i++) {
    const line = lines[i]
    if (
      !line.includes("@") &&
      !line.includes("http") &&
      !line.includes(".com") &&
      !line.includes("/") &&
      !/\d/.test(line) &&
      line.length >= 3 &&
      line.length <= 40 &&
      line.split(/\s+/).length >= 2 &&
      line.split(/\s+/).length <= 4 &&
      !/^(resume|curriculum|cv|summary|profile|contact|portfolio|page)/i.test(line)
    ) {
      extractedName = line.replace(/[^a-zA-Z\s.-]/g, "").trim()
      break
    }
  }

  // 3. Section partitioning
  let currentSection = "header"
  const sections: Record<string, string[]> = {
    header: [],
    summary: [],
    experience: [],
    education: [],
    projects: [],
    skills: [],
    certifications: [],
  }

  for (const line of lines) {
    const upper = line.toUpperCase()
    if (/^(SUMMARY|PROFESSIONAL SUMMARY|EXECUTIVE SUMMARY|ABOUT ME|PROFILE|OBJECTIVE)\b/.test(upper)) {
      currentSection = "summary"
      continue
    }
    if (/^(WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EXPERIENCE|EMPLOYMENT HISTORY)\b/.test(upper)) {
      currentSection = "experience"
      continue
    }
    if (/^(EDUCATION|ACADEMIC BACKGROUND|DEGREES|QUALIFICATIONS)\b/.test(upper)) {
      currentSection = "education"
      continue
    }
    if (/^(PROJECTS|KEY PROJECTS|PERSONAL PROJECTS|TECHNICAL PROJECTS)\b/.test(upper)) {
      currentSection = "projects"
      continue
    }
    if (/^(SKILLS|TECHNICAL SKILLS|CORE COMPETENCIES|AREAS OF EXPERTISE)\b/.test(upper)) {
      currentSection = "skills"
      continue
    }
    if (/^(CERTIFICATIONS|LICENSES & CERTIFICATIONS|CERTIFICATES)\b/.test(upper)) {
      currentSection = "certifications"
      continue
    }

    if (sections[currentSection]) {
      sections[currentSection].push(line)
    }
  }

  // 4. Skills extraction
  const skillKeywords = [
    "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Express", "NestJS",
    "Vue.js", "Angular", "Python", "Django", "FastAPI", "Flask", "Java", "Spring Boot",
    "C++", "C#", ".NET", "Go", "Golang", "Rust", "PHP", "Laravel", "Ruby", "Rails",
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Supabase", "Firebase",
    "GraphQL", "REST API", "HTML5", "CSS3", "Tailwind CSS", "Bootstrap", "Material UI",
    "Git", "GitHub", "GitLab", "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Linux",
    "CI/CD", "Terraform", "Agile", "Scrum", "Jira", "Figma", "UI/UX", "Machine Learning",
    "Deep Learning", "Artificial Intelligence", "NLP", "LLM", "Data Analysis", "Pandas"
  ]

  const skillsText = (sections.skills.join(" ") + " " + normalized).toLowerCase()
  const extractedSkills = skillKeywords.filter((skill) => {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
    return regex.test(skillsText)
  })

  // 5. Professional Summary (Only if summary section actually exists)
  const professionalSummary = sections.summary.length > 0
    ? sections.summary.join(" ").slice(0, 1000)
    : ""

  // 6. Work Experience (Only if meaningful content in experience section)
  const workExperience: ResumeWorkExperience[] = []
  if (sections.experience.length > 0) {
    let currentExp: ResumeWorkExperience | null = null
    for (const line of sections.experience) {
      if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
        if (currentExp) {
          currentExp.responsibilities.push(line.replace(/^[•\-*]\s*/, "").trim())
        }
      } else if (line.length >= 3) {
        // Only start a new job entry if line looks like a title/company (not just dates or single word)
        if (currentExp && (currentExp.responsibilities.length > 0 || currentExp.companyName)) {
          workExperience.push(currentExp)
        }
        const parts = line.split(/[-–|]/).map((p) => p.trim()).filter(Boolean)
        currentExp = {
          companyName: parts[0] || line,
          jobTitle: parts[1] || "",
          duration: parts[2] || "",
          responsibilities: [],
        }
      }
    }
    if (currentExp && (currentExp.companyName || currentExp.responsibilities.length > 0)) {
      workExperience.push(currentExp)
    }
  }

  // 7. Education (Only if recognized degree / school)
  const education: ResumeEducation[] = []
  if (sections.education.length > 0) {
    for (const line of sections.education) {
      if (!line.startsWith("•") && !line.startsWith("-") && line.length > 4) {
        // Skip lines that are just years/dates
        if (/^\d{4}(\s*[-–]\s*\d{4})?$/.test(line)) {
          continue
        }
        const parts = line.split(/[-–|,]/).map((p) => p.trim()).filter(Boolean)
        if (parts.length >= 2) {
          education.push({
            school: parts[0] || "",
            degree: parts[1] || "",
            field: parts[2] || undefined,
            duration: line.match(/\b(19\d{2}|20\d{2})\b/g)?.join(" - ") || undefined,
            details: [],
          })
        } else if (parts.length === 1 && !/^\d+$/.test(parts[0])) {
          education.push({
            school: parts[0],
            degree: "",
            details: [],
          })
        }
      }
    }
  }

  return {
    profile: {
      fullName: extractedName,
      email: emailMatch?.[0],
      phone: phoneMatch?.[0],
      location: locationMatch?.[0],
      website: portfolioMatch?.[0],
      linkedin: linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : undefined,
      github: githubMatch ? `https://github.com/${githubMatch[1]}` : undefined,
      portfolio: portfolioMatch?.[0],
    },
    professionalSummary,
    skills: Array.from(new Set(extractedSkills)),
    workExperience,
    education,
    projects: [],
    certifications: [],
    links: [
      ...(linkedinMatch ? [{ label: "LinkedIn", url: `https://linkedin.com/in/${linkedinMatch[1]}` }] : []),
      ...(githubMatch ? [{ label: "GitHub", url: `https://github.com/${githubMatch[1]}` }] : []),
    ],
    additionalInfo: {
      source: "text-fallback",
      extractedTextLength: normalized.length,
    },
  }
}

async function extractTextFromResume(fileName: string, mimeType: string, buffer: Buffer) {
  const lowerName = fileName.toLowerCase()

  if (mimeType.includes("pdf") || lowerName.endsWith(".pdf")) {
    try {
      const pdfModule = await import("pdf-parse")
      if (pdfModule.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: buffer })
        const result = await parser.getText()
        await parser.destroy()
        if (result?.text && result.text.trim().length > 0) {
          return result.text
        }
      }

      const defaultParser = (pdfModule as unknown as { default?: (buf: Buffer) => Promise<{ text?: string }> }).default
      if (typeof defaultParser === "function") {
        const data = await defaultParser(buffer)
        if (data?.text && data.text.trim().length > 0) {
          return data.text
        }
      }
    } catch (pdfErr) {
      console.warn("PDF parser error:", pdfErr)
    }

    const raw = buffer.toString("utf8")
    const matches = raw.match(/[a-zA-Z0-9.,@_+\-:\s/()]{4,}/g)
    return matches ? matches.join(" ") : buffer.toString("latin1")
  }

  if (
    mimeType.includes("officedocument.wordprocessingml") ||
    mimeType.includes("docx") ||
    lowerName.endsWith(".docx")
  ) {
    const docResult = await mammoth.extractRawText({ buffer })
    return docResult.value ?? ""
  }

  if (
    mimeType.includes("text") ||
    mimeType.includes("json") ||
    mimeType.includes("csv") ||
    mimeType.includes("markdown") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".rtf")
  ) {
    return buffer.toString("utf8")
  }

  return buffer.toString("utf8")
}

async function parseWithGemini(text: string): Promise<ResumeParsedData> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return fallbackParseFromText(text)
  }

  const ai = new GoogleGenAI({ apiKey })
  const prompt = `Extract structured resume data from the text below and return valid JSON only.

Requirements:
- Keep keys exactly as: profile, professionalSummary, skills, workExperience, education, projects, certifications, links, additionalInfo.
- profile fields: fullName, email, phone, location, website, linkedin, github, portfolio.
- workExperience array items: companyName, jobTitle, duration, responsibilities, location.
- education array items: school, degree, field, duration, details.
- projects array items: name, description, url, technologies.
- certifications array items: name, issuer, date.
- links array items: label, url.
- Do not include markdown fences or commentary.
- If a field is missing, set it to null or an empty string/array. Never invent or hallucinate information not present in the text.

Resume text:
${text}`

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash"

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  })

  const rawText = response?.text ?? ""
  const cleaned = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim()

  if (!cleaned) {
    return fallbackParseFromText(text)
  }

  try {
    const payload = JSON.parse(cleaned)
    return normalizeResumeJson(payload)
  } catch {
    const partialMatch = cleaned.match(/\{[\s\S]*\}/)
    if (partialMatch) {
      try {
        return normalizeResumeJson(JSON.parse(partialMatch[0]))
      } catch {
        return fallbackParseFromText(text)
      }
    }

    return fallbackParseFromText(text)
  }
}

export async function parseResumeFile(fileName: string, mimeType: string, fileBuffer: Buffer) {
  const text = await extractTextFromResume(fileName, mimeType, fileBuffer)
  const trimmed = text.trim()

  if (!trimmed) {
    return emptyResumeData
  }

  try {
    return await parseWithGemini(trimmed)
  } catch {
    return fallbackParseFromText(trimmed)
  }
}
