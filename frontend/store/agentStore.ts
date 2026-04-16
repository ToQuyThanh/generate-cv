import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { agentApi } from '@/lib/api/agent'
import type { 
  TokenUsage, 
  KeywordReport, 
  ScoreBreakdown,
  AgentParseResponse,
  AgentEditResponse,
  AgentTailorResponse,
  AgentScoreResponse,
  AgentPipelineResponse,
} from '@/types'

// State definition
interface AgentState {
  // Parse
  parsedProfile: Record<string, unknown> | null
  isParsing: boolean
  parseError: string | null
  
  // Edit
  editedProfile: Record<string, unknown> | null
  isEditing: boolean
  editError: string | null
  
  // Tailor
  tailoredProfile: Record<string, unknown> | null
  keywordReport: KeywordReport | null
  relevanceScore: number | null
  isTailoring: boolean
  tailorError: string | null
  
  // Score
  scoreResult: AgentScoreResponse | null
  isScoring: boolean
  scoreError: string | null
  
  // Pipeline
  pipelineResult: AgentPipelineResponse | null
  isRunningPipeline: boolean
  pipelineError: string | null
  
  // Token usage tracking
  totalTokenUsage: TokenUsage | null
  
  // Actions
  parseCV: (file: File, prompt?: string) => Promise<void>
  editProfile: (profile: Record<string, unknown>, instruction: string) => Promise<void>
  tailorProfile: (profile: Record<string, unknown>, jd: string, userPrompt?: string) => Promise<void>
  scoreProfile: (profile: Record<string, unknown>, jd?: string, userPrompt?: string) => Promise<void>
  runPipeline: (file: File, jd?: string, prompt?: string) => Promise<void>
  reset: () => void
  resetParse: () => void
  resetEdit: () => void
  resetTailor: () => void
  resetScore: () => void
  resetPipeline: () => void
}

const initialState = {
  // Parse
  parsedProfile: null,
  isParsing: false,
  parseError: null,
  
  // Edit
  editedProfile: null,
  isEditing: false,
  editError: null,
  
  // Tailor
  tailoredProfile: null,
  keywordReport: null,
  relevanceScore: null,
  isTailoring: false,
  tailorError: null,
  
  // Score
  scoreResult: null,
  isScoring: false,
  scoreError: null,
  
  // Pipeline
  pipelineResult: null,
  isRunningPipeline: false,
  pipelineError: null,
  
  // Token usage
  totalTokenUsage: null,
}

export const useAgentStore = create<AgentState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      parseCV: async (file, prompt) => {
        set({ isParsing: true, parseError: null })
        try {
          const response: AgentParseResponse = await agentApi.parse(file, prompt)
          set({ 
            parsedProfile: response.profile, 
            isParsing: false,
            totalTokenUsage: response.usage,
          })
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to parse CV'
          set({ parseError: message, isParsing: false })
          throw error
        }
      },

      editProfile: async (profile, instruction) => {
        set({ isEditing: true, editError: null })
        try {
          const response: AgentEditResponse = await agentApi.edit(profile, instruction)
          set({ 
            editedProfile: response.profile, 
            isEditing: false,
            totalTokenUsage: response.usage,
          })
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to edit profile'
          set({ editError: message, isEditing: false })
          throw error
        }
      },

      tailorProfile: async (profile, jd, userPrompt) => {
        set({ isTailoring: true, tailorError: null })
        try {
          const response: AgentTailorResponse = await agentApi.tailor(profile, jd, userPrompt)
          set({ 
            tailoredProfile: response.profile,
            keywordReport: response.keyword_report,
            relevanceScore: response.relevance_score,
            isTailoring: false,
            totalTokenUsage: response.usage,
          })
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to tailor profile'
          set({ tailorError: message, isTailoring: false })
          throw error
        }
      },

      scoreProfile: async (profile, jd, userPrompt) => {
        set({ isScoring: true, scoreError: null })
        try {
          const response: AgentScoreResponse = await agentApi.score(profile, jd, userPrompt)
          set({ 
            scoreResult: response,
            isScoring: false,
            totalTokenUsage: response.usage,
          })
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to score profile'
          set({ scoreError: message, isScoring: false })
          throw error
        }
      },

      runPipeline: async (file, jd, prompt) => {
        set({ isRunningPipeline: true, pipelineError: null })
        try {
          const response: AgentPipelineResponse = await agentApi.pipeline(file, jd, prompt)
          set({ 
            pipelineResult: response,
            isRunningPipeline: false,
            totalTokenUsage: response.usage,
          })
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to run pipeline'
          set({ pipelineError: message, isRunningPipeline: false })
          throw error
        }
      },

      reset: () => {
        set(initialState)
      },

      resetParse: () => {
        set({ 
          parsedProfile: null, 
          isParsing: false, 
          parseError: null 
        })
      },

      resetEdit: () => {
        set({ 
          editedProfile: null, 
          isEditing: false, 
          editError: null 
        })
      },

      resetTailor: () => {
        set({ 
          tailoredProfile: null,
          keywordReport: null,
          relevanceScore: null,
          isTailoring: false,
          tailorError: null,
        })
      },

      resetScore: () => {
        set({ 
          scoreResult: null,
          isScoring: false,
          scoreError: null,
        })
      },

      resetPipeline: () => {
        set({ 
          pipelineResult: null,
          isRunningPipeline: false,
          pipelineError: null,
        })
      },
    }),
    { name: 'agent-store' }
  )
)

export default useAgentStore
