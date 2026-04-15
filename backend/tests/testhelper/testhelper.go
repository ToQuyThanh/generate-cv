// Package testhelper cung cấp các utility dùng chung cho toàn bộ test suite.
package testhelper

import (
	"os"
	"testing"

	"github.com/yourname/generate-cv/config"
)

// DefaultConfig trả về config mặc định cho môi trường test (không cần .env).
func DefaultConfig() *config.Config {
	return &config.Config{
		App: config.AppConfig{
			Env:  "test",
			Port: "8080",
		},
		DB: config.DBConfig{
			Host:     "localhost",
			Port:     "5432",
			User:     "postgres",
			Password: "postgres",
			Name:     "generate_cv_test",
			SSLMode:  "disable",
		},
		Redis: config.RedisConfig{
			Addr:     "localhost:6379",
			Password: "",
		},
		JWT: config.JWTConfig{
			Secret:         "test-secret-at-least-32-characters-long",
			AccessTTLMin:   15,
			RefreshTTLDays: 30,
		},
	}
}

// SetEnv tạm thời set biến môi trường trong test, tự dọn sau khi test xong.
func SetEnv(t *testing.T, key, value string) {
	t.Helper()
	old, existed := os.LookupEnv(key)
	os.Setenv(key, value)
	t.Cleanup(func() {
		if existed {
			os.Setenv(key, old)
		} else {
			os.Unsetenv(key)
		}
	})
}

// UnsetEnv tạm thời xoá biến môi trường trong test, tự phục hồi sau.
func UnsetEnv(t *testing.T, key string) {
	t.Helper()
	old, existed := os.LookupEnv(key)
	os.Unsetenv(key)
	t.Cleanup(func() {
		if existed {
			os.Setenv(key, old)
		}
	})
}
