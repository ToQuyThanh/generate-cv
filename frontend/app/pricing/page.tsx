'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Crown, Loader2, ArrowLeft, Zap } from 'lucide-react'
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
  accentColor: string
}[] = [
  {
    id: 'weekly',
    label: 'Gói Tuần',
    price: '49.000đ',
    priceNote: '/ 7 ngày',
    perDay: '~7.000đ / ngày',
    accentColor: 'var(--wf-purple)',
  },
  {
    id: 'monthly',
    label: 'Gói Tháng',
    price: '149.000đ',
    priceNote: '/ 30 ngày',
    perDay: '~5.000đ / ngày',
    popular: true,
    accentColor: 'var(--wf-blue)',
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
    <div className="min-h-screen bg-white">
      {/* ── Page header ── */}
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-0">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 mb-8 -ml-1"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Button>

        <div className="text-center space-y-3 pb-8 border-b border-wf-border">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded bg-[rgba(20,110,245,0.08)]">
              <Crown className="h-6 w-6 text-wf-blue" />
            </div>
          </div>
          {/* Label */}
          <p className="wf-label">Pricing</p>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-wf-black leading-tight">
            Nâng cấp tài khoản
          </h1>
          <p className="text-base text-wf-gray-500 max-w-sm mx-auto leading-relaxed">
            Mở khoá toàn bộ tính năng, tạo CV chuyên nghiệp hơn
          </p>
        </div>
      </div>

      {/* ── Content grid ── */}
      <div className="max-w-3xl mx-auto px-6 py-8 grid lg:grid-cols-[1fr_320px] gap-8 items-start">

        {/* Left — selectors + CTA */}
        <div className="space-y-6">

          {/* Plan picker */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[1px] text-wf-gray-500">Chọn gói</p>
            {PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.id
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={cn(
                    'relative w-full rounded-lg border-2 p-4 text-left transition-all duration-150',
                    isSelected
                      ? 'border-wf-blue bg-[rgba(20,110,245,0.04)] shadow-wf-sm'
                      : 'border-wf-border bg-white hover:border-[#898989]'
                  )}
                >
                  {plan.popular && (
                    <span className="absolute top-3 right-3 wf-badge" style={{ color: 'var(--wf-blue)' }}>
                      Phổ biến nhất
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-3.5 w-3.5" style={{ color: plan.accentColor }} />
                    <p className="text-[13px] font-semibold text-wf-gray-700">{plan.label}</p>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="text-[26px] font-semibold tracking-[-0.03em] text-wf-black">{plan.price}</span>
                    <span className="text-sm text-wf-gray-300">{plan.priceNote}</span>
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.6px] font-semibold text-wf-gray-300 mt-1">{plan.perDay}</p>
                </button>
              )
            })}
          </div>

          {/* Payment method */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[1px] text-wf-gray-500">Phương thức thanh toán</p>
            <div className="flex gap-3">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-semibold transition-all duration-150',
                    selectedMethod === m.id
                      ? 'border-wf-blue bg-[rgba(20,110,245,0.04)] text-wf-black'
                      : 'border-wf-border bg-white text-wf-gray-500 hover:border-[#898989]'
                  )}
                >
                  <span>{m.logo}</span> {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* CTA */}
          <Button
            className="w-full h-11 text-[15px] font-semibold gap-2"
            onClick={handleCheckout}
            disabled={loading || currentPlan !== 'free'}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Đang chuyển hướng...</>
            ) : currentPlan !== 'free' ? (
              '✓ Bạn đã có gói Premium'
            ) : (
              `Thanh toán qua ${selectedMethod === 'momo' ? 'MoMo' : 'VNPay'}`
            )}
          </Button>

          <p className="text-center text-[11px] uppercase tracking-[0.6px] font-semibold text-wf-gray-300">
            Thanh toán an toàn · Kích hoạt ngay sau khi xác nhận
          </p>
        </div>

        {/* Right — feature list card */}
        <div className="rounded-lg border border-wf-border bg-[#fafafa] p-5 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[1px] text-wf-gray-500">Bao gồm tất cả</p>
          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-wf-gray-700">
                <CheckCircle2 className="h-4 w-4 text-wf-blue shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
          <div className="rounded border border-wf-border bg-white p-3 text-[12px] text-wf-gray-500 leading-relaxed">
            💡 Gói tự động hết hạn sau thời gian. Không tự gia hạn.
          </div>
        </div>
      </div>
    </div>
  )
}
