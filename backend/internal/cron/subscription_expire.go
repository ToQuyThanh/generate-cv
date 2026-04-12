// Package cron contains periodic background jobs.
package cron

import (
	"context"
	"log/slog"
	"time"

	"github.com/yourname/generate-cv/internal/repository"
)

// SubscriptionExpirer runs every hour and downgrades accounts
// whose subscription has passed its expires_at.
type SubscriptionExpirer struct {
	repo     repository.SubscriptionRepo
	log      *slog.Logger
	interval time.Duration
}

// NewSubscriptionExpirer creates the expirer with a default 1-hour interval.
func NewSubscriptionExpirer(repo repository.SubscriptionRepo, log *slog.Logger) *SubscriptionExpirer {
	return &SubscriptionExpirer{
		repo:     repo,
		log:      log,
		interval: time.Hour,
	}
}

// WithInterval overrides the tick interval — useful in tests.
func (j *SubscriptionExpirer) WithInterval(d time.Duration) *SubscriptionExpirer {
	j.interval = d
	return j
}

// Start runs the expiry loop until ctx is cancelled.
// Call in a dedicated goroutine from main.go:
//
//	go expirer.Start(ctx)
func (j *SubscriptionExpirer) Start(ctx context.Context) {
	j.log.Info("subscription expirer started", "interval", j.interval)

	// Run once immediately on start, then tick.
	j.run(ctx)

	ticker := time.NewTicker(j.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			j.log.Info("subscription expirer stopped")
			return
		case <-ticker.C:
			j.run(ctx)
		}
	}
}

func (j *SubscriptionExpirer) run(ctx context.Context) {
	start := time.Now()

	expired, err := j.repo.ExpireAll(ctx)
	if err != nil {
		j.log.Error("subscription expirer: query failed", "err", err)
		return
	}

	if len(expired) == 0 {
		j.log.Debug("subscription expirer: nothing to expire")
		return
	}

	for _, s := range expired {
		j.log.Info("subscription expired — downgraded to free", "user_id", s.UserID)
	}

	j.log.Info("subscription expirer: cycle done",
		"count", len(expired),
		"elapsed", time.Since(start))
}
