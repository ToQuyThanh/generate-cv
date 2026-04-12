import apiClient from './client'
import type {
  AISuggestSummaryRequest,
  AISuggestExperienceRequest,
  AIAnalyzeJDRequest,
  AIAnalyzeJDResponse,
  AIRewriteSectionRequest,
  AISuggestionResponse,
} from '@/types'

export const aiApi = {
  suggestSummary: (body: AISuggestSummaryRequest) =>
    apiClient
      .post<AISuggestionResponse>('/ai/suggest-summary', body)
      .then((r) => r.data),

  suggestExperience: (body: AISuggestExperienceRequest) =>
    apiClient
      .post<AISuggestionResponse>('/ai/suggest-experience', body)
      .then((r) => r.data),

  analyzeJD: (body: AIAnalyzeJDRequest) =>
    apiClient
      .post<AIAnalyzeJDResponse>('/ai/analyze-jd', body)
      .then((r) => r.data),

  rewriteSection: (body: AIRewriteSectionRequest) =>
    apiClient
      .post<AISuggestionResponse>('/ai/rewrite-section', body)
      .then((r) => r.data),
}
