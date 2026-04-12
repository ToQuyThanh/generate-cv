'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { EditorLayout } from '@/components/editor/EditorLayout'
import { cvApi } from '@/lib/api'
import { useEditorStore } from '@/store'

export default function CVEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { setCVData, reset } = useEditorStore()

  useEffect(() => {
    cvApi
      .get(id)
      .then((cv) => setCVData(cv))
      .catch(() => {
        toast.error('Không tìm thấy CV')
        router.replace('/dashboard')
      })

    return () => reset()
  }, [id, setCVData, reset, router])

  return <EditorLayout />
}
