'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Crown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cvApi, apiClient } from '@/lib/api'
import { useAuthStore } from '@/store'
import { cn } from '@/lib/utils'
import type { Template } from '@/types'

const COLOR_PRESETS = [
  '#1a56db', '#0ea5e9', '#7c3aed', '#db2777',
  '#059669', '#d97706', '#dc2626', '#374151',
]

export default function NewCVPage() {
  const router = useRouter()
  const { subscription } = useAuthStore()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('template_modern_01')
  const [selectedColor, setSelectedColor] = useState('#1a56db')

  useEffect(() => {
    apiClient
      .get<{ data: Template[] }>('/templates')
      .then((r) => setTemplates(r.data.data))
      .catch(() => toast.error('Không tải được danh sách template'))
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
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="h-8 w-8 rounded-full border cursor-pointer"
              title="Tùy chỉnh màu"
            />
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
                    {/* Thumbnail */}
                    <div
                      className="h-44 flex flex-col items-center justify-center gap-2"
                      style={{ backgroundColor: selectedColor + '18' }}
                    >
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: selectedColor }}
                      >
                        <span className="text-white text-xs font-bold">
                          {tpl.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="w-20 space-y-1.5">
                        <div className="h-1.5 rounded-full opacity-40" style={{ backgroundColor: selectedColor }} />
                        <div className="h-1.5 rounded-full w-14 opacity-25" style={{ backgroundColor: selectedColor }} />
                        <div className="h-1.5 rounded-full opacity-25" style={{ backgroundColor: selectedColor }} />
                      </div>
                    </div>
                    {/* Footer */}
                    <div className="p-2.5 flex items-center justify-between gap-1">
                      <span className="text-xs font-medium truncate">{tpl.name}</span>
                      {tpl.is_premium ? (
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
