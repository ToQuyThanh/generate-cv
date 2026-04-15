/**
 * profile-snapshot.test.ts
 *
 * Unit tests cho lib/profile-snapshot.ts:
 * - snapshotToSections: chuyển profile_snapshot → CVSection[]
 * - hasProfileSnapshot: guard check
 *
 * Coverage: tất cả section types kể cả projects, certifications, languages
 * và các fields mới: achievements, tech_stack, highlights, credential_id
 */

import { describe, it, expect } from 'vitest'
import {
  snapshotToSections,
  hasProfileSnapshot,
  type ProfileSnapshot,
} from '@/lib/profile-snapshot'

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
            achievements: ['Tăng 30% hiệu suất', 'Deploy zero-downtime'],
            tech_stack: ['Go', 'PostgreSQL', 'Redis'],
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
            activities: 'Clb lập trình, luận văn AI',
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
        {
          id: 'item-skill-2',
          position: 1,
          is_visible: true,
          data: {
            group_name: 'DevOps',
            skills: ['Docker', 'Kubernetes'],
          },
        },
      ],
    },
    {
      id: 'sec-proj',
      type: 'projects',
      title: 'Dự án',
      position: 3,
      is_visible: true,
      items: [
        {
          id: 'item-proj-1',
          position: 0,
          is_visible: true,
          data: {
            name: 'CV Generator',
            role: 'Lead Dev',
            url: 'https://github.com/a/cv-gen',
            start_date: '2023-01',
            end_date: '2023-06',
            description: 'Build CV tool',
            tech_stack: ['Next.js', 'Go'],
            highlights: ['1000 users', 'Open source'],
          },
        },
      ],
    },
    {
      id: 'sec-cert',
      type: 'certifications',
      title: 'Chứng chỉ',
      position: 4,
      is_visible: true,
      items: [
        {
          id: 'item-cert-1',
          position: 0,
          is_visible: true,
          data: {
            name: 'AWS Solutions Architect',
            issuer: 'Amazon',
            date: '2023-03',
            url: 'https://verify.amazon.com/abc',
            credential_id: 'AWS-SA-12345',
          },
        },
      ],
    },
    {
      id: 'sec-lang',
      type: 'languages',
      title: 'Ngôn ngữ',
      position: 5,
      is_visible: true,
      items: [
        {
          id: 'item-lang-1',
          position: 0,
          is_visible: true,
          data: {
            language: 'Tiếng Anh',
            level: 'professional',
          },
        },
        {
          id: 'item-lang-2',
          position: 1,
          is_visible: true,
          data: {
            language: 'Tiếng Nhật',
            level: 'conversational',
          },
        },
      ],
    },
    {
      id: 'sec-hidden',
      type: 'work_experience',
      title: 'Hidden Section',
      position: 6,
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

// ─── structure ─────────────────────────────────────────────────────────────

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
    expect(summary?.order).toBe(1)
  })

  it('minimal snapshot produces exactly 2 sections', () => {
    expect(snapshotToSections(minimalSnapshot)).toHaveLength(2)
  })

  it('all sections have visible=true', () => {
    expect(snapshotToSections(fullSnapshot).every((s) => s.visible)).toBe(true)
  })

  it('all sections have unique ids', () => {
    const ids = snapshotToSections(fullSnapshot).map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('full snapshot produces personal+summary+6 visible profile sections', () => {
    // 6 visible: exp, edu, skills, projects, cert, lang (hidden excluded)
    expect(snapshotToSections(fullSnapshot)).toHaveLength(8)
  })
})

// ─── personal ──────────────────────────────────────────────────────────────

describe('snapshotToSections — personal section', () => {
  const getPersonal = (snap = fullSnapshot) => {
    const sections = snapshotToSections(snap)
    return sections.find((s) => s.type === 'personal')!.data as Record<string, unknown>
  }

  it('maps full_name', () => { expect(getPersonal().full_name).toBe('Nguyen Van A') })
  it('maps role_target → job_title', () => { expect(getPersonal().job_title).toBe('Senior Engineer') })
  it('maps email', () => { expect(getPersonal().email).toBe('a@example.com') })
  it('maps phone', () => { expect(getPersonal().phone).toBe('0901234567') })
  it('maps location', () => { expect(getPersonal().location).toBe('Hanoi') })
  it('maps linkedin_url → linkedin', () => { expect(getPersonal().linkedin).toBe('linkedin.com/in/a') })
  it('maps github_url → github', () => { expect(getPersonal().github).toBe('github.com/a') })
  it('maps website_url → website', () => { expect(getPersonal().website).toBe('https://a.dev') })
  it('maps avatar_url', () => { expect(getPersonal().avatar_url).toBe('https://a.dev/avatar.png') })

  it('defaults all fields to empty string when absent', () => {
    const d = getPersonal(minimalSnapshot)
    expect(d.full_name).toBe('')
    expect(d.job_title).toBe('')
    expect(d.email).toBe('')
  })
})

