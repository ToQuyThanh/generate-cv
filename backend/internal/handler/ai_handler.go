package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/yourname/generate-cv/internal/model"
	"github.com/yourname/generate-cv/internal/repository"
	"github.com/yourname/generate-cv/internal/service"
)

// AIHandler handles inline AI suggestion endpoints (/api/v1/ai/*)
type AIHandler struct {
	agentSvc *service.AgentService
	cvRepo   *repository.CVRepository
}

// NewAIHandler creates a new AIHandler
func NewAIHandler(agentSvc *service.AgentService, cvRepo *repository.CVRepository) *AIHandler {
	return &AIHandler{agentSvc: agentSvc, cvRepo: cvRepo}
}

// loadCVProfile resolves cv_id → CV → unmarshalled profile snapshot.
// It also verifies that the requesting user owns the CV.
func (h *AIHandler) loadCVProfile(c *gin.Context, cvIDStr string) (map[string]interface{}, error) {
	cvID, err := uuid.Parse(cvIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid cv_id")
	}

	userIDStr := c.GetString("userID")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, fmt.Errorf("unauthorized")
	}

	cv, err := h.cvRepo.GetByID(c.Request.Context(), cvID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("cv not found")
		}
		return nil, fmt.Errorf("failed to load cv")
	}

	if cv.UserID != userID {
		return nil, fmt.Errorf("forbidden")
	}

	if len(cv.ProfileSnapshot) == 0 || string(cv.ProfileSnapshot) == "null" {
		return nil, fmt.Errorf("cv has no profile snapshot; parse a CV file first")
	}

	var profile map[string]interface{}
	if err := json.Unmarshal(cv.ProfileSnapshot, &profile); err != nil {
		return nil, fmt.Errorf("failed to parse profile snapshot")
	}

	return profile, nil
}

// extractSuggestion tries a list of field names in order and returns the
// first non-empty string value found.
func extractSuggestion(profile map[string]interface{}, keys ...string) string {
	for _, k := range keys {
		if v, ok := profile[k]; ok {
			if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
				return strings.TrimSpace(s)
			}
		}
	}
	return ""
}

// respondCVError writes the appropriate HTTP error for loadCVProfile errors.
func respondCVError(c *gin.Context, err error) {
	msg := err.Error()
	switch msg {
	case "invalid cv_id":
		c.JSON(http.StatusBadRequest, gin.H{"code": "INVALID_CV_ID", "message": msg})
	case "cv not found":
		c.JSON(http.StatusNotFound, gin.H{"code": "CV_NOT_FOUND", "message": msg})
	case "forbidden":
		c.JSON(http.StatusForbidden, gin.H{"code": "FORBIDDEN", "message": "You don't own this CV"})
	case "unauthorized":
		c.JSON(http.StatusUnauthorized, gin.H{"code": "UNAUTHORIZED", "message": msg})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"code": "PROFILE_ERROR", "message": msg})
	}
}

// AnalyzeJD godoc
// @Summary Analyze a job description against the CV
// @Tags AI
// @Accept json
// @Produce json
// @Param request body model.AIAnalyzeJDRequest true "Analyze JD request"
// @Success 200 {object} model.AIAnalyzeJDResponse
// @Router /ai/analyze-jd [post]
func (h *AIHandler) AnalyzeJD(c *gin.Context) {
	var req model.AIAnalyzeJDRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "INVALID_REQUEST", "message": err.Error()})
		return
	}

	userID := c.GetString("userID")

	profile, err := h.loadCVProfile(c, req.CVID)
	if err != nil {
		respondCVError(c, err)
		return
	}

	tailorResp, err := h.agentSvc.TailorProfile(c.Request.Context(), userID, profile, req.JobDescription, "")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "ANALYZE_FAILED", "message": err.Error()})
		return
	}

	// Merge present + partial as "matched" keywords
	keywords := make([]string, 0, len(tailorResp.KeywordReport.Present)+len(tailorResp.KeywordReport.Partial))
	keywords = append(keywords, tailorResp.KeywordReport.Present...)
	keywords = append(keywords, tailorResp.KeywordReport.Partial...)

	// Build human-readable suggestions from missing keywords
	suggestions := make([]string, 0, len(tailorResp.KeywordReport.Missing))
	for _, kw := range tailorResp.KeywordReport.Missing {
		suggestions = append(suggestions, fmt.Sprintf("Add '%s' to your CV to improve match", kw))
	}

	c.JSON(http.StatusOK, model.AIAnalyzeJDResponse{
		Keywords:        keywords,
		MissingKeywords: tailorResp.KeywordReport.Missing,
		MatchScore:      tailorResp.RelevanceScore,
		Suggestions:     suggestions,
	})
}

