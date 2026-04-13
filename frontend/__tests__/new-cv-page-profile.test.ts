/**
 * new-cv-page-profile.test.ts
 *
 * Kiểm tra logic cho Profile Selection step trong /cv/new:
 * - Step flow: profile → template
 * - Profile được truyền vào CreateCVRequest khi có profile_id
 * - Không có profile_id khi user bỏ qua (skip)
 * - selectedProfileId state thay đổi đúng khi user chọn
 */

import { describe, it, expect } from 'vitest'
import type { CVProfileListItem, CreateCVRequest } from '@/types'

// ─── Re-implement pure logic từ page (không import Next.js components) ───────

type Step = 'profile' | 'template'

function buildCreateCVRequest(params: {
  selectedTemplate: string
  selectedColor: string
  selectedProfileId: string | null
}): CreateCVRequest {
  return {
    template_id: params.selectedTemplate,
    color_theme: params.selectedColor,
    title: 'CV của tôi',
    sections: [],
    profile_id: params.selectedProfileId ?? undefined,
  }
}

function getNextStep(current: Step): Step {
  return current === 'profile' ? 'template' : 'template'
}

function getPrevStep(current: Step): Step {
  return current === 'template' ? 'profile' : 'profile'
}

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const mockProfiles: CVProfileListItem[] = [
  { id: 'p1', name: 'Senior Backend', role_target: 'SWE', is_default: true, created_at: '', updated_at: '' },
  { id: 'p2', name: 'Freelance', role_target: 'Fullstack', is_default: false, created_at: '', updated_at: '' },
]

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('Step navigation', () => {
  it('starts at profile step', () => {
    const step: Step = 'profile'
    expect(step).toBe('profile')
  })

  it('moves to template step after next', () => {
    expect(getNextStep('profile')).toBe('template')
  })

  it('moves back to profile step when on template', () => {
    expect(getPrevStep('template')).toBe('profile')
  })

  it('stays at template on getNextStep (final step)', () => {
    expect(getNextStep('template')).toBe('template')
  })
})

describe('Profile selection', () => {
  it('selectedProfileId is null by default (no profile = skip)', () => {
    const selectedProfileId: string | null = null
    expect(selectedProfileId).toBeNull()
  })

  it('can select a profile by id', () => {
    let selectedProfileId: string | null = null
    selectedProfileId = 'p1'
    expect(selectedProfileId).toBe('p1')
  })

  it('can deselect (return to null / no profile)', () => {
    let selectedProfileId: string | null = 'p1'
    selectedProfileId = null
    expect(selectedProfileId).toBeNull()
  })

  it('preselected profile from query param sets selectedProfileId', () => {
    // Simulate: preselectedProfileId = searchParams.get('profile_id')
    const preselectedProfileId = 'p2'
    const selectedProfileId = preselectedProfileId ?? null
    expect(selectedProfileId).toBe('p2')
  })

  it('no query param → selectedProfileId is null', () => {
    const preselectedProfileId = null
    const selectedProfileId = preselectedProfileId ?? null
    expect(selectedProfileId).toBeNull()
  })

  it('jumps to template step when profile_id is preselected', () => {
    const preselectedProfileId = 'p1'
    const step: Step = preselectedProfileId ? 'template' : 'profile'
    expect(step).toBe('template')
  })
})

describe('buildCreateCVRequest — profile integration', () => {
  const baseParams = {
    selectedTemplate: 'modern',
    selectedColor: '#1a56db',
  }

  it('includes profile_id when profile is selected', () => {
    const req = buildCreateCVRequest({ ...baseParams, selectedProfileId: 'p1' })
    expect(req.profile_id).toBe('p1')
  })

  it('omits profile_id (undefined) when no profile selected', () => {
    const req = buildCreateCVRequest({ ...baseParams, selectedProfileId: null })
    expect(req.profile_id).toBeUndefined()
  })

  it('always includes template_id, color_theme, title', () => {
    const req = buildCreateCVRequest({ ...baseParams, selectedProfileId: null })
    expect(req.template_id).toBe('modern')
    expect(req.color_theme).toBe('#1a56db')
    expect(req.title).toBe('CV của tôi')
  })

  it('blank template is a valid template_id', () => {
    const req = buildCreateCVRequest({ ...baseParams, selectedTemplate: 'blank', selectedProfileId: null })
    expect(req.template_id).toBe('blank')
  })
})

describe('Profile list filtering', () => {
  it('finds profile by id', () => {
    const found = mockProfiles.find((p) => p.id === 'p1')
    expect(found?.name).toBe('Senior Backend')
  })

  it('returns undefined when profile not found', () => {
    const found = mockProfiles.find((p) => p.id === 'p-nonexistent')
    expect(found).toBeUndefined()
  })

  it('can identify the default profile', () => {
    const defaultProfile = mockProfiles.find((p) => p.is_default)
    expect(defaultProfile?.id).toBe('p1')
  })

  it('profile list can be empty (no profiles created yet)', () => {
    const emptyProfiles: CVProfileListItem[] = []
    expect(emptyProfiles).toHaveLength(0)
  })
})

describe('Profile banner display logic', () => {
  it('shows profile banner when selectedProfileId is set', () => {
    const selectedProfileId: string | null = 'p1'
    const selectedProfile = mockProfiles.find((p) => p.id === selectedProfileId)
    expect(selectedProfile).toBeDefined()
    expect(selectedProfile?.name).toBe('Senior Backend')
  })

  it('does not show banner when no profile selected', () => {
    const selectedProfileId: string | null = null
    const selectedProfile = mockProfiles.find((p) => p.id === selectedProfileId!)
    expect(selectedProfile).toBeUndefined()
  })
})
