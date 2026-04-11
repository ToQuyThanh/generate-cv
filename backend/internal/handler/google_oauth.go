package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"github.com/yourname/generate-cv/config"
)

// OAuthServiceIface is the subset used by the OAuth handler.
type OAuthServiceIface interface {
	UpsertOAuthUser(ctx context.Context, email, fullName string, avatarURL *string) (*struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
	}, error)
}

// GoogleHandler handles Google OAuth2 redirect and callback.
type GoogleHandler struct {
	oauthCfg *oauth2.Config
	authSvc  interface {
		UpsertOAuthUser(ctx context.Context, email, fullName string, avatarURL *string) (interface{}, error)
	}
}

func NewGoogleHandler(cfg *config.Config) *GoogleHandler {
	oauthCfg := &oauth2.Config{
		ClientID:     cfg.Google.ClientID,
		ClientSecret: cfg.Google.ClientSecret,
		RedirectURL:  cfg.Google.RedirectURL,
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}
	return &GoogleHandler{oauthCfg: oauthCfg}
}

// SetAuthService injects the auth service after construction (breaks circular import).
func (h *GoogleHandler) SetAuthService(svc *AuthServiceWithOAuth) {
	h.authSvc = svc
}

// GET /auth/google — redirect to Google consent screen
func (h *GoogleHandler) Redirect(c *gin.Context) {
	url := h.oauthCfg.AuthCodeURL("state-token", oauth2.AccessTypeOffline)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// GET /auth/google/callback — exchange code for token, upsert user
func (h *GoogleHandler) Callback(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing code"})
		return
	}

	token, err := h.oauthCfg.Exchange(c.Request.Context(), code)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "oauth exchange failed"})
		return
	}

	userInfo, err := fetchGoogleUserInfo(c.Request.Context(), h.oauthCfg, token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user info"})
		return
	}

	if h.authSvc == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "oauth service not configured"})
		return
	}

	resp, err := h.authSvc.UpsertOAuthUser(c.Request.Context(), userInfo.Email, userInfo.Name, &userInfo.Picture)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "oauth login failed"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ─── Google userinfo ──────────────────────────────────────────────────────────

type googleUserInfo struct {
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

func fetchGoogleUserInfo(ctx context.Context, cfg *oauth2.Config, token *oauth2.Token) (*googleUserInfo, error) {
	client := cfg.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, fmt.Errorf("get userinfo: %w", err)
	}
	defer resp.Body.Close()

	var info googleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("decode userinfo: %w", err)
	}
	return &info, nil
}

// AuthServiceWithOAuth wraps AuthService to satisfy the narrow interface above.
// This avoids import cycles between handler and service packages.
type AuthServiceWithOAuth struct {
	inner interface {
		UpsertOAuthUser(ctx context.Context, email, fullName string, avatarURL *string) (interface{}, error)
	}
}
