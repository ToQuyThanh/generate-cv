import { create } from 'zustand'
import { profileApi } from '@/lib/api'
import type {
  CVProfile,
  CVProfileListItem,
  CreateProfileRequest,
  UpdateProfileRequest,
} from '@/types'

interface ProfileState {
  profiles: CVProfileListItem[]
  activeProfile: CVProfile | null
  loading: boolean
  error: string | null

  fetchProfiles: () => Promise<void>
  fetchProfile: (id: string) => Promise<CVProfile>
  createProfile: (data: CreateProfileRequest) => Promise<CVProfile>
  updateProfile: (id: string, data: UpdateProfileRequest) => Promise<void>
  deleteProfile: (id: string) => Promise<void>
  setDefault: (id: string) => Promise<void>
  setActiveProfile: (profile: CVProfile | null) => void
  reset: () => void
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  activeProfile: null,
  loading: false,
  error: null,

  fetchProfiles: async () => {
    set({ loading: true, error: null })
    try {
      const result = await profileApi.list()
      // Guard: đảm bảo luôn là array dù API trả về format bất kỳ
      const profiles = Array.isArray(result) ? result : []
      set({ profiles })
    } catch (err) {
      set({ error: 'Không thể tải danh sách profile' })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  fetchProfile: async (id) => {
    const profile = await profileApi.get(id)
    set({ activeProfile: profile })
    return profile
  },

  createProfile: async (data) => {
    const profile = await profileApi.create(data)
    set((s) => ({
      profiles: [
        {
          id: profile.id,
          name: profile.name,
          role_target: profile.role_target,
          full_name: profile.full_name,
          email: profile.email,
          is_default: profile.is_default,
          section_count: 0,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        },
        ...s.profiles,
      ],
    }))
    return profile
  },

  updateProfile: async (id, data) => {
    const updated = await profileApi.update(id, data)
    set((s) => ({
      profiles: s.profiles.map((p) =>
        p.id === id
          ? {
              ...p,
              name: updated.name,
              role_target: updated.role_target,
              full_name: updated.full_name,
              updated_at: updated.updated_at,
            }
          : p
      ),
      activeProfile: s.activeProfile?.id === id ? updated : s.activeProfile,
    }))
  },

  deleteProfile: async (id) => {
    await profileApi.delete(id)
    set((s) => ({
      profiles: s.profiles.filter((p) => p.id !== id),
      activeProfile: s.activeProfile?.id === id ? null : s.activeProfile,
    }))
  },

  setDefault: async (id) => {
    await profileApi.setDefault(id)
    set((s) => ({
      profiles: s.profiles.map((p) => ({ ...p, is_default: p.id === id })),
      activeProfile:
        s.activeProfile
          ? { ...s.activeProfile, is_default: s.activeProfile.id === id }
          : null,
    }))
  },

  setActiveProfile: (profile) => set({ activeProfile: profile }),

  reset: () => set({ profiles: [], activeProfile: null, loading: false, error: null }),
}))
