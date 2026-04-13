/**
 * new-sections.test.ts
 *
 * Unit tests logic cho ProjectsSection, CertificationsSection, LanguagesSection
 * (không import React component — test pure data logic)
 */

import { describe, it, expect } from 'vitest'
import type {
  ProjectItem,
  CertificationItem,
  LanguageItem,
  LanguageLevel,
  ProjectsData,
  CertificationsData,
  LanguagesData,
} from '@/types'

// ─── Pure helpers (mirror component logic) ─────────────────────────────────

function addTag(
  items: ProjectItem[],
  itemId: string,
  field: 'tech_stack' | 'highlights',
  value: string
): ProjectItem[] {
  const trimmed = value.trim()
  if (!trimmed) return items
  return items.map((it) => {
    if (it.id !== itemId) return it
    const existing = (it[field] ?? []) as string[]
    if (existing.includes(trimmed)) return it
    return { ...it, [field]: [...existing, trimmed] }
  })
}

function removeTag(
  items: ProjectItem[],
  itemId: string,
  field: 'tech_stack' | 'highlights',
  tag: string
): ProjectItem[] {
  return items.map((it) => {
    if (it.id !== itemId) return it
    return { ...it, [field]: ((it[field] ?? []) as string[]).filter((t) => t !== tag) }
  })
}

// ─── Fixtures ──────────────────────────────────────────────────────────────

const sampleProject: ProjectItem = {
  id: 'p1',
  name: 'CV Generator',
  role: 'Lead Dev',
  url: 'https://github.com/a/cv-gen',
  start_date: '2023-01',
  end_date: '2023-06',
  description: 'A tool for building CVs',
  tech_stack: ['Next.js', 'Go'],
  highlights: ['1000 users'],
}

const sampleCert: CertificationItem = {
  id: 'c1',
  name: 'AWS Solutions Architect',
  issuer: 'Amazon',
  date: '2023-03',
  url: 'https://verify.aws.com/abc',
  credential_id: 'AWS-SA-12345',
}

const sampleLang: LanguageItem = {
  id: 'l1',
  language: 'Tiếng Anh',
  level: 'professional',
}

// ─── ProjectsSection logic ─────────────────────────────────────────────────

describe('ProjectsSection — data logic', () => {
  describe('addTag (tech_stack)', () => {
    it('adds a new tech to tech_stack', () => {
      const result = addTag([sampleProject], 'p1', 'tech_stack', 'Docker')
      expect(result[0].tech_stack).toContain('Docker')
    })

    it('trims whitespace before adding', () => {
      const result = addTag([sampleProject], 'p1', 'tech_stack', '  AWS  ')
      expect(result[0].tech_stack).toContain('AWS')
    })

    it('does not add empty string', () => {
      const before = sampleProject.tech_stack!.length
      const result = addTag([sampleProject], 'p1', 'tech_stack', '   ')
      expect(result[0].tech_stack!.length).toBe(before)
    })

    it('does not add duplicate', () => {
      const before = sampleProject.tech_stack!.length
      const result = addTag([sampleProject], 'p1', 'tech_stack', 'Go') // already in
      expect(result[0].tech_stack!.length).toBe(before)
    })

    it('does not modify other items', () => {
      const other: ProjectItem = { ...sampleProject, id: 'p2', tech_stack: [] }
      const result = addTag([sampleProject, other], 'p1', 'tech_stack', 'Rust')
      expect(result[1].tech_stack).toHaveLength(0)
    })
  })

  describe('addTag (highlights)', () => {
    it('adds a highlight', () => {
      const result = addTag([sampleProject], 'p1', 'highlights', '5000 stars')
      expect(result[0].highlights).toContain('5000 stars')
    })

    it('preserves existing highlights', () => {
      const result = addTag([sampleProject], 'p1', 'highlights', 'New')
      expect(result[0].highlights).toContain('1000 users')
      expect(result[0].highlights).toContain('New')
    })
  })

  describe('removeTag', () => {
    it('removes tech from tech_stack', () => {
      const result = removeTag([sampleProject], 'p1', 'tech_stack', 'Go')
      expect(result[0].tech_stack).not.toContain('Go')
      expect(result[0].tech_stack).toContain('Next.js')
    })

    it('removes highlight', () => {
      const result = removeTag([sampleProject], 'p1', 'highlights', '1000 users')
      expect(result[0].highlights).toHaveLength(0)
    })

    it('is a no-op when tag does not exist', () => {
      const before = sampleProject.tech_stack!.length
      const result = removeTag([sampleProject], 'p1', 'tech_stack', 'COBOL')
      expect(result[0].tech_stack!.length).toBe(before)
    })
  })

  describe('ProjectItem type completeness', () => {
    it('ProjectItem has all required fields', () => {
      expect(sampleProject.id).toBeDefined()
      expect(sampleProject.name).toBeDefined()
      expect(sampleProject.description).toBeDefined()
    })

    it('optional fields can be absent', () => {
      const minimal: ProjectItem = {
        id: 'min',
        name: 'Min Project',
        description: 'Desc',
      }
      expect(minimal.role).toBeUndefined()
      expect(minimal.url).toBeUndefined()
      expect(minimal.tech_stack).toBeUndefined()
    })

    it('ProjectsData wraps items array', () => {
      const data: ProjectsData = { items: [sampleProject] }
      expect(data.items).toHaveLength(1)
    })
  })
})

