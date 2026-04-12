'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Crown, Loader2, Pipette } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cvApi, apiClient } from '@/lib/api'
import { getBlankSections } from '@/lib/cv-template'
import { CVMiniPreview } from '@/components/cv/CVMiniPreview'
import { useAuthStore } from '@/store'
import { cn } from '@/lib/utils'
import type { Template } from '@/types'

// Template "Blank" luôn hiển thị đầu tiên — fallback khi API trả rỗng hoặc lỗi
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

// Sections dùng cho preview thumbnail của tất cả template
// (preview tĩnh — không phụ thuộc data user nhập)
const PREVIEW_SECTIONS = getBlankSections()

export default function NewCVPage() {
  const router = useRouter()
  const { subscription } = useAuthStore()
  const [templates, setTemplates] = useState<Template[]>([BLANK_TEMPLATE])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank')
  const [selectedColor, setSelectedColor] = useState('#1a56db')
  const colorInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    apiClient
      .get<{ data: Template[] }>('/templates')
      .then((r) => setTemplates([BLANK_TEMPLATE, ...r.data.data]))
      .catch(() => {
        // Giữ nguyên [BLANK_TEMPLATE] — user vẫn có thể tạo CV
        toast.error('Không tải được danh sách template')
      })
      .finally(() => setLoading(false))
  }, [])

  const isPaid = subscription?.plan !== 'free'

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-base font-semibold">Chọn template</h1>
            <p className="text-xs text-muted-foreground">Chọn mẫu CV và màu chủ đạo</p>
          </div>
        </div>
        <Button onClick={handleCreate} disabled={creating} className="gap-2">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Dùng template này
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Color picker */}
        <section>
          <h2 className="text-sm font-medium mb-3">Màu chủ đạo</h2>
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

            {/* Icon color picker — ẩn input thật, trigger bằng icon */}
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
                  background: !COLOR_PRESETS.includes(selectedColor)
                    ? `conic-gradient(from 0deg, hsl(0,80%,55%), hsl(60,80%,55%), hsl(120,80%,45%), hsl(180,80%,45%), hsl(240,80%,60%), hsl(300,80%,55%), hsl(360,80%,55%))`
                    : `conic-gradient(from 0deg, hsl(0,80%,55%), hsl(60,80%,55%), hsl(120,80%,45%), hsl(180,80%,45%), hsl(240,80%,60%), hsl(300,80%,55%), hsl(360,80%,55%))`,
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

            {/* Hiển thị màu đang chọn nếu là custom */}
            {!COLOR_PRESETS.includes(selectedColor) && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: selectedColor }} />
                <span className="font-mono">{selectedColor}</span>
              </div>
            )}
          </div>
        </section>

        {/* Templates */}
        <section>
          <h2 className="text-sm font-medium mb-3">Templates</h2>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {templates.map((tpl) => {
                const isBlank = tpl.id === 'blank'
                const locked = tpl.is_premium && !isPaid
                const isSelected = selectedTemplate === tpl.id
                return (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      if (locked) {
                        toast.info('Nâng cấp để dùng template premium')
                        return
                      }
                      setSelectedTemplate(tpl.id)
                    }}
                    className={cn(
                      'relative rounded-xl border-2 overflow-hidden text-left transition-all',
                      isSelected
                        ? 'border-primary shadow-md'
                        : 'border-border hover:border-primary/40',
                      locked && 'opacity-70'
                    )}
                  >
                    {/* Thumbnail — CVMiniPreview thật */}
                    <div className="h-44 overflow-hidden bg-white flex items-start justify-center">
                      <CVMiniPreview
                        sections={PREVIEW_SECTIONS}
                        colorTheme={selectedColor}
                        containerWidth={isBlank ? 210 : 210}
                      />
                    </div>

                    {/* Footer */}
                    <div className="p-2.5 flex items-center justify-between gap-1 border-t">
                      <span className="text-xs font-medium truncate">{tpl.name}</span>
                      {isBlank ? (
                        <Badge variant="secondary" className="text-xs shrink-0">Mặc định</Badge>
                      ) : tpl.is_premium ? (
                        <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 shrink-0">
                          <Crown className="h-2.5 w-2.5" /> Pro
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs shrink-0">Free</Badge>
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
                      <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                        <Crown className="h-6 w-6 text-amber-500" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
