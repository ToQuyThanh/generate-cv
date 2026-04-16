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

// RunPipeline runs the full pipeline: parse → tailor (if JD provided) → score (if JD provided)
func (c *Client) RunPipeline(ctx context.Context, file io.Reader, filename, jobDescription, prompt string) (*PipelineResponse, error) {
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

	// Add optional job description
	if jobDescription != "" {
		if err := writer.WriteField("job_description", jobDescription); err != nil {
			return nil, fmt.Errorf("failed to write job_description field: %w", err)
		}
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

	// Perform request with extended timeout for pipeline
	url := c.config.BaseURL + "/pipeline"
	req, err := http.NewRequestWithContext(ctx, "POST", url, &body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())

	// Use extended timeout for pipeline operations (can take 1-2 minutes)
	client := &http.Client{Timeout: 120 * time.Second}
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
			return nil, fmt.Errorf("pipeline failed (%d): %s", resp.StatusCode, errResp.Detail)
		}
		return nil, fmt.Errorf("pipeline failed (%d): %s", resp.StatusCode, string(respBody))
	}

	var result PipelineResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &result, nil
}
