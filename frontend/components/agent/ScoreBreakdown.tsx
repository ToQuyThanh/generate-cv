'use client'

import type { ScoreBreakdown as ScoreBreakdownType } from '@/types'

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownType
}

const dimensions = [
  { key: 'completeness', label: 'Completeness', description: 'All essential sections filled' },
  { key: 'relevance', label: 'Relevance', description: 'Matches job requirements' },
  { key: 'impact', label: 'Impact', description: 'Quantified achievements' },
  { key: 'presentation', label: 'Presentation', description: 'Formatting and readability' },
  { key: 'ats_optimized', label: 'ATS Optimized', description: 'Parsable by ATS systems' },
] as const

export function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  return (
    <div className="bg-white border rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Score Breakdown</h3>
      
      <div className="space-y-4">
        {dimensions.map(({ key, label, description }) => {
          const score = breakdown[key as keyof ScoreBreakdownType]
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="font-medium text-gray-700">{label}</span>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
                <span className="font-semibold text-gray-900">{score}/100</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
