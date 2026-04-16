package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yourname/generate-cv/backend/internal/model"
	"github.com/yourname/generate-cv/backend/internal/service"
)

// AgentHandler handles HTTP requests for Profile Processing Agent endpoints
type AgentHandler struct {
	agentService *service.AgentService
}

// NewAgentHandler creates a new AgentHandler
func NewAgentHandler(agentService *service.AgentService) *AgentHandler {
	return &AgentHandler{
		agentService: agentService,
	}
}

// ParseCV godoc
// @Summary Parse a CV file to structured profile
// @Description Upload a PDF, DOCX, MD, or TXT file and extract structured profile data
// @Tags Agent
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "CV file (PDF, DOCX, MD, TXT)"
// @Param prompt formData string false "Optional extraction instructions"
// @Success 200 {object} model.AgentParseResponse
// @Failure 400 {object} model.ErrorResponse
// @Failure 413 {object} model.ErrorResponse
// @Failure 503 {object} model.ErrorResponse
// @Router /agent/parse [post]
func (h *AgentHandler) ParseCV(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"code": "UNAUTHORIZED", "message": "User not authenticated"})
		return
	}

	// Parse multipart form (10MB max)
	if err := c.Request.ParseMultipartForm(10 << 20); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "PARSE_ERROR", "message": "Failed to parse form: " + err.Error()})
		return
	}

	// Get file
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "FILE_REQUIRED", "message": "File is required"})
		return
	}
	defer file.Close()

	// Get optional prompt
	prompt := c.PostForm("prompt")

	// Call service
	resp, err := h.agentService.ParseCV(c.Request.Context(), userID, file, header.Filename, header.Size, prompt)
	if err != nil {
		switch {
		case isFileSizeError(err):
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"code": "FILE_TOO_LARGE", "message": err.Error()})
		case isFileTypeError(err):
			c.JSON(http.StatusBadRequest, gin.H{"code": "UNSUPPORTED_FILE_TYPE", "message": err.Error()})
		case isServiceUnavailableError(err):
			c.JSON(http.StatusServiceUnavailable, gin.H{"code": "AGENT_UNAVAILABLE", "message": "Agent service is unavailable"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"code": "PARSE_FAILED", "message": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, model.AgentParseResponse{
		Profile: resp.Profile,
		Usage:   resp.Usage,
	})
}

