'use client'

import { useEditorStore } from '@/store'
import { resolveTemplate } from '@/templates/registry'

/**
 * CVPreview — Editor full-size preview (595px A4).
 *
 * Resolve đúng template component từ registry theo cvData.template_id,
 * render ở kích thước A4 thật (595px), không scale.
 */
export function CVPreview() {
  const { cvData } = useEditorStore()
  if (!cvData) return null

  const { component: TemplateComponent } = resolveTemplate(cvData.template_id)

  return (
    <div className="shadow-xl rounded overflow-hidden">
      <TemplateComponent
        sections={cvData.sections}
        colorTheme={cvData.color_theme}
      />
    </div>
  )
}