// ─── summary ───────────────────────────────────────────────────────────────

describe('snapshotToSections — summary', () => {
  it('maps summary → content', () => {
    const sections = snapshotToSections(fullSnapshot)
    const d = sections.find((s) => s.type === 'summary')!.data as Record<string, unknown>
    expect(d.content).toBe('Experienced developer')
  })

  it('defaults to empty string when absent', () => {
    const sections = snapshotToSections(minimalSnapshot)
    const d = sections.find((s) => s.type === 'summary')!.data as Record<string, unknown>
    expect(d.content).toBe('')
  })
})

// ─── work_experience ───────────────────────────────────────────────────────

describe('snapshotToSections — work_experience', () => {
  const getItems = () => {
    const s = snapshotToSections(fullSnapshot).find((sec) => sec.type === 'experience')!
    return (s.data as Record<string, unknown>).items as Record<string, unknown>[]
  }

  it('maps to "experience" CVSection type', () => {
    expect(snapshotToSections(fullSnapshot).find((s) => s.type === 'experience')).toBeDefined()
  })
  it('maps company and position', () => {
    expect(getItems()[0].company).toBe('ACME Corp')
    expect(getItems()[0].position).toBe('Backend Engineer')
  })
  it('maps location', () => { expect(getItems()[0].location).toBe('HCM') })
  it('maps dates and is_current', () => {
    expect(getItems()[0].start_date).toBe('2022-01')
    expect(getItems()[0].is_current).toBe(false)
  })
  it('maps achievements array', () => {
    const ach = getItems()[0].achievements as string[]
    expect(ach).toHaveLength(2)
    expect(ach[0]).toBe('Tăng 30% hiệu suất')
  })
  it('maps tech_stack array', () => {
    const ts = getItems()[0].tech_stack as string[]
    expect(ts).toContain('Go')
    expect(ts).toContain('PostgreSQL')
  })
})

// ─── education ─────────────────────────────────────────────────────────────

describe('snapshotToSections — education', () => {
  const getItems = () => {
    const s = snapshotToSections(fullSnapshot).find((sec) => sec.type === 'education')!
    return (s.data as Record<string, unknown>).items as Record<string, unknown>[]
  }

  it('maps school, degree, field', () => {
    expect(getItems()[0].school).toBe('Hanoi University')
    expect(getItems()[0].degree).toBe('Bachelor')
    expect(getItems()[0].field).toBe('Computer Science')
  })
  it('maps gpa', () => { expect(getItems()[0].gpa).toBe('3.6') })
  it('maps activities → description', () => {
    expect(getItems()[0].description).toBe('Clb lập trình, luận văn AI')
  })
})

// ─── skills ────────────────────────────────────────────────────────────────

describe('snapshotToSections — skills', () => {
  const getItems = () => {
    const s = snapshotToSections(fullSnapshot).find((sec) => sec.type === 'skills')!
    return (s.data as Record<string, unknown>).items as Record<string, unknown>[]
  }

  it('flattens multiple skill groups into individual items', () => {
    // group1: 3 skills + group2: 2 skills = 5 total
    expect(getItems()).toHaveLength(5)
  })
  it('each item has name field', () => {
    const names = getItems().map((i) => i.name)
    expect(names).toContain('Go')
    expect(names).toContain('Docker')
  })
  it('assigns default level 3', () => {
    expect(getItems().every((i) => i.level === 3)).toBe(true)
  })
})

// ─── projects ──────────────────────────────────────────────────────────────

