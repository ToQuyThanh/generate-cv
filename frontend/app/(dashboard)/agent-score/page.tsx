'use client'

import { useState } from 'react'
import { AgentLayout } from '@/components/agent/AgentLayout'
import { RelevanceScoreCard } from '@/components/agent/RelevanceScoreCard'
import { ScoreBreakdown } from '@/components/agent/ScoreBreakdown'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, BarChart3, RefreshCcw } from 'lucide-react'
import { useAgentStore } from '@/store/agentStore'
import { toast } from 'sonner'

export default function AgentScorePage() {
  const [profileJson, setProfileJson] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [userPrompt, setUserPrompt] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  
  const {
    scoreResult,
    isScoring,
    scoreError,
    scoreProfile,
    resetScore,
  } = useAgentStore()

  const handleScore = async () => {
    if (!profileJson.trim()) {
      toast.error('Please provide a profile to score')
      return
    }

    let profile: Record<string, unknown>
    try {
      profile = JSON.parse(profileJson)
      setParseError(null)
    } catch {
      setParseError('Invalid JSON format')
      toast.error('Invalid JSON format')
      return
    }

    try {
      await scoreProfile(profile, jobDescription || undefined, userPrompt || undefined)
      toast.success('Profile scored successfully!')
    } catch {
      toast.error(scoreError || 'Failed to score profile')
    }
  }

  const handleClear = () => {
    setProfileJson('')
    setJobDescription('')
    setUserPrompt('')
    setParseError(null)
    resetScore()
  }

  return (
    <AgentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Score Your CV</h2>
            <p className="text-gray-500">
              Get detailed scoring across 5 dimensions
            </p>
          </div>
          <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm font-medium">5 Dimensions</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div className="bg-white border rounded-xl p-4">
              <label className="text-sm font-medium">Your Profile (JSON)</label>
              <Textarea
                value={profileJson}
                onChange={(e) => setProfileJson(e.target.value)}
                placeholder="Paste your profile JSON here..."
                rows={10}
                className="font-mono text-sm mt-2"
              />
              {parseError && (
                <p className="text-red-500 text-sm mt-2">{parseError}</p>
              )}
            </div>

            <div className="bg-white border rounded-xl p-4">
              <label className="text-sm font-medium">Job Description (Optional)</label>
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste job description for context-aware scoring..."
                rows={6}
                className="mt-2"
              />
            </div>

            <div className="bg-white border rounded-xl p-4">
              <label className="text-sm font-medium">Optional Instructions</label>
              <Textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="E.g., Focus on technical leadership skills..."
                rows={3}
                className="mt-2"
              />
            </div>

            <Button
              onClick={handleScore}
              disabled={isScoring || !profileJson.trim()}
              className="w-full"
            >
              {isScoring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scoring...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Score Profile
                </>
              )}
            </Button>

            {scoreError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                <p className="font-medium">Error</p>
                <p className="text-sm">{scoreError}</p>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            {scoreResult && (
              <>
                <RelevanceScoreCard score={scoreResult.overall_score} />
                <ScoreBreakdown breakdown={scoreResult.breakdown} />
                
                {scoreResult.recommendations.length > 0 && (
                  <div className="bg-white border rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
                    <ul className="space-y-2">
                      {scoreResult.recommendations.map((rec, index) => (
                        <li key={index} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          <span className="text-gray-700">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button variant="outline" className="w-full" onClick={handleClear}>
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Score Another
                </Button>
              </>
            )}

            {!scoreResult && !isScoring && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  Enter your profile and click Score Profile to see results
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AgentLayout>
  )
}
