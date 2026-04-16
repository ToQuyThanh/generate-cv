package profileagent

import (
	"context"
	"fmt"
)

// TailorProfile rewrites a profile to highlight skills and experiences relevant to a job description
func (c *Client) TailorProfile(ctx context.Context, profile map[string]interface{}, jobDescription, userPrompt string) (*TailorResponse, error) {
	if profile == nil {
		return nil, fmt.Errorf("profile cannot be nil")
	}
	if jobDescription == "" {
		return nil, fmt.Errorf("job description cannot be empty")
	}

	req := TailorRequest{
		Profile:         profile,
		JobDescription:  jobDescription,
		UserPrompt:      userPrompt,
	}

	var resp TailorResponse
	if err := c.doJSONRequest(ctx, "POST", "/tailor", req, &resp); err != nil {
		return nil, fmt.Errorf("tailor profile failed: %w", err)
	}

	return &resp, nil
}
