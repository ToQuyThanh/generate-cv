import { describe, it, expect } from 'vitest'
import { getBlankSections } from '@/lib/cv-template'

// UUID v4 regex
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('getBlankSections', () => {
  it('returns exactly 5 sections', () => {
    const sections = getBlankSections()
    expect(sections).toHaveLength(5)
  })

  it('contains all required section types in order', () => {
    const sections = getBlankSections()
    const types = sections.map((s) => s.type)
    expect(types).toEqual(['personal', 'summary', 'experience', 'education', 'skills'])
  })

  it('order values are 0 through 4 sequentially', () => {
    const sections = getBlankSections()
    sections.forEach((s, i) => {
      expect(s.order).toBe(i)
    })
  })

  it('all sections are visible by default', () => {
    const sections = getBlankSections()
    sections.forEach((s) => {
      expect(s.visible).toBe(true)
    })
  })

  it('each section has a valid UUID v4 as id', () => {
    const sections = getBlankSections()
    sections.forEach((s) => {
      expect(s.id).toMatch(UUID_RE)
    })
  })

  it('all section ids are unique within one call', () => {
    const sections = getBlankSections()
    const ids = sections.map((s) => s.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('generates fresh ids on each call (no shared state)', () => {
    const first = getBlankSections().map((s) => s.id)
    const second = getBlankSections().map((s) => s.id)
    first.forEach((id, i) => {
      expect(id).not.toBe(second[i])
    })
  })

  it('personal section data contains all 8 required fields', () => {
    const sections = getBlankSections()
    const personal = sections.find((s) => s.type === 'personal')
    expect(personal).toBeDefined()
    const REQUIRED_FIELDS = [
      'full_name', 'job_title', 'email', 'phone',
      'location', 'website', 'linkedin', 'github',
    ]
    REQUIRED_FIELDS.forEach((field) => {
      expect(personal!.data).toHaveProperty(field)
      expect(personal!.data[field]).toBe('')
    })
  })

  it('summary section data has content field as empty string', () => {
    const sections = getBlankSections()
    const summary = sections.find((s) => s.type === 'summary')
    expect(summary?.data).toEqual({ content: '' })
  })

  it('experience / education / skills sections start with empty items array', () => {
    const sections = getBlankSections()
    for (const type of ['experience', 'education', 'skills'] as const) {
      const sec = sections.find((s) => s.type === type)
      expect(sec?.data).toHaveProperty('items')
      expect((sec!.data as { items: unknown[] }).items).toEqual([])
    }
  })

  it('mutating returned data does not affect subsequent calls', () => {
    const first = getBlankSections()
    const personal = first.find((s) => s.type === 'personal')!
    ;(personal.data as Record<string, string>).full_name = 'MUTATED'

    const second = getBlankSections()
    const personalAgain = second.find((s) => s.type === 'personal')!
    expect((personalAgain.data as Record<string, string>).full_name).toBe('')
  })
})
