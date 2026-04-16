package profileagent

import (
	"context"
	"fmt"
)

// EditProfile applies a natural language editing instruction to a structured profile
func (c *Client) EditProfile(ctx context.Context, profile map[string]interface{}, instruction string) (*EditResponse, error) {
	if profile == nil {
		return nil, fmt.Errorf("profile cannot be nil")
	}
	if instruction == "" {
		return nil, fmt.Errorf("instruction cannot be empty")
	}

	req := EditRequest{
		Profile:     profile,
		Instruction: instruction,
	}

	var resp EditResponse
	if err := c.doJSONRequest(ctx, "POST", "/edit", req, &resp); err != nil {
		return nil, fmt.Errorf("edit profile failed: %w", err)
	}

	return &resp, nil
}
