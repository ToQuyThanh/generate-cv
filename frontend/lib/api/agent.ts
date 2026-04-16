import apiClient from './client'
import type {
  AgentParseResponse,
  AgentEditRequest,
  AgentEditResponse,
  AgentTailorRequest,
  AgentTailorResponse,
  AgentScoreRequest,
  AgentScoreResponse,
  AgentPipelineResponse,
} from '@/types'

/**
 * Profile Processing Agent API
 * 
 * Endpoints for parsing CVs, editing profiles, tailoring to job descriptions,
 * and scoring candidate fit.
 */
export const agentApi = {
  /**
   * Parse a CV file (PDF, DOCX, MD, TXT) to structured profile
   * @param file - The CV file to parse
   * @param prompt - Optional extraction instructions
   * @returns Parsed profile with token usage
   */
  parse: (file: File, prompt?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (prompt) formData.append('prompt', prompt)
    
    return apiClient
      .post<AgentParseResponse>('/agent/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // 60s cho parse (file upload + processing)
      })
      .then((r) => r.data)
  },

  /**
   * Edit a profile using natural language instruction
   * @param profile - The structured profile to edit
   * @param instruction - Natural language editing instruction
   * @returns Edited profile with token usage
   */
  edit: (profile: Record<string, unknown>, instruction: string) => {
    const body: AgentEditRequest = { profile, instruction }
    return apiClient
      .post<AgentEditResponse>('/agent/edit', body, { 
        timeout: 30000 // 30s cho edit
      })
      .then((r) => r.data)
  },

  /**
   * Tailor a profile to a job description
   * @param profile - The structured profile to tailor
   * @param jobDescription - The target job description
   * @param userPrompt - Optional additional instructions
   * @returns Tailored profile with keyword report and relevance score
   */
  tailor: (profile: Record<string, unknown>, jobDescription: string, userPrompt?: string) => {
    const body: AgentTailorRequest = { 
      profile, 
      job_description: jobDescription, 
      user_prompt: userPrompt 
    }
    return apiClient
      .post<AgentTailorResponse>('/agent/tailor', body, { 
        timeout: 45000 // 45s cho tailor (phức tạp hơn edit)
      })
      .then((r) => r.data)
  },

  /**
   * Score a profile across 5 dimensions
   * @param profile - The structured profile to score
   * @param jobDescription - Optional job description for context
   * @param userPrompt - Optional scoring focus instructions
   * @returns Score result with breakdown and recommendations
   */
  score: (profile: Record<string, unknown>, jobDescription?: string, userPrompt?: string) => {
    const body: AgentScoreRequest = { 
      profile, 
      job_description: jobDescription, 
      user_prompt: userPrompt 
    }
    return apiClient
      .post<AgentScoreResponse>('/agent/score', body, { 
        timeout: 30000 // 30s cho score
      })
      .then((r) => r.data)
  },

  /**
   * Run full pipeline: parse → tailor (if JD) → score (if JD)
   * @param file - The CV file to process
   * @param jobDescription - Optional job description for tailoring
   * @param prompt - Optional extraction instructions
   * @returns Full pipeline result
   */
  pipeline: (file: File, jobDescription?: string, prompt?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (jobDescription) formData.append('job_description', jobDescription)
    if (prompt) formData.append('prompt', prompt)
    
    return apiClient
      .post<AgentPipelineResponse>('/agent/pipeline', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 120s cho pipeline (lâu nhất)
      })
      .then((r) => r.data)
  },

  /**
   * Check Agent service health
   * @returns Health status
   */
  health: () => {
    return apiClient
      .get<{ status: string }>('/agent/health')
      .then((r) => r.data)
  },
}

export default agentApi
