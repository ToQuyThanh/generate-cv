package jwtutil_test

import (
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/yourname/generate-cv/pkg/jwtutil"
)

const testSecret = "test-secret-at-least-32-chars-long!!"

func TestSign_And_Parse_Success(t *testing.T) {
	userID := uuid.New()

	token, err := jwtutil.Sign(testSecret, userID, 15*time.Minute)
	if err != nil {
		t.Fatalf("Sign failed: %v", err)
	}
	if token == "" {
		t.Fatal("expected non-empty token")
	}

	claims, err := jwtutil.Parse(testSecret, token)
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}
	if claims.UserID != userID {
		t.Errorf("expected userID %s, got %s", userID, claims.UserID)
	}
}

func TestParse_WrongSecret(t *testing.T) {
	userID := uuid.New()
	token, _ := jwtutil.Sign(testSecret, userID, 15*time.Minute)

	_, err := jwtutil.Parse("wrong-secret-also-long-enough-12345", token)
	if err != jwtutil.ErrTokenInvalid {
		t.Errorf("expected ErrTokenInvalid, got: %v", err)
	}
}

func TestParse_ExpiredToken(t *testing.T) {
	userID := uuid.New()
	// TTL of -1 second → already expired
	token, err := jwtutil.Sign(testSecret, userID, -1*time.Second)
	if err != nil {
		t.Fatalf("Sign failed: %v", err)
	}

	_, err = jwtutil.Parse(testSecret, token)
	if err != jwtutil.ErrTokenExpired {
		t.Errorf("expected ErrTokenExpired, got: %v", err)
	}
}

func TestParse_MalformedToken(t *testing.T) {
	_, err := jwtutil.Parse(testSecret, "this.is.garbage")
	if err != jwtutil.ErrTokenInvalid {
		t.Errorf("expected ErrTokenInvalid, got: %v", err)
	}
}

func TestParse_EmptyToken(t *testing.T) {
	_, err := jwtutil.Parse(testSecret, "")
	if err == nil {
		t.Error("expected error for empty token")
	}
}
