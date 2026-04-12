import { create } from 'zustand'
import type { CV, CVSection } from '@/types'

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

  setCVData: (cv) =>
    set({ cvData: cv, isDirty: false, lastSavedAt: null }),

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