// SuggestSummary godoc
// @Summary Generate a professional summary for the CV
// @Tags AI
// @Accept json
// @Produce json
// @Param request body model.AISuggestSummaryRequest true "Suggest summary request"
// @Success 200 {object} model.AISuggestionResponse
// @Router /ai/suggest-summary [post]
func (h *AIHandler) SuggestSummary(c *gin.Context) {
	var req model.AISuggestSummaryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "INVALID_REQUEST", "message": err.Error()})
		return
	}

	userID := c.GetString("userID")

	profile, err := h.loadCVProfile(c, req.CVID)
	if err != nil {
		respondCVError(c, err)
		return
	}

	var sb strings.Builder
	sb.WriteString("Rewrite the professional summary to be compelling and impactful.")
	if req.JobTitle != "" {
		sb.WriteString(fmt.Sprintf(" Target role: %s.", req.JobTitle))
	}
	if req.YearsExperience > 0 {
		sb.WriteString(fmt.Sprintf(" Years of experience: %d.", req.YearsExperience))
	}
	sb.WriteString(" Store the new summary text in a top-level field '_suggestion'. Keep all other profile fields unchanged.")

	editResp, err := h.agentSvc.EditProfile(c.Request.Context(), userID, profile, sb.String())
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "SUGGEST_FAILED", "message": err.Error()})
		return
	}

	suggestion := extractSuggestion(editResp.Profile,
		"_suggestion", "summary", "professional_summary", "objective", "about", "profile_summary")

	c.JSON(http.StatusOK, model.AISuggestionResponse{Suggestion: suggestion})
}

// SuggestExperience godoc
// @Summary Suggest improved experience bullet points
// @Tags AI
// @Accept json
// @Produce json
// @Param request body model.AISuggestExperienceRequest true "Suggest experience request"
// @Success 200 {object} model.AISuggestionResponse
// @Router /ai/suggest-experience [post]
func (h *AIHandler) SuggestExperience(c *gin.Context) {
	var req model.AISuggestExperienceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "INVALID_REQUEST", "message": err.Error()})
		return
	}

	userID := c.GetString("userID")

	profile, err := h.loadCVProfile(c, req.CVID)
	if err != nil {
		respondCVError(c, err)
		return
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Improve the job description for the role '%s' at '%s'.", req.Position, req.Company))
	if req.CurrentDescription != "" {
		sb.WriteString(fmt.Sprintf(" Current description: %s.", req.CurrentDescription))
	}
	sb.WriteString(" Use strong action verbs and quantifiable achievements.")
	sb.WriteString(" Store the rewritten description text in a top-level field '_suggestion'. Keep all other profile fields unchanged.")

	editResp, err := h.agentSvc.EditProfile(c.Request.Context(), userID, profile, sb.String())
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "SUGGEST_FAILED", "message": err.Error()})
		return
	}

	suggestion := extractSuggestion(editResp.Profile, "_suggestion")

	c.JSON(http.StatusOK, model.AISuggestionResponse{Suggestion: suggestion})
}

// RewriteSection godoc
// @Summary Rewrite a CV section with a specified tone
// @Tags AI
// @Accept json
// @Produce json
// @Param request body model.AIRewriteSectionRequest true "Rewrite section request"
// @Success 200 {object} model.AISuggestionResponse
// @Router /ai/rewrite-section [post]
func (h *AIHandler) RewriteSection(c *gin.Context) {
	var req model.AIRewriteSectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "INVALID_REQUEST", "message": err.Error()})
		return
	}

	userID := c.GetString("userID")

	profile, err := h.loadCVProfile(c, req.CVID)
	if err != nil {
		respondCVError(c, err)
		return
	}

	instruction := fmt.Sprintf(
		"Rewrite the following CV content with a %s tone: \"%s\". "+
			"Store only the rewritten text in a top-level field '_suggestion'. Keep all other profile fields unchanged.",
		req.Tone, req.Content,
	)

	editResp, err := h.agentSvc.EditProfile(c.Request.Context(), userID, profile, instruction)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "REWRITE_FAILED", "message": err.Error()})
		return
	}

	suggestion := extractSuggestion(editResp.Profile, "_suggestion")

	c.JSON(http.StatusOK, model.AISuggestionResponse{Suggestion: suggestion})
}
