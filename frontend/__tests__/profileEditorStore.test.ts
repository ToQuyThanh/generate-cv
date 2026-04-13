import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { act } from '@testing-library/react'
import { useProfileEditorStore } from '@/store/profileEditorStore'
import type { CVProfile, ProfileSection, ProfileItem } from '@/types'

// ── Mock profileApi ──────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
  profileApi: {
    get: vi.fn(),
    update: vi.fn(),
    createSection: vi.fn(),
    updateSection: vi.fn(),
    deleteSection: vi.fn(),
    reorderSections: vi.fn(),
    createItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    reorderItems: vi.fn(),
  },
}))

import { profileApi } from '@/lib/api'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockItem: ProfileItem = {
  id: 'item-1',
  section_id: 'sec-1',
  position: 0,
  is_visible: true,
  data: { company: 'Acme Corp', position: 'Engineer', start_date: '2022-01', is_current: false, description: '', achievements: [] },
}

const mockSection: ProfileSection = {
  id: 'sec-1',
  profile_id: 'profile-1',
  type: 'work_experience',
  title: 'Kinh nghiệm làm việc',
  position: 0,
  is_visible: true,
  items: [mockItem],
}

const mockProfile: CVProfile = {
  id: 'profile-1',
  user_id: 'user-1',
  name: 'Senior Backend',
  role_target: 'Software Engineer',
  full_name: 'Nguyen Van A',
  email: 'a@example.com',
  is_default: false,
  sections: [mockSection],
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadProfile() {
  ;(profileApi.get as Mock).mockResolvedValue(mockProfile)
  await act(async () => {
    await useProfileEditorStore.getState().loadProfile('profile-1')
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('profileEditorStore', () => {
  beforeEach(() => {
    act(() => useProfileEditorStore.getState().reset())
    vi.clearAllMocks()
  })

  // ── loadProfile ────────────────────────────────────────────────────────────

  describe('loadProfile', () => {
    it('loads profile and sections from API', async () => {
      await loadProfile()
      const { profile, sections } = useProfileEditorStore.getState()
      expect(profile?.id).toBe('profile-1')
      expect(sections).toHaveLength(1)
      expect(sections[0].id).toBe('sec-1')
    })

    it('sets isDirty=false and isSaving=false after load', async () => {
      await loadProfile()
      const { isDirty, isSaving } = useProfileEditorStore.getState()
      expect(isDirty).toBe(false)
      expect(isSaving).toBe(false)
    })

    it('flattens sections with items from profile', async () => {
      await loadProfile()
      const { sections } = useProfileEditorStore.getState()
      expect(sections[0].items).toHaveLength(1)
      expect(sections[0].items[0].id).toBe('item-1')
    })
  })

  // ── updateMeta ─────────────────────────────────────────────────────────────

  describe('updateMeta', () => {
    it('updates profile field and sets isDirty', async () => {
      await loadProfile()
      act(() => useProfileEditorStore.getState().updateMeta({ name: 'Updated Name' }))

      const { profile, isDirty } = useProfileEditorStore.getState()
      expect(profile?.name).toBe('Updated Name')
      expect(isDirty).toBe(true)
    })

    it('can update multiple fields at once', async () => {
      await loadProfile()
      act(() => useProfileEditorStore.getState().updateMeta({ name: 'New', role_target: 'CTO', email: 'new@example.com' }))

      const { profile } = useProfileEditorStore.getState()
      expect(profile?.name).toBe('New')
      expect(profile?.role_target).toBe('CTO')
      expect(profile?.email).toBe('new@example.com')
    })

    it('does nothing if no profile loaded', () => {
      act(() => useProfileEditorStore.getState().updateMeta({ name: 'X' }))
      expect(useProfileEditorStore.getState().profile).toBeNull()
    })
  })

  // ── saveMeta ───────────────────────────────────────────────────────────────

  describe('saveMeta', () => {
    it('calls profileApi.update with current profile data', async () => {
      await loadProfile()
      act(() => useProfileEditorStore.getState().updateMeta({ name: 'Updated' }))

      const updatedProfile = { ...mockProfile, name: 'Updated' }
      ;(profileApi.update as Mock).mockResolvedValue(updatedProfile)

      await act(async () => {
        await useProfileEditorStore.getState().saveMeta()
      })

      expect(profileApi.update).toHaveBeenCalledWith('profile-1', expect.objectContaining({ name: 'Updated' }))
    })

    it('clears isDirty and sets lastSavedAt after save', async () => {
      await loadProfile()
      act(() => useProfileEditorStore.getState().updateMeta({ name: 'X' }))
      ;(profileApi.update as Mock).mockResolvedValue(mockProfile)

      await act(async () => {
        await useProfileEditorStore.getState().saveMeta()
      })

      const { isDirty, isSaving, lastSavedAt } = useProfileEditorStore.getState()
      expect(isDirty).toBe(false)
      expect(isSaving).toBe(false)
      expect(lastSavedAt).toBeInstanceOf(Date)
    })

    it('throws and sets isSaving=false on API failure', async () => {
      await loadProfile()
      ;(profileApi.update as Mock).mockRejectedValue(new Error('Network'))

      await act(async () => {
        await useProfileEditorStore.getState().saveMeta().catch(() => {})
      })

      expect(useProfileEditorStore.getState().isSaving).toBe(false)
    })
  })

  // ── addSection ─────────────────────────────────────────────────────────────

  describe('addSection', () => {
    it('appends new section to list', async () => {
      await loadProfile()

      const newSection: ProfileSection = {
        id: 'sec-2',
        profile_id: 'profile-1',
        type: 'education',
        title: 'Học vấn',
        position: 1,
        is_visible: true,
        items: [],
      }
      ;(profileApi.createSection as Mock).mockResolvedValue(newSection)

      await act(async () => {
        await useProfileEditorStore.getState().addSection({ type: 'education', title: 'Học vấn' })
      })

      const { sections } = useProfileEditorStore.getState()
      expect(sections).toHaveLength(2)
      expect(sections[1].id).toBe('sec-2')
    })

    it('new section starts with empty items array', async () => {
      await loadProfile()
      const newSection: ProfileSection = { id: 'sec-2', profile_id: 'profile-1', type: 'skills', title: 'Skills', position: 1, is_visible: true, items: [] }
      ;(profileApi.createSection as Mock).mockResolvedValue(newSection)

      await act(async () => {
        await useProfileEditorStore.getState().addSection({ type: 'skills', title: 'Skills' })
      })

      expect(useProfileEditorStore.getState().sections[1].items).toEqual([])
    })
  })

  // ── updateSection ──────────────────────────────────────────────────────────

  describe('updateSection', () => {
    it('updates section fields optimistically', async () => {
      await loadProfile()
      act(() => useProfileEditorStore.getState().updateSection('sec-1', { is_visible: false }))

      const sec = useProfileEditorStore.getState().sections[0]
      expect(sec.is_visible).toBe(false)
      expect(useProfileEditorStore.getState().isDirty).toBe(true)
    })
  })

  // ── removeSection ──────────────────────────────────────────────────────────

  describe('removeSection', () => {
    it('removes section from list', async () => {
      await loadProfile()
      ;(profileApi.deleteSection as Mock).mockResolvedValue(undefined)

      await act(async () => {
        await useProfileEditorStore.getState().removeSection('sec-1')
      })

      expect(useProfileEditorStore.getState().sections).toHaveLength(0)
    })
  })

  // ── reorderSections ────────────────────────────────────────────────────────

  describe('reorderSections', () => {
    it('reorders sections optimistically', async () => {
      const sec2: ProfileSection = { ...mockSection, id: 'sec-2', position: 1 }
      ;(profileApi.get as Mock).mockResolvedValue({
        ...mockProfile,
        sections: [mockSection, sec2],
      })
      await act(async () => {
        await useProfileEditorStore.getState().loadProfile('profile-1')
      })
      ;(profileApi.reorderSections as Mock).mockResolvedValue(undefined)

      await act(async () => {
        await useProfileEditorStore.getState().reorderSections(['sec-2', 'sec-1'])
      })

      const { sections } = useProfileEditorStore.getState()
      expect(sections[0].id).toBe('sec-2')
      expect(sections[1].id).toBe('sec-1')
    })
  })

  // ── addItem ────────────────────────────────────────────────────────────────

  describe('addItem', () => {
    it('appends item to correct section', async () => {
      await loadProfile()
      const newItem: ProfileItem = { id: 'item-2', section_id: 'sec-1', position: 1, is_visible: true, data: { company: 'Beta', position: 'Dev', start_date: '2023-01', is_current: true, description: '', achievements: [] } }
      ;(profileApi.createItem as Mock).mockResolvedValue(newItem)

      await act(async () => {
        await useProfileEditorStore.getState().addItem('sec-1', { data: newItem.data })
      })

      const sec = useProfileEditorStore.getState().sections[0]
      expect(sec.items).toHaveLength(2)
      expect(sec.items[1].id).toBe('item-2')
    })
  })

  // ── updateItem ─────────────────────────────────────────────────────────────

  describe('updateItem', () => {
    it('merges data into item and sets isDirty', async () => {
      await loadProfile()
      act(() => useProfileEditorStore.getState().updateItem('sec-1', 'item-1', {
        data: { company: 'New Corp' } as Partial<typeof mockItem.data>,
      }))

      const item = useProfileEditorStore.getState().sections[0].items[0]
      expect((item.data as Record<string, unknown>).company).toBe('New Corp')
      expect(useProfileEditorStore.getState().isDirty).toBe(true)
    })

    it('updates is_visible on item', async () => {
      await loadProfile()
      act(() => useProfileEditorStore.getState().updateItem('sec-1', 'item-1', { is_visible: false }))
      const item = useProfileEditorStore.getState().sections[0].items[0]
      expect(item.is_visible).toBe(false)
    })
  })

  // ── removeItem ─────────────────────────────────────────────────────────────

  describe('removeItem', () => {
    it('removes item from section', async () => {
      await loadProfile()
      ;(profileApi.deleteItem as Mock).mockResolvedValue(undefined)

      await act(async () => {
        await useProfileEditorStore.getState().removeItem('sec-1', 'item-1')
      })

      expect(useProfileEditorStore.getState().sections[0].items).toHaveLength(0)
    })
  })

  // ── reorderItems ───────────────────────────────────────────────────────────

  describe('reorderItems', () => {
    it('reorders items optimistically within section', async () => {
      const item2: ProfileItem = { ...mockItem, id: 'item-2', position: 1 }
      ;(profileApi.get as Mock).mockResolvedValue({
        ...mockProfile,
        sections: [{ ...mockSection, items: [mockItem, item2] }],
      })
      await act(async () => {
        await useProfileEditorStore.getState().loadProfile('profile-1')
      })
      ;(profileApi.reorderItems as Mock).mockResolvedValue(undefined)

      await act(async () => {
        await useProfileEditorStore.getState().reorderItems('sec-1', ['item-2', 'item-1'])
      })

      const items = useProfileEditorStore.getState().sections[0].items
      expect(items[0].id).toBe('item-2')
      expect(items[1].id).toBe('item-1')
    })
  })

  // ── reset ──────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('clears all editor state', async () => {
      await loadProfile()
      act(() => useProfileEditorStore.getState().reset())

      const { profile, sections, isDirty, isSaving, lastSavedAt } = useProfileEditorStore.getState()
      expect(profile).toBeNull()
      expect(sections).toHaveLength(0)
      expect(isDirty).toBe(false)
      expect(isSaving).toBe(false)
      expect(lastSavedAt).toBeNull()
    })
  })
})
