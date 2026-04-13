'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  Check,
  AlertCircle,
  GripVertical,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useProfileEditorStore } from '@/store'
import { cn } from '@/lib/utils'
import type {
  ProfileSection,
  ProfileItem,
  ProfileSectionType,
  WorkExperienceItemData,
  EducationItemData,
  SkillsItemData,
} from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SECTION_TYPE_LABELS: Record<ProfileSectionType, string> = {
  work_experience: 'Kinh nghiệm làm việc',
  education: 'Học vấn',
  skills: 'Kỹ năng',
  projects: 'Dự án',
  certifications: 'Chứng chỉ',
  languages: 'Ngôn ngữ',
  custom: 'Tùy chỉnh',
}

const SECTION_TYPE_OPTIONS: ProfileSectionType[] = [
  'work_experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'languages',
  'custom',
]

function getItemSummary(section: ProfileSection, item: ProfileItem): string {
  const d = item.data as Record<string, unknown>
  switch (section.type) {
    case 'work_experience':
      return `${d.position ?? ''} tại ${d.company ?? ''}`.trim() || 'Mục mới'
    case 'education':
      return `${d.degree ?? ''} · ${d.school ?? ''}`.trim() || 'Mục mới'
    case 'skills':
      return (d.group_name as string) || 'Nhóm kỹ năng'
    case 'projects':
      return (d.name as string) || 'Dự án mới'
    case 'certifications':
      return (d.name as string) || 'Chứng chỉ mới'
    case 'languages':
      return (d.name as string) || 'Ngôn ngữ mới'
    default:
      return 'Mục mới'
  }
}

function buildBlankItemData(type: ProfileSectionType): Record<string, unknown> {
  switch (type) {
    case 'work_experience':
      return { company: '', position: '', start_date: '', end_date: null, is_current: false, description: '', achievements: [], tech_stack: [] }
    case 'education':
      return { school: '', degree: '', field: '', start_date: '', end_date: '' }
    case 'skills':
      return { group_name: '', skills: [], level: 'intermediate' }
    case 'projects':
      return { name: '', description: '', tech_stack: [], highlights: [] }
    case 'certifications':
      return { name: '', issuer: '', date: '' }
    case 'languages':
      return { name: '', level: '' }
    default:
      return {}
  }
}

// ─── Save Status indicator ────────────────────────────────────────────────────

function SaveStatus({ isDirty, isSaving, lastSavedAt }: { isDirty: boolean; isSaving: boolean; lastSavedAt: Date | null }) {
  if (isSaving) return (
    <span className="flex items-center gap-1.5 text-xs text-wf-gray-500">
      <Loader2 className="h-3 w-3 animate-spin" /> Đang lưu...
    </span>
  )
  if (!isDirty && lastSavedAt) return (
    <span className="flex items-center gap-1.5 text-xs text-wf-gray-300">
      <Check className="h-3 w-3 text-green-500" /> Đã lưu
    </span>
  )
  if (isDirty) return (
    <span className="flex items-center gap-1.5 text-xs text-amber-500">
      <AlertCircle className="h-3 w-3" /> Chưa lưu
    </span>
  )
  return null
}

// ─── Add Section Modal ────────────────────────────────────────────────────────

function AddSectionModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (type: ProfileSectionType, title: string) => Promise<void>
}) {
  const [selectedType, setSelectedType] = useState<ProfileSectionType>('work_experience')
  const [customTitle, setCustomTitle] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAdd = async () => {
    setLoading(true)
    try {
      const title = selectedType === 'custom' && customTitle.trim()
        ? customTitle.trim()
        : SECTION_TYPE_LABELS[selectedType]
      await onAdd(selectedType, title)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg border border-wf-border shadow-wf w-full max-w-sm mx-4 p-5 space-y-4">
        <h3 className="text-[14px] font-semibold text-wf-black">Thêm section</h3>
        <div className="space-y-2">
          {SECTION_TYPE_OPTIONS.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={cn(
                'w-full text-left px-3 py-2 rounded text-sm transition-colors',
                selectedType === type
                  ? 'bg-wf-blue text-white'
                  : 'text-wf-gray-700 hover:bg-[rgba(20,110,245,0.06)] hover:text-wf-blue'
              )}
            >
              {SECTION_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
        {selectedType === 'custom' && (
          <input
            type="text"
            placeholder="Tên section tùy chỉnh"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            className="w-full rounded border border-wf-border px-3 py-2 text-sm focus:outline-none focus:border-wf-blue"
          />
        )}
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-wf-gray-700">Hủy</button>
          <Button size="sm" onClick={handleAdd} disabled={loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Thêm
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Item Editor (Work Experience) ──────────────────────────────────────────

function WorkExpItemForm({
  data,
  onChange,
}: {
  data: Partial<WorkExperienceItemData>
  onChange: (d: Partial<WorkExperienceItemData>) => void
}) {
  return (
    <div className="space-y-3 pt-2">
      {(['company', 'position', 'location'] as const).map((field) => (
        <div key={field}>
          <label className="wf-label mb-1 block capitalize">{field === 'company' ? 'Công ty' : field === 'position' ? 'Vị trí' : 'Địa điểm'}</label>
          <input
            type="text"
            value={(data[field] as string) ?? ''}
            onChange={(e) => onChange({ ...data, [field]: e.target.value })}
            className="w-full rounded border border-wf-border px-3 py-2 text-sm focus:outline-none focus:border-wf-blue"
          />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="wf-label mb-1 block">Từ tháng</label>
          <input
            type="text"
            placeholder="2022-03"
            value={data.start_date ?? ''}
            onChange={(e) => onChange({ ...data, start_date: e.target.value })}
            className="w-full rounded border border-wf-border px-3 py-2 text-sm focus:outline-none focus:border-wf-blue"
          />
        </div>
        <div>
          <label className="wf-label mb-1 block">Đến tháng</label>
          <input
            type="text"
            placeholder="2024-06 hoặc để trống"
            value={data.end_date ?? ''}
            disabled={!!data.is_current}
            onChange={(e) => onChange({ ...data, end_date: e.target.value })}
            className="w-full rounded border border-wf-border px-3 py-2 text-sm focus:outline-none focus:border-wf-blue disabled:opacity-50"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-wf-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={!!data.is_current}
          onChange={(e) => onChange({ ...data, is_current: e.target.checked, end_date: e.target.checked ? null : data.end_date })}
          className="rounded border-wf-border"
        />
        Đang làm việc tại đây
      </label>
      <div>
        <label className="wf-label mb-1 block">Mô tả</label>
        <textarea
          rows={3}
          value={data.description ?? ''}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          className="w-full rounded border border-wf-border px-3 py-2 text-sm focus:outline-none focus:border-wf-blue resize-none"
        />
      </div>
    </div>
  )
}

function EducationItemForm({
  data,
  onChange,
}: {
  data: Partial<EducationItemData>
  onChange: (d: Partial<EducationItemData>) => void
}) {
  return (
    <div className="space-y-3 pt-2">
      {[
        { field: 'school' as const, label: 'Trường' },
        { field: 'degree' as const, label: 'Bằng cấp' },
        { field: 'field' as const, label: 'Chuyên ngành' },
        { field: 'gpa' as const, label: 'GPA (tùy chọn)' },
      ].map(({ field, label }) => (
        <div key={field}>
          <label className="wf-label mb-1 block">{label}</label>
          <input
            type="text"
            value={(data[field] as string) ?? ''}
            onChange={(e) => onChange({ ...data, [field]: e.target.value })}
            className="w-full rounded border border-wf-border px-3 py-2 text-sm focus:outline-none focus:border-wf-blue"
          />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="wf-label mb-1 block">Từ năm</label>
          <input type="text" placeholder="2018" value={data.start_date ?? ''} onChange={(e) => onChange({ ...data, start_date: e.target.value })} className="w-full rounded border border-wf-border px-3 py-2 text-sm focus:outline-none focus:border-wf-blue" />
        </div>
        <div>
          <label className="wf-label mb-1 block">Đến năm</label>
          <input type="text" placeholder="2022" value={data.end_date ?? ''} onChange={(e) => onChange({ ...data, end_date: e.target.value })} className="w-full rounded border border-wf-border px-3 py-2 text-sm focus:outline-none focus:border-wf-blue" />
        </div>
      </div>
    </div>
  )
}

function SkillsItemForm({
  data,
  onChange,
}: {
  data: Partial<SkillsItemData>
  onChange: (d: Partial<SkillsItemData>) => void
}) {
  const [skillInput, setSkillInput] = useState('')
  const skills = data.skills ?? []

  const addSkill = () => {
    const trimmed = skillInput.trim()
    if (!trimmed || skills.includes(trimmed)) return
    onChange({ ...data, skills: [...skills, trimmed] })
    setSkillInput('')
  }

  return (
    <div className="space-y-3 pt-2">
      <div>
        <label className="wf-label mb-1 block">Tên nhóm</label>
        <input type="text" placeholder="VD: Backend, DevOps, Frontend" value={data.group_name ?? ''} onChange={(e) => onChange({ ...data, group_name: e.target.value })} className="w-full rounded border border-wf-border px-3 py-2 text-sm focus:outline-none focus:border-wf-blue" />
      </div>
      <div>
        <label className="wf-label mb-1 block">Kỹ năng</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Thêm kỹ năng, Enter để xác nhận"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
            className="flex-1 rounded border border-wf-border px-3 py-2 text-sm focus:outline-none focus:border-wf-blue"
          />
          <Button size="sm" variant="outline" onClick={addSkill} type="button">Thêm</Button>
        </div>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {skills.map((skill) => (
              <span key={skill} className="flex items-center gap-1 text-xs bg-[rgba(20,110,245,0.08)] text-wf-blue px-2 py-1 rounded">
                {skill}
                <button onClick={() => onChange({ ...data, skills: skills.filter((s) => s !== skill) })} className="hover:text-wf-red">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GenericItemForm({
  data,
  onChange,
}: {
  data: Record<string, unknown>
  onChange: (d: Record<string, unknown>) => void
}) {
  return (
    <div className="space-y-3 pt-2">
      {Object.entries(data).map(([key, value]) => (
        typeof value === 'string' ? (
          <div key={key}>
            <label className="wf-label mb-1 block capitalize">{key.replace(/_/g, ' ')}</label>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange({ ...data, [key]: e.target.value })}
              className="w-full rounded border border-wf-border px-3 py-2 text-sm focus:outline-none focus:border-wf-blue"
            />
          </div>
        ) : null
      ))}
    </div>
  )
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function ItemCard({
  section,
  item,
  profileId,
}: {
  section: ProfileSection
  item: ProfileItem
  profileId: string
}) {
  const { updateItem, saveItem, removeItem } = useProfileEditorStore()
  const [expanded, setExpanded] = useState(false)
  const [localData, setLocalData] = useState<Record<string, unknown>>(
    item.data as Record<string, unknown>
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    updateItem(section.id, item.id, { data: localData as typeof item.data })
    try {
      await saveItem(section.id, item.id)
      toast.success('Đã lưu')
      setExpanded(false)
    } catch {
      toast.error('Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Xóa mục này?')) return
    try {
      await removeItem(section.id, item.id)
    } catch {
      toast.error('Không thể xóa')
    }
  }

  const renderForm = () => {
    switch (section.type) {
      case 'work_experience':
        return <WorkExpItemForm data={localData as Partial<WorkExperienceItemData>} onChange={(d) => setLocalData(d as Record<string, unknown>)} />
      case 'education':
        return <EducationItemForm data={localData as Partial<EducationItemData>} onChange={(d) => setLocalData(d as Record<string, unknown>)} />
      case 'skills':
        return <SkillsItemForm data={localData as Partial<SkillsItemData>} onChange={(d) => setLocalData(d as Record<string, unknown>)} />
      default:
        return <GenericItemForm data={localData} onChange={setLocalData} />
    }
  }

  return (
    <div className="rounded border border-wf-border bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <GripVertical className="h-4 w-4 text-wf-gray-300 shrink-0 cursor-grab" />
        <span className="flex-1 text-sm text-wf-gray-700 truncate">
          {getItemSummary(section, item)}
        </span>
        <button
          onClick={() => updateItem(section.id, item.id, { is_visible: !item.is_visible })}
          className="text-wf-gray-300 hover:text-wf-gray-700 transition-colors"
          title={item.is_visible ? 'Ẩn' : 'Hiện'}
        >
          {item.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={handleRemove}
          className="text-wf-gray-300 hover:text-wf-red transition-colors"
          title="Xóa"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-wf-gray-500 hover:text-wf-black transition-colors"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Expanded form */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-wf-border bg-[#fafafa]">
          {renderForm()}
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setExpanded(false)} className="text-sm text-wf-gray-500 px-3">Hủy</button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Lưu
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Section Block ────────────────────────────────────────────────────────────

function SectionBlock({
  section,
  profileId,
}: {
  section: ProfileSection
  profileId: string
}) {
  const { updateSection, removeSection, addItem } = useProfileEditorStore()
  const [collapsed, setCollapsed] = useState(false)
  const [addingItem, setAddingItem] = useState(false)

  const handleToggleVisible = async () => {
    updateSection(section.id, { is_visible: !section.is_visible })
    // Auto-save visibility
    try {
      const { profileApi } = await import('@/lib/api')
      await profileApi.updateSection(profileId, section.id, { is_visible: !section.is_visible })
    } catch { /* silent */ }
  }

  const handleDelete = async () => {
    if (!confirm(`Xóa section "${section.title}"? Tất cả mục bên trong cũng sẽ bị xóa.`)) return
    try {
      await removeSection(section.id)
    } catch {
      toast.error('Không thể xóa section')
    }
  }

  const handleAddItem = async () => {
    setAddingItem(true)
    try {
      await addItem(section.id, { data: buildBlankItemData(section.type) as typeof section.items[0]['data'] })
    } catch {
      toast.error('Không thể thêm mục')
    } finally {
      setAddingItem(false)
    }
  }

  return (
    <div className="rounded-lg border border-wf-border bg-white overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-wf-border bg-[#fafafa]">
        <GripVertical className="h-4 w-4 text-wf-gray-300 shrink-0 cursor-grab" />
        <span className="flex-1 text-sm font-semibold text-wf-black">{section.title}</span>
        <button onClick={handleToggleVisible} className="text-wf-gray-300 hover:text-wf-gray-700 transition-colors" title={section.is_visible ? 'Ẩn section' : 'Hiện section'}>
          {section.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button onClick={handleDelete} className="text-wf-gray-300 hover:text-wf-red transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setCollapsed((v) => !v)} className="text-wf-gray-500 hover:text-wf-black transition-colors">
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {/* Items */}
      {!collapsed && (
        <div className="p-3 space-y-2">
          {(section.items ?? []).map((item) => (
            <ItemCard key={item.id} section={section} item={item} profileId={profileId} />
          ))}
          <button
            onClick={handleAddItem}
            disabled={addingItem}
            className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-wf-border py-2 text-xs text-wf-gray-500 hover:border-wf-blue hover:text-wf-blue transition-colors"
          >
            {addingItem ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Thêm mục
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Personal Info Section ────────────────────────────────────────────────────

function PersonalInfoSection({ profileId }: { profileId: string }) {
  const { profile, updateMeta, saveMeta, isDirty, isSaving } = useProfileEditorStore()
  if (!profile) return null

  const fields = [
    { key: 'full_name', label: 'Họ và tên', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Điện thoại', type: 'tel' },
    { key: 'location', label: 'Địa điểm', type: 'text' },
    { key: 'linkedin_url', label: 'LinkedIn URL', type: 'url' },
    { key: 'github_url', label: 'GitHub URL', type: 'url' },
    { key: 'website_url', label: 'Website URL', type: 'url' },
  ] as const

  return (
    <div className="rounded-lg border border-wf-border bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-wf-border bg-[#fafafa]">
        <span className="text-sm font-semibold text-wf-black">Thông tin cá nhân</span>
        {isDirty && (
          <Button size="sm" onClick={saveMeta} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Lưu
          </Button>
        )}
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Profile meta */}
        <div className="md:col-span-2">
          <label className="wf-label mb-1 block">Tên profile *</label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => updateMeta({ name: e.target.value })}
            className="w-full rounded border border-wf-border px-3 py-2 text-sm font-medium focus:outline-none focus:border-wf-blue"
          />
        </div>
        <div className="md:col-span-2">
          <label className="wf-label mb-1 block">Vị trí mục tiêu</label>
          <input
            type="text"
            placeholder="VD: Software Engineer"
            value={profile.role_target ?? ''}
            onChange={(e) => updateMeta({ role_target: e.target.value })}
            className="w-full rounded border border-wf-border px-3 py-2 text-sm focus:outline-none focus:border-wf-blue"
          />
        </div>
        {fields.map(({ key, label, type }) => (
          <div key={key}>
            <label className="wf-label mb-1 block">{label}</label>
            <input
              type={type}
              value={(profile[key as keyof typeof profile] as string) ?? ''}
              onChange={(e) => updateMeta({ [key]: e.target.value })}
              className="w-full rounded border border-wf-border px-3 py-2 text-sm focus:outline-none focus:border-wf-blue"
            />
          </div>
        ))}
        <div className="md:col-span-2">
          <label className="wf-label mb-1 block">Tóm tắt bản thân</label>
          <textarea
            rows={3}
            value={profile.summary ?? ''}
            onChange={(e) => updateMeta({ summary: e.target.value })}
            className="w-full rounded border border-wf-border px-3 py-2 text-sm focus:outline-none focus:border-wf-blue resize-none"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfileEditorPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const {
    profile,
    sections,
    isDirty,
    isSaving,
    lastSavedAt,
    loadProfile,
    reset,
  } = useProfileEditorStore()

  const [pageLoading, setPageLoading] = useState(true)
  const [showAddSection, setShowAddSection] = useState(false)
  const { addSection } = useProfileEditorStore()

  useEffect(() => {
    reset()
    loadProfile(params.id)
      .catch(() => { toast.error('Không thể tải profile'); router.push('/profiles') })
      .finally(() => setPageLoading(false))
    return () => reset()
  }, [params.id])

  const handleAddSection = async (type: ProfileSectionType, title: string) => {
    try {
      await addSection({ type, title })
    } catch {
      toast.error('Không thể thêm section')
      throw new Error('Add section failed')
    }
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-wf-gray-300" />
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-wf-border bg-white/95 backdrop-blur px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/profiles')}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-[rgba(0,0,0,0.05)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-wf-gray-700" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-semibold text-wf-black truncate">{profile.name}</h1>
          {profile.role_target && (
            <p className="text-xs text-wf-gray-500 truncate">{profile.role_target}</p>
          )}
        </div>

        <SaveStatus isDirty={isDirty} isSaving={isSaving} lastSavedAt={lastSavedAt} />

        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(`/cv/new?profile_id=${profile.id}`)}
          className="gap-1.5 shrink-0"
        >
          <FileText className="h-3.5 w-3.5" />
          Tạo CV từ profile
        </Button>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        {/* Personal info */}
        <PersonalInfoSection profileId={profile.id} />

        {/* Sections */}
        {sections.map((section) => (
          <SectionBlock key={section.id} section={section} profileId={profile.id} />
        ))}

        {/* Add section */}
        <button
          onClick={() => setShowAddSection(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-wf-border py-3 text-sm text-wf-gray-500 hover:border-wf-blue hover:text-wf-blue transition-colors bg-white"
        >
          <Plus className="h-4 w-4" />
          Thêm section mới
        </button>
      </div>

      <AddSectionModal
        open={showAddSection}
        onClose={() => setShowAddSection(false)}
        onAdd={handleAddSection}
      />
    </div>
  )
}
