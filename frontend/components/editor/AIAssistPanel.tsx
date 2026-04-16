'use client'

import { useState, type ReactNode } from 'react'
import {
  Sparkles, Loader2, X, CheckCircle2, AlertCircle,
  FileSearch, PenLine, Briefcase, RefreshCcw, Copy, Check,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { aiApi } from '@/lib/api'
import { useEditorStore, useAuthStore } from '@/store'
import { cn } from '@/lib/utils'
import type { AIAnalyzeJDResponse } from '@/types'

type TabId = 'analyze' | 'summary' | 'experience' | 'rewrite'

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: 'analyze',    label: 'Phân tích JD',   icon: <FileSearch className="h-3.5 w-3.5" /> },
  { id: 'summary',    label: 'Tóm tắt',         icon: <PenLine className="h-3.5 w-3.5" /> },
  { id: 'experience', label: 'Kinh nghiệm',     icon: <Briefcase className="h-3.5 w-3.5" /> },
  { id: 'rewrite',    label: 'Viết lại',         icon: <RefreshCcw className="h-3.5 w-3.5" /> },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

// ── Tab: Analyze JD ──────────────────────────────────────────────────────────

function AnalyzeTab({ cvId, isPaid }: { cvId: string; isPaid: boolean }) {
  const [jd, setJD] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AIAnalyzeJDResponse | null>(null)

  const handle = async () => {
    if (!isPaid) { toast.info('Nâng cấp gói để dùng AI'); return }
    if (!jd.trim()) return
    setLoading(true); setResult(null)
    try {
      setResult(await aiApi.analyzeJD({ cv_id: cvId, job_description: jd }))
    } catch { toast.error('AI gặp lỗi, thử lại sau') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Dán JD để AI phân tích mức độ phù hợp CV với vị trí ứng tuyển.</p>
      <textarea
        className="w-full min-h-[130px] resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
        placeholder="Dán nội dung Job Description vào đây..."
        value={jd}
        onChange={(e) => setJD(e.target.value)}
      />
      <Button className="w-full gap-2" size="sm" onClick={handle} disabled={loading || !jd.trim()}>
        {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang phân tích...</> : <><Sparkles className="h-3.5 w-3.5" />Phân tích</>}
      </Button>

      {result && (
        <div className="space-y-3 pt-1">
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Mức độ phù hợp</span>
              <span className={cn('font-bold', result.match_score >= 70 ? 'text-green-600' : result.match_score >= 40 ? 'text-amber-600' : 'text-destructive')}>
                {result.match_score}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', result.match_score >= 70 ? 'bg-green-500' : result.match_score >= 40 ? 'bg-amber-500' : 'bg-destructive')}
                style={{ width: `${result.match_score}%` }} />
            </div>
          </div>
          {result.keywords.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3.5 w-3.5" />Kỹ năng phù hợp</p>
              <div className="flex flex-wrap gap-1.5">
                {result.keywords.map((kw) => (
                  <span key={kw} className="px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs">{kw}</span>
                ))}
              </div>
            </div>
          )}
          {result.missing_keywords.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium flex items-center gap-1 text-amber-600"><AlertCircle className="h-3.5 w-3.5" />Cần bổ sung</p>
              <div className="flex flex-wrap gap-1.5">
                {result.missing_keywords.map((kw) => (
                  <span key={kw} className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs">{kw}</span>
                ))}
              </div>
            </div>
          )}
          {result.suggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gợi ý cải thiện</p>
              <ul className="space-y-1.5">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab: Suggest Summary ─────────────────────────────────────────────────────

function SummaryTab({ cvId, isPaid }: { cvId: string; isPaid: boolean }) {
  const { updateSection, cvData } = useEditorStore()
  const [jobTitle, setJobTitle] = useState('')
  const [years, setYears] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  const handle = async () => {
    if (!isPaid) { toast.info('Nâng cấp gói để dùng AI'); return }
    setLoading(true); setResult('')
    try {
      const res = await aiApi.suggestSummary({
        cv_id: cvId,
        job_title: jobTitle || undefined,
        years_experience: years ? parseInt(years) : undefined,
      })
      setResult(res.suggestion)
    } catch { toast.error('AI gặp lỗi, thử lại sau') }
    finally { setLoading(false) }
  }

  const applyToCV = () => {
    if (!cvData || !result) return
    const summarySection = cvData.sections.find((s) => s.type === 'summary')
    if (!summarySection) { toast.error('Chưa có section Tóm tắt trong CV'); return }
    updateSection(summarySection.id, { data: { ...summarySection.data, content: result } })
    toast.success('Đã áp dụng vào CV')
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">AI viết đoạn giới thiệu bản thân phù hợp với CV của bạn.</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Vị trí mục tiêu</Label>
          <input className="w-full h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
            placeholder="Software Engineer" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Số năm KN</Label>
          <input type="number" min={0} max={50}
            className="w-full h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
            placeholder="3" value={years} onChange={(e) => setYears(e.target.value)} />
        </div>
      </div>
      <Button className="w-full gap-2" size="sm" onClick={handle} disabled={loading}>
        {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang tạo...</> : <><Sparkles className="h-3.5 w-3.5" />Gợi ý tóm tắt</>}
      </Button>
      {result && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <p className="text-sm flex-1 leading-relaxed">{result}</p>
            <CopyButton text={result} />
          </div>
          <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={applyToCV}>
            <CheckCircle2 className="h-3.5 w-3.5" />Áp dụng vào CV
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Tab: Suggest Experience ──────────────────────────────────────────────────

function ExperienceTab({ cvId, isPaid }: { cvId: string; isPaid: boolean }) {
  const [company, setCompany] = useState('')
  const [position, setPosition] = useState('')
  const [currentDesc, setCurrentDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  const handle = async () => {
    if (!isPaid) { toast.info('Nâng cấp gói để dùng AI'); return }
    if (!company.trim() || !position.trim()) { toast.error('Nhập tên công ty và vị trí'); return }
    setLoading(true); setResult('')
    try {
      const res = await aiApi.suggestExperience({ cv_id: cvId, company, position, current_description: currentDesc || undefined })
      setResult(res.suggestion)
    } catch { toast.error('AI gặp lỗi, thử lại sau') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">AI cải thiện mô tả công việc với action verbs và thành tích đo lường được.</p>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Công ty *</Label>
            <input className="w-full h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
              placeholder="Google" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Vị trí *</Label>
            <input className="w-full h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
              placeholder="Backend Dev" value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Mô tả hiện tại (tùy chọn)</Label>
          <textarea className="w-full min-h-[80px] resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            placeholder="Phát triển API..." value={currentDesc} onChange={(e) => setCurrentDesc(e.target.value)} />
        </div>
      </div>
      <Button className="w-full gap-2" size="sm" onClick={handle} disabled={loading}>
        {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang tạo...</> : <><Sparkles className="h-3.5 w-3.5" />Cải thiện mô tả</>}
      </Button>
      {result && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <p className="text-sm flex-1 leading-relaxed whitespace-pre-wrap">{result}</p>
            <CopyButton text={result} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Rewrite Section ─────────────────────────────────────────────────────

const TONES = [
  { value: 'professional', label: 'Chuyên nghiệp' },
  { value: 'concise',      label: 'Súc tích' },
  { value: 'impactful',    label: 'Ấn tượng' },
]

function RewriteTab({ cvId, isPaid }: { cvId: string; isPaid: boolean }) {
  const [content, setContent] = useState('')
  const [tone, setTone] = useState<'professional' | 'concise' | 'impactful'>('professional')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  const handle = async () => {
    if (!isPaid) { toast.info('Nâng cấp gói để dùng AI'); return }
    if (!content.trim()) { toast.error('Nhập nội dung cần viết lại'); return }
    setLoading(true); setResult('')
    try {
      const res = await aiApi.rewriteSection({ cv_id: cvId, section_id: 'custom', content, tone })
      setResult(res.suggestion)
    } catch { toast.error('AI gặp lỗi, thử lại sau') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Dán bất kỳ đoạn nào trong CV để AI viết lại theo giọng văn mong muốn.</p>
      <div className="space-y-1">
        <Label className="text-xs">Giọng văn</Label>
        <div className="flex gap-1.5">
          {TONES.map((t) => (
            <button key={t.value} onClick={() => setTone(t.value as typeof tone)}
              className={cn('flex-1 rounded-md border px-2 py-1.5 text-xs transition-all',
                tone === t.value ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/40')}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Nội dung gốc</Label>
        <textarea className="w-full min-h-[110px] resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          placeholder="Dán đoạn text cần viết lại..." value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
      <Button className="w-full gap-2" size="sm" onClick={handle} disabled={loading || !content.trim()}>
        {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang viết lại...</> : <><RefreshCcw className="h-3.5 w-3.5" />Viết lại</>}
      </Button>
      {result && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <p className="text-sm flex-1 leading-relaxed whitespace-pre-wrap">{result}</p>
            <CopyButton text={result} />
          </div>
          <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs"
            onClick={() => { setContent(result); setResult('') }}>
            <RefreshCcw className="h-3.5 w-3.5" />Dùng kết quả này để viết lại tiếp
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Main Panel ───────────────────────────────────────────────────────────────

export function AIAssistPanel() {
  const { cvData, setAIPanelOpen } = useEditorStore()
  const { subscription } = useAuthStore()
  const isPaid = subscription?.plan !== 'free'
  const [activeTab, setActiveTab] = useState<TabId>('analyze')

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

      {/* Tab bar */}
      <div className="shrink-0 border-b flex overflow-x-auto scrollbar-none">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 -mb-[1px] transition-colors shrink-0',
              activeTab === tab.id
                ? 'border-primary text-primary bg-background'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!isPaid && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 mb-4">
            ✨ Nâng cấp gói để dùng AI không giới hạn
          </div>
        )}
        {!cvData ? (
          <p className="text-xs text-muted-foreground text-center py-8">Vui lòng mở CV để sử dụng AI</p>
        ) : (
          <>
            {activeTab === 'analyze'    && <AnalyzeTab    cvId={cvData.id} isPaid={isPaid} />}
            {activeTab === 'summary'    && <SummaryTab    cvId={cvData.id} isPaid={isPaid} />}
            {activeTab === 'experience' && <ExperienceTab cvId={cvData.id} isPaid={isPaid} />}
            {activeTab === 'rewrite'    && <RewriteTab    cvId={cvData.id} isPaid={isPaid} />}
          </>
        )}
      </div>
    </div>
  )
}
