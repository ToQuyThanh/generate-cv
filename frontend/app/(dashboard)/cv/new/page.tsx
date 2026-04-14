'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Crown,
  Loader2,
  Pipette,
  LayoutGrid,
  Star,
  Columns2,
  Image,
  Briefcase,
  ShieldCheck,
  Database,
  Plus,
  User,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cvApi, apiClient } from '@/lib/api'
import { getBlankSections, getSampleSections } from '@/lib/cv-template'
import { CVMiniPreview } from '@/components/cv/CVMiniPreview'
import { useAuthStore, useProfileStore } from '@/store'
import { cn } from '@/lib/utils'
import { getAllTemplates, getDefaultColor } from '@/templates/registry'
import type { Template, CVProfileListItem } from '@/types'

// ── Constants ───────────────────────────────────────────────────────────────

const BLANK_TEMPLATE: Template = {
  id: 'blank',
  name: 'Trống',
  thumbnail_url: null,
  preview_url: null,
  is_premium: false,
  tags: [],
}

const COLOR_PRESETS = [
  '#1a56db', '#0ea5e9', '#7c3aed', '#db2777',
  '#059669', '#d97706', '#dc2626', '#374151',
]

const PREVIEW_SECTIONS = getSampleSections()

const FILTER_TABS = [
  { key: 'all',           label: 'Tất cả',        icon: LayoutGrid },
  { key: 'simple',        label: 'Đơn giản',      icon: Star },
  { key: 'modern',        label: 'Hiện đại',      icon: Briefcase },
  { key: 'single-column', label: 'Một cột',       icon: Columns2 },
  { key: 'with-photo',    label: 'Có ảnh',        icon: Image },
  { key: 'professional',  label: 'Chuyên nghiệp', icon: Briefcase },
  { key: 'two-column',    label: 'Hai cột',       icon: Columns2 },
  { key: 'premium',       label: 'Premium',       icon: Crown },
] as const

type FilterKey = typeof FILTER_TABS[number]['key']
type Step = 'profile' | 'template'

const BLANK_DESCRIPTION = 'Bắt đầu từ tờ giấy trắng, tự do thiết kế theo phong cách riêng.'

// ── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'profile',  label: 'Chọn profile' },
    { key: 'template', label: 'Chọn template' },
  ]
  const currentIdx = steps.findIndex((s) => s.key === step)

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, idx) => (
        <div key={s.key} className="flex items-center gap-2">
          <div className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors',
            idx < currentIdx
              ? 'bg-wf-blue text-white'
              : idx === currentIdx
              ? 'bg-wf-blue text-white ring-2 ring-offset-1 ring-wf-blue'
              : 'bg-wf-border text-wf-gray-500'
          )}>
            {idx < currentIdx ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
          </div>
          <span className={cn(
            'text-sm',
            idx === currentIdx ? 'font-semibold text-wf-black' : 'text-wf-gray-500'
          )}>
            {s.label}
          </span>
          {idx < steps.length - 1 && <span className="text-wf-gray-300 mx-1">→</span>}
        </div>
      ))}
    </div>
  )
}

// ── Profile Selector step ────────────────────────────────────────────────────

