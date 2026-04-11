package router

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/yourname/generate-cv/config"
	"github.com/yourname/generate-cv/internal/handler"
	"github.com/yourname/generate-cv/internal/middleware"
	"github.com/yourname/generate-cv/internal/repository"
	"github.com/yourname/generate-cv/internal/service"
	"github.com/yourname/generate-cv/pkg/email"

	"github.com/jackc/pgx/v5/pgxpool"
)

// New creates and returns the root Gin engine with all routes registered.
func New(cfg *config.Config, pool *pgxpool.Pool) *gin.Engine {
	if cfg.App.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// Health check — used by Docker / load balancer
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// ─── Wire dependencies ────────────────────────────────────────────────────
	userRepo := repository.NewUserRepository(pool)
	refreshRepo := repository.NewRefreshTokenRepository(pool)
	subRepo := repository.NewSubscriptionRepository(pool)
	resetRepo := repository.NewPasswordResetTokenRepository(pool)

	mailer := email.NewNoOpSender() // replaced by Resend client in Phase 2

	authSvc := service.NewAuthService(cfg, userRepo, refreshRepo, subRepo, resetRepo, mailer)
	authHandler := handler.NewAuthHandler(authSvc)
	googleHandler := handler.NewGoogleHandler(cfg)

	// ─── API v1 ───────────────────────────────────────────────────────────────
	v1 := r.Group("/api/v1")
	{
		v1.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "pong"})
		})

		// ── Auth (public) ─────────────────────────────────────────────────────
		auth := v1.Group("/auth")
		{
			auth.POST("/register",        authHandler.Register)
			auth.POST("/login",           authHandler.Login)
			auth.POST("/refresh",         authHandler.Refresh)
			auth.POST("/logout",          authHandler.Logout)
			auth.POST("/forgot-password", authHandler.ForgotPassword)
			auth.POST("/reset-password",  authHandler.ResetPassword)

			// Google OAuth
			auth.GET("/google",          googleHandler.Redirect)
			auth.GET("/google/callback", googleHandler.Callback)
		}

		// ── Protected routes (require valid JWT) ──────────────────────────────
		protected := v1.Group("")
		protected.Use(middleware.AuthJWT(cfg.JWT.Secret))
		{
			// CV routes, User routes, AI routes — added in subsequent weeks
			protected.GET("/me/ping", func(c *gin.Context) {
				userID := middleware.GetUserID(c)
				c.JSON(http.StatusOK, gin.H{"message": "authenticated", "user_id": userID})
			})
		}
	}

	return r
}
