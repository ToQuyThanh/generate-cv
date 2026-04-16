package profileagent

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/cenkalti/backoff/v4"
)

// Config holds configuration for the Profile Agent client
type Config struct {
	BaseURL    string
	Timeout    time.Duration
	MaxRetries int
	RetryDelay time.Duration
}

// DefaultConfig returns a default configuration
func DefaultConfig() Config {
	return Config{
		BaseURL:    "http://localhost:8000",
		Timeout:    30 * time.Second,
		MaxRetries: 3,
		RetryDelay: 1 * time.Second,
	}
}

// Client is an HTTP client for the Profile Processing Agent API
type Client struct {
	config     Config
	httpClient *http.Client
}

// NewClient creates a new Profile Agent client
func NewClient(config Config) *Client {
	if config.BaseURL == "" {
		config.BaseURL = DefaultConfig().BaseURL
	}
	config.BaseURL = strings.TrimRight(strings.TrimSpace(config.BaseURL), "/")
	if config.Timeout == 0 {
		config.Timeout = DefaultConfig().Timeout
	}
	if config.MaxRetries == 0 {
		config.MaxRetries = DefaultConfig().MaxRetries
	}
	if config.RetryDelay == 0 {
		config.RetryDelay = DefaultConfig().RetryDelay
	}

	return &Client{
		config: config,
		httpClient: &http.Client{
			Timeout: config.Timeout,
		},
	}
}

// doRequest performs an HTTP request with retry logic
func (c *Client) doRequest(ctx context.Context, method, path string, body io.Reader, contentType string) (*http.Response, error) {
	url := c.config.BaseURL + path

	operation := func() (*http.Response, error) {
		// Reset reader position for retries (bytes.Reader implements io.Seeker)
		if seeker, ok := body.(io.Seeker); ok {
			if _, err := seeker.Seek(0, io.SeekStart); err != nil {
				return nil, fmt.Errorf("failed to reset request body: %w", err)
			}
		}
		req, err := http.NewRequestWithContext(ctx, method, url, body)
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}

		if contentType != "" {
			req.Header.Set("Content-Type", contentType)
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("failed to execute request: %w", err)
		}

		// Retry on 5xx errors or network errors
		if resp.StatusCode >= 500 {
			resp.Body.Close()
			return nil, fmt.Errorf("server error: %d", resp.StatusCode)
		}

		return resp, nil
	}

	// Configure exponential backoff
	notify := func(err error, duration time.Duration) {
		log.Printf("[profileagent] retrying %s %s after error: %v (wait %.1fs)", method, url, err, duration.Seconds())
	}

	backOffConfig := backoff.NewExponentialBackOff()
	backOffConfig.InitialInterval = c.config.RetryDelay
	backOffConfig.MaxInterval = 5 * time.Second
	backOffConfig.MaxElapsedTime = c.config.Timeout

	return backoff.RetryNotifyWithData(operation, backoff.WithMaxRetries(backOffConfig, uint64(c.config.MaxRetries)), notify)
}

// doJSONRequest performs a JSON request and decodes the response
func (c *Client) doJSONRequest(ctx context.Context, method, path string, requestBody interface{}, response interface{}) error {
	var body io.ReadSeeker
	var contentType string

	if requestBody != nil {
		jsonData, err := json.Marshal(requestBody)
		if err != nil {
			return fmt.Errorf("failed to marshal request: %w", err)
		}
		body = bytes.NewReader(jsonData)
		contentType = "application/json"
	}

	resp, err := c.doRequest(ctx, method, path, body, contentType)
	if err != nil {
		log.Printf("[profileagent] %s %s%s failed: %v", method, c.config.BaseURL, path, err)
		return err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode >= 400 {
		var errResp ErrorResponse
		if err := json.Unmarshal(respBody, &errResp); err == nil && errResp.Detail != "" {
			return fmt.Errorf("agent API error (%d): %s", resp.StatusCode, errResp.Detail)
		}
		return fmt.Errorf("agent API error (%d): %s", resp.StatusCode, string(respBody))
	}

	if response != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, response); err != nil {
			return fmt.Errorf("failed to unmarshal response: %w", err)
		}
	}

	return nil
}

// Health checks if the Agent service is healthy
func (c *Client) Health(ctx context.Context) (map[string]interface{}, error) {
	resp, err := c.doRequest(ctx, "GET", "/health", nil, "")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode health response: %w", err)
	}

	return result, nil
}

// IsHealthy returns true if the Agent service is healthy
func (c *Client) IsHealthy(ctx context.Context) bool {
	_, err := c.Health(ctx)
	return err == nil
}

// ValidateFileType checks if the file extension is supported
func ValidateFileType(filename string) bool {
	ext := filepath.Ext(filename)
	switch ext {
	case ".pdf", ".docx", ".md", ".txt":
		return true
	default:
		return false
	}
}

// GetMimeType returns the MIME type for a file extension
func GetMimeType(filename string) string {
	ext := filepath.Ext(filename)
	switch ext {
	case ".pdf":
		return "application/pdf"
	case ".docx":
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	case ".md":
		return "text/markdown"
	case ".txt":
		return "text/plain"
	default:
		return "application/octet-stream"
	}
}
