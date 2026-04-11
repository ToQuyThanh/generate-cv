// Package handler — HTTP handlers for User endpoints.
package handler

import (
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/yourname/generate-cv/internal/middleware"
	"github.com/yourname/generate-cv/internal/model"
	"github.com/yourname/generate-cv/internal/service"
)

// ─── Interface ────────────────────────────────────────────────────────────────

// UserServiceIface is the subset of UserService the handler depends on.
type UserServiceIface interface {
	GetMe(ctx context.Context, userID uuid.UUID) (*model.UserWithSubResponse, error)
	UpdateMe(ctx context.Context, userID uuid.UUID, req model.UpdateUserRequest) (*model.UserWithSubResponse, error)
	DeleteMe(ctx context.Context, userID uuid.UUID) error
	GetSubscription(ctx context.Context, userID uuid.UUID) (*model.SubscriptionResponse, error)
}

// ─── Handler ──────────────────────────────────────────────────────────────────

type UserHandler struct {
	svc UserServiceIface
}

func NewUserHandler(svc UserServiceIface) *UserHandler {
	return &UserHandler{svc: svc}
}

// ─── GET /users/me ────────────────────────────────────────────────────────────

func (h *UserHandler) GetMe(c *gin.Context) {
	userID := middleware.GetUserID(c)

	resp, err := h.svc.GetMe(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, service.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ─── PATCH /users/me ─────────────────────────────────────────────────────────

func (h *UserHandler) UpdateMe(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var req model.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.svc.UpdateMe(c.Request.Context(), userID, req)
	if err != nil {
		if errors.Is(err, service.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ─── DELETE /users/me ─────────────────────────────────────────────────────────

func (h *UserHandler) DeleteMe(c *gin.Context) {
	userID := middleware.GetUserID(c)

	if err := h.svc.DeleteMe(c.Request.Context(), userID); err != nil {
		if errors.Is(err, service.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "account deleted"})
}

// ─── GET /users/me/subscription ──────────────────────────────────────────────

func (h *UserHandler) GetSubscription(c *gin.Context) {
	userID := middleware.GetUserID(c)

	resp, err := h.svc.GetSubscription(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get subscription"})
		return
	}

	c.JSON(http.StatusOK, resp)
}
