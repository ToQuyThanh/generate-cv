/**
 * profile-snapshot.test.ts
 *
 * Unit tests cho lib/profile-snapshot.ts:
 * - snapshotToSections: chuyển profile_snapshot → CVSection[]
 * - hasProfileSnapshot: guard check
 */

import { describe, it, expect } from 'vitest'
import {
  snapshotToSections,
  hasProfileSnapshot,
  type ProfileSnapshot,
} from '@/lib/profile-snapshot'
import type { CVSection } from '@/types'

// ─── Fixtures ──────────────────────────────────────────────────────────────

const minimalSnapshot: ProfileSnapshot = {
  id: 'snap-1',
  name: 'Test Profile',
}

const fullSnapshot: ProfileSnapshot = {
  id: 'snap-full',
  name: 'Full Profile',
  role_target: 'Senior Engineer',
  summary: 'Experienced developer',
  full_name: 'Nguyen Van A',
  email: 'a@example.com',
  phone: '0901234567',
  location: 'Hanoi',
  linkedin_url: 'linkedin.com/in/a',
  github_url: 'github.com/a',
  website_url: 'https://a.dev',
  avatar_url: 'https://a.dev/avatar.png',
  sections: [
    {
      id: 'sec-exp',
      type: 'work_experience',
      title: 'Kinh nghiệm',
      position: 0,
      is_visible: true,
      items: [
        {
          id: 'item-exp-1',
          position: 0,
          is_visible: true,
          data: {
            company: 'ACME Corp',
            position: 'Backend Engineer',
            location: 'HCM',
            start_date: '2022-01',
            end_date: '2024-01',
            is_current: false,
            description: 'Built APIs',
          },
        },
      ],
    },
    {
      id: 'sec-edu',
      type: 'education',
      title: 'Học vấn',
      position: 1,
      is_visible: true,
      items: [
        {
          id: 'item-edu-1',
          position: 0,
          is_visible: true,
          data: {
            school: 'Hanoi University',
            degree: 'Bachelor',
            field: 'Computer Science',
            start_date: '2018-09',
            end_date: '2022-06',
            gpa: '3.6',
          },
        },
      ],
    },
    {
      id: 'sec-skills',
      type: 'skills',
      title: 'Kỹ năng',
      position: 2,
      is_visible: true,
      items: [
        {
          id: 'item-skill-1',
          position: 0,
          is_visible: true,
          data: {
            group_name: 'Backend',
            skills: ['Go', 'PostgreSQL', 'Redis'],
          },
        },
      ],
    },
    {
      id: 'sec-hidden',
      type: 'projects',
      title: 'Dự án',
      position: 3,
      is_visible: false, // should be excluded
      items: [],
    },
  ],
}

// ─── hasProfileSnapshot ────────────────────────────────────────────────────

