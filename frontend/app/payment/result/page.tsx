'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store'
import { userApi } from '@/lib/api'

type ResultState = 'loading' | 'success' | 'failed'

export default function PaymentResultPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { setSubscription } = useAuthStore()
  const [state, setState] = useState<ResultState>('loading')

  // VNPay trả về ?vnp_ResponseCode=00 khi thành công
  // MoMo trả về ?resultCode=0 khi thành công
  useEffect(() => {
    const vnpCode = params.get('vnp_ResponseCode')
    const momoCode = params.get('resultCode')

    const isSuccess =
      vnpCode === '00' || momoCode === '0'

    setState(isSuccess ? 'success' : 'failed')

    if (isSuccess) {
      // Refresh subscription từ API
      userApi
        .getSubscription()
        .then((sub) => setSubscription(sub))
        .catch(() => {/* Không cần xử lý lỗi ở đây */})
    }
  }, [params, setSubscription])

  if (state === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isSuccess = state === 'success'

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-sm w-full mx-4 rounded-2xl border bg-card shadow-xl p-8 text-center space-y-5">
        <div className="flex justify-center">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${
            isSuccess ? 'bg-green-100' : 'bg-destructive/10'
          }`}>
            {isSuccess
              ? <CheckCircle2 className="h-8 w-8 text-green-600" />
              : <XCircle className="h-8 w-8 text-destructive" />
            }
          </div>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold">
            {isSuccess ? 'Thanh toán thành công! 🎉' : 'Thanh toán thất bại'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSuccess
              ? 'Tài khoản đã được nâng cấp. Bạn có thể sử dụng toàn bộ tính năng Premium ngay bây giờ.'
              : 'Giao dịch không thành công. Vui lòng thử lại hoặc chọn phương thức thanh toán khác.'}
          </p>
        </div>

        {isSuccess ? (
          <Button className="w-full gap-2" onClick={() => router.push('/dashboard')}>
            Vào Dashboard <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <div className="space-y-2">
            <Button className="w-full" onClick={() => router.push('/pricing')}>
              Thử lại
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => router.push('/dashboard')}>
              Về Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
