package cron_test

import (
	"context"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/yourname/generate-cv/internal/cron"
	"github.com/yourname/generate-cv/internal/repository"
)

// ─── Mock: SubscriptionRepo ───────────────────────────────────────────────────

type mockSubRepo struct {
	expireReturn []*repository.Subscription
	expireErr    error
	callCount    int
}

func (m *mockSubRepo) Upgrade(_ context.Context, _ uuid.UUID, _ string, _ time.Time) (*repository.Subscription, error) {
	return nil, nil
}

func (m *mockSubRepo) ExpireAll(_ context.Context) ([]*repository.Subscription, error) {
	m.callCount++
	return m.expireReturn, m.expireErr
}

// ─── helpers ──────────────────────────────────────────────────────────────────

var testLog = slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

func runExpirer(t *testing.T, repo repository.SubscriptionRepo, timeout, interval time.Duration) {
	t.Helper()
	expirer := cron.NewSubscriptionExpirer(repo, testLog).WithInterval(interval)
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	go expirer.Start(ctx)
	<-ctx.Done()
}

// ─── Tests ────────────────────────────────────────────────────────────────────

func TestSubscriptionExpirer_CallsExpireOnStart(t *testing.T) {
	repo := &mockSubRepo{}
	runExpirer(t, repo, 60*time.Millisecond, 1*time.Hour) // interval >> timeout → only initial call
	if repo.callCount == 0 {
		t.Error("ExpireAll should be called at least once on start")
	}
}

func TestSubscriptionExpirer_TicksMultipleTimes(t *testing.T) {
	repo := &mockSubRepo{}
	// 3 ticks in ~90ms: initial + 2 ticks at 30ms interval
	runExpirer(t, repo, 90*time.Millisecond, 30*time.Millisecond)
	if repo.callCount < 2 {
		t.Errorf("expected >= 2 calls, got %d", repo.callCount)
	}
}

func TestSubscriptionExpirer_LogsExpiredAccounts(t *testing.T) {
	uid := uuid.New()
	repo := &mockSubRepo{
		expireReturn: []*repository.Subscription{
			{UserID: uid, Plan: "free", Status: "expired"},
		},
	}
	// Should not panic even when items are returned
	runExpirer(t, repo, 60*time.Millisecond, 1*time.Hour)
}

func TestSubscriptionExpirer_DBError_DoesNotPanic(t *testing.T) {
	repo := &mockSubRepo{expireErr: context.DeadlineExceeded}
	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("expirer panicked on DB error: %v", r)
		}
	}()
	runExpirer(t, repo, 60*time.Millisecond, 1*time.Hour)
}

func TestSubscriptionExpirer_StopsOnContextCancel(t *testing.T) {
	repo := &mockSubRepo{}
	expirer := cron.NewSubscriptionExpirer(repo, testLog).WithInterval(10 * time.Millisecond)

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
		// ✓ goroutine exited cleanly
	case <-time.After(300 * time.Millisecond):
		t.Fatal("expirer did not stop within 300ms after context cancel")
	}
}