function ProfileSelectorStep({
  profiles,
  loading,
  selectedId,
  onSelect,
  onSkip,
  onCreateNew,
}: {
  profiles: CVProfileListItem[]
  loading: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
  onSkip: () => void
  onCreateNew: () => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold mb-1">Chọn bộ dữ liệu CV</h2>
        <p className="text-xs text-wf-gray-500">
          Chọn profile để tự động điền thông tin vào CV, hoặc bỏ qua để tạo CV trống.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-wf-gray-300" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* No profile option */}
          <button
            onClick={() => onSelect(null)}
            className={cn(
              'rounded-lg border-2 p-4 text-left transition-all',
              selectedId === null
                ? 'border-wf-blue shadow-sm'
                : 'border-wf-border hover:border-wf-blue/40'
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[rgba(90,90,90,0.08)]">
                <Database className="h-4 w-4 text-wf-gray-500" />
              </div>
              <span className="text-sm font-semibold text-wf-black">Không dùng profile</span>
            </div>
            <p className="text-xs text-wf-gray-500">Tạo CV trống, nhập thông tin trực tiếp trong editor</p>
            {selectedId === null && (
              <div className="flex justify-end mt-2">
                <CheckCircle2 className="h-4 w-4 text-wf-blue" />
              </div>
            )}
          </button>

          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => onSelect(profile.id)}
              className={cn(
                'rounded-lg border-2 p-4 text-left transition-all',
                selectedId === profile.id
                  ? 'border-wf-blue shadow-sm'
                  : 'border-wf-border hover:border-wf-blue/40'
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[rgba(20,110,245,0.08)]">
                  <User className="h-4 w-4 text-wf-blue" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-wf-black truncate">{profile.name}</p>
                  {profile.role_target && (
                    <p className="text-xs text-wf-gray-500 truncate">{profile.role_target}</p>
                  )}
                </div>
              </div>
              {profile.is_default && (
                <Badge className="text-[10px] px-1.5 py-0.5 bg-[rgba(20,110,245,0.1)] text-wf-blue border-0 uppercase tracking-wide">
                  Mặc định
                </Badge>
              )}
              {selectedId === profile.id && (
                <div className="flex justify-end mt-2">
                  <CheckCircle2 className="h-4 w-4 text-wf-blue" />
                </div>
              )}
            </button>
          ))}

          {/* Create new profile */}
          <button
            onClick={onCreateNew}
            className="rounded-lg border-2 border-dashed border-wf-border p-4 text-left hover:border-wf-blue hover:text-wf-blue transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[rgba(20,110,245,0.06)]">
                <Plus className="h-4 w-4 text-wf-blue" />
              </div>
              <span className="text-sm font-medium text-wf-gray-700">Tạo profile mới</span>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Template thumbnail ───────────────────────────────────────────────────────

function BlankThumbnail() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-muted/30">
      <div className="w-16 h-2 rounded bg-muted-foreground/20" />
      <div className="w-12 h-1.5 rounded bg-muted-foreground/15" />
      <div className="mt-3 flex flex-col gap-1.5 w-20">
        <div className="w-full h-1 rounded bg-muted-foreground/15" />
        <div className="w-4/5 h-1 rounded bg-muted-foreground/10" />
        <div className="w-5/6 h-1 rounded bg-muted-foreground/10" />
      </div>
      <div className="mt-2 flex flex-col gap-1.5 w-20">
        <div className="w-full h-1 rounded bg-muted-foreground/15" />
        <div className="w-3/4 h-1 rounded bg-muted-foreground/10" />
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function NewCVPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { subscription } = useAuthStore()
  const { profiles, fetchProfiles, loading: profilesLoading } = useProfileStore()

  // Steps
  const [step, setStep] = useState<Step>('profile')
  const preselectedProfileId = searchParams.get('profile_id')
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    preselectedProfileId ?? null
  )

  // Template
  const [templates, setTemplates] = useState<Template[]>([BLANK_TEMPLATE])
  const [descriptions, setDescriptions] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')

  const initialTemplate = searchParams.get('template') ?? 'blank'
  const [selectedTemplate, setSelectedTemplate] = useState<string>(initialTemplate)
  const [selectedColor, setSelectedColor] = useState(
    initialTemplate !== 'blank' ? getDefaultColor(initialTemplate) : '#1a56db'
  )
  const colorInputRef = useRef<HTMLInputElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  const isPaid = subscription?.plan !== 'free'

  // Load profiles
  useEffect(() => {
    fetchProfiles().catch(() => { /* silent */ })
  }, [fetchProfiles])

  // If profile_id preselected, jump to template step
  useEffect(() => {
    if (preselectedProfileId) setStep('template')
  }, [preselectedProfileId])

  // Load templates
  useEffect(() => {
    const localTemplates = getAllTemplates().map((entry) => ({
      id: entry.meta.id,
      name: entry.meta.name,
      thumbnail_url: null,
      preview_url: null,
      is_premium: entry.meta.isPremium,
      tags: entry.meta.tags,
    } satisfies Template))

    const descMap: Record<string, string> = {}
    getAllTemplates().forEach((entry) => {
      if (entry.meta.description) descMap[entry.meta.id] = entry.meta.description
    })
    setDescriptions(descMap)

    apiClient
      .get<{ data: Template[] }>('/templates')
      .then((r) => {
        const apiMap = new Map(r.data.data.map((t) => [t.id, t]))
        const merged = localTemplates.map((lt) => ({
          ...lt,
          ...(apiMap.has(lt.id) ? { is_premium: apiMap.get(lt.id)!.is_premium } : {}),
        }))
        setTemplates([BLANK_TEMPLATE, ...merged])
      })
      .catch(() => { setTemplates([BLANK_TEMPLATE, ...localTemplates]) })
      .finally(() => setLoading(false))
  }, [])

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId)
    if (templateId !== 'blank') setSelectedColor(getDefaultColor(templateId))
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const cv = await cvApi.create({
        template_id: selectedTemplate,
        color_theme: selectedColor,
        title: 'CV của tôi',
        // Khi có profile_id, không truyền sections — backend sẽ tạo profile_snapshot
        // và editorStore sẽ populate sections từ snapshot khi mở editor.
        // Khi không có profile_id, dùng blank sections như bình thường.
        sections: selectedProfileId ? undefined : getBlankSections(),
        profile_id: selectedProfileId ?? undefined,
      })
      toast.success('Đã tạo CV!')
      router.push(`/cv/${cv.id}`)
    } catch {
      toast.error('Không thể tạo CV. Vui lòng thử lại.')
      setCreating(false)
    }
  }

  const visibleTemplates = templates.filter((t) => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'premium') return t.is_premium
    return t.tags.includes(activeFilter)
  })

  const selectedEntry = templates.find((t) => t.id === selectedTemplate)
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId)

  return (
    <div className="min-h-screen bg-background">

      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => {
            if (step === 'template') setStep('profile')
            else router.back()
          }} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base font-semibold">Tạo CV mới</h1>
            <p className="text-xs text-muted-foreground truncate">
              {step === 'profile'
                ? 'Chọn bộ dữ liệu cho CV'
                : selectedEntry && selectedEntry.id !== 'blank'
                ? `Template: ${selectedEntry.name} · Màu: ${selectedColor}`
                : 'Chọn template và màu chủ đạo'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StepIndicator step={step} />
          {step === 'profile' ? (
            <Button onClick={() => setStep('template')} className="gap-1.5 shrink-0" size="sm">
              Tiếp theo <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={creating} className="gap-2 shrink-0">
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Tạo CV
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Step 1: Profile ── */}
        {step === 'profile' && (
          <ProfileSelectorStep
            profiles={profiles}
            loading={profilesLoading}
            selectedId={selectedProfileId}
            onSelect={setSelectedProfileId}
            onSkip={() => { setSelectedProfileId(null); setStep('template') }}
            onCreateNew={() => router.push('/profiles')}
          />
        )}

        {/* ── Step 2: Template ── */}
        {step === 'template' && (
          <>
            {/* Profile summary banner */}
            {selectedProfile && (
              <div className="flex items-center gap-3 rounded-lg border border-wf-border bg-[rgba(20,110,245,0.04)] px-4 py-3">
                <Database className="h-4 w-4 text-wf-blue shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-wf-black">
                    Profile: <span className="text-wf-blue">{selectedProfile.name}</span>
                  </p>
                  {selectedProfile.role_target && (
                    <p className="text-xs text-wf-gray-500 truncate">{selectedProfile.role_target}</p>
                  )}
                </div>
                <button
                  onClick={() => setStep('profile')}
                  className="text-xs text-wf-gray-500 hover:text-wf-blue transition-colors shrink-0"
                >
                  Thay đổi
                </button>
              </div>
            )}

            {/* Màu chủ đạo */}
            <section>
              <h2 className="text-sm font-semibold mb-3">Màu chủ đạo</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      'h-8 w-8 rounded-full ring-offset-2 transition-all',
                      selectedColor === color ? 'ring-2 ring-foreground scale-110' : 'hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Chọn màu ${color}`}
                  />
                ))}
                <div className="relative">
                  <button
                    onClick={() => colorInputRef.current?.click()}
                    className={cn(
                      'h-8 w-8 rounded-full ring-offset-2 transition-all border flex items-center justify-center',
                      !COLOR_PRESETS.includes(selectedColor) ? 'ring-2 ring-foreground scale-110' : 'hover:scale-105',
                    )}
                    style={{ background: `conic-gradient(from 0deg, hsl(0,80%,55%), hsl(60,80%,55%), hsl(120,80%,45%), hsl(180,80%,45%), hsl(240,80%,60%), hsl(300,80%,55%), hsl(360,80%,55%))` }}
                    title="Tùy chỉnh màu"
                    aria-label="Mở color picker"
                  >
                    <Pipette className="h-3.5 w-3.5 text-white drop-shadow" />
                  </button>
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="absolute inset-0 opacity-0 w-0 h-0 pointer-events-none"
                    tabIndex={-1}
                    aria-hidden
                  />
                </div>
                {!COLOR_PRESETS.includes(selectedColor) && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: selectedColor }} />
                    <span className="font-mono">{selectedColor}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Template section */}
            <section>
              <h2 className="text-sm font-semibold mb-4">Chọn template</h2>

              {/* Filter tabs */}
              <div
                ref={tabsRef}
                className="flex gap-1 overflow-x-auto pb-2 mb-6 scrollbar-none border-b"
              >
                {FILTER_TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveFilter(key)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                      activeFilter === key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Template grid */}
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {visibleTemplates.map((tpl) => {
                    const isBlank = tpl.id === 'blank'
                    const locked = tpl.is_premium && !isPaid
                    const isSelected = selectedTemplate === tpl.id
                    const desc = isBlank ? BLANK_DESCRIPTION : descriptions[tpl.id]

                    return (
                      <div key={tpl.id} className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            if (locked) { toast.info('Nâng cấp để dùng template premium'); return }
                            handleSelectTemplate(tpl.id)
                          }}
                          className={cn(
                            'relative rounded-xl border-2 overflow-hidden text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full',
                            isSelected ? 'border-primary shadow-md' : 'border-border hover:border-primary/40',
                            locked && 'opacity-60'
                          )}
                        >
                          <div className="h-48 overflow-hidden bg-white">
                            {isBlank ? (
                              <BlankThumbnail />
                            ) : (
                              <CVMiniPreview
                                sections={PREVIEW_SECTIONS}
                                colorTheme={selectedColor}
                                templateId={tpl.id}
                                containerWidth={210}
                                gap={0}
                              />
                            )}
                          </div>

                          <div className="px-2.5 py-2 flex items-center justify-between gap-1 border-t bg-card">
                            <span className="text-xs font-medium truncate">{tpl.name}</span>
                            {isBlank ? (
                              <Badge variant="secondary" className="text-xs shrink-0">Mặc định</Badge>
                            ) : tpl.is_premium ? (
                              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 shrink-0 text-xs">
                                <Crown className="h-2.5 w-2.5" /> Pro
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs shrink-0 text-green-700 border-green-300">Free</Badge>
                            )}
                          </div>

                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle2 className="h-5 w-5 text-primary fill-background" />
                            </div>
                          )}

                          {locked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
                              <div className="flex flex-col items-center gap-1">
                                <Crown className="h-5 w-5 text-amber-500" />
                                <span className="text-xs font-medium text-amber-600">Premium</span>
                              </div>
                            </div>
                          )}
                        </button>

                        {desc && (
                          <p className="text-xs text-muted-foreground leading-relaxed px-0.5">{desc}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {!loading && visibleTemplates.length === 0 && (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  Không có template nào trong danh mục này
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
