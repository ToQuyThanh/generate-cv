package cron

import (
	"context"
	"log/slog"
	"time"

	db "github.com/yourname/generate-cv/db/sqlc"
)

// SubscriptionExpirer là cron job chạy mỗi giờ,
// hạ cấp tất cả tài khoản có subscription đã hết hạn xuống gói free.
type SubscriptionExpirer struct {
	queries  *db.Queries
	log      *slog.Logger
	interval time.Duration
}

// NewSubscriptionExpirer tạo job với interval mặc định 1 giờ.
func NewSubscriptionExpirer(q *db.Queries, log *slog.Logger) *SubscriptionExpirer {
	return &SubscriptionExpirer{
		queries:  q,
		log:      log,
		interval: 1 * time.Hour,
	}
}

// WithInterval cho phép override interval (dùng trong test).
func (j *SubscriptionExpirer) WithInterval(d time.Duration) *SubscriptionExpirer {
	j.interval = d
	return j
}

// Start chạy job theo vòng lặp cho đến khi ctx bị cancel.
// Gọi trong goroutine riêng từ main.go.
//
//	go cronExpirer.Start(ctx)
func (j *SubscriptionExpirer) Start(ctx context.Context) {
	j.log.Info("subscription expirer started", "interval", j.interval)

	// Chạy ngay lần đầu khi start, sau đó lặp theo interval
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

// run thực thi một lần expire.
func (j *SubscriptionExpirer) run(ctx context.Context) {
	start := time.Now()

	expired, err := j.queries.ExpireSubscriptions(ctx)
	if err != nil {
		j.log.Error("subscription expirer: query failed", "err", err)
		return
	}

	if len(expired) == 0 {
		j.log.Debug("subscription expirer: no expired subscriptions")
		return
	}

	// Log từng user bị hạ cấp để audit
	for _, sub := range expired {
		j.log.Info("subscription expired — downgraded to free",
			"user_id", sub.UserID,
			"old_plan", sub.Plan,
		)
	}

	j.log.Info("subscription expirer: done",
		"count", len(expired),
		"elapsed", time.Since(start))
}
