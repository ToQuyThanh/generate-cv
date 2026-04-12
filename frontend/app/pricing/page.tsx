'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Crown, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { paymentApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import { cn } from '@/lib/utils'
import type { PaymentMethod, PaymentPlan } from '@/types'

const PLANS: {
  id: PaymentPlan
  label: string
  price: string
  priceNote: string
  perDay: string
  popular?: boolean
}[] = [
  {
    id: 'weekly',
    label: 'Gói Tuần',
    price: '29.000đ',
    priceNote: '/ 7 ngày',
    perDay: '~4.100đ/ngày',
  },
  {
    id: 'monthly',
    label: 'Gói Tháng',
    price: '79.000đ',
    priceNote: '/ 30 ngày',
    perDay: '~2.600đ/ngày',
    popular: true,
  },
]

const FEATURES = [
  'Xuất PDF không watermark',
  'Gợi ý AI không giới hạn',
  'Phân tích Job Description bằng AI',
  'Truy cập toàn bộ template premium',
  'Hỗ trợ ưu tiên qua chat',
]

const METHODS: { id: PaymentMethod; label: string; logo: string }[] = [
  { id: 'vnpay', label: 'VNPay', logo: '🏦' },
  { id: 'momo', label: 'MoMo', logo: '💜' },
]

export default function PricingPage() {
  const router = useRouter()
  const { subscription } = useAuthStore()
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan>('monthly')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('momo')
  const [loading, setLoading] = useState(false)

  const currentPlan = subscription?.plan ?? 'free'

  const handleCheckout = async () => {
    if (currentPlan !== 'free') {
      toast.info('Bạn đã có gói đang hoạt động')
      return
    }
    setLoading(true)
    try {
      const res = await paymentApi.create({ plan: selectedPlan, method: selectedMethod })
      window.location.href = res.payment_url
    } catch {
      toast.error('Không tạo được link thanh toán. Thử lại sau.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-2">
        <Button variant="ghost" size="sm" className="gap-2 mb-6" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Button>
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Crown className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Nâng cấp tài khoản</h1>
          <p className="text-muted-foreground">
            Mở khoá toàn bộ tính năng, tạo CV chuyên nghiệp hơn
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 grid lg:grid-cols-2 gap-8">
        {/* Left — Plan + Method selection */}
        <div className="space-y-5">
          {/* Plan picker */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Chọn gói</p>
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  'relative w-full rounded-xl border-2 p-4 text-left transition-all',
                  selectedPlan === plan.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                )}
              >
                {plan.popular && (
                  <span className="absolute top-3 right-3 text-[10px] font-semibold rounded-full bg-primary text-primary-foreground px-2 py-0.5">
                    Phổ biến nhất
                  </span>
                )}
                <p className="font-semibold">{plan.label}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.priceNote}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{plan.perDay}</p>
              </button>
            ))}
          </div>

          {/* Method picker */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Phương thức thanh toán</p>
            <div className="flex gap-3">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-xl border-2 p-3 font-medium text-sm transition-all',
                    selectedMethod === m.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  <span>{m.logo}</span> {m.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full h-12 text-base gap-2"
            onClick={handleCheckout}
            disabled={loading || currentPlan !== 'free'}
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang chuyển hướng...</>
              : currentPlan !== 'free'
              ? '✓ Bạn đã có gói Premium'
              : `Thanh toán qua ${selectedMethod === 'momo' ? 'MoMo' : 'VNPay'}`
            }
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Thanh toán an toàn. Kích hoạt ngay sau khi xác nhận.
          </p>
        </div>

        {/* Right — Feature list */}
        <div className="rounded-2xl border bg-card p-6 space-y-4 h-fit">
          <p className="font-semibold">Bao gồm tất cả tính năng:</p>
          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
          <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            💡 Gói tự động hết hạn sau thời gian. Không tự gia hạn.
          </div>
        </div>
      </div>
    </div>
  )
}
