'use client'

import { useEditorStore } from '@/store'
import { PersonalSection } from './sections/PersonalSection'
import { SummarySection } from './sections/SummarySection'
import { ExperienceSection } from './sections/ExperienceSection'
import { EducationSection } from './sections/EducationSection'
import { SkillsSection } from './sections/SkillsSection'
import { ProjectsSection } from './sections/ProjectsSection'
import { CertificationsSection } from './sections/CertificationsSection'
import { LanguagesSection } from './sections/LanguagesSection'
import type { CVSection } from '@/types'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

const SECTION_MAP: Record<string, React.ComponentType<{ section: CVSection }>> = {
  personal:       PersonalSection,
  summary:        SummarySection,
  experience:     ExperienceSection,
  education:      EducationSection,
  skills:         SkillsSection,
  projects:       ProjectsSection,
  certifications: CertificationsSection,
  languages:      LanguagesSection,
}

export function EditorPanel() {
  const { cvData, updateSection, updateColorTheme } = useEditorStore()
  if (!cvData) return null

  const sorted = [...cvData.sections].sort((a, b) => a.order - b.order)

  return (
    <div className="p-4 space-y-4">
      {/* Color theme picker */}
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <span className="text-sm font-medium flex-1">Màu chủ đạo</span>
        <input
          type="color"
          value={cvData.color_theme}
          onChange={(e) => updateColorTheme(e.target.value)}
          className="h-8 w-8 rounded cursor-pointer border"
        />
      </div>

      {sorted.map((section) => {
        const SectionComponent = SECTION_MAP[section.type]
        return (
          <div key={section.id} className="rounded-xl border overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
              <span className="text-sm font-medium">{section.title}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => updateSection(section.id, { visible: !section.visible })}
                title={section.visible ? 'Ẩn section' : 'Hiển thị section'}
              >
                {section.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
              </Button>
            </div>
            {section.visible && SectionComponent && (
              <div className="p-3">
                <SectionComponent section={section} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
