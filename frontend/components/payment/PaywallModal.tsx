'use client'

import { useRouter } from 'next/navigation'
import { Crown, Sparkles, FileText, X, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onClose: () => void
}

const BENEFITS = [
  { icon: FileText,  text: 'Xuất PDF không watermark' },
  { icon: Sparkles,  text: 'Gợi ý AI không giới hạn' },
  { icon: Crown,     text: 'Truy cập template premium' },
]

export function PaywallModal({ open, onClose }: Props) {
  const router = useRouter()
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-lg border border-wf-border bg-white shadow-wf p-6 space-y-5 animate-fade-in">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded text-wf-gray-300 hover:bg-[rgba(0,0,0,0.05)] hover:text-wf-black transition-colors"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-[rgba(20,110,245,0.08)]">
            <Crown className="h-6 w-6 text-wf-blue" />
          </div>
        </div>

        {/* Headline */}
        <div className="text-center space-y-1.5">
          <p className="wf-label">Premium</p>
          <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-wf-black">
            Nâng cấp tài khoản
          </h2>
          <p className="text-sm text-wf-gray-500 leading-relaxed">
            Mở khoá toàn bộ tính năng để tạo CV đẳng cấp
          </p>
        </div>

        {/* Benefits */}
        <ul className="space-y-2.5">
          {BENEFITS.map(({ text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-wf-gray-700">
              <CheckCircle2 className="h-4 w-4 text-wf-blue shrink-0" />
              {text}
            </li>
          ))}
        </ul>

        {/* Price hint */}
        <div className="rounded border border-wf-border bg-[#fafafa] px-3 py-2 text-center">
          <p className="text-[11px] uppercase tracking-[0.6px] font-semibold text-wf-gray-300">
            Chỉ từ{' '}
            <span className="text-wf-black">49.000đ / tuần</span>
          </p>
        </div>

        {/* CTAs */}
        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={() => { onClose(); router.push('/pricing') }}
          >
            Xem các gói
          </Button>
          <Button
            variant="ghost"
            className="w-full text-wf-gray-500"
            onClick={onClose}
          >
            Để sau
          </Button>
        </div>
      </div>
    </div>
  )
}
