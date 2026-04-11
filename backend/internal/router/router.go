package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/yourname/generate-cv/config"
	"github.com/yourname/generate-cv/internal/handler"
	"github.com/yourname/generate-cv/internal/middleware"
	"github.com/yourname/generate-cv/internal/repository"
	"github.com/yourname/generate-cv/internal/service"
	"github.com/yourname/generate-cv/pkg/email"
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

	// Auth
	userRepo := repository.NewUserRepository(pool)
	refreshRepo := repository.NewRefreshTokenRepository(pool)
	subRepo := repository.NewSubscriptionRepository(pool)
	resetRepo := repository.NewPasswordResetTokenRepository(pool)
	mailer := email.NewNoOpSender()
	authSvc := service.NewAuthService(cfg, userRepo, refreshRepo, subRepo, resetRepo, mailer)
	authHandler := handler.NewAuthHandler(authSvc)
	googleHandler := handler.NewGoogleHandler(cfg)

	// CV
	cvRepo := repository.NewCVRepository(pool)
	cvSvc := service.NewCVService(cvRepo)
	cvHandler := handler.NewCVHandler(cvSvc)

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
			auth.GET("/google",           googleHandler.Redirect)
			auth.GET("/google/callback",  googleHandler.Callback)
		}

		// ── Protected routes (require valid JWT) ──────────────────────────────
		protected := v1.Group("")
		protected.Use(middleware.AuthJWT(cfg.JWT.Secret))
		{
			// Dev helper
			protected.GET("/me/ping", func(c *gin.Context) {
				userID := middleware.GetUserID(c)
				c.JSON(http.StatusOK, gin.H{"message": "authenticated", "user_id": userID})
			})

			// ── CV routes ─────────────────────────────────────────────────────
			cvs := protected.Group("/cvs")
			{
				cvs.GET("",              cvHandler.List)
				cvs.POST("",             cvHandler.Create)
				cvs.GET("/:id",          cvHandler.Get)
				cvs.PATCH("/:id",        cvHandler.Update)
				cvs.DELETE("/:id",       cvHandler.Delete)
				cvs.POST("/:id/duplicate", cvHandler.Duplicate)
			}

			// User, Template, AI routes — added in weeks 4+
		}
	}

	return r
}
