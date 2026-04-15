'use client'

import { useState } from 'react'
import {
  Eye, EyeOff, Code2, Settings2, Plus, Trash2,
  CheckCircle2, Crown, LayoutTemplate,
} from 'lucide-react'
import { toast } from 'sonner'

import { useEditorStore } from '@/store'
import { useAuthStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { PersonalSection } from './sections/PersonalSection'
import { SummarySection } from './sections/SummarySection'
import { ExperienceSection } from './sections/ExperienceSection'
import { EducationSection } from './sections/EducationSection'
import { SkillsSection } from './sections/SkillsSection'
import { ProjectsSection } from './sections/ProjectsSection'
import { CertificationsSection } from './sections/CertificationsSection'
import { LanguagesSection } from './sections/LanguagesSection'
import { CustomSection } from './sections/CustomSection'
import { MarkdownEditor } from './MarkdownEditor'
import { getAllTemplates, getDefaultColor } from '@/templates/registry'
import type { CVSection, SectionType } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_MAP: Record<string, React.ComponentType<{ section: CVSection }>> = {
  personal:       PersonalSection,
  summary:        SummarySection,
  experience:     ExperienceSection,
  education:      EducationSection,
  skills:         SkillsSection,
  projects:       ProjectsSection,
  certifications: CertificationsSection,
  languages:      LanguagesSection,
  custom:         CustomSection,
}

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

// Các section chuẩn có thể thêm (nếu chưa tồn tại)
const ADDABLE_STANDARD_SECTIONS: { type: SectionType; label: string; description: string }[] = [
  { type: 'experience',     label: 'Kinh nghiệm',  description: 'Lịch sử công việc và thành tích' },
  { type: 'education',      label: 'Học vấn',       description: 'Trường học, bằng cấp, chuyên ngành' },
  { type: 'skills',         label: 'Kỹ năng',       description: 'Kỹ năng kỹ thuật và mềm' },
  { type: 'projects',       label: 'Dự án',         description: 'Dự án cá nhân và công ty' },
  { type: 'certifications', label: 'Chứng chỉ',    description: 'Chứng chỉ chuyên môn' },
  { type: 'languages',      label: 'Ngôn ngữ',      description: 'Ngoại ngữ và trình độ' },
  { type: 'summary',        label: 'Tóm tắt',       description: 'Giới thiệu bản thân ngắn gọn' },
]

const MARKDOWN_TAB = '__markdown__'
const COLOR_TAB    = '__color__'
const SETTINGS_TAB = '__settings__'
const ADD_TAB      = '__add__'

const COLOR_PRESETS = [
  '#2563eb', '#16a34a', '#dc2626', '#9333ea',
  '#ea580c', '#0891b2', '#64748b', '#111827',
]

// ─── Template picker (mini) ───────────────────────────────────────────────────

function TemplatePicker({
  currentId,
  onSelect,
}: {
  currentId: string
  onSelect: (id: string) => void
}) {
  const { subscription } = useAuthStore()
  const isPaid = subscription?.plan !== 'free'
  const templates = getAllTemplates()

  return (
    <div className="grid grid-cols-2 gap-3">
      {templates.map((entry) => {
        const locked = entry.meta.isPremium && !isPaid
        const isSelected = currentId === entry.meta.id

        return (
          <button
            key={entry.meta.id}
            onClick={() => {
              if (locked) { toast.info('Nâng cấp để dùng template premium'); return }
              onSelect(entry.meta.id)
            }}
            className={cn(
              'relative rounded-lg border-2 text-left transition-all overflow-hidden',
              isSelected ? 'border-primary shadow-sm' : 'border-border hover:border-primary/40',
              locked && 'opacity-60'
            )}
          >
            {/* Mini preview placeholder */}
            <div className="h-24 bg-muted/30 flex items-center justify-center">
              <LayoutTemplate className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <div className="px-2 py-1.5 flex items-center justify-between border-t bg-card">
              <span className="text-[11px] font-medium truncate">{entry.meta.name}</span>
              {entry.meta.isPremium && (
                <Crown className="h-3 w-3 text-amber-500 shrink-0" />
              )}
            </div>
            {isSelected && (
              <div className="absolute top-1.5 right-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary fill-background" />
              </div>
            )}
            {locked && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                <Crown className="h-4 w-4 text-amber-500" />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Settings tab content ─────────────────────────────────────────────────────

function SettingsTab() {
  const { cvData, updateTitle, updateTemplateId, updateColorTheme } = useEditorStore()
  if (!cvData) return null

  return (
    <div className="p-4 space-y-6">
      {/* CV title */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Tên CV</Label>
        <Input
          className="h-9 text-sm"
          value={cvData.title}
          placeholder="Tên CV của bạn"
          onChange={(e) => updateTitle(e.target.value)}
        />
        <p className="text-[10px] text-muted-foreground">
          Tên hiển thị trong dashboard, không xuất hiện trong file CV
        </p>
      </div>

      {/* Color */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Màu chủ đạo</Label>
        <div className="flex items-center gap-2 flex-wrap">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => updateColorTheme(color)}
              className={cn(
                'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                cvData.color_theme === color ? 'border-foreground scale-110' : 'border-transparent'
              )}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={cvData.color_theme}
            onChange={(e) => updateColorTheme(e.target.value)}
            className="h-7 w-7 rounded cursor-pointer border"
            title="Tùy chỉnh màu"
          />
          <span className="text-xs text-muted-foreground font-mono">{cvData.color_theme}</span>
        </div>
      </div>

      {/* Template */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Template</Label>
        <p className="text-[10px] text-muted-foreground mb-2">
          Thay đổi template sẽ giữ nguyên nội dung CV
        </p>
        <TemplatePicker
          currentId={cvData.template_id}
          onSelect={(id) => {
            updateTemplateId(id)
            // Cập nhật màu mặc định của template mới nếu màu hiện tại là mặc định cũ
            updateColorTheme(getDefaultColor(id))
            toast.success('Đã đổi template')
          }}
        />
      </div>
    </div>
  )
}

// ─── Add section tab content ──────────────────────────────────────────────────

function AddSectionTab({ onDone }: { onDone: (tabId: string) => void }) {
  const { cvData, addSection } = useEditorStore()
  const [customName, setCustomName] = useState('')
  if (!cvData) return null

  const existingTypes = new Set(cvData.sections.map((s) => s.type))
  const maxOrder = Math.max(0, ...cvData.sections.map((s) => s.order))

  const handleAddStandard = (type: SectionType, label: string) => {
    if (existingTypes.has(type)) {
      toast.info(`Section "${label}" đã tồn tại`)
      onDone(type)
      return
    }
    const newSection: CVSection = {
      id: crypto.randomUUID(),
      type,
      title: label,
      visible: true,
      order: maxOrder + 1,
      data: type === 'summary' ? { content: '' } : { items: [] },
    }
    addSection(newSection)
    toast.success(`Đã thêm section "${label}"`)
    onDone(type)
  }

  const handleAddCustom = () => {
    const name = customName.trim() || 'Section mới'
    const newSection: CVSection = {
      id: crypto.randomUUID(),
      type: 'custom' as SectionType,
      title: name,
      visible: true,
      order: maxOrder + 1,
      data: { items: [] },
    }
    addSection(newSection)
    toast.success(`Đã thêm section "${name}"`)
    setCustomName('')
    onDone(newSection.id)
  }

  return (
    <div className="p-4 space-y-5">
      {/* Standard sections */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Section chuẩn</Label>
        <div className="space-y-1.5">
          {ADDABLE_STANDARD_SECTIONS.map(({ type, label, description }) => {
            const exists = existingTypes.has(type)
            return (
              <button
                key={type}
                onClick={() => handleAddStandard(type, label)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all',
                  exists
                    ? 'border-border bg-muted/20 opacity-60'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{description}</p>
                </div>
                {exists ? (
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom section */}
      <div className="space-y-2 pt-2 border-t">
        <Label className="text-xs font-medium">Custom section</Label>
        <p className="text-[11px] text-muted-foreground">
          Tạo section tùy ý với danh sách bullet points — phù hợp cho Giải thưởng, Sở thích, Tình nguyện...
        </p>
        <div className="flex gap-2">
          <Input
            className="h-8 text-sm flex-1"
            placeholder="Tên section (vd: Giải thưởng)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
          />
          <Button size="sm" className="h-8 gap-1 shrink-0" onClick={handleAddCustom}>
            <Plus className="h-3.5 w-3.5" />
            Thêm
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main EditorPanel ─────────────────────────────────────────────────────────

export function EditorPanel() {
  const { cvData, updateSection, removeSection } = useEditorStore()
  const [activeTab, setActiveTab] = useState<string>('')

  if (!cvData) return null

  const sorted = [...cvData.sections].sort((a, b) => a.order - b.order)
  const effectiveTab = activeTab || sorted[0]?.type || ''

  // Custom sections dùng id làm tab key (để hỗ trợ nhiều custom sections)
  const activeSection = sorted.find(
    (s) => s.id === effectiveTab || s.type === effectiveTab
  )
  const SectionComponent = activeSection ? SECTION_MAP[activeSection.type] : null

  const isSpecialTab = [MARKDOWN_TAB, COLOR_TAB, SETTINGS_TAB, ADD_TAB].includes(effectiveTab)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Tab bar ── */}
      <div className="shrink-0 border-b bg-muted/20">
        <div className="flex overflow-x-auto scrollbar-none">
          {sorted.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveTab(section.type === 'custom' ? section.id : section.type)}
              className={cn(
                'relative shrink-0 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors',
                'border-b-2 -mb-[1px]',
                effectiveTab === (section.type === 'custom' ? section.id : section.type)
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

          {/* Thêm section */}
          <button
            onClick={() => setActiveTab(ADD_TAB)}
            className={cn(
              'shrink-0 px-2.5 py-2 text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1',
              'border-b-2 -mb-[1px]',
              effectiveTab === ADD_TAB
                ? 'border-primary text-primary bg-background'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
            title="Thêm section"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm
          </button>

          {/* Divider */}
          <div className="w-px bg-border my-2 shrink-0" />

          {/* Markdown */}
          <button
            onClick={() => setActiveTab(MARKDOWN_TAB)}
            className={cn(
              'shrink-0 px-2.5 py-2 text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1',
              'border-b-2 -mb-[1px]',
              effectiveTab === MARKDOWN_TAB
                ? 'border-primary text-primary bg-background'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
          >
            <Code2 className="h-3 w-3" />
            MD
          </button>

          {/* Settings */}
          <button
            onClick={() => setActiveTab(SETTINGS_TAB)}
            className={cn(
              'shrink-0 px-2.5 py-2 text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1',
              'border-b-2 -mb-[1px]',
              effectiveTab === SETTINGS_TAB
                ? 'border-primary text-primary bg-background'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
            title="Cài đặt CV"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">

        {effectiveTab === MARKDOWN_TAB && (
          <div className="h-full"><MarkdownEditor /></div>
        )}

        {effectiveTab === SETTINGS_TAB && <SettingsTab />}

        {effectiveTab === ADD_TAB && (
          <AddSectionTab
            onDone={(tabId) => setActiveTab(tabId)}
          />
        )}

        {!isSpecialTab && activeSection && (
          <div className="p-4 space-y-3">
            {/* Visibility + delete (custom sections có nút xóa riêng trong component) */}
            <div className="flex items-center justify-between rounded-lg border px-3 py-2 bg-muted/20">
              <span className="text-xs text-muted-foreground">
                {activeSection.visible ? 'Đang hiển thị' : 'Đang ẩn'}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => updateSection(activeSection.id, { visible: !activeSection.visible })}
                >
                  {activeSection.visible
                    ? <><Eye className="h-3.5 w-3.5" /> Ẩn</>
                    : <><EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> Hiện</>}
                </Button>
                {/* Xóa cho standard sections không bắt buộc */}
                {activeSection.type !== 'personal' && activeSection.type !== 'custom' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      removeSection(activeSection.id)
                      setActiveTab(sorted[0]?.type ?? '')
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {activeSection.visible && SectionComponent && (
              <SectionComponent section={activeSection} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
