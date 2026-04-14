import { create } from 'zustand'
import type { CV, CVSection } from '@/types'
import { snapshotToSections, hasProfileSnapshot, type ProfileSnapshot } from '@/lib/profile-snapshot'

interface EditorState {
  // Dữ liệu CV đang edit
  cvData: CV | null
  isDirty: boolean
  isSaving: boolean
  lastSavedAt: Date | null

  // Panel AI
  isAIPanelOpen: boolean

  // Actions
  setCVData: (cv: CV) => void
  updateTitle: (title: string) => void
  updateColorTheme: (color: string) => void
  updateTemplateId: (templateId: string) => void
  updateSection: (sectionId: string, data: Partial<CVSection>) => void
  addSection: (section: CVSection) => void
  removeSection: (sectionId: string) => void
  reorderSections: (sections: CVSection[]) => void
  setSaving: (saving: boolean) => void
  markSaved: () => void
  setAIPanelOpen: (open: boolean) => void
  reset: () => void
}

export const useEditorStore = create<EditorState>((set) => ({
  cvData: null,
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  isAIPanelOpen: false,

  setCVData: (cv) => {
    // Nếu CV có profile_snapshot và sections rỗng/chưa có data,
    // tự động populate sections từ snapshot.
    let sections = cv.sections
    const snapshot = cv.profile_snapshot
    const sectionsAreEmpty =
      !sections ||
      sections.length === 0 ||
      sections.every((s) => {
        const d = s.data as Record<string, unknown>
        // personal section: check full_name
        if (s.type === 'personal') return !d.full_name
        // summary section: check content
        if (s.type === 'summary') return !d.content
        // other sections: check items array
        const items = d.items as unknown[]
        return !items || items.length === 0
      })

    if (sectionsAreEmpty && hasProfileSnapshot(snapshot)) {
      sections = snapshotToSections(snapshot as unknown as ProfileSnapshot)
    }

    set({ cvData: { ...cv, sections }, isDirty: false, lastSavedAt: null })
  },

  updateTitle: (title) =>
    set((s) =>
      s.cvData ? { cvData: { ...s.cvData, title }, isDirty: true } : {}
    ),

  updateColorTheme: (color_theme) =>
    set((s) =>
      s.cvData ? { cvData: { ...s.cvData, color_theme }, isDirty: true } : {}
    ),

  updateTemplateId: (template_id) =>
    set((s) =>
      s.cvData ? { cvData: { ...s.cvData, template_id }, isDirty: true } : {}
    ),

  updateSection: (sectionId, patch) =>
    set((s) => {
      if (!s.cvData) return {}
      const sections = s.cvData.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, ...patch } : sec
      )
      return { cvData: { ...s.cvData, sections }, isDirty: true }
    }),

  reorderSections: (sections) =>
    set((s) =>
      s.cvData ? { cvData: { ...s.cvData, sections }, isDirty: true } : {}
    ),

  addSection: (section) =>
    set((s) =>
      s.cvData
        ? { cvData: { ...s.cvData, sections: [...s.cvData.sections, section] }, isDirty: true }
        : {}
    ),

  removeSection: (sectionId) =>
    set((s) => {
      if (!s.cvData) return {}
      return {
        cvData: {
          ...s.cvData,
          sections: s.cvData.sections.filter((sec) => sec.id !== sectionId),
        },
        isDirty: true,
      }
    }),

  setSaving: (isSaving) => set({ isSaving }),

  markSaved: () => set({ isDirty: false, isSaving: false, lastSavedAt: new Date() }),

  setAIPanelOpen: (isAIPanelOpen) => set({ isAIPanelOpen }),

  reset: () =>
    set({
      cvData: null,
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
      isAIPanelOpen: false,
    }),
}))
