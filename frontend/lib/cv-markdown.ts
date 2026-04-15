/**
 * cv-markdown.ts
 * Serialize CV sections → structured markdown và parse ngược lại.
 *
 * Format markdown:
 * # PERSONAL
 * full_name: Nguyễn Văn A
 * job_title: Frontend Developer
 * ...
 *
 * # SUMMARY
 * Nội dung giới thiệu bản thân...
 *
 * # EXPERIENCE
 * ## Vị trí — Công ty
 * location: Hà Nội
 * start_date: 2022-01
 * end_date: 2024-03
 * is_current: false
 * description: Mô tả công việc
 * achievements: Thành tích 1 | Thành tích 2
 * tech_stack: Go | PostgreSQL | Docker
 */

import type {
  CVSection,
  PersonalData,
  ExperienceItem,
  EducationItem,
  SkillItem,
  ProjectItem,
  CertificationItem,
  LanguageItem,
} from '@/types'

// ─── Serialize: CV sections → markdown string ─────────────────────────────────

export function serializeToMarkdown(sections: CVSection[]): string {
  const sorted = [...sections].sort((a, b) => a.order - b.order)
  const parts: string[] = []

  for (const section of sorted) {
    if (!section.visible) continue
    const block = serializeSection(section)
    if (block) parts.push(block)
  }

  return parts.join('\n\n')
}

function serializeSection(section: CVSection): string {
  const header = `# ${section.type.toUpperCase()}`

  switch (section.type) {
    case 'personal': {
      const d = section.data as Partial<PersonalData>
      return [
        header,
        `full_name: ${d.full_name ?? ''}`,
        `job_title: ${d.job_title ?? ''}`,
        `email: ${d.email ?? ''}`,
        `phone: ${d.phone ?? ''}`,
        `location: ${d.location ?? ''}`,
        `website: ${d.website ?? ''}`,
        `linkedin: ${d.linkedin ?? ''}`,
        `github: ${d.github ?? ''}`,
      ].join('\n')
    }

    case 'summary': {
      const d = section.data as { content?: string }
      return `${header}\n${d.content ?? ''}`
    }

    case 'experience': {
      const items = ((section.data as { items?: ExperienceItem[] }).items ?? [])
      if (items.length === 0) return `${header}\n<!-- Chưa có kinh nghiệm -->`
      const blocks = items.map((item) => [
        `## ${item.position || 'Vị trí'} — ${item.company || 'Công ty'}`,
        `location: ${item.location ?? ''}`,
        `start_date: ${item.start_date ?? ''}`,
        `end_date: ${item.end_date ?? ''}`,
        `is_current: ${item.is_current ? 'true' : 'false'}`,
        `description: ${item.description ?? ''}`,
        `achievements: ${(item.achievements ?? []).join(' | ')}`,
        `tech_stack: ${(item.tech_stack ?? []).join(' | ')}`,
      ].join('\n'))
      return [header, ...blocks].join('\n\n')
    }

    case 'education': {
      const items = ((section.data as { items?: EducationItem[] }).items ?? [])
      if (items.length === 0) return `${header}\n<!-- Chưa có học vấn -->`
      const blocks = items.map((item) => [
        `## ${item.school || 'Trường'} — ${item.degree || 'Bằng cấp'}`,
        `field: ${item.field ?? ''}`,
        `start_date: ${item.start_date ?? ''}`,
        `end_date: ${item.end_date ?? ''}`,
        `gpa: ${item.gpa ?? ''}`,
        `description: ${item.description ?? ''}`,
      ].join('\n'))
      return [header, ...blocks].join('\n\n')
    }

    case 'skills': {
      const items = ((section.data as { items?: SkillItem[] }).items ?? [])
      if (items.length === 0) return `${header}\n<!-- Chưa có kỹ năng -->`
      const lines = items.map((item) => `- ${item.name}: ${item.level}/5`)
      return [header, ...lines].join('\n')
    }

    case 'projects': {
      const items = ((section.data as { items?: ProjectItem[] }).items ?? [])
      if (items.length === 0) return `${header}\n<!-- Chưa có dự án -->`
      const blocks = items.map((item) => [
        `## ${item.name || 'Dự án'}${item.role ? ` — ${item.role}` : ''}`,
        `url: ${item.url ?? ''}`,
        `start_date: ${item.start_date ?? ''}`,
        `end_date: ${item.end_date ?? ''}`,
        `description: ${item.description ?? ''}`,
        `tech_stack: ${(item.tech_stack ?? []).join(' | ')}`,
        `highlights: ${(item.highlights ?? []).join(' | ')}`,
      ].join('\n'))
      return [header, ...blocks].join('\n\n')
    }

    case 'certifications': {
      const items = ((section.data as { items?: CertificationItem[] }).items ?? [])
      if (items.length === 0) return `${header}\n<!-- Chưa có chứng chỉ -->`
      const blocks = items.map((item) => [
        `## ${item.name || 'Chứng chỉ'}`,
        `issuer: ${item.issuer ?? ''}`,
        `date: ${item.date ?? ''}`,
        `url: ${item.url ?? ''}`,
        `credential_id: ${item.credential_id ?? ''}`,
      ].join('\n'))
      return [header, ...blocks].join('\n\n')
    }

    case 'languages': {
      const items = ((section.data as { items?: LanguageItem[] }).items ?? [])
      if (items.length === 0) return `${header}\n<!-- Chưa có ngôn ngữ -->`
      const lines = items.map((item) => `- ${item.language}: ${item.level}`)
      return [header, ...lines].join('\n')
    }

    default:
      return ''
  }
}

