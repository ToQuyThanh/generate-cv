import { useEffect, useRef } from 'react'
import { cvApi } from '@/lib/api'
import { useEditorStore } from '@/store'

/**
 * Debounce auto-save: sau khi isDirty=true và không có thay đổi trong 2 giây
 * thì gọi PATCH /cvs/:id tự động.
 */
export function useAutoSave() {
  const { cvData, isDirty, setSaving, markSaved } = useEditorStore()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isDirty || !cvData) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        await cvApi.update(cvData.id, {
          title: cvData.title,
          template_id: cvData.template_id,
          color_theme: cvData.color_theme,
          sections: cvData.sections,
        })
        markSaved()
      } catch {
        setSaving(false)
        // Lỗi lưu — giữ nguyên isDirty để retry lần sau
      }
    }, 2000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isDirty, cvData, setSaving, markSaved])
}
