package service

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"path/filepath"
	"strings"
	"time"

	"github.com/yourname/generate-cv/backend/pkg/profileagent"
)

// AgentService provides business logic for Profile Processing Agent integration
type AgentService struct {
	client     *profileagent.Client
	usageLogFn func(ctx context.Context, userID string, endpoint string, usage profileagent.TokenUsage) error
}

// NewAgentService creates a new AgentService
func NewAgentService(client *profileagent.Client) *AgentService {
	return &AgentService{
		client:     client,
		usageLogFn: nil, // Can be set later if usage logging is needed
	}
}

// SetUsageLogger sets a function to log token usage
func (s *AgentService) SetUsageLogger(fn func(ctx context.Context, userID string, endpoint string, usage profileagent.TokenUsage) error) {
	s.usageLogFn = fn
}

// logUsage logs token usage if a logger is configured
func (s *AgentService) logUsage(ctx context.Context, userID string, endpoint string, usage profileagent.TokenUsage) {
	if s.usageLogFn != nil {
		// Fire and forget - don't block the response
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			_ = s.usageLogFn(ctx, userID, endpoint, usage)
		}()
	}
}

// validateFileType checks if the file extension is allowed
func (s *AgentService) validateFileType(filename string) error {
	ext := strings.ToLower(filepath.Ext(filename))
	allowed := map[string]bool{
		".pdf":  true,
		".docx": true,
		".md":   true,
		".txt":  true,
	}
	if !allowed[ext] {
		return fmt.Errorf("unsupported file type '%s', allowed: pdf, docx, md, txt", ext)
	}
	return nil
}

// validateFileSize checks if the file size is within limits (10MB)
func (s *AgentService) validateFileSize(size int64) error {
	const maxSize = 10 * 1024 * 1024 // 10MB
	if size > maxSize {
		return fmt.Errorf("file too large: %d bytes (max: 10MB)", size)
	}
	return nil
}

// ParseCV parses a CV file and returns a structured profile
func (s *AgentService) ParseCV(ctx context.Context, userID string, file multipart.File, filename string, size int64, prompt string) (*profileagent.ParseResponse, error) {
	if err := s.validateFileType(filename); err != nil {
		return nil, err
	}
	if err := s.validateFileSize(size); err != nil {
		return nil, err
	}

	resp, err := s.client.ParseCV(ctx, file, filename, prompt)
	if err != nil {
		return nil, fmt.Errorf("parse cv failed: %w", err)
	}

	s.logUsage(ctx, userID, "parse", resp.Usage)
	return resp, nil
}

// EditProfile edits a profile using natural language instruction
func (s *AgentService) EditProfile(ctx context.Context, userID string, profile map[string]interface{}, instruction string) (*profileagent.EditResponse, error) {
	if profile == nil {
		return nil, fmt.Errorf("profile is required")
	}
	if strings.TrimSpace(instruction) == "" {
		return nil, fmt.Errorf("instruction is required")
	}

	resp, err := s.client.EditProfile(ctx, profile, instruction)
	if err != nil {
		return nil, fmt.Errorf("edit profile failed: %w", err)
	}

	s.logUsage(ctx, userID, "edit", resp.Usage)
	return resp, nil
}

// TailorProfile tailors a profile to a job description
func (s *AgentService) TailorProfile(ctx context.Context, userID string, profile map[string]interface{}, jobDescription, userPrompt string) (*profileagent.TailorResponse, error) {
	if profile == nil {
		return nil, fmt.Errorf("profile is required")
	}
	if strings.TrimSpace(jobDescription) == "" {
		return nil, fmt.Errorf("job description is required")
	}

	resp, err := s.client.TailorProfile(ctx, profile, jobDescription, userPrompt)
	if err != nil {
		return nil, fmt.Errorf("tailor profile failed: %w", err)
	}

	s.logUsage(ctx, userID, "tailor", resp.Usage)
	return resp, nil
}

// ScoreProfile scores a profile
func (s *AgentService) ScoreProfile(ctx context.Context, userID string, profile map[string]interface{}, jobDescription, userPrompt string) (*profileagent.ScoreResponse, error) {
	if profile == nil {
		return nil, fmt.Errorf("profile is required")
	}

	resp, err := s.client.ScoreProfile(ctx, profile, jobDescription, userPrompt)
	if err != nil {
		return nil, fmt.Errorf("score profile failed: %w", err)
	}

	s.logUsage(ctx, userID, "score", resp.Usage)
	return resp, nil
}

// RunPipeline runs the full pipeline
func (s *AgentService) RunPipeline(ctx context.Context, userID string, file multipart.File, filename string, size int64, jobDescription, prompt string) (*profileagent.PipelineResponse, error) {
	if err := s.validateFileType(filename); err != nil {
		return nil, err
	}
	if err := s.validateFileSize(size); err != nil {
		return nil, err
	}

	resp, err := s.client.RunPipeline(ctx, file, filename, jobDescription, prompt)
	if err != nil {
		return nil, fmt.Errorf("pipeline failed: %w", err)
	}

	s.logUsage(ctx, userID, "pipeline", resp.Usage)
	return resp, nil
}

// HealthCheck checks if the Agent service is healthy
func (s *AgentService) HealthCheck(ctx context.Context) bool {
	return s.client.IsHealthy(ctx)
}

// ReadFile reads all content from a multipart file
func ReadFile(file multipart.File) ([]byte, error) {
	defer file.Close()
	return io.ReadAll(file)
}