describe('hasProfileSnapshot', () => {
  it('returns true for valid snapshot object with id', () => {
    expect(hasProfileSnapshot({ id: 'abc', name: 'Test' })).toBe(true)
  })

  it('returns false for null', () => {
    expect(hasProfileSnapshot(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(hasProfileSnapshot(undefined)).toBe(false)
  })

  it('returns false for empty object (no id)', () => {
    expect(hasProfileSnapshot({})).toBe(false)
  })

  it('returns false for non-object', () => {
    expect(hasProfileSnapshot('string' as unknown as Record<string, unknown>)).toBe(false)
  })
})

// ─── snapshotToSections — basic structure ──────────────────────────────────

describe('snapshotToSections — structure', () => {
  it('always generates personal section at order 0', () => {
    const sections = snapshotToSections(minimalSnapshot)
    const personal = sections.find((s) => s.type === 'personal')
    expect(personal).toBeDefined()
    expect(personal?.order).toBe(0)
  })

  it('always generates summary section at order 1', () => {
    const sections = snapshotToSections(minimalSnapshot)
    const summary = sections.find((s) => s.type === 'summary')
    expect(summary).toBeDefined()
    expect(summary?.order).toBe(1)
  })

  it('minimal snapshot produces exactly 2 sections (personal + summary)', () => {
    const sections = snapshotToSections(minimalSnapshot)
    expect(sections).toHaveLength(2)
  })

  it('all generated sections have visible=true', () => {
    const sections = snapshotToSections(fullSnapshot)
    expect(sections.every((s) => s.visible)).toBe(true)
  })

  it('all generated sections have unique ids', () => {
    const sections = snapshotToSections(fullSnapshot)
    const ids = sections.map((s) => s.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })
})

// ─── snapshotToSections — personal data ───────────────────────────────────

describe('snapshotToSections — personal section data', () => {
  it('maps full_name correctly', () => {
    const sections = snapshotToSections(fullSnapshot)
    const personal = sections.find((s) => s.type === 'personal')!
    expect((personal.data as Record<string, unknown>).full_name).toBe('Nguyen Van A')
  })

  it('maps role_target → job_title', () => {
    const sections = snapshotToSections(fullSnapshot)
    const personal = sections.find((s) => s.type === 'personal')!
    expect((personal.data as Record<string, unknown>).job_title).toBe('Senior Engineer')
  })

  it('maps email, phone, location', () => {
    const sections = snapshotToSections(fullSnapshot)
    const personal = sections.find((s) => s.type === 'personal')!
    const d = personal.data as Record<string, unknown>
    expect(d.email).toBe('a@example.com')
    expect(d.phone).toBe('0901234567')
    expect(d.location).toBe('Hanoi')
  })

  it('maps linkedin_url → linkedin', () => {
    const sections = snapshotToSections(fullSnapshot)
    const personal = sections.find((s) => s.type === 'personal')!
    expect((personal.data as Record<string, unknown>).linkedin).toBe('linkedin.com/in/a')
  })

  it('maps github_url → github', () => {
    const sections = snapshotToSections(fullSnapshot)
    const personal = sections.find((s) => s.type === 'personal')!
    expect((personal.data as Record<string, unknown>).github).toBe('github.com/a')
  })

  it('maps website_url → website', () => {
    const sections = snapshotToSections(fullSnapshot)
    const personal = sections.find((s) => s.type === 'personal')!
    expect((personal.data as Record<string, unknown>).website).toBe('https://a.dev')
  })

  it('defaults missing fields to empty string', () => {
    const sections = snapshotToSections(minimalSnapshot)
    const personal = sections.find((s) => s.type === 'personal')!
    const d = personal.data as Record<string, unknown>
    expect(d.full_name).toBe('')
    expect(d.job_title).toBe('')
    expect(d.email).toBe('')
  })
})

// ─── snapshotToSections — summary ─────────────────────────────────────────

describe('snapshotToSections — summary section data', () => {
  it('maps summary → content', () => {
    const sections = snapshotToSections(fullSnapshot)
    const summary = sections.find((s) => s.type === 'summary')!
    expect((summary.data as Record<string, unknown>).content).toBe('Experienced developer')
  })

  it('defaults to empty string when summary absent', () => {
    const sections = snapshotToSections(minimalSnapshot)
    const summary = sections.find((s) => s.type === 'summary')!
    expect((summary.data as Record<string, unknown>).content).toBe('')
  })
})

// ─── snapshotToSections — work_experience ─────────────────────────────────

describe('snapshotToSections — work_experience', () => {
  it('maps to "experience" CVSection type', () => {
    const sections = snapshotToSections(fullSnapshot)
    const exp = sections.find((s) => s.type === 'experience')
    expect(exp).toBeDefined()
  })

  it('maps company and position fields', () => {
    const sections = snapshotToSections(fullSnapshot)
    const exp = sections.find((s) => s.type === 'experience')!
    const items = (exp.data as Record<string, unknown>).items as Record<string, unknown>[]
    expect(items[0].company).toBe('ACME Corp')
    expect(items[0].position).toBe('Backend Engineer')
  })

  it('maps is_current and date fields', () => {
    const sections = snapshotToSections(fullSnapshot)
    const exp = sections.find((s) => s.type === 'experience')!
    const items = (exp.data as Record<string, unknown>).items as Record<string, unknown>[]
    expect(items[0].start_date).toBe('2022-01')
    expect(items[0].end_date).toBe('2024-01')
    expect(items[0].is_current).toBe(false)
  })
})

// ─── snapshotToSections — education ───────────────────────────────────────

describe('snapshotToSections — education', () => {
  it('maps school, degree, field', () => {
    const sections = snapshotToSections(fullSnapshot)
    const edu = sections.find((s) => s.type === 'education')!
    const items = (edu.data as Record<string, unknown>).items as Record<string, unknown>[]
    expect(items[0].school).toBe('Hanoi University')
    expect(items[0].degree).toBe('Bachelor')
    expect(items[0].field).toBe('Computer Science')
  })

  it('maps gpa field', () => {
    const sections = snapshotToSections(fullSnapshot)
    const edu = sections.find((s) => s.type === 'education')!
    const items = (edu.data as Record<string, unknown>).items as Record<string, unknown>[]
    expect(items[0].gpa).toBe('3.6')
  })
})

// ─── snapshotToSections — skills ──────────────────────────────────────────

describe('snapshotToSections — skills', () => {
  it('flattens skill group into individual skill items', () => {
    const sections = snapshotToSections(fullSnapshot)
    const skills = sections.find((s) => s.type === 'skills')!
    const items = (skills.data as Record<string, unknown>).items as Record<string, unknown>[]
    // 3 skills in one group → 3 items
    expect(items).toHaveLength(3)
    expect(items[0].name).toBe('Go')
    expect(items[1].name).toBe('PostgreSQL')
    expect(items[2].name).toBe('Redis')
  })

  it('assigns default level 3 to all skill items', () => {
    const sections = snapshotToSections(fullSnapshot)
    const skills = sections.find((s) => s.type === 'skills')!
    const items = (skills.data as Record<string, unknown>).items as Record<string, unknown>[]
    expect(items.every((it) => it.level === 3)).toBe(true)
  })
})

// ─── snapshotToSections — visibility ──────────────────────────────────────

describe('snapshotToSections — visibility filtering', () => {
  it('excludes sections with is_visible=false', () => {
    const sections = snapshotToSections(fullSnapshot)
    // 'sec-hidden' (projects) has is_visible=false
    const projects = sections.find((s) => s.type === 'projects')
    expect(projects).toBeUndefined()
  })

  it('includes all sections with is_visible=true', () => {
    const sections = snapshotToSections(fullSnapshot)
    const types = sections.map((s) => s.type)
    expect(types).toContain('experience')
    expect(types).toContain('education')
    expect(types).toContain('skills')
  })
})

// ─── snapshotToSections — ordering ────────────────────────────────────────

describe('snapshotToSections — ordering', () => {
  it('sections are ordered: personal(0), summary(1), then profile sections', () => {
    const sections = snapshotToSections(fullSnapshot)
    expect(sections[0].type).toBe('personal')
    expect(sections[1].type).toBe('summary')
    expect(sections[2].order).toBe(2)
    expect(sections[3].order).toBe(3)
  })
})
