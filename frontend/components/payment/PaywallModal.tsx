'use client'

import { useRouter } from 'next/navigation'
import { Crown, Sparkles, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onClose: () => void
}

const BENEFITS = [
  { icon: FileText, text: 'Xuất PDF không watermark' },
  { icon: Sparkles, text: 'Gợi ý AI không giới hạn' },
  { icon: Crown, text: 'Truy cập template premium' },
]

export function PaywallModal({ open, onClose }: Props) {
  const router = useRouter()
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl bg-background border shadow-xl p-6 space-y-5 animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Crown className="h-7 w-7 text-primary" />
          </div>
        </div>

        {/* Headline */}
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold">Nâng cấp tài khoản</h2>
          <p className="text-sm text-muted-foreground">
            Mở khoá toàn bộ tính năng để tạo CV đẳng cấp
          </p>
        </div>

        {/* Benefits */}
        <ul className="space-y-2">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              {text}
            </li>
          ))}
        </ul>

        {/* Pricing hint */}
        <p className="text-center text-xs text-muted-foreground">
          Chỉ từ <span className="font-semibold text-foreground">49.000đ/tuần</span>
        </p>

        {/* CTA */}
        <div className="space-y-2">
          <Button className="w-full" onClick={() => { onClose(); router.push('/pricing') }}>
            Xem các gói
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={onClose}>
            Để sau
          </Button>
        </div>
      </div>
    </div>
  )
}
