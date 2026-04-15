'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, ArrowRight, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store'
import { userApi } from '@/lib/api'

// ─── Backend redirect schema ────────────────────────────────────────────────
// VNPayCallback → /payment/result?status=success|failed&txn=<txnID>
// (không phải vnp_ResponseCode hay resultCode raw — backend đã xử lý rồi)

type ResultState = 'loading' | 'success' | 'failed'

function PaymentResultContent() {
  const router = useRouter()
  const params = useSearchParams()
  const { setSubscription } = useAuthStore()
  const [state, setState] = useState<ResultState>('loading')
  const [txnId, setTxnId] = useState<string | null>(null)

  useEffect(() => {
    // Backend redirect: ?status=success|failed&txn=<txnID>
    const status = params.get('status')
    const txn = params.get('txn')

    setTxnId(txn)

    const isSuccess = status === 'success'
    setState(isSuccess ? 'success' : 'failed')

    if (isSuccess) {
      // Refresh subscription từ API để store có giá trị mới nhất
      userApi
        .getSubscription()
        .then((sub) => setSubscription(sub))
        .catch(() => {
          // Không block UI nếu lỗi — subscription sẽ được refresh lần sau
        })
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
    <div className="flex h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="max-w-sm w-full rounded-2xl border bg-card shadow-xl p-8 text-center space-y-5">
        {/* Icon */}
        <div className="flex justify-center">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full ${
              isSuccess ? 'bg-green-100' : 'bg-destructive/10'
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            ) : (
              <XCircle className="h-8 w-8 text-destructive" />
            )}
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold">
            {isSuccess ? 'Thanh toán thành công! 🎉' : 'Thanh toán thất bại'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSuccess
              ? 'Tài khoản đã được nâng cấp. Bạn có thể sử dụng toàn bộ tính năng Premium ngay bây giờ.'
              : 'Giao dịch không thành công. Vui lòng thử lại hoặc chọn phương thức thanh toán khác.'}
          </p>
          {/* Mã giao dịch — chỉ hiện khi có */}
          {txnId && (
            <p className="text-xs text-muted-foreground font-mono bg-muted rounded px-2 py-1 mt-2">
              Mã GD: {txnId}
            </p>
          )}
        </div>

        {/* CTA */}
        {isSuccess ? (
          <Button
            className="w-full gap-2"
            onClick={() => router.push('/dashboard')}
          >
            Vào Dashboard <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <div className="space-y-2">
            <Button className="w-full gap-2" onClick={() => router.push('/pricing')}>
              <RotateCcw className="h-4 w-4" /> Thử lại
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => router.push('/dashboard')}
            >
              Về Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PaymentResultContent />
    </Suspense>
  )
}
