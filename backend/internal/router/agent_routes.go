package router

import (
	"github.com/gin-gonic/gin"
	"github.com/yourname/generate-cv/backend/internal/handler"
	"github.com/yourname/generate-cv/backend/internal/middleware"
)

// RegisterAgentRoutes registers the Profile Processing Agent routes
func RegisterAgentRoutes(
	rg *gin.RouterGroup,
	agentHandler *handler.AgentHandler,
	authMiddleware *middleware.AuthMiddleware,
	requireSubscription gin.HandlerFunc,
	rateLimit gin.HandlerFunc,
) {
	agent := rg.Group("/agent")
	
	// All agent endpoints require authentication
	agent.Use(authMiddleware.RequireAuth())
	
	// Require paid subscription for all agent endpoints
	agent.Use(requireSubscription)
	
	// Apply rate limiting (10 requests per minute for agent endpoints)
	agent.Use(rateLimit)

	// File upload endpoints (parse, pipeline)
	agent.POST("/parse", agentHandler.ParseCV)
	agent.POST("/pipeline", agentHandler.RunPipeline)

	// JSON endpoints (edit, tailor, score)
	agent.POST("/edit", agentHandler.EditProfile)
	agent.POST("/tailor", agentHandler.TailorProfile)
	agent.POST("/score", agentHandler.ScoreProfile)

	// Health check (no auth required, useful for monitoring)
	rg.GET("/agent/health", agentHandler.HealthCheck)
}
