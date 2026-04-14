'use client'

import { useState } from 'react'
import { Eye, EyeOff, Code2 } from 'lucide-react'

import { useEditorStore } from '@/store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PersonalSection } from './sections/PersonalSection'
import { SummarySection } from './sections/SummarySection'
import { ExperienceSection } from './sections/ExperienceSection'
import { EducationSection } from './sections/EducationSection'
import { SkillsSection } from './sections/SkillsSection'
import { ProjectsSection } from './sections/ProjectsSection'
import { CertificationsSection } from './sections/CertificationsSection'
import { LanguagesSection } from './sections/LanguagesSection'
import { MarkdownEditor } from './MarkdownEditor'
import type { CVSection } from '@/types'

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

// Label ngắn gọn hiển thị trên tab
const SECTION_LABELS: Record<string, string> = {
  personal:       'Cá nhân',
  summary:        'Tóm tắt',
  experience:     'Kinh nghiệm',
  education:      'Học vấn',
  skills:         'Kỹ năng',
  projects:       'Dự án',
  certifications: 'Chứng chỉ',
  languages:      'Ngôn ngữ',
}

// Tab đặc biệt
const MARKDOWN_TAB = '__markdown__'
const COLOR_TAB = '__color__'

export function EditorPanel() {
  const { cvData, updateSection, updateColorTheme } = useEditorStore()
  const [activeTab, setActiveTab] = useState<string>('')

  if (!cvData) return null

  const sorted = [...cvData.sections].sort((a, b) => a.order - b.order)

  // Set tab mặc định là section đầu tiên nếu chưa chọn
  const effectiveTab = activeTab || sorted[0]?.type || ''

  const activeSection = sorted.find((s) => s.type === effectiveTab)
  const SectionComponent = activeSection ? SECTION_MAP[activeSection.type] : null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar — scroll ngang */}
      <div className="shrink-0 border-b bg-muted/20">
        <div className="flex overflow-x-auto scrollbar-none">
          {sorted.map((section) => (
            <button
              key={section.type}
              onClick={() => setActiveTab(section.type)}
              className={cn(
                'relative shrink-0 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors',
                'border-b-2 -mb-[1px]',
                effectiveTab === section.type
                  ? 'border-primary text-primary bg-background'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40',
                !section.visible && 'opacity-50'
              )}
            >
              {SECTION_LABELS[section.type] ?? section.title}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px bg-border my-2 shrink-0" />

          {/* Màu sắc */}
          <button
            onClick={() => setActiveTab(COLOR_TAB)}
            className={cn(
              'shrink-0 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors',
              'border-b-2 -mb-[1px]',
              effectiveTab === COLOR_TAB
                ? 'border-primary text-primary bg-background'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
          >
            🎨 Màu
          </button>

          {/* Markdown */}
          <button
            onClick={() => setActiveTab(MARKDOWN_TAB)}
            className={cn(
              'shrink-0 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors gap-1 flex items-center',
              'border-b-2 -mb-[1px]',
              effectiveTab === MARKDOWN_TAB
                ? 'border-primary text-primary bg-background'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
          >
            <Code2 className="h-3 w-3" />
            Markdown
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Markdown mode */}
        {effectiveTab === MARKDOWN_TAB && (
          <div className="h-full">
            <MarkdownEditor />
          </div>
        )}

        {/* Color picker */}
        {effectiveTab === COLOR_TAB && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <span className="text-sm font-medium flex-1">Màu chủ đạo</span>
              <input
                type="color"
                value={cvData.color_theme}
                onChange={(e) => updateColorTheme(e.target.value)}
                className="h-8 w-8 rounded cursor-pointer border"
              />
              <span className="text-xs text-muted-foreground font-mono">
                {cvData.color_theme}
              </span>
            </div>
            {/* Preset colors */}
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Màu gợi ý</span>
              <div className="flex flex-wrap gap-2">
                {[
                  '#2563eb', '#16a34a', '#dc2626', '#9333ea',
                  '#ea580c', '#0891b2', '#64748b', '#111827',
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => updateColorTheme(color)}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                      cvData.color_theme === color ? 'border-foreground scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section editors */}
        {effectiveTab !== MARKDOWN_TAB && effectiveTab !== COLOR_TAB && activeSection && (
          <div className="p-4 space-y-3">
            {/* Section visibility toggle */}
            <div className="flex items-center justify-between rounded-lg border px-3 py-2 bg-muted/20">
              <span className="text-xs text-muted-foreground">
                {activeSection.visible ? 'Section đang hiển thị trong CV' : 'Section đang bị ẩn'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() =>
                  updateSection(activeSection.id, { visible: !activeSection.visible })
                }
              >
                {activeSection.visible ? (
                  <><Eye className="h-3.5 w-3.5" /> Ẩn section</>
                ) : (
                  <><EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> Hiện section</>
                )}
              </Button>
            </div>

            {/* Section content */}
            {activeSection.visible && SectionComponent && (
              <SectionComponent section={activeSection} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
