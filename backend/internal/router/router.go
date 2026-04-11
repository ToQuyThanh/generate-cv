package router

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/yourname/generate-cv/config"
	"github.com/yourname/generate-cv/internal/handler"
	"github.com/yourname/generate-cv/internal/middleware"
	"github.com/yourname/generate-cv/internal/repository"
	"github.com/yourname/generate-cv/internal/service"
	"github.com/yourname/generate-cv/pkg/email"
)

// New creates and returns the root Gin engine with all routes registered.
// rdb may be nil in tests that don't exercise rate-limited routes.
func New(cfg *config.Config, pool *pgxpool.Pool, rdb *redis.Client) *gin.Engine {
	if cfg.App.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(middleware.RequestID())
	r.Use(middleware.RequestLogger())
	r.Use(gin.Recovery())

	// Health check — used by Docker / load balancer
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// ─── Repositories ─────────────────────────────────────────────────────────
	userRepo     := repository.NewUserRepository(pool)
	refreshRepo  := repository.NewRefreshTokenRepository(pool)
	subRepo      := repository.NewSubscriptionRepository(pool)
	resetRepo    := repository.NewPasswordResetTokenRepository(pool)
	templateRepo := repository.NewTemplateRepository(pool)
	cvRepo       := repository.NewCVRepository(pool)

	// ─── Services ─────────────────────────────────────────────────────────────
	mailer      := email.NewNoOpSender()
	authSvc     := service.NewAuthService(cfg, userRepo, refreshRepo, subRepo, resetRepo, mailer)
	cvSvc       := service.NewCVService(cvRepo)
	// subRepo satisfies both SubscriptionRepo (auth — Create) and SubReader (user — GetByUserID)
	userSvc     := service.NewUserService(userRepo, subRepo)
	templateSvc := service.NewTemplateService(templateRepo)

	// ─── Handlers ─────────────────────────────────────────────────────────────
	authHandler     := handler.NewAuthHandler(authSvc)
	googleHandler   := handler.NewGoogleHandler(cfg)
	cvHandler       := handler.NewCVHandler(cvSvc)
	userHandler     := handler.NewUserHandler(userSvc)
	templateHandler := handler.NewTemplateHandler(templateSvc)

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

		// ── Templates (public) ────────────────────────────────────────────────
		tmpl := v1.Group("/templates")
		{
			tmpl.GET("",     templateHandler.List)
			tmpl.GET("/:id", templateHandler.Get)
		}

		// ── Protected routes (require valid JWT) ──────────────────────────────
		protected := v1.Group("")
		protected.Use(middleware.AuthJWT(cfg.JWT.Secret))
		{
			protected.GET("/me/ping", func(c *gin.Context) {
				userID := middleware.GetUserID(c)
				c.JSON(http.StatusOK, gin.H{"message": "authenticated", "user_id": userID})
			})

			// ── User ──────────────────────────────────────────────────────────
			users := protected.Group("/users")
			if rdb != nil {
				users.Use(middleware.RateLimit(rdb, 60, time.Minute))
			}
			{
				users.GET("/me",              userHandler.GetMe)
				users.PATCH("/me",            userHandler.UpdateMe)
				users.DELETE("/me",           userHandler.DeleteMe)
				users.GET("/me/subscription", userHandler.GetSubscription)
			}

			// ── CV ────────────────────────────────────────────────────────────
			cvs := protected.Group("/cvs")
			if rdb != nil {
				cvs.Use(middleware.RateLimit(rdb, 120, time.Minute))
			}
			{
				cvs.GET("",                cvHandler.List)
				cvs.POST("",               cvHandler.Create)
				cvs.GET("/:id",            cvHandler.Get)
				cvs.PATCH("/:id",          cvHandler.Update)
				cvs.DELETE("/:id",         cvHandler.Delete)
				cvs.POST("/:id/duplicate", cvHandler.Duplicate)
			}
		}
	}

	return r
}
