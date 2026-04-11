package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/yourname/generate-cv/config"
	"github.com/yourname/generate-cv/internal/router"
	"github.com/yourname/generate-cv/pkg/database"
	"github.com/yourname/generate-cv/pkg/redisutil"
	"github.com/yourname/generate-cv/pkg/sentryutil"
)

func main() {
	// 1. Load config
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	// 2. Init Sentry (no-op if SENTRY_DSN is empty)
	if err := sentryutil.Init(cfg.Sentry.DSN, cfg.App.Env, cfg.App.Release); err != nil {
		log.Fatalf("failed to init sentry: %v", err)
	}
	defer sentryutil.Flush()

	// 3. Connect to PostgreSQL
	ctx := context.Background()
	pool, err := database.NewPool(ctx, cfg.DB)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()
	log.Println("✅  Connected to PostgreSQL")

	// 4. Run migrations
	if err := database.RunMigrations(cfg.DB); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}
	log.Println("✅  Migrations applied")

	// 5. Connect to Redis
	rdb, err := redisutil.NewClient(cfg.Redis.Addr, cfg.Redis.Password)
	if err != nil {
		log.Fatalf("failed to connect to redis: %v", err)
	}
	defer rdb.Close()
	log.Println("✅  Connected to Redis")

	// 6. Build router (inject pool + redis for dependency wiring)
	r := router.New(cfg, pool, rdb)

	// 7. Create HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.App.Port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 8. Start in background goroutine
	go func() {
		log.Printf("🚀  Server listening on :%s  [env=%s]", cfg.App.Port, cfg.App.Env)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server error: %v", err)
		}
	}()

	// 9. Graceful shutdown on SIGINT / SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down server…")
	shutCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutCtx); err != nil {
		log.Fatalf("forced shutdown: %v", err)
	}
	log.Println("server stopped")
}
