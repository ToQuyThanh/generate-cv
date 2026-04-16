'use client'

import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import type { KeywordReport } from '@/types'

interface KeywordReportCardProps {
  report: KeywordReport
}

export function KeywordReportCard({ report }: KeywordReportCardProps) {
  return (
    <div className="bg-white border rounded-xl p-6 space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-blue-500" />
        Keyword Analysis
      </h3>

      {/* Present Keywords */}
      {report.present.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-700">
              Present ({report.present.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {report.present.map((keyword) => (
              <span
                key={keyword}
                className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Partial Keywords */}
      {report.partial.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-700">
              Partial Match ({report.partial.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {report.partial.map((keyword) => (
              <span
                key={keyword}
                className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing Keywords */}
      {report.missing.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-gray-700">
              Missing ({report.missing.length}) - Consider adding
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {report.missing.map((keyword) => (
              <span
                key={keyword}
                className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
