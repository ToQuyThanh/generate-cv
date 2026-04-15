import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { act } from '@testing-library/react'
import { useProfileStore } from '@/store/profileStore'
import type { CVProfile, CVProfileListItem } from '@/types'

// ── Mock profileApi ──────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
  profileApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    setDefault: vi.fn(),
    listSections: vi.fn(),
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

const mockListItem: CVProfileListItem = {
  id: 'profile-1',
  name: 'Senior Backend Engineer',
  role_target: 'Software Engineer',
  full_name: 'Nguyen Van A',
  email: 'test@example.com',
  is_default: false,
  section_count: 3,
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
}

const mockProfile: CVProfile = {
  id: 'profile-1',
  user_id: 'user-1',
  name: 'Senior Backend Engineer',
  role_target: 'Software Engineer',
  full_name: 'Nguyen Van A',
  email: 'test@example.com',
  phone: '0901234567',
  location: 'Ho Chi Minh City',
  is_default: false,
  sections: [],
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
}

const mockProfile2: CVProfileListItem = {
  id: 'profile-2',
  name: 'Freelance Fullstack',
  is_default: true,
  created_at: '2026-04-02T00:00:00Z',
  updated_at: '2026-04-02T00:00:00Z',
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('profileStore', () => {
  beforeEach(() => {
    act(() => useProfileStore.getState().reset())
    vi.clearAllMocks()
  })

  // ── fetchProfiles ──────────────────────────────────────────────────────────

  describe('fetchProfiles', () => {
    it('loads profiles and clears loading state', async () => {
      ;(profileApi.list as Mock).mockResolvedValue([mockListItem, mockProfile2])

      await act(async () => {
        await useProfileStore.getState().fetchProfiles()
      })

      const { profiles, loading, error } = useProfileStore.getState()
      expect(profiles).toHaveLength(2)
      expect(profiles[0].id).toBe('profile-1')
      expect(loading).toBe(false)
      expect(error).toBeNull()
    })

    it('sets error state when API fails', async () => {
      ;(profileApi.list as Mock).mockRejectedValue(new Error('Network error'))

      await act(async () => {
        await useProfileStore.getState().fetchProfiles().catch(() => {})
      })

      const { loading, error } = useProfileStore.getState()
      expect(loading).toBe(false)
      expect(error).toBe('Không thể tải danh sách profile')
    })

    it('sets loading=true during fetch then false after', async () => {
      let resolveList!: (v: CVProfileListItem[]) => void
      ;(profileApi.list as Mock).mockReturnValue(new Promise((r) => { resolveList = r }))

      act(() => { useProfileStore.getState().fetchProfiles() })
      expect(useProfileStore.getState().loading).toBe(true)

      await act(async () => { resolveList([mockListItem]) })
      expect(useProfileStore.getState().loading).toBe(false)
    })
  })

  // ── fetchProfile ───────────────────────────────────────────────────────────

  describe('fetchProfile', () => {
    it('sets activeProfile on success', async () => {
      ;(profileApi.get as Mock).mockResolvedValue(mockProfile)

      await act(async () => {
        await useProfileStore.getState().fetchProfile('profile-1')
      })

      expect(useProfileStore.getState().activeProfile).toEqual(mockProfile)
    })

    it('returns the fetched profile', async () => {
      ;(profileApi.get as Mock).mockResolvedValue(mockProfile)
      let result!: CVProfile

      await act(async () => {
        result = await useProfileStore.getState().fetchProfile('profile-1')
      })

      expect(result.id).toBe('profile-1')
    })
  })

  // ── createProfile ──────────────────────────────────────────────────────────

  describe('createProfile', () => {
    it('prepends new profile to list', async () => {
      ;(profileApi.list as Mock).mockResolvedValue([mockListItem])
      ;(profileApi.create as Mock).mockResolvedValue({
        ...mockProfile,
        id: 'profile-new',
        name: 'New Profile',
        is_default: false,
        sections: [],
      })

      await act(async () => {
        await useProfileStore.getState().fetchProfiles()
        await useProfileStore.getState().createProfile({ name: 'New Profile' })
      })

      const { profiles } = useProfileStore.getState()
      expect(profiles[0].id).toBe('profile-new')
      expect(profiles).toHaveLength(2)
    })

    it('returns the created profile', async () => {
      const created = { ...mockProfile, id: 'profile-new', name: 'New', sections: [] }
      ;(profileApi.create as Mock).mockResolvedValue(created)
      let result!: CVProfile

      await act(async () => {
        result = await useProfileStore.getState().createProfile({ name: 'New' })
      })

      expect(result.id).toBe('profile-new')
    })
  })

  // ── updateProfile ──────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('updates profile in list', async () => {
      act(() => useProfileStore.setState({ profiles: [mockListItem] }))
      ;(profileApi.update as Mock).mockResolvedValue({
        ...mockProfile,
        name: 'Updated Name',
        updated_at: '2026-04-10T00:00:00Z',
      })

      await act(async () => {
        await useProfileStore.getState().updateProfile('profile-1', { name: 'Updated Name' })
      })

      const updated = useProfileStore.getState().profiles[0]
      expect(updated.name).toBe('Updated Name')
    })

    it('updates activeProfile if it matches', async () => {
      act(() => useProfileStore.setState({ profiles: [mockListItem], activeProfile: mockProfile }))
      ;(profileApi.update as Mock).mockResolvedValue({ ...mockProfile, name: 'Updated Name' })

      await act(async () => {
        await useProfileStore.getState().updateProfile('profile-1', { name: 'Updated Name' })
      })

      expect(useProfileStore.getState().activeProfile?.name).toBe('Updated Name')
    })
  })

  // ── deleteProfile ──────────────────────────────────────────────────────────

  describe('deleteProfile', () => {
    it('removes profile from list', async () => {
      act(() => useProfileStore.setState({ profiles: [mockListItem, mockProfile2] }))
      ;(profileApi.delete as Mock).mockResolvedValue(undefined)

      await act(async () => {
        await useProfileStore.getState().deleteProfile('profile-1')
      })

      const { profiles } = useProfileStore.getState()
      expect(profiles).toHaveLength(1)
      expect(profiles[0].id).toBe('profile-2')
    })

    it('clears activeProfile if it was deleted', async () => {
      act(() => useProfileStore.setState({ profiles: [mockListItem], activeProfile: mockProfile }))
      ;(profileApi.delete as Mock).mockResolvedValue(undefined)

      await act(async () => {
        await useProfileStore.getState().deleteProfile('profile-1')
      })

      expect(useProfileStore.getState().activeProfile).toBeNull()
    })

    it('does NOT clear activeProfile if a different profile was deleted', async () => {
      act(() => useProfileStore.setState({ profiles: [mockListItem, mockProfile2], activeProfile: mockProfile }))
      ;(profileApi.delete as Mock).mockResolvedValue(undefined)

      await act(async () => {
        await useProfileStore.getState().deleteProfile('profile-2')
      })

      expect(useProfileStore.getState().activeProfile?.id).toBe('profile-1')
    })
  })

  // ── setDefault ─────────────────────────────────────────────────────────────

  describe('setDefault', () => {
    it('sets only target profile as default, clears others', async () => {
      const p2WithDefault = { ...mockProfile2, is_default: true }
      act(() => useProfileStore.setState({ profiles: [mockListItem, p2WithDefault] }))
      ;(profileApi.setDefault as Mock).mockResolvedValue(undefined)

      await act(async () => {
        await useProfileStore.getState().setDefault('profile-1')
      })

      const { profiles } = useProfileStore.getState()
      const p1 = profiles.find((p) => p.id === 'profile-1')
      const p2 = profiles.find((p) => p.id === 'profile-2')
      expect(p1?.is_default).toBe(true)
      expect(p2?.is_default).toBe(false)
    })

    it('updates activeProfile is_default field', async () => {
      act(() => useProfileStore.setState({ profiles: [mockListItem], activeProfile: mockProfile }))
      ;(profileApi.setDefault as Mock).mockResolvedValue(undefined)

      await act(async () => {
        await useProfileStore.getState().setDefault('profile-1')
      })

      expect(useProfileStore.getState().activeProfile?.is_default).toBe(true)
    })
  })

  // ── setActiveProfile ───────────────────────────────────────────────────────

  describe('setActiveProfile', () => {
    it('sets activeProfile directly', () => {
      act(() => useProfileStore.getState().setActiveProfile(mockProfile))
      expect(useProfileStore.getState().activeProfile).toEqual(mockProfile)
    })

    it('can clear activeProfile with null', () => {
      act(() => useProfileStore.setState({ activeProfile: mockProfile }))
      act(() => useProfileStore.getState().setActiveProfile(null))
      expect(useProfileStore.getState().activeProfile).toBeNull()
    })
  })

  // ── reset ──────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('clears all state', async () => {
      act(() => useProfileStore.setState({
        profiles: [mockListItem],
        activeProfile: mockProfile,
        error: 'some error',
      }))

      act(() => useProfileStore.getState().reset())

      const { profiles, activeProfile, loading, error } = useProfileStore.getState()
      expect(profiles).toHaveLength(0)
      expect(activeProfile).toBeNull()
      expect(loading).toBe(false)
      expect(error).toBeNull()
    })
  })
})
