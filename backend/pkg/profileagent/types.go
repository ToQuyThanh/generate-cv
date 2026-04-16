package profileagent

// TokenUsage represents token consumption from Agent API
type TokenUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// ParseResponse represents the response from parsing a CV file
type ParseResponse struct {
	Profile map[string]interface{} `json:"profile"`
	Usage   TokenUsage             `json:"usage"`
}

// EditRequest represents a request to edit a profile
type EditRequest struct {
	Profile     map[string]interface{} `json:"profile"`
	Instruction string                 `json:"instruction"`
}

// EditResponse represents the response from editing a profile
type EditResponse struct {
	Profile map[string]interface{} `json:"profile"`
	Usage   TokenUsage             `json:"usage"`
}

// TailorRequest represents a request to tailor a profile to a job description
type TailorRequest struct {
	Profile         map[string]interface{} `json:"profile"`
	JobDescription  string                 `json:"job_description"`
	UserPrompt      string                 `json:"user_prompt,omitempty"`
}

// KeywordReport represents keyword matching analysis
type KeywordReport struct {
	Present []string `json:"present"`
	Partial []string `json:"partial"`
	Missing []string `json:"missing"`
}

// TailorResponse represents the response from tailoring a profile
type TailorResponse struct {
	Profile         map[string]interface{} `json:"profile"`
	KeywordReport   KeywordReport          `json:"keyword_report"`
	RelevanceScore  int                    `json:"relevance_score"`
	Usage           TokenUsage             `json:"usage"`
}

// ScoreRequest represents a request to score a profile
type ScoreRequest struct {
	Profile         map[string]interface{} `json:"profile"`
	JobDescription  string                 `json:"job_description,omitempty"`
	UserPrompt      string                 `json:"user_prompt,omitempty"`
}

// ScoreBreakdown represents per-dimension scores
type ScoreBreakdown struct {
	Completeness   int `json:"completeness"`
	Relevance      int `json:"relevance"`
	Impact         int `json:"impact"`
	Presentation   int `json:"presentation"`
	ATSOptimized   int `json:"ats_optimized"`
}

// ScoreResponse represents the response from scoring a profile
type ScoreResponse struct {
	OverallScore    int            `json:"overall_score"`
	Breakdown       ScoreBreakdown `json:"breakdown"`
	Recommendations []string       `json:"recommendations"`
	Usage           TokenUsage     `json:"usage"`
}

// PipelineResponse represents the response from running the full pipeline
type PipelineResponse struct {
	ParsedProfile    map[string]interface{} `json:"parsed_profile"`
	TailoredProfile  map[string]interface{} `json:"tailored_profile,omitempty"`
	KeywordReport    *KeywordReport         `json:"keyword_report,omitempty"`
	RelevanceScore   *int                   `json:"relevance_score,omitempty"`
	Scorecard        *ScoreBreakdown         `json:"scorecard,omitempty"`
	Usage            TokenUsage             `json:"usage"`
}

// ErrorResponse represents an error response from the Agent API
type ErrorResponse struct {
	Detail string `json:"detail"`
}