// ─── Parse: markdown string → SectionPatch[] ──────────────────────────────────

export type SectionPatch = {
  sectionType: string
  data: Record<string, unknown>
}

export function parseMarkdown(md: string): SectionPatch[] {
  const sectionBlocks = md.split(/^# /m).filter(Boolean)
  const results: SectionPatch[] = []

  for (const block of sectionBlocks) {
    const lines = block.trim().split('\n')
    const typeRaw = lines[0].trim().toLowerCase()
    const body = lines.slice(1).join('\n').trim()

    switch (typeRaw) {
      case 'personal': {
        const d = parseKeyValues(body)
        results.push({
          sectionType: 'personal',
          data: {
            full_name: d.full_name ?? '',
            job_title: d.job_title ?? '',
            email: d.email ?? '',
            phone: d.phone ?? '',
            location: d.location ?? '',
            website: d.website ?? '',
            linkedin: d.linkedin ?? '',
            github: d.github ?? '',
          },
        })
        break
      }

      case 'summary': {
        const content = body.replace(/^<!--.*-->$/m, '').trim()
        results.push({ sectionType: 'summary', data: { content } })
        break
      }

      case 'experience': {
        const items = parseH2Blocks(body).map((b) => {
          const titleMatch = b.title.match(/^(.+?)\s*—\s*(.+)$/)
          const d = parseKeyValues(b.body)
          return {
            id: crypto.randomUUID(),
            position: titleMatch?.[1]?.trim() ?? b.title,
            company: titleMatch?.[2]?.trim() ?? '',
            location: d.location ?? '',
            start_date: d.start_date ?? '',
            end_date: d.end_date ?? '',
            is_current: d.is_current === 'true',
            description: d.description ?? '',
            achievements: splitPipe(d.achievements),
            tech_stack: splitPipe(d.tech_stack),
          }
        })
        results.push({ sectionType: 'experience', data: { items } })
        break
      }

      case 'education': {
        const items = parseH2Blocks(body).map((b) => {
          const titleMatch = b.title.match(/^(.+?)\s*—\s*(.+)$/)
          const d = parseKeyValues(b.body)
          return {
            id: crypto.randomUUID(),
            school: titleMatch?.[1]?.trim() ?? b.title,
            degree: titleMatch?.[2]?.trim() ?? '',
            field: d.field ?? '',
            start_date: d.start_date ?? '',
            end_date: d.end_date ?? '',
            gpa: d.gpa ?? '',
            description: d.description ?? '',
          }
        })
        results.push({ sectionType: 'education', data: { items } })
        break
      }

      case 'skills': {
        const items = body
          .split('\n')
          .filter((l) => l.startsWith('- '))
          .map((l) => {
            const clean = l.slice(2).trim()
            const match = clean.match(/^(.+):\s*(\d)\/5$/)
            return {
              id: crypto.randomUUID(),
              name: match?.[1]?.trim() ?? clean,
              level: Math.min(5, Math.max(1, parseInt(match?.[2] ?? '3'))) as 1 | 2 | 3 | 4 | 5,
            }
          })
        results.push({ sectionType: 'skills', data: { items } })
        break
      }

      case 'projects': {
        const items = parseH2Blocks(body).map((b) => {
          const titleMatch = b.title.match(/^(.+?)\s*—\s*(.+)$/)
          const d = parseKeyValues(b.body)
          return {
            id: crypto.randomUUID(),
            name: titleMatch?.[1]?.trim() ?? b.title,
            role: titleMatch?.[2]?.trim() ?? '',
            url: d.url ?? '',
            start_date: d.start_date ?? '',
            end_date: d.end_date ?? '',
            description: d.description ?? '',
            tech_stack: splitPipe(d.tech_stack),
            highlights: splitPipe(d.highlights),
          }
        })
        results.push({ sectionType: 'projects', data: { items } })
        break
      }

      case 'certifications': {
        const items = parseH2Blocks(body).map((b) => {
          const d = parseKeyValues(b.body)
          return {
            id: crypto.randomUUID(),
            name: b.title,
            issuer: d.issuer ?? '',
            date: d.date ?? '',
            url: d.url ?? '',
            credential_id: d.credential_id ?? '',
          }
        })
        results.push({ sectionType: 'certifications', data: { items } })
        break
      }

      case 'languages': {
        const items = body
          .split('\n')
          .filter((l) => l.startsWith('- '))
          .map((l) => {
            const clean = l.slice(2).trim()
            const match = clean.match(/^(.+):\s*(.+)$/)
            return {
              id: crypto.randomUUID(),
              language: match?.[1]?.trim() ?? clean,
              level: (match?.[2]?.trim() ?? 'basic') as LanguageItem['level'],
            }
          })
        results.push({ sectionType: 'languages', data: { items } })
        break
      }
    }
  }

  return results
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseKeyValues(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const idx = line.indexOf(': ')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const val = line.slice(idx + 2).trim()
    if (key) result[key] = val
  }
  return result
}

function parseH2Blocks(text: string): { title: string; body: string }[] {
  const blocks = text.split(/^## /m).filter(Boolean)
  return blocks.map((block) => {
    const firstNewline = block.indexOf('\n')
    if (firstNewline === -1) return { title: block.trim(), body: '' }
    return {
      title: block.slice(0, firstNewline).trim(),
      body: block.slice(firstNewline + 1).trim(),
    }
  })
}

function splitPipe(val: string | undefined): string[] {
  if (!val) return []
  return val.split('|').map((s) => s.trim()).filter(Boolean)
}
