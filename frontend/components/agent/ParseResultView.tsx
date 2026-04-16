'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, User, Briefcase, GraduationCap, Wrench, FileText, Award, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ParseResultViewProps {
  profile: Record<string, unknown>
}

const sectionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  personal: User,
  summary: FileText,
  experience: Briefcase,
  education: GraduationCap,
  skills: Wrench,
  certifications: Award,
  languages: Globe,
}

export function ParseResultView({ profile }: ParseResultViewProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['personal', 'summary'])

  const toggleSection = (key: string) => {
    setExpandedSections(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    )
  }

  const renderValue = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) return <span className="text-gray-400">-</span>
    if (typeof value === 'string') return <span>{value}</span>
    if (typeof value === 'number') return <span>{value}</span>
    if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-gray-400">Empty</span>
      return (
        <ul className="space-y-2">
          {value.map((item, index) => (
            <li key={index} className="bg-gray-50 p-2 rounded">
              {renderValue(item)}
            </li>
          ))}
        </ul>
      )
    }
    if (typeof value === 'object') {
      return (
        <div className="space-y-1 pl-4 border-l-2 border-gray-200">
          {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-gray-500 font-medium capitalize">{k}:</span>
              <div className="flex-1">{renderValue(v)}</div>
            </div>
          ))}
        </div>
      )
    }
    return <span>{String(value)}</span>
  }

  return (
    <div className="space-y-3">
      {Object.entries(profile).map(([key, value]) => {
        const isExpanded = expandedSections.includes(key)
        const Icon = sectionIcons[key] || FileText

        return (
          <div key={key} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection(key)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
              <Icon className="w-5 h-5 text-gray-500" />
              <span className="font-medium capitalize text-gray-700">{key.replace(/_/g, ' ')}</span>
            </button>
            {isExpanded && (
              <div className="px-4 py-4">
                {renderValue(value)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
