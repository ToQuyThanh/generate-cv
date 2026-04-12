package cron_test

import (
	"context"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	db "github.com/yourname/generate-cv/db/sqlc"
	"github.com/yourname/generate-cv/internal/cron"
)

// ─────────────────────────────────────────────
//  Mock Queries
// ─────────────────────────────────────────────

type mockExpireQueries struct{ mock.Mock }

func (m *mockExpireQueries) ExpireSubscriptions(ctx context.Context) ([]db.Subscription, error) {
	args := m.Called(ctx)
	return args.Get(0).([]db.Subscription), args.Error(1)
}

var testLogger = slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

// ─────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────

func TestSubscriptionExpirer_RunOnce_NoExpired(t *testing.T) {
	q := &mockExpireQueries{}
	q.On("ExpireSubscriptions", mock.Anything).Return([]db.Subscription{}, nil)

	expirer := cron.NewSubscriptionExpirer(q, testLogger).WithInterval(50 * time.Millisecond)

	ctx, cancel := context.WithTimeout(context.Background(), 80*time.Millisecond)
	defer cancel()

	// Chạy trong goroutine và chờ context hết hạn
	go expirer.Start(ctx)
	<-ctx.Done()

	// Phải gọi ít nhất 1 lần (lần đầu khi start)
	q.AssertCalled(t, "ExpireSubscriptions", mock.Anything)
}

func TestSubscriptionExpirer_RunOnce_WithExpiredSubs(t *testing.T) {
	q := &mockExpireQueries{}

	userID1 := uuid.New()
	userID2 := uuid.New()
	q.On("ExpireSubscriptions", mock.Anything).Return([]db.Subscription{
		{UserID: userID1, Plan: "weekly"},
		{UserID: userID2, Plan: "monthly"},
	}, nil).Once()
	// Lần tiếp theo trả rỗng
	q.On("ExpireSubscriptions", mock.Anything).Return([]db.Subscription{}, nil)

	expirer := cron.NewSubscriptionExpirer(q, testLogger).WithInterval(50 * time.Millisecond)

	ctx, cancel := context.WithTimeout(context.Background(), 80*time.Millisecond)
	defer cancel()

	go expirer.Start(ctx)
	<-ctx.Done()

	q.AssertExpectations(t)
}

func TestSubscriptionExpirer_DBError_DoesNotPanic(t *testing.T) {
	q := &mockExpireQueries{}
	q.On("ExpireSubscriptions", mock.Anything).Return([]db.Subscription{}, assert.AnError)

	expirer := cron.NewSubscriptionExpirer(q, testLogger).WithInterval(30 * time.Millisecond)

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Millisecond)
	defer cancel()

	// Không được panic khi DB lỗi
	assert.NotPanics(t, func() {
		go expirer.Start(ctx)
		<-ctx.Done()
	})
}

func TestSubscriptionExpirer_StopsOnContextCancel(t *testing.T) {
	q := &mockExpireQueries{}
	q.On("ExpireSubscriptions", mock.Anything).Return([]db.Subscription{}, nil)

	expirer := cron.NewSubscriptionExpirer(q, testLogger).WithInterval(10 * time.Millisecond)

	ctx, cancel := context.WithCancel(context.Background())

	done := make(chan struct{})
	go func() {
		expirer.Start(ctx)
		close(done)
	}()

	time.Sleep(35 * time.Millisecond)
	cancel()

	select {
	case <-done:
		// goroutine đã kết thúc đúng cách
	case <-time.After(200 * time.Millisecond):
		t.Fatal("expirer không dừng sau khi context bị cancel")
	}
}
