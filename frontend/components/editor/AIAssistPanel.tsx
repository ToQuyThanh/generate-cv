'use client'

import { useState } from 'react'
import { Sparkles, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { aiApi } from '@/lib/api'
import { useEditorStore, useAuthStore } from '@/store'
import { cn } from '@/lib/utils'
import type { AIAnalyzeJDResponse } from '@/types'

export function AIAssistPanel() {
  const { cvData, setAIPanelOpen } = useEditorStore()
  const { subscription } = useAuthStore()
  const isPaid = subscription?.plan !== 'free'

  const [jd, setJD] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AIAnalyzeJDResponse | null>(null)

  const handleAnalyze = async () => {
    if (!isPaid) { toast.info('Nâng cấp gói để dùng AI phân tích JD'); return }
    if (!cvData || !jd.trim()) return
    setAnalyzing(true)
    setResult(null)
    try {
      const res = await aiApi.analyzeJD({ cv_id: cvData.id, job_description: jd })
      setResult(res)
    } catch {
      toast.error('AI gặp lỗi, thử lại sau')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">AI Trợ lý</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAIPanelOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!isPaid && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
            ✨ Nâng cấp để dùng AI không giới hạn
          </div>
        )}

        {/* JD Analyzer */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Phân tích Job Description
          </p>
          <textarea
            className="w-full min-h-[140px] resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            placeholder="Dán nội dung JD vào đây để AI phân tích mức độ phù hợp với CV của bạn..."
            value={jd}
            onChange={(e) => setJD(e.target.value)}
          />
          <Button
            className="w-full gap-2"
            size="sm"
            onClick={handleAnalyze}
            disabled={analyzing || !jd.trim()}
          >
            {analyzing
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang phân tích...</>
              : <><Sparkles className="h-3.5 w-3.5" /> Phân tích JD</>
            }
          </Button>
        </section>

        {/* Result */}
        {result && (
          <section className="space-y-3">
            {/* Match score */}
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Mức độ phù hợp</span>
                <span
                  className={cn(
                    'font-bold text-base',
                    result.match_score >= 70 ? 'text-green-600' :
                    result.match_score >= 40 ? 'text-amber-600' : 'text-destructive'
                  )}
                >
                  {result.match_score}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    result.match_score >= 70 ? 'bg-green-500' :
                    result.match_score >= 40 ? 'bg-amber-500' : 'bg-destructive'
                  )}
                  style={{ width: `${result.match_score}%` }}
                />
              </div>
            </div>

            {/* Keywords match */}
            {result.keywords.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Kỹ năng phù hợp
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.keywords.map((kw) => (
                    <span key={kw} className="px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing keywords */}
            {result.missing_keywords.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium flex items-center gap-1 text-amber-600">
                  <AlertCircle className="h-3.5 w-3.5" /> Cần bổ sung
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.missing_keywords.map((kw) => (
                    <span key={kw} className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gợi ý cải thiện</p>
                <ul className="space-y-1.5">
                  {result.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
