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
	"github.com/yourname/generate-cv/internal/model"
)

// OAuthServiceIface is the narrow interface the Google handler depends on.
// *service.AuthService satisfies this automatically.
type OAuthServiceIface interface {
	UpsertOAuthUser(ctx context.Context, email, fullName string, avatarURL *string) (*model.AuthResponse, error)
}

// GoogleHandler handles Google OAuth2 redirect and callback.
type GoogleHandler struct {
	oauthCfg *oauth2.Config
	authSvc  OAuthServiceIface
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

// SetAuthService injects the auth service after construction.
func (h *GoogleHandler) SetAuthService(svc OAuthServiceIface) {
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
