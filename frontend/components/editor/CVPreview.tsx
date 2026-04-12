'use client'

import { useEditorStore } from '@/store'
import { CVMiniPreview } from '@/components/cv/CVMiniPreview'

/**
 * CVPreview — Editor full-size preview (595px A4).
 * Dùng lại CVMiniPreview với containerWidth = 595 (= scale 1:1, không thu nhỏ).
 */
export function CVPreview() {
  const { cvData } = useEditorStore()
  if (!cvData) return null

  return (
    <div className="shadow-xl rounded overflow-hidden">
      <CVMiniPreview
        sections={cvData.sections}
        colorTheme={cvData.color_theme}
        containerWidth={595}
      />
    </div>
  )
}
