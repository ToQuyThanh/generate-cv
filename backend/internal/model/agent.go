package model

import (
	"github.com/yourname/generate-cv/pkg/profileagent"
)

// TokenUsage represents token consumption from Agent API
type TokenUsage = profileagent.TokenUsage

// KeywordReport represents keyword matching analysis
type KeywordReport = profileagent.KeywordReport

// ScoreBreakdown represents per-dimension scores
type ScoreBreakdown = profileagent.ScoreBreakdown

// AgentParseRequest represents a request to parse a CV file
type AgentParseRequest struct {
	Prompt string `form:"prompt" json:"prompt,omitempty"`
	// File is handled via multipart form, not JSON
}

// AgentParseResponse represents the response from parsing a CV file
type AgentParseResponse struct {
	Profile map[string]interface{} `json:"profile"`
	Usage   TokenUsage             `json:"usage"`
}

// AgentEditRequest represents a request to edit a profile
type AgentEditRequest struct {
	Profile     map[string]interface{} `json:"profile" binding:"required"`
	Instruction string                 `json:"instruction" binding:"required"`
}

// AgentEditResponse represents the response from editing a profile
type AgentEditResponse struct {
	Profile map[string]interface{} `json:"profile"`
	Usage   TokenUsage             `json:"usage"`
}

// AgentTailorRequest represents a request to tailor a profile
type AgentTailorRequest struct {
	Profile        map[string]interface{} `json:"profile" binding:"required"`
	JobDescription string                 `json:"job_description" binding:"required"`
	UserPrompt     string                 `json:"user_prompt,omitempty"`
}

// AgentTailorResponse represents the response from tailoring a profile
type AgentTailorResponse struct {
	Profile        map[string]interface{} `json:"profile"`
	KeywordReport  KeywordReport          `json:"keyword_report"`
	RelevanceScore int                    `json:"relevance_score"`
	Usage          TokenUsage             `json:"usage"`
}

// AgentScoreRequest represents a request to score a profile
type AgentScoreRequest struct {
	Profile        map[string]interface{} `json:"profile" binding:"required"`
	JobDescription string                 `json:"job_description,omitempty"`
	UserPrompt     string                 `json:"user_prompt,omitempty"`
}

// AgentScoreResponse represents the response from scoring a profile
type AgentScoreResponse struct {
	OverallScore    int            `json:"overall_score"`
	Breakdown       ScoreBreakdown `json:"breakdown"`
	Recommendations []string       `json:"recommendations"`
	Usage           TokenUsage     `json:"usage"`
}

// AgentPipelineRequest represents a request to run the full pipeline
type AgentPipelineRequest struct {
	JobDescription string `form:"job_description" json:"job_description,omitempty"`
	Prompt         string `form:"prompt" json:"prompt,omitempty"`
	// File is handled via multipart form
}

// AgentPipelineResponse represents the response from running the pipeline
type AgentPipelineResponse struct {
	ParsedProfile   map[string]interface{} `json:"parsed_profile"`
	TailoredProfile map[string]interface{} `json:"tailored_profile,omitempty"`
	KeywordReport   *KeywordReport         `json:"keyword_report,omitempty"`
	RelevanceScore  *int                   `json:"relevance_score,omitempty"`
	Scorecard       *ScoreBreakdown        `json:"scorecard,omitempty"`
	Usage           TokenUsage             `json:"usage"`
}

// ─── AI Inline Suggestions ────────────────────────────────────────────────────

// AIAnalyzeJDRequest is the body for POST /ai/analyze-jd
type AIAnalyzeJDRequest struct {
	CVID           string `json:"cv_id" binding:"required"`
	JobDescription string `json:"job_description" binding:"required"`
}

// AIAnalyzeJDResponse is returned by POST /ai/analyze-jd
type AIAnalyzeJDResponse struct {
	Keywords        []string `json:"keywords"`
	MissingKeywords []string `json:"missing_keywords"`
	MatchScore      int      `json:"match_score"`
	Suggestions     []string `json:"suggestions"`
}

// AISuggestSummaryRequest is the body for POST /ai/suggest-summary
type AISuggestSummaryRequest struct {
	CVID            string `json:"cv_id" binding:"required"`
	JobTitle        string `json:"job_title,omitempty"`
	YearsExperience int    `json:"years_experience,omitempty"`
}

// AISuggestExperienceRequest is the body for POST /ai/suggest-experience
type AISuggestExperienceRequest struct {
	CVID               string `json:"cv_id" binding:"required"`
	Company            string `json:"company" binding:"required"`
	Position           string `json:"position" binding:"required"`
	CurrentDescription string `json:"current_description,omitempty"`
}

// AIRewriteSectionRequest is the body for POST /ai/rewrite-section
type AIRewriteSectionRequest struct {
	CVID      string `json:"cv_id" binding:"required"`
	SectionID string `json:"section_id" binding:"required"`
	Content   string `json:"content" binding:"required"`
	Tone      string `json:"tone" binding:"required"` // professional | concise | impactful
}

// AISuggestionResponse is the generic single-text response for AI suggest endpoints
type AISuggestionResponse struct {
	Suggestion string `json:"suggestion"`
}
