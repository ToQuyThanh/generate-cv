'use client'

import { useState, useCallback, useEffect } from 'react'
import { Check, X, RefreshCw, Info } from 'lucide-react'
import { toast } from 'sonner'

import { useEditorStore } from '@/store'
import { Button } from '@/components/ui/button'
import { serializeToMarkdown, parseMarkdown } from '@/lib/cv-markdown'

const SYNTAX_GUIDE = `# PERSONAL
full_name: Họ và tên
job_title: Vị trí ứng tuyển
email: email@example.com
phone: 0912 345 678
location: Hà Nội, Việt Nam
website: https://yoursite.com
linkedin: linkedin.com/in/you
github: github.com/you

# SUMMARY
Nội dung giới thiệu bản thân...

# EXPERIENCE
## Vị trí — Công ty
location: Hà Nội
start_date: 2022-01
end_date: 2024-03
is_current: false
description: Mô tả công việc
achievements: Thành tích 1 | Thành tích 2
tech_stack: Go | PostgreSQL | Docker

# EDUCATION
## Tên trường — Bằng cấp
field: Công nghệ thông tin
start_date: 2018-09
end_date: 2022-06
gpa: 3.8 / 4.0
description: Ghi chú

# SKILLS
- React: 4/5
- TypeScript: 5/5
- Go: 3/5

# PROJECTS
## Tên dự án — Vai trò
url: https://github.com/you/project
start_date: 2023-01
end_date: 2023-06
description: Mô tả dự án
tech_stack: React | Node.js | AWS
highlights: Xử lý 1M req/ngày | Giảm 40% latency

# CERTIFICATIONS
## Tên chứng chỉ
issuer: Google
date: 2023-06
url: https://cert.google.com/...
credential_id: ABC123

# LANGUAGES
- Tiếng Anh: professional
- Tiếng Nhật: basic`

export function MarkdownEditor() {
  const { cvData, updateSection } = useEditorStore()
  const [markdown, setMarkdown] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [isDirtyLocal, setIsDirtyLocal] = useState(false)

  // Khởi tạo markdown từ cvData khi mount hoặc khi section thay đổi từ bên ngoài
  const syncFromStore = useCallback(() => {
    if (!cvData) return
    setMarkdown(serializeToMarkdown(cvData.sections))
    setIsDirtyLocal(false)
  }, [cvData])

  useEffect(() => {
    syncFromStore()
  }, []) // chỉ sync lần đầu mount — tránh overwrite khi user đang gõ

  const handleChange = (value: string) => {
    setMarkdown(value)
    setIsDirtyLocal(true)
  }

  const handleApply = () => {
    if (!cvData) return

    try {
      const patches = parseMarkdown(markdown)

      if (patches.length === 0) {
        toast.error('Không nhận ra section nào. Kiểm tra lại định dạng.')
        return
      }

      let appliedCount = 0
      for (const patch of patches) {
        const section = cvData.sections.find((s) => s.type === patch.sectionType)
        if (section) {
          updateSection(section.id, { data: patch.data })
          appliedCount++
        }
      }

      setIsDirtyLocal(false)
      toast.success(`Đã áp dụng ${appliedCount} section từ markdown`)
    } catch {
      toast.error('Lỗi parse markdown. Kiểm tra lại định dạng.')
    }
  }

  const handleReset = () => {
    syncFromStore()
    toast.info('Đã khôi phục từ dữ liệu hiện tại')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/20 shrink-0">
        <span className="text-xs font-medium text-muted-foreground flex-1">
          Chỉnh sửa toàn bộ CV bằng Markdown
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setShowGuide((v) => !v)}
          title="Xem hướng dẫn cú pháp"
        >
          <Info className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleReset}
          title="Khôi phục từ dữ liệu hiện tại"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={() => { setMarkdown(''); setIsDirtyLocal(false) }}
          title="Xóa toàn bộ"
          disabled={!markdown}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={handleApply}
          disabled={!isDirtyLocal}
        >
          <Check className="h-3.5 w-3.5" />
          Áp dụng
        </Button>
      </div>

      {/* Guide overlay */}
      {showGuide && (
        <div className="mx-3 mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-700">Cú pháp Markdown CV</span>
            <button
              onClick={() => setShowGuide(false)}
              className="text-blue-400 hover:text-blue-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <pre className="text-[10px] leading-relaxed text-blue-800 whitespace-pre-wrap overflow-auto max-h-48 font-mono">
            {SYNTAX_GUIDE}
          </pre>
          <button
            onClick={() => { setMarkdown(SYNTAX_GUIDE); setIsDirtyLocal(true); setShowGuide(false) }}
            className="mt-2 text-[10px] text-blue-600 underline hover:text-blue-800"
          >
            Dùng mẫu này
          </button>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden p-3">
        <textarea
          className="w-full h-full resize-none rounded-md border bg-background px-3 py-2 text-xs font-mono leading-relaxed outline-none focus:ring-1 focus:ring-primary"
          value={markdown}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`# PERSONAL\nfull_name: Nguyễn Văn A\n...\n\n# SUMMARY\nGiới thiệu bản thân...\n\n# EXPERIENCE\n## Vị trí — Công ty\n...`}
          spellCheck={false}
        />
      </div>

      {/* Status bar */}
      <div className="px-3 py-1.5 border-t bg-muted/10 shrink-0 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">
          {markdown.split('\n').length} dòng · {markdown.length} ký tự
        </span>
        {isDirtyLocal && (
          <span className="text-[10px] text-amber-500 font-medium ml-auto">
            Chưa áp dụng — nhấn Áp dụng để cập nhật CV
          </span>
        )}
      </div>
    </div>
  )
}
