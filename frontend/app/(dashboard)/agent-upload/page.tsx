'use client'

import { useState } from 'react'
import { UploadDropzone } from '@/components/agent/UploadDropzone'
import { ParseResultView } from '@/components/agent/ParseResultView'
import { AgentLayout } from '@/components/agent/AgentLayout'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, RefreshCcw, Save } from 'lucide-react'
import { useAgentStore } from '@/store/agentStore'
import { toast } from 'sonner'

export default function AgentUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [prompt, setPrompt] = useState('')
  
  const { 
    parsedProfile, 
    isParsing, 
    parseError, 
    parseCV, 
    reset 
  } = useAgentStore()

  const handleParse = async () => {
    if (!file) return
    try {
      await parseCV(file, prompt)
      toast.success('CV parsed successfully!')
    } catch {
      toast.error(parseError || 'Failed to parse CV')
    }
  }

  const handleClear = () => {
    setFile(null)
    setPrompt('')
    reset()
  }

  const handleSaveToProfile = () => {
    // TODO: Implement saving parsed profile to user's profile
    toast.success('Profile saved!')
  }

  return (
    <AgentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Parse CV to Profile</h2>
            <p className="text-gray-500">
              Upload your CV file and convert it to structured profile data
            </p>
          </div>
          <div className="flex items-center gap-2 text-purple-600 bg-purple-50 px-4 py-2 rounded-lg">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium">AI Powered</span>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white border rounded-xl p-6">
          <UploadDropzone
            onFileSelect={setFile}
            selectedFile={file}
            onClear={handleClear}
            isLoading={isParsing}
          />

          {/* Optional Prompt */}
          {file && !parsedProfile && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Optional Instructions (Prompt)
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="E.g., Focus on my leadership experience and technical skills..."
                  className="w-full mt-1 p-3 border rounded-lg text-sm"
                  rows={3}
                />
              </div>
              
              <Button
                onClick={handleParse}
                disabled={isParsing}
                className="w-full"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Parse CV
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Result Display */}
        {parsedProfile && (
          <div className="bg-white border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Parsed Profile</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClear}>
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Parse Another
                </Button>
                <Button onClick={handleSaveToProfile}>
                  <Save className="w-4 h-4 mr-2" />
                  Save to Profile
                </Button>
              </div>
            </div>
            <ParseResultView profile={parsedProfile} />
          </div>
        )}
      </div>
    </AgentLayout>
  )
}
