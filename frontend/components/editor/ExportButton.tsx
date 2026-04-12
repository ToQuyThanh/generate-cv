'use client'

import { useState } from 'react'
import { Download, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { cvApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import { PaywallModal } from '@/components/payment/PaywallModal'

interface Props {
  cvId: string
}

type ExportState = 'idle' | 'pending' | 'done' | 'failed'

export function ExportButton({ cvId }: Props) {
  const { subscription } = useAuthStore()
  const isPaid = subscription?.plan !== 'free'
  const [state, setState] = useState<ExportState>('idle')
  const [showPaywall, setShowPaywall] = useState(false)

  const handleExport = async () => {
    if (!isPaid) {
      setShowPaywall(true)
      return
    }
    setState('pending')
    try {
      const { job_id } = await cvApi.exportPDF(cvId)
      // Poll mỗi 2 giây tối đa 60 giây
      let attempts = 0
      const poll = async () => {
        attempts++
        const res = await cvApi.pollExport(cvId, job_id)
        if (res.status === 'done' && res.url) {
          setState('done')
          window.open(res.url, '_blank')
          toast.success('Xuất PDF thành công!')
          setTimeout(() => setState('idle'), 3000)
        } else if (res.status === 'failed' || attempts >= 30) {
          setState('failed')
          toast.error('Xuất PDF thất bại. Thử lại sau.')
          setTimeout(() => setState('idle'), 3000)
        } else {
          setTimeout(poll, 2000)
        }
      }
      setTimeout(poll, 2000)
    } catch {
      setState('failed')
      toast.error('Không thể tạo bản xuất PDF')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const icon = {
    idle: <Download className="h-3.5 w-3.5" />,
    pending: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    done: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
    failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  }[state]

  const label = {
    idle: 'Xuất PDF',
    pending: 'Đang xuất...',
    done: 'Thành công!',
    failed: 'Thử lại',
  }[state]

  return (
    <>
      <Button
        size="sm"
        className="h-8 gap-2"
        onClick={handleExport}
        disabled={state === 'pending'}
        variant={state === 'failed' ? 'destructive' : 'default'}
      >
        {icon}
        {label}
        {!isPaid && (
          <span className="text-[10px] opacity-70 ml-0.5">• Free</span>
        )}
      </Button>
      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} />
    </>
  )
}
