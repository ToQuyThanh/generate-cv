'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Crown, Loader2, Pipette, LayoutGrid, Star, Columns2, Image, Briefcase, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cvApi, apiClient } from '@/lib/api'
import { getBlankSections } from '@/lib/cv-template'
import { CVMiniPreview } from '@/components/cv/CVMiniPreview'
import { useAuthStore } from '@/store'
import { cn } from '@/lib/utils'
import { getAllTemplates, getDefaultColor } from '@/templates/registry'
import type { Template } from '@/types'

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

const PREVIEW_SECTIONS = getBlankSections()

// Các tab filter giống ảnh mẫu
const FILTER_TABS = [
  { key: 'all',           label: 'Tất cả',      icon: LayoutGrid },
  { key: 'simple',        label: 'Đơn giản',    icon: Star },
  { key: 'modern',        label: 'Hiện đại',    icon: Briefcase },
  { key: 'single-column', label: 'Một cột',     icon: Columns2 },
  { key: 'with-photo',    label: 'Có ảnh',      icon: Image },
  { key: 'professional',  label: 'Chuyên nghiệp', icon: Briefcase },
  { key: 'two-column',    label: 'Hai cột',     icon: Columns2 },
  { key: 'premium',       label: 'Premium',     icon: Crown },
] as const

type FilterKey = typeof FILTER_TABS[number]['key']

// Mô tả template blank
const BLANK_DESCRIPTION = 'Bắt đầu từ tờ giấy trắng, tự do thiết kế theo phong cách riêng.'

export default function NewCVPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { subscription } = useAuthStore()

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

  useEffect(() => {
    const localTemplates = getAllTemplates().map((entry) => ({
      id: entry.meta.id,
      name: entry.meta.name,
      thumbnail_url: null,
      preview_url: null,
      is_premium: entry.meta.isPremium,
      tags: entry.meta.tags,
      description: entry.meta.description,
    } satisfies Template & { description?: string }))

    // Lưu descriptions từ local registry
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
      .catch(() => {
        setTemplates([BLANK_TEMPLATE, ...localTemplates])
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId)
    if (templateId !== 'blank') {
      setSelectedColor(getDefaultColor(templateId))
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const cv = await cvApi.create({
        template_id: selectedTemplate,
        color_theme: selectedColor,
        title: 'CV của tôi',
        sections: getBlankSections(),
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

  return (
    <div className="min-h-screen bg-background">

      {/* ── Sticky header ────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base font-semibold">Tạo CV mới</h1>
            <p className="text-xs text-muted-foreground truncate">
              {selectedEntry && selectedEntry.id !== 'blank'
                ? `Template: ${selectedEntry.name} · Màu: ${selectedColor}`
                : 'Chọn template và màu chủ đạo'}
            </p>
          </div>
        </div>
        <Button onClick={handleCreate} disabled={creating} className="gap-2 shrink-0">
          {creating && <Loader2 className="h-4 w-4 animate-spin" />}
          Tạo CV
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Màu chủ đạo ──────────────────────────────────────────────── */}
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
                  !COLOR_PRESETS.includes(selectedColor)
                    ? 'ring-2 ring-foreground scale-110'
                    : 'hover:scale-105',
                )}
                style={{
                  background: `conic-gradient(from 0deg, hsl(0,80%,55%), hsl(60,80%,55%), hsl(120,80%,45%), hsl(180,80%,45%), hsl(240,80%,60%), hsl(300,80%,55%), hsl(360,80%,55%))`,
                }}
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

        {/* ── Template section ──────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold mb-4">Chọn template</h2>

          {/* Filter tabs — scrollable ngang */}
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
                    {/* Card */}
                    <button
                      onClick={() => {
                        if (locked) {
                          toast.info('Nâng cấp để dùng template premium')
                          return
                        }
                        handleSelectTemplate(tpl.id)
                      }}
                      className={cn(
                        'relative rounded-xl border-2 overflow-hidden text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full',
                        isSelected
                          ? 'border-primary shadow-md'
                          : 'border-border hover:border-primary/40',
                        locked && 'opacity-60'
                      )}
                    >
                      {/* Thumbnail */}
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

                      {/* Footer */}
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

                      {/* Selected checkmark */}
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="h-5 w-5 text-primary fill-background" />
                        </div>
                      )}

                      {/* Lock overlay */}
                      {locked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
                          <div className="flex flex-col items-center gap-1">
                            <Crown className="h-5 w-5 text-amber-500" />
                            <span className="text-xs font-medium text-amber-600">Premium</span>
                          </div>
                        </div>
                      )}
                    </button>

                    {/* Description bên dưới card */}
                    {desc && (
                      <p className="text-xs text-muted-foreground leading-relaxed px-0.5">
                        {desc}
                      </p>
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
      </div>
    </div>
  )
}

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
