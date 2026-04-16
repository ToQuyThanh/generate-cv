'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Upload, 
  Edit3, 
  Target, 
  BarChart3, 
  Zap,
  ArrowLeft,
} from 'lucide-react'

const tabs = [
  { id: 'upload', label: 'Parse CV', icon: Upload, href: '/agent-upload' },
  { id: 'edit', label: 'AI Edit', icon: Edit3, href: '/agent' },
  { id: 'tailor', label: 'Tailor to JD', icon: Target, href: '/agent-tailor' },
  { id: 'score', label: 'Score', icon: BarChart3, href: '/agent-score' },
]

export function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <div className="h-6 w-px bg-gray-300" />
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl font-semibold">AI CV Agent</h1>
          </div>
          <span className="ml-auto text-sm text-gray-500">
            Powered by Profile Processing Agent
          </span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <nav className="w-48 flex-shrink-0 space-y-1">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </Link>
              )
            })}
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
