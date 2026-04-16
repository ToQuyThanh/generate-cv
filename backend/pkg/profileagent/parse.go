package profileagent

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"
)

// ParseCV uploads a CV file and returns a structured profile
func (c *Client) ParseCV(ctx context.Context, file io.Reader, filename string, prompt string) (*ParseResponse, error) {
	if !ValidateFileType(filename) {
		return nil, fmt.Errorf("unsupported file type: %s (supported: pdf, docx, md, txt)", filename)
	}

	// Build multipart form
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	// Add file
	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return nil, fmt.Errorf("failed to create form file: %w", err)
	}

	if _, err := io.Copy(part, file); err != nil {
		return nil, fmt.Errorf("failed to copy file: %w", err)
	}

	// Add optional prompt
	if prompt != "" {
		if err := writer.WriteField("prompt", prompt); err != nil {
			return nil, fmt.Errorf("failed to write prompt field: %w", err)
		}
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to close writer: %w", err)
	}

	// Perform request with extended timeout for file upload
	url := c.config.BaseURL + "/parse"
	req, err := http.NewRequestWithContext(ctx, "POST", url, &body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())

	// Use extended timeout for parse operations
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		var errResp ErrorResponse
		if err := json.Unmarshal(respBody, &errResp); err == nil && errResp.Detail != "" {
			return nil, fmt.Errorf("parse failed (%d): %s", resp.StatusCode, errResp.Detail)
		}
		return nil, fmt.Errorf("parse failed (%d): %s", resp.StatusCode, string(respBody))
	}

	var result ParseResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &result, nil
}