// ─── CertificationsSection logic ───────────────────────────────────────────

describe('CertificationsSection — data logic', () => {
  it('CertificationItem has all required fields', () => {
    expect(sampleCert.id).toBeDefined()
    expect(sampleCert.name).toBeDefined()
    expect(sampleCert.issuer).toBeDefined()
    expect(sampleCert.date).toBeDefined()
  })

  it('optional fields (url, credential_id) can be absent', () => {
    const minimal: CertificationItem = {
      id: 'c-min',
      name: 'Some Cert',
      issuer: 'Some Org',
      date: '2024-01',
    }
    expect(minimal.url).toBeUndefined()
    expect(minimal.credential_id).toBeUndefined()
  })

  it('CertificationsData wraps items array', () => {
    const data: CertificationsData = { items: [sampleCert] }
    expect(data.items[0].credential_id).toBe('AWS-SA-12345')
  })

  it('filtering items works correctly', () => {
    const items = [sampleCert, { ...sampleCert, id: 'c2', name: 'GCP Cert' }]
    const filtered = items.filter((i) => i.id !== 'c1')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe('GCP Cert')
  })

  it('patching item updates correct field', () => {
    const items: CertificationItem[] = [sampleCert]
    const patched = items.map((i) => i.id === 'c1' ? { ...i, credential_id: 'NEW-ID' } : i)
    expect(patched[0].credential_id).toBe('NEW-ID')
  })
})

// ─── LanguagesSection logic ────────────────────────────────────────────────

describe('LanguagesSection — data logic', () => {
  const VALID_LEVELS: LanguageLevel[] = [
    'basic', 'conversational', 'professional', 'fluent', 'native',
  ]

  it('LanguageItem has language and level', () => {
    expect(sampleLang.language).toBe('Tiếng Anh')
    expect(sampleLang.level).toBe('professional')
  })

  it('all level values are valid LanguageLevel', () => {
    VALID_LEVELS.forEach((lvl) => {
      const item: LanguageItem = { id: 'x', language: 'Test', level: lvl }
      expect(VALID_LEVELS).toContain(item.level)
    })
  })

  it('LanguagesData wraps items array', () => {
    const data: LanguagesData = { items: [sampleLang] }
    expect(data.items[0].language).toBe('Tiếng Anh')
  })

  it('changing level updates correctly', () => {
    const items: LanguageItem[] = [sampleLang]
    const patched = items.map((i) =>
      i.id === 'l1' ? { ...i, level: 'fluent' as LanguageLevel } : i
    )
    expect(patched[0].level).toBe('fluent')
  })

  it('adding a new language', () => {
    const items: LanguageItem[] = [sampleLang]
    const newLang: LanguageItem = { id: 'l2', language: 'Tiếng Nhật', level: 'conversational' }
    expect([...items, newLang]).toHaveLength(2)
  })

  it('removing a language', () => {
    const items: LanguageItem[] = [
      sampleLang,
      { id: 'l2', language: 'Tiếng Nhật', level: 'conversational' },
    ]
    const result = items.filter((i) => i.id !== 'l1')
    expect(result).toHaveLength(1)
    expect(result[0].language).toBe('Tiếng Nhật')
  })
})

// ─── ExperienceItem extended fields ────────────────────────────────────────

describe('ExperienceItem — extended fields (achievements + tech_stack)', () => {
  it('ExperienceItem can have location field', () => {
    const item = {
      id: 'e1',
      company: 'ACME',
      position: 'Dev',
      location: 'HCM',
      start_date: '2022-01',
      end_date: '2024-01',
      is_current: false,
      description: 'Work',
      achievements: ['Thing 1', 'Thing 2'],
      tech_stack: ['Go', 'React'],
    }
    expect(item.location).toBe('HCM')
    expect(item.achievements).toHaveLength(2)
    expect(item.tech_stack).toContain('Go')
  })

  it('achievements defaults to empty array when absent', () => {
    const item = {
      id: 'e1', company: '', position: '', start_date: '', end_date: '',
      is_current: false, description: '',
    }
    const achievements = (item as Record<string, unknown>).achievements ?? []
    expect(achievements).toEqual([])
  })

  it('tech_stack defaults to empty array when absent', () => {
    const item = {
      id: 'e1', company: '', position: '', start_date: '', end_date: '',
      is_current: false, description: '',
    }
    const techStack = (item as Record<string, unknown>).tech_stack ?? []
    expect(techStack).toEqual([])
  })
})
