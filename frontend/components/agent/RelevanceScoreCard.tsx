'use client'

import { cn } from '@/lib/utils'

interface RelevanceScoreCardProps {
  score: number
}

export function RelevanceScoreCard({ score }: RelevanceScoreCardProps) {
  const getScoreColor = (s: number): string => {
    if (s >= 80) return 'text-green-600'
    if (s >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  const getScoreBg = (s: number): string => {
    if (s >= 80) return 'bg-green-500'
    if (s >= 60) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const getScoreLabel = (s: number): string => {
    if (s >= 80) return 'Excellent match'
    if (s >= 60) return 'Good match'
    if (s >= 40) return 'Fair match'
    return 'Poor match'
  }

  return (
    <div className="bg-white border rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Relevance Score</h3>
      
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${score * 2.83} 283`}
              className={cn('transition-all duration-1000', getScoreColor(score))}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('text-2xl font-bold', getScoreColor(score))}>
              {score}
            </span>
          </div>
        </div>
        
        <div>
          <p className={cn('text-lg font-medium', getScoreColor(score))}>
            {getScoreLabel(score)}
          </p>
          <p className="text-sm text-gray-500">
            Your CV matches {score}% of job requirements
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-1000', getScoreBg(score))}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  )
}
