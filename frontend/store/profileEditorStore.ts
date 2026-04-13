import { create } from 'zustand'
import { profileApi } from '@/lib/api'
import type {
  CVProfile,
  ProfileSection,
  ProfileItem,
  ProfileSectionType,
  ProfileItemData,
  UpdateProfileRequest,
  CreateSectionRequest,
  UpdateSectionRequest,
  CreateItemRequest,
  UpdateItemRequest,
} from '@/types'

interface ProfileEditorState {
  profile: CVProfile | null
  sections: ProfileSection[]
  isDirty: boolean
  isSaving: boolean
  lastSavedAt: Date | null
  error: string | null

  // Lifecycle
  loadProfile: (id: string) => Promise<void>
  reset: () => void

  // Profile meta
  updateMeta: (data: UpdateProfileRequest) => void
  saveMeta: () => Promise<void>

  // Section ops
  addSection: (data: CreateSectionRequest) => Promise<void>
  updateSection: (sectionId: string, data: UpdateSectionRequest) => void
  removeSection: (sectionId: string) => Promise<void>
  reorderSections: (orderedIds: string[]) => Promise<void>

  // Item ops
  addItem: (sectionId: string, data: CreateItemRequest) => Promise<void>
  updateItem: (sectionId: string, itemId: string, data: UpdateItemRequest) => void
  saveItem: (sectionId: string, itemId: string) => Promise<void>
  removeItem: (sectionId: string, itemId: string) => Promise<void>
  reorderItems: (sectionId: string, orderedIds: string[]) => Promise<void>

  // Persist
  save: () => Promise<void>
}

export const useProfileEditorStore = create<ProfileEditorState>((set, get) => ({
  profile: null,
  sections: [],
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  error: null,

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  loadProfile: async (id) => {
    const profile = await profileApi.get(id)
    set({
      profile,
      sections: profile.sections ?? [],
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
      error: null,
    })
  },

  reset: () =>
    set({
      profile: null,
      sections: [],
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
      error: null,
    }),

  // ── Profile meta ──────────────────────────────────────────────────────────

  updateMeta: (data) =>
    set((s) =>
      s.profile
        ? { profile: { ...s.profile, ...data }, isDirty: true }
        : {}
    ),

  saveMeta: async () => {
    const { profile } = get()
    if (!profile) return
    set({ isSaving: true })
    try {
      const updated = await profileApi.update(profile.id, {
        name: profile.name,
        role_target: profile.role_target,
        summary: profile.summary,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        linkedin_url: profile.linkedin_url,
        github_url: profile.github_url,
        website_url: profile.website_url,
      })
      set({ profile: updated, isDirty: false, isSaving: false, lastSavedAt: new Date() })
    } catch {
      set({ isSaving: false, error: 'Lưu thất bại. Vui lòng thử lại.' })
      throw new Error('Save failed')
    }
  },

  // ── Section ops ───────────────────────────────────────────────────────────

  addSection: async (data) => {
    const { profile } = get()
    if (!profile) return
    const section = await profileApi.createSection(profile.id, data)
    set((s) => ({ sections: [...s.sections, { ...section, items: [] }] }))
  },

  updateSection: (sectionId, data) =>
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, ...data } : sec
      ),
      isDirty: true,
    })),

  removeSection: async (sectionId) => {
    const { profile } = get()
    if (!profile) return
    await profileApi.deleteSection(profile.id, sectionId)
    set((s) => ({ sections: s.sections.filter((sec) => sec.id !== sectionId) }))
  },

  reorderSections: async (orderedIds) => {
    const { profile, sections } = get()
    if (!profile) return
    // Optimistic update
    const reordered = orderedIds
      .map((id) => sections.find((s) => s.id === id))
      .filter(Boolean) as ProfileSection[]
    set({ sections: reordered })
    await profileApi.reorderSections(profile.id, { order: orderedIds })
  },

  // ── Item ops ──────────────────────────────────────────────────────────────

  addItem: async (sectionId, data) => {
    const { profile } = get()
    if (!profile) return
    const item = await profileApi.createItem(profile.id, sectionId, data)
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.id === sectionId
          ? { ...sec, items: [...(sec.items ?? []), item] }
          : sec
      ),
    }))
  },

  updateItem: (sectionId, itemId, data) =>
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.id === sectionId
          ? {
              ...sec,
              items: (sec.items ?? []).map((item) =>
                item.id === itemId
                  ? { ...item, ...(data.data ? { data: { ...item.data, ...data.data } as ProfileItemData } : {}), ...(data.is_visible !== undefined ? { is_visible: data.is_visible } : {}) }
                  : item
              ),
            }
          : sec
      ),
      isDirty: true,
    })),

  saveItem: async (sectionId, itemId) => {
    const { profile, sections } = get()
    if (!profile) return
    const sec = sections.find((s) => s.id === sectionId)
    const item = sec?.items?.find((i) => i.id === itemId)
    if (!item) return
    set({ isSaving: true })
    try {
      await profileApi.updateItem(profile.id, sectionId, itemId, {
        data: item.data,
        is_visible: item.is_visible,
      })
      set({ isDirty: false, isSaving: false, lastSavedAt: new Date() })
    } catch {
      set({ isSaving: false, error: 'Lưu item thất bại.' })
      throw new Error('Save item failed')
    }
  },

  removeItem: async (sectionId, itemId) => {
    const { profile } = get()
    if (!profile) return
    await profileApi.deleteItem(profile.id, sectionId, itemId)
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.id === sectionId
          ? { ...sec, items: (sec.items ?? []).filter((i) => i.id !== itemId) }
          : sec
      ),
    }))
  },

  reorderItems: async (sectionId, orderedIds) => {
    const { profile, sections } = get()
    if (!profile) return
    // Optimistic update
    set((s) => ({
      sections: s.sections.map((sec) => {
        if (sec.id !== sectionId) return sec
        const reordered = orderedIds
          .map((id) => (sec.items ?? []).find((i) => i.id === id))
          .filter(Boolean) as ProfileItem[]
        return { ...sec, items: reordered }
      }),
    }))
    await profileApi.reorderItems(profile.id, sectionId, { order: orderedIds })
  },

  // ── Persist (save meta) ───────────────────────────────────────────────────

  save: async () => {
    await get().saveMeta()
  },
}))
