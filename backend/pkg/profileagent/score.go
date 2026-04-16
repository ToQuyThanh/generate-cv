package profileagent

import (
	"context"
	"fmt"
)

// ScoreProfile evaluates a profile across five dimensions
func (c *Client) ScoreProfile(ctx context.Context, profile map[string]interface{}, jobDescription, userPrompt string) (*ScoreResponse, error) {
	if profile == nil {
		return nil, fmt.Errorf("profile cannot be nil")
	}

	req := ScoreRequest{
		Profile:         profile,
		JobDescription:  jobDescription,
		UserPrompt:      userPrompt,
	}

	var resp ScoreResponse
	if err := c.doJSONRequest(ctx, "POST", "/score", req, &resp); err != nil {
		return nil, fmt.Errorf("score profile failed: %w", err)
	}

	return &resp, nil
}