describe('snapshotToSections — projects', () => {
  const getItems = () => {
    const s = snapshotToSections(fullSnapshot).find((sec) => sec.type === 'projects')!
    return (s.data as Record<string, unknown>).items as Record<string, unknown>[]
  }

  it('maps name, role, url', () => {
    expect(getItems()[0].name).toBe('CV Generator')
    expect(getItems()[0].role).toBe('Lead Dev')
    expect(getItems()[0].url).toBe('https://github.com/a/cv-gen')
  })
  it('maps dates', () => {
    expect(getItems()[0].start_date).toBe('2023-01')
    expect(getItems()[0].end_date).toBe('2023-06')
  })
  it('maps description', () => {
    expect(getItems()[0].description).toBe('Build CV tool')
  })
  it('maps tech_stack array', () => {
    const ts = getItems()[0].tech_stack as string[]
    expect(ts).toContain('Next.js')
    expect(ts).toContain('Go')
  })
  it('maps highlights array', () => {
    const hl = getItems()[0].highlights as string[]
    expect(hl).toContain('1000 users')
    expect(hl).toContain('Open source')
  })
})

// ─── certifications ────────────────────────────────────────────────────────

describe('snapshotToSections — certifications', () => {
  const getItems = () => {
    const s = snapshotToSections(fullSnapshot).find((sec) => sec.type === 'certifications')!
    return (s.data as Record<string, unknown>).items as Record<string, unknown>[]
  }

  it('maps name, issuer, date', () => {
    expect(getItems()[0].name).toBe('AWS Solutions Architect')
    expect(getItems()[0].issuer).toBe('Amazon')
    expect(getItems()[0].date).toBe('2023-03')
  })
  it('maps url and credential_id', () => {
    expect(getItems()[0].url).toBe('https://verify.amazon.com/abc')
    expect(getItems()[0].credential_id).toBe('AWS-SA-12345')
  })
})

// ─── languages ─────────────────────────────────────────────────────────────

describe('snapshotToSections — languages', () => {
  const getItems = () => {
    const s = snapshotToSections(fullSnapshot).find((sec) => sec.type === 'languages')!
    return (s.data as Record<string, unknown>).items as Record<string, unknown>[]
  }

  it('maps language name', () => {
    expect(getItems()[0].language).toBe('Tiếng Anh')
    expect(getItems()[1].language).toBe('Tiếng Nhật')
  })
  it('maps level', () => {
    expect(getItems()[0].level).toBe('professional')
    expect(getItems()[1].level).toBe('conversational')
  })
  it('defaults level to "professional" when absent', () => {
    const snap: ProfileSnapshot = {
      id: 'x',
      name: 'x',
      sections: [{
        id: 'sl', type: 'languages', title: 'Lang', position: 0, is_visible: true,
        items: [{ id: 'il', position: 0, is_visible: true, data: { language: 'French' } }],
      }],
    }
    const items = (snapshotToSections(snap).find((s) => s.type === 'languages')!
      .data as Record<string, unknown>).items as Record<string, unknown>[]
    expect(items[0].level).toBe('professional')
  })
})

// ─── visibility filtering ──────────────────────────────────────────────────

describe('snapshotToSections — visibility filtering', () => {
  it('excludes sections with is_visible=false', () => {
    // sec-hidden (work_experience, is_visible=false) must not appear as extra
    const sections = snapshotToSections(fullSnapshot)
    // Only one experience section (the visible one)
    const expSections = sections.filter((s) => s.type === 'experience')
    expect(expSections).toHaveLength(1)
  })

  it('excludes invisible items within a visible section', () => {
    const snap: ProfileSnapshot = {
      id: 'x',
      name: 'x',
      sections: [{
        id: 'se', type: 'work_experience', title: 'Exp', position: 0, is_visible: true,
        items: [
          { id: 'i1', position: 0, is_visible: true, data: { company: 'A', position: 'Dev', start_date: '', end_date: '', is_current: false, description: '' } },
          { id: 'i2', position: 1, is_visible: false, data: { company: 'B', position: 'PM', start_date: '', end_date: '', is_current: false, description: '' } },
        ],
      }],
    }
    const s = snapshotToSections(snap).find((sec) => sec.type === 'experience')!
    const items = (s.data as Record<string, unknown>).items as Record<string, unknown>[]
    expect(items).toHaveLength(1)
    expect(items[0].company).toBe('A')
  })
})

// ─── ordering ──────────────────────────────────────────────────────────────

describe('snapshotToSections — ordering', () => {
  it('sections follow position order from snapshot', () => {
    const sections = snapshotToSections(fullSnapshot)
    // After personal(0) + summary(1), profile sections start at order 2
    const profileSections = sections.slice(2)
    for (let i = 0; i < profileSections.length - 1; i++) {
      expect(profileSections[i].order).toBeLessThan(profileSections[i + 1].order)
    }
  })
})
