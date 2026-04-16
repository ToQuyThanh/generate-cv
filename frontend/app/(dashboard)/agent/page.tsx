'use client'

import { useState } from 'react'
import { AgentLayout } from '@/components/agent/AgentLayout'
import { ParseResultView } from '@/components/agent/ParseResultView'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sparkles, RefreshCcw } from 'lucide-react'
import { useAgentStore } from '@/store/agentStore'
import { toast } from 'sonner'

export default function AgentEditPage() {
  const [profileJson, setProfileJson] = useState('')
  const [instruction, setInstruction] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  
  const { 
    editedProfile, 
    isEditing, 
    editError, 
    editProfile, 
    resetEdit 
  } = useAgentStore()

  const handleEdit = async () => {
    if (!profileJson.trim() || !instruction.trim()) {
      toast.error('Please provide both profile and instruction')
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
      await editProfile(profile, instruction)
      toast.success('Profile edited successfully!')
    } catch {
      toast.error(editError || 'Failed to edit profile')
    }
  }

  const handleClear = () => {
    setProfileJson('')
    setInstruction('')
    setParseError(null)
    resetEdit()
  }

  return (
    <AgentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">AI Edit Profile</h2>
            <p className="text-gray-500">
              Edit your profile using natural language instructions
            </p>
          </div>
          <div className="flex items-center gap-2 text-purple-600 bg-purple-50 px-4 py-2 rounded-lg">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium">AI Powered</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div className="bg-white border rounded-xl p-4">
              <label className="text-sm font-medium">Profile (JSON)</label>
              <Textarea
                value={profileJson}
                onChange={(e) => setProfileJson(e.target.value)}
                placeholder="Paste your profile JSON here..."
                rows={12}
                className="font-mono text-sm mt-2"
              />
              {parseError && (
                <p className="text-red-500 text-sm mt-2">{parseError}</p>
              )}
            </div>

            <div className="bg-white border rounded-xl p-4">
              <label className="text-sm font-medium">Instruction</label>
              <Textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="E.g., Rewrite the summary for a senior DevOps role..."
                rows={4}
                className="mt-2"
              />
            </div>

            <Button
              onClick={handleEdit}
              disabled={isEditing || !profileJson.trim() || !instruction.trim()}
              className="w-full"
            >
              {isEditing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Editing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Apply Edit
                </>
              )}
            </Button>

            {editError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                <p className="font-medium">Error</p>
                <p className="text-sm">{editError}</p>
              </div>
            )}
          </div>

          {/* Result Section */}
          <div className="space-y-4">
            {editedProfile ? (
              <div className="bg-white border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Edited Profile</h3>
                  <Button variant="outline" size="sm" onClick={handleClear}>
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
                <ParseResultView profile={editedProfile} />
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
                <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  Enter your profile and instruction, then click Apply Edit
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AgentLayout>
  )
}
