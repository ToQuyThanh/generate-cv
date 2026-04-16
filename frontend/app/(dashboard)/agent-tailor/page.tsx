'use client'

import { useState } from 'react'
import { AgentLayout } from '@/components/agent/AgentLayout'
import { ParseResultView } from '@/components/agent/ParseResultView'
import { KeywordReportCard } from '@/components/agent/KeywordReportCard'
import { RelevanceScoreCard } from '@/components/agent/RelevanceScoreCard'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Target, RefreshCcw } from 'lucide-react'
import { useAgentStore } from '@/store/agentStore'
import { toast } from 'sonner'

export default function AgentTailorPage() {
  const [profileJson, setProfileJson] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [userPrompt, setUserPrompt] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  
  const {
    tailoredProfile,
    keywordReport,
    relevanceScore,
    isTailoring,
    tailorError,
    tailorProfile,
    resetTailor,
  } = useAgentStore()

  const handleTailor = async () => {
    if (!profileJson.trim() || !jobDescription.trim()) {
      toast.error('Please provide both profile and job description')
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
      await tailorProfile(profile, jobDescription, userPrompt)
      toast.success('Profile tailored successfully!')
    } catch {
      toast.error(tailorError || 'Failed to tailor profile')
    }
  }

  const handleClear = () => {
    setProfileJson('')
    setJobDescription('')
    setUserPrompt('')
    setParseError(null)
    resetTailor()
  }

  return (
    <AgentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Tailor CV to Job</h2>
            <p className="text-gray-500">
              Optimize your CV for a specific job description
            </p>
          </div>
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
            <Target className="w-5 h-5" />
            <span className="text-sm font-medium">Job Matching</span>
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
                rows={8}
                className="font-mono text-sm mt-2"
              />
              {parseError && (
                <p className="text-red-500 text-sm mt-2">{parseError}</p>
              )}
            </div>

            <div className="bg-white border rounded-xl p-4">
              <label className="text-sm font-medium">Job Description</label>
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
                rows={8}
                className="mt-2"
              />
            </div>

            <div className="bg-white border rounded-xl p-4">
              <label className="text-sm font-medium">Optional Instructions</label>
              <Textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="E.g., Emphasize cloud experience..."
                rows={3}
                className="mt-2"
              />
            </div>

            <Button
              onClick={handleTailor}
              disabled={isTailoring || !profileJson.trim() || !jobDescription.trim()}
              className="w-full"
            >
              {isTailoring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Tailoring...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Tailor CV
                </>
              )}
            </Button>

            {tailorError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                <p className="font-medium">Error</p>
                <p className="text-sm">{tailorError}</p>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            {relevanceScore !== null && (
              <RelevanceScoreCard score={relevanceScore} />
            )}
            
            {keywordReport && (
              <KeywordReportCard report={keywordReport} />
            )}

            {tailoredProfile && (
              <div className="bg-white border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Tailored Profile</h3>
                  <Button variant="outline" size="sm" onClick={handleClear}>
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
                <ParseResultView profile={tailoredProfile} />
              </div>
            )}

            {!tailoredProfile && !isTailoring && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
                <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  Enter your profile and job description, then click Tailor CV
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AgentLayout>
  )
}
