'use client'

import { ArrowLeft, Sparkles, Loader2, CheckCheck, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useEditorStore } from '@/store'
import { EditorPanel } from './EditorPanel'
import { CVPreview } from './CVPreview'
import { AIAssistPanel } from './AIAssistPanel'
import { ExportButton } from './ExportButton'
import { useAutoSave } from '@/lib/hooks/useAutoSave'

export function EditorLayout() {
  const router = useRouter()
  const { cvData, isDirty, isSaving, lastSavedAt, isAIPanelOpen, setAIPanelOpen } = useEditorStore()
  useAutoSave()

  if (!cvData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background flex-col">
      {/* Topbar */}
      <header className="shrink-0 h-12 border-b flex items-center px-4 gap-3 bg-background z-10">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <input
          className="text-sm font-medium bg-transparent border-none outline-none flex-1 max-w-[240px] truncate"
          value={cvData.title}
          onChange={(e) => useEditorStore.getState().updateTitle(e.target.value)}
        />
        {/* Save status */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
          {isSaving ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> Đang lưu...</>
          ) : isDirty ? (
            <><Clock className="h-3 w-3" /> Chưa lưu</>
          ) : lastSavedAt ? (
            <><CheckCheck className="h-3 w-3 text-green-500" /> Đã lưu</>
          ) : null}
        </div>
        <Button
          variant={isAIPanelOpen ? 'default' : 'outline'}
          size="sm"
          className="gap-2 h-8"
          onClick={() => setAIPanelOpen(!isAIPanelOpen)}
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI
        </Button>
        <ExportButton cvId={cvData.id} />
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — editor */}
        <div className="w-[400px] shrink-0 border-r flex flex-col overflow-hidden">
          <EditorPanel />
        </div>

        {/* Center — preview */}
        <div className="flex-1 overflow-y-auto bg-muted/30 flex items-start justify-center p-6">
          <CVPreview />
        </div>

        {/* Right — AI panel (collapsible) */}
        {isAIPanelOpen && (
          <div className="w-80 shrink-0 border-l overflow-y-auto">
            <AIAssistPanel />
          </div>
        )}
      </div>
    </div>
  )
}
