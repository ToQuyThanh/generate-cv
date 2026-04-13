/**
 * editorStore-snapshot.test.ts
 *
 * Tests cho logic populate sections từ profile_snapshot trong editorStore.setCVData
 * (bug fix: CV tạo từ profile không hiển thị thông tin profile)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import { useEditorStore } from '@/store/editorStore'
import type { CV } from '@/types'

// Mock profile-snapshot module
vi.mock('@/lib/profile-snapshot', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/profile-snapshot')>()
  return actual // dùng implementation thật để test integration
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCV(overrides: Partial<CV> = {}): CV {
  return {
    id: 'cv-1',
    user_id: 'user-1',
    title: 'Test CV',
    template_id: 'blank',
    color_theme: '#1a56db',
    sections: [],
    profile_id: null,
    profile_snapshot: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

const mockSnapshot = {
  id: 'snap-1',
  name: 'My Profile',
  role_target: 'Backend Engineer',
  full_name: 'Nguyen Van A',
  email: 'a@example.com',
  phone: '0901234567',
  location: 'Hanoi',
  summary: 'Experienced developer',
  linkedin_url: 'linkedin.com/in/a',
  github_url: 'github.com/a',
  website_url: 'https://a.dev',
  sections: [
    {
      id: 'sec-exp',
      type: 'work_experience',
      title: 'Kinh nghiệm',
      position: 0,
      is_visible: true,
      items: [
        {
          id: 'item-1',
          position: 0,
          is_visible: true,
          data: {
            company: 'ACME',
            position: 'Dev',
            start_date: '2022-01',
            end_date: '2024-01',
            is_current: false,
            description: 'Worked on things',
          },
        },
      ],
    },
  ],
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('editorStore.setCVData — profile snapshot populate', () => {
  beforeEach(() => {
    act(() => useEditorStore.getState().reset())
  })

  // ── Case 1: CV không có profile_snapshot ────────────────────────────────

  it('sets cvData as-is when no profile_snapshot', () => {
    const cv = makeCV({ sections: [] })
    act(() => useEditorStore.getState().setCVData(cv))
    const { cvData } = useEditorStore.getState()
    expect(cvData?.sections).toHaveLength(0)
  })

  it('keeps existing sections when no profile_snapshot', () => {
    const cv = makeCV({
      sections: [
        {
          id: 'existing-sec',
          type: 'personal',
          title: 'Thông tin',
          visible: true,
          order: 0,
          data: { full_name: 'Existing Name' },
        },
      ],
    })
    act(() => useEditorStore.getState().setCVData(cv))
    const { cvData } = useEditorStore.getState()
    expect(cvData?.sections).toHaveLength(1)
    expect((cvData?.sections[0].data as Record<string, unknown>).full_name).toBe('Existing Name')
  })

  // ── Case 2: CV có profile_snapshot, sections rỗng (bug case) ──────────

  it('populates sections from profile_snapshot when sections is empty []', () => {
    const cv = makeCV({
      sections: [],
      profile_id: 'profile-1',
      profile_snapshot: mockSnapshot as unknown as Record<string, unknown>,
    })
    act(() => useEditorStore.getState().setCVData(cv))
    const { cvData } = useEditorStore.getState()
    // Should have: personal + summary + experience = 3
    expect(cvData!.sections.length).toBeGreaterThanOrEqual(3)
  })

  it('generates personal section with full_name from snapshot', () => {
    const cv = makeCV({
      sections: [],
      profile_snapshot: mockSnapshot as unknown as Record<string, unknown>,
    })
    act(() => useEditorStore.getState().setCVData(cv))
    const personal = useEditorStore.getState().cvData?.sections.find(
      (s) => s.type === 'personal'
    )
    expect(personal).toBeDefined()
    expect((personal!.data as Record<string, unknown>).full_name).toBe('Nguyen Van A')
  })

  it('generates personal section with role_target as job_title', () => {
    const cv = makeCV({
      sections: [],
      profile_snapshot: mockSnapshot as unknown as Record<string, unknown>,
    })
    act(() => useEditorStore.getState().setCVData(cv))
    const personal = useEditorStore.getState().cvData?.sections.find(
      (s) => s.type === 'personal'
    )
    expect((personal!.data as Record<string, unknown>).job_title).toBe('Backend Engineer')
  })

  it('generates summary section with content from snapshot.summary', () => {
    const cv = makeCV({
      sections: [],
      profile_snapshot: mockSnapshot as unknown as Record<string, unknown>,
    })
    act(() => useEditorStore.getState().setCVData(cv))
    const summary = useEditorStore.getState().cvData?.sections.find(
      (s) => s.type === 'summary'
    )
    expect((summary!.data as Record<string, unknown>).content).toBe('Experienced developer')
  })

  it('generates experience section from work_experience items', () => {
    const cv = makeCV({
      sections: [],
      profile_snapshot: mockSnapshot as unknown as Record<string, unknown>,
    })
    act(() => useEditorStore.getState().setCVData(cv))
    const exp = useEditorStore.getState().cvData?.sections.find(
      (s) => s.type === 'experience'
    )
    expect(exp).toBeDefined()
    const items = (exp!.data as Record<string, unknown>).items as Record<string, unknown>[]
    expect(items[0].company).toBe('ACME')
  })

  it('does not set isDirty=true after snapshot populate', () => {
    const cv = makeCV({
      sections: [],
      profile_snapshot: mockSnapshot as unknown as Record<string, unknown>,
    })
    act(() => useEditorStore.getState().setCVData(cv))
    expect(useEditorStore.getState().isDirty).toBe(false)
  })

  // ── Case 3: sections có data rồi (user đã edit) → không override ────────

  it('does NOT override sections that already have data', () => {
    const cv = makeCV({
      sections: [
        {
          id: 'personal-existing',
          type: 'personal',
          title: 'Thông tin',
          visible: true,
          order: 0,
          data: { full_name: 'Already Filled Name', job_title: 'PM' },
        },
        {
          id: 'summary-existing',
          type: 'summary',
          title: 'Tóm tắt',
          visible: true,
          order: 1,
          data: { content: 'Already filled summary' },
        },
        {
          id: 'exp-existing',
          type: 'experience',
          title: 'Kinh nghiệm',
          visible: true,
          order: 2,
          data: {
            items: [
              { id: 'e1', company: 'Old Company', position: 'Dev', start_date: '', end_date: '', is_current: false, description: '' },
            ],
          },
        },
      ],
      profile_snapshot: mockSnapshot as unknown as Record<string, unknown>,
    })
    act(() => useEditorStore.getState().setCVData(cv))
    const personal = useEditorStore.getState().cvData?.sections.find(
      (s) => s.type === 'personal'
    )
    // Should keep original data, not override with snapshot
    expect((personal!.data as Record<string, unknown>).full_name).toBe('Already Filled Name')
  })

  // ── Case 4: profile_snapshot null/invalid ───────────────────────────────

  it('does not crash when profile_snapshot is null', () => {
    const cv = makeCV({ sections: [], profile_snapshot: null })
    expect(() => {
      act(() => useEditorStore.getState().setCVData(cv))
    }).not.toThrow()
    expect(useEditorStore.getState().cvData?.sections).toHaveLength(0)
  })

  it('does not crash when profile_snapshot has no id field', () => {
    const cv = makeCV({
      sections: [],
      profile_snapshot: { name: 'no-id' } as unknown as Record<string, unknown>,
    })
    expect(() => {
      act(() => useEditorStore.getState().setCVData(cv))
    }).not.toThrow()
  })

  // ── Case 5: reset clears cvData ──────────────────────────────────────────

  it('reset clears cvData populated from snapshot', () => {
    const cv = makeCV({
      sections: [],
      profile_snapshot: mockSnapshot as unknown as Record<string, unknown>,
    })
    act(() => useEditorStore.getState().setCVData(cv))
    act(() => useEditorStore.getState().reset())
    expect(useEditorStore.getState().cvData).toBeNull()
  })
})