// EditProfile godoc
// @Summary Edit a profile with natural language instruction
// @Description Apply a natural language editing instruction to a structured profile
// @Tags Agent
// @Accept json
// @Produce json
// @Param request body model.AgentEditRequest true "Edit request"
// @Success 200 {object} model.AgentEditResponse
// @Failure 400 {object} model.ErrorResponse
// @Failure 503 {object} model.ErrorResponse
// @Router /agent/edit [post]
func (h *AgentHandler) EditProfile(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"code": "UNAUTHORIZED", "message": "User not authenticated"})
		return
	}

	var req model.AgentEditRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "VALIDATION_ERROR", "message": err.Error()})
		return
	}

	resp, err := h.agentService.EditProfile(c.Request.Context(), userID, req.Profile, req.Instruction)
	if err != nil {
		if isServiceUnavailableError(err) {
			c.JSON(http.StatusServiceUnavailable, gin.H{"code": "AGENT_UNAVAILABLE", "message": "Agent service is unavailable"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"code": "EDIT_FAILED", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.AgentEditResponse{
		Profile: resp.Profile,
		Usage:   resp.Usage,
	})
}

// TailorProfile godoc
// @Summary Tailor a profile to a job description
// @Description Rewrites the profile to highlight skills and experiences most relevant to the supplied job description
// @Tags Agent
// @Accept json
// @Produce json
// @Param request body model.AgentTailorRequest true "Tailor request"
// @Success 200 {object} model.AgentTailorResponse
// @Failure 400 {object} model.ErrorResponse
// @Failure 503 {object} model.ErrorResponse
// @Router /agent/tailor [post]
func (h *AgentHandler) TailorProfile(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"code": "UNAUTHORIZED", "message": "User not authenticated"})
		return
	}

	var req model.AgentTailorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "VALIDATION_ERROR", "message": err.Error()})
		return
	}

	resp, err := h.agentService.TailorProfile(c.Request.Context(), userID, req.Profile, req.JobDescription, req.UserPrompt)
	if err != nil {
		if isServiceUnavailableError(err) {
			c.JSON(http.StatusServiceUnavailable, gin.H{"code": "AGENT_UNAVAILABLE", "message": "Agent service is unavailable"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"code": "TAILOR_FAILED", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.AgentTailorResponse{
		Profile:        resp.Profile,
		KeywordReport:  resp.KeywordReport,
		RelevanceScore: resp.RelevanceScore,
		Usage:          resp.Usage,
	})
}

// ScoreProfile godoc
// @Summary Score a profile
// @Description Evaluates the profile across five dimensions
// @Tags Agent
// @Accept json
// @Produce json
// @Param request body model.AgentScoreRequest true "Score request"
// @Success 200 {object} model.AgentScoreResponse
// @Failure 400 {object} model.ErrorResponse
// @Failure 503 {object} model.ErrorResponse
// @Router /agent/score [post]
func (h *AgentHandler) ScoreProfile(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"code": "UNAUTHORIZED", "message": "User not authenticated"})
		return
	}

	var req model.AgentScoreRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "VALIDATION_ERROR", "message": err.Error()})
		return
	}

	resp, err := h.agentService.ScoreProfile(c.Request.Context(), userID, req.Profile, req.JobDescription, req.UserPrompt)
	if err != nil {
		if isServiceUnavailableError(err) {
			c.JSON(http.StatusServiceUnavailable, gin.H{"code": "AGENT_UNAVAILABLE", "message": "Agent service is unavailable"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"code": "SCORE_FAILED", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.AgentScoreResponse{
		OverallScore:    resp.OverallScore,
		Breakdown:       resp.Breakdown,
		Recommendations: resp.Recommendations,
		Usage:           resp.Usage,
	})
}

// RunPipeline godoc
// @Summary Full pipeline: parse → tailor → score
// @Description Upload a CV file and optionally provide a job description. Runs parse → tailor (if JD provided) → score (if JD provided) in sequence.
// @Tags Agent
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "CV file (PDF, DOCX, MD, TXT)"
// @Param job_description formData string false "Target job description"
// @Param prompt formData string false "Optional instructions"
// @Success 200 {object} model.AgentPipelineResponse
// @Failure 400 {object} model.ErrorResponse
// @Failure 413 {object} model.ErrorResponse
// @Failure 503 {object} model.ErrorResponse
// @Router /agent/pipeline [post]
func (h *AgentHandler) RunPipeline(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"code": "UNAUTHORIZED", "message": "User not authenticated"})
		return
	}

	// Parse multipart form (10MB max)
	if err := c.Request.ParseMultipartForm(10 << 20); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "PARSE_ERROR", "message": "Failed to parse form: " + err.Error()})
		return
	}

	// Get file
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "FILE_REQUIRED", "message": "File is required"})
		return
	}
	defer file.Close()

	// Get optional fields
	jobDescription := c.PostForm("job_description")
	prompt := c.PostForm("prompt")

	resp, err := h.agentService.RunPipeline(c.Request.Context(), userID, file, header.Filename, header.Size, jobDescription, prompt)
	if err != nil {
		switch {
		case isFileSizeError(err):
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"code": "FILE_TOO_LARGE", "message": err.Error()})
		case isFileTypeError(err):
			c.JSON(http.StatusBadRequest, gin.H{"code": "UNSUPPORTED_FILE_TYPE", "message": err.Error()})
		case isServiceUnavailableError(err):
			c.JSON(http.StatusServiceUnavailable, gin.H{"code": "AGENT_UNAVAILABLE", "message": "Agent service is unavailable"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"code": "PIPELINE_FAILED", "message": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, model.AgentPipelineResponse{
		ParsedProfile:   resp.ParsedProfile,
		TailoredProfile: resp.TailoredProfile,
		KeywordReport:   resp.KeywordReport,
		RelevanceScore:  resp.RelevanceScore,
		Scorecard:       resp.Scorecard,
		Usage:           resp.Usage,
	})
}

// HealthCheck godoc
// @Summary Check Agent service health
// @Description Check if the Profile Processing Agent service is available
// @Tags Agent
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /agent/health [get]
func (h *AgentHandler) HealthCheck(c *gin.Context) {
	isHealthy := h.agentService.HealthCheck(c.Request.Context())
	if isHealthy {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	} else {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unhealthy"})
	}
}

// Helper functions for error classification

func isFileSizeError(err error) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	return contains(errStr, "too large") || contains(errStr, "File too large")
}

func isFileTypeError(err error) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	return contains(errStr, "unsupported") || contains(errStr, "file type")
}

func isServiceUnavailableError(err error) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	return contains(errStr, "unavailable") ||
		contains(errStr, "timeout") ||
		contains(errStr, "connection refused") ||
		contains(errStr, "no such host")
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsInternal(s, substr))
}

func containsInternal(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
