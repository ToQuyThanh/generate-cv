// Package sentryutil wraps Sentry SDK initialisation.
package sentryutil

import (
	"fmt"
	"time"

	"github.com/getsentry/sentry-go"
)

// Init initialises the Sentry SDK. It is a no-op when dsn is empty.
// Call defer sentryutil.Flush() in main() after Init().
func Init(dsn, env, release string) error {
	if dsn == "" {
		// No DSN configured — silently skip (dev / test environment).
		return nil
	}

	if err := sentry.Init(sentry.ClientOptions{
		Dsn:              dsn,
		Environment:      env,
		Release:          release,
		TracesSampleRate: 0.1,
		AttachStacktrace: true,
	}); err != nil {
		return fmt.Errorf("sentry init: %w", err)
	}

	return nil
}

// Flush waits for buffered events to be sent to Sentry.
// Call this as defer sentryutil.Flush() at the top of main().
func Flush() {
	sentry.Flush(2 * time.Second)
}

// CaptureError sends a non-fatal error to Sentry.
func CaptureError(err error) {
	if err == nil {
		return
	}
	sentry.CaptureException(err)
}
