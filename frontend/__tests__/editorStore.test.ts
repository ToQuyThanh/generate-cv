import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useEditorStore } from '@/store/editorStore'
import type { CV } from '@/types'

const mockCV: CV = {
  id: 'cv-1',
  user_id: 'user-1',
  title: 'CV Test',
  template_id: 'template_modern_01',
  color_theme: '#1a56db',
  sections: [
    {
      id: 'sec-1',
      type: 'personal',
      title: 'Thông tin cá nhân',
      visible: true,
      order: 0,
      data: { full_name: 'Nguyễn Văn A', email: 'test@example.com' },
    },
    {
      id: 'sec-2',
      type: 'summary',
      title: 'Giới thiệu',
      visible: true,
      order: 1,
      data: { content: 'Kỹ sư phần mềm 3 năm kinh nghiệm' },
    },
  ],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

describe('editorStore', () => {
  beforeEach(() => {
    act(() => useEditorStore.getState().reset())
  })

  it('setCVData sets data and clears dirty flag', () => {
    act(() => useEditorStore.getState().setCVData(mockCV))
    const { cvData, isDirty } = useEditorStore.getState()
    expect(cvData?.id).toBe('cv-1')
    expect(isDirty).toBe(false)
  })

  it('updateTitle marks dirty', () => {
    act(() => useEditorStore.getState().setCVData(mockCV))
    act(() => useEditorStore.getState().updateTitle('New Title'))
    const { cvData, isDirty } = useEditorStore.getState()
    expect(cvData?.title).toBe('New Title')
    expect(isDirty).toBe(true)
  })

  it('updateColorTheme changes color and marks dirty', () => {
    act(() => useEditorStore.getState().setCVData(mockCV))
    act(() => useEditorStore.getState().updateColorTheme('#ff0000'))
    const { cvData, isDirty } = useEditorStore.getState()
    expect(cvData?.color_theme).toBe('#ff0000')
    expect(isDirty).toBe(true)
  })

  it('updateSection patches section data', () => {
    act(() => useEditorStore.getState().setCVData(mockCV))
    act(() =>
      useEditorStore.getState().updateSection('sec-2', {
        data: { content: 'Updated summary' },
      })
    )
    const { cvData } = useEditorStore.getState()
    const summary = cvData?.sections.find((s) => s.id === 'sec-2')
    expect((summary?.data as { content: string }).content).toBe('Updated summary')
  })

  it('updateSection toggles visibility', () => {
    act(() => useEditorStore.getState().setCVData(mockCV))
    act(() => useEditorStore.getState().updateSection('sec-1', { visible: false }))
    const { cvData } = useEditorStore.getState()
    const sec = cvData?.sections.find((s) => s.id === 'sec-1')
    expect(sec?.visible).toBe(false)
  })

  it('markSaved resets dirty and saving flags', () => {
    act(() => useEditorStore.getState().setCVData(mockCV))
    act(() => useEditorStore.getState().updateTitle('Dirty'))
    act(() => useEditorStore.getState().setSaving(true))
    act(() => useEditorStore.getState().markSaved())
    const { isDirty, isSaving, lastSavedAt } = useEditorStore.getState()
    expect(isDirty).toBe(false)
    expect(isSaving).toBe(false)
    expect(lastSavedAt).toBeTruthy()
  })

  it('setAIPanelOpen toggles AI panel', () => {
    act(() => useEditorStore.getState().setAIPanelOpen(true))
    expect(useEditorStore.getState().isAIPanelOpen).toBe(true)
    act(() => useEditorStore.getState().setAIPanelOpen(false))
    expect(useEditorStore.getState().isAIPanelOpen).toBe(false)
  })

  it('reset clears all state', () => {
    act(() => useEditorStore.getState().setCVData(mockCV))
    act(() => useEditorStore.getState().updateTitle('Dirty'))
    act(() => useEditorStore.getState().reset())
    const { cvData, isDirty } = useEditorStore.getState()
    expect(cvData).toBeNull()
    expect(isDirty).toBe(false)
  })
})
