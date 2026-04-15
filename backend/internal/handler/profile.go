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

// ProfileServiceIface is the subset of ProfileService the handler depends on.
type ProfileServiceIface interface {
	List(ctx context.Context, userID uuid.UUID) (*model.ListProfilesResponse, error)
	Create(ctx context.Context, userID uuid.UUID, req model.CreateProfileRequest) (*model.ProfileResponse, error)
	Get(ctx context.Context, userID, profileID uuid.UUID) (*model.ProfileResponse, error)
	Update(ctx context.Context, userID, profileID uuid.UUID, req model.UpdateProfileRequest) (*model.ProfileResponse, error)
	Delete(ctx context.Context, userID, profileID uuid.UUID) error
	SetDefault(ctx context.Context, userID, profileID uuid.UUID) error
	// Sections
	CreateSection(ctx context.Context, userID, profileID uuid.UUID, req model.CreateSectionRequest) (*model.ProfileSectionResponse, error)
	ListSections(ctx context.Context, userID, profileID uuid.UUID) ([]model.ProfileSectionResponse, error)
	UpdateSection(ctx context.Context, userID, profileID, sectionID uuid.UUID, req model.UpdateSectionRequest) (*model.ProfileSectionResponse, error)
	DeleteSection(ctx context.Context, userID, profileID, sectionID uuid.UUID) error
	ReorderSections(ctx context.Context, userID, profileID uuid.UUID, ids []uuid.UUID) error
	// Items
	CreateItem(ctx context.Context, userID, profileID, sectionID uuid.UUID, req model.CreateItemRequest) (*model.ProfileItemResponse, error)
	UpdateItem(ctx context.Context, userID, profileID, sectionID, itemID uuid.UUID, req model.UpdateItemRequest) (*model.ProfileItemResponse, error)
	DeleteItem(ctx context.Context, userID, profileID, sectionID, itemID uuid.UUID) error
	ReorderItems(ctx context.Context, userID, profileID, sectionID uuid.UUID, ids []uuid.UUID) error
}

type ProfileHandler struct {
	svc ProfileServiceIface
}

func NewProfileHandler(svc ProfileServiceIface) *ProfileHandler {
	return &ProfileHandler{svc: svc}
}

// ─── GET /profiles ────────────────────────────────────────────────────────────

func (h *ProfileHandler) List(c *gin.Context) {
	userID := middleware.GetUserID(c)
	resp, err := h.svc.List(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list profiles"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// ─── POST /profiles ───────────────────────────────────────────────────────────

func (h *ProfileHandler) Create(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var req model.CreateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.svc.Create(c.Request.Context(), userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create profile"})
		return
	}
	c.JSON(http.StatusCreated, resp)
}

// ─── GET /profiles/:id ────────────────────────────────────────────────────────

func (h *ProfileHandler) Get(c *gin.Context) {
	userID := middleware.GetUserID(c)
	profileID, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	resp, err := h.svc.Get(c.Request.Context(), userID, profileID)
	if err != nil {
		if isProfileNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get profile"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// ─── PUT /profiles/:id ────────────────────────────────────────────────────────

func (h *ProfileHandler) Update(c *gin.Context) {
	userID := middleware.GetUserID(c)
	profileID, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	var req model.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.svc.Update(c.Request.Context(), userID, profileID, req)
	if err != nil {
		if isProfileNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// ─── DELETE /profiles/:id ─────────────────────────────────────────────────────

func (h *ProfileHandler) Delete(c *gin.Context) {
	userID := middleware.GetUserID(c)
	profileID, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	if err := h.svc.Delete(c.Request.Context(), userID, profileID); err != nil {
		if isProfileNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete profile"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "profile deleted"})
}

// ─── PATCH /profiles/:id/default ─────────────────────────────────────────────

func (h *ProfileHandler) SetDefault(c *gin.Context) {
	userID := middleware.GetUserID(c)
	profileID, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	if err := h.svc.SetDefault(c.Request.Context(), userID, profileID); err != nil {
		if isProfileNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to set default"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "default profile updated"})
}

// ─── GET /profiles/:id/sections ──────────────────────────────────────────────

func (h *ProfileHandler) ListSections(c *gin.Context) {
	userID := middleware.GetUserID(c)
	profileID, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	sections, err := h.svc.ListSections(c.Request.Context(), userID, profileID)
	if err != nil {
		if isProfileNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list sections"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": sections})
}

// ─── POST /profiles/:id/sections ─────────────────────────────────────────────

func (h *ProfileHandler) CreateSection(c *gin.Context) {
	userID := middleware.GetUserID(c)
	profileID, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	var req model.CreateSectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.svc.CreateSection(c.Request.Context(), userID, profileID, req)
	if err != nil {
		if isProfileNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create section"})
		return
	}
	c.JSON(http.StatusCreated, resp)
}

// ─── PUT /profiles/:id/sections/:sectionId ───────────────────────────────────

func (h *ProfileHandler) UpdateSection(c *gin.Context) {
	userID := middleware.GetUserID(c)
	profileID, err := parseUUID(c, "id")
	if err != nil {
		return
	}
	sectionID, err := parseUUID(c, "sectionId")
	if err != nil {
		return
	}

	var req model.UpdateSectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.svc.UpdateSection(c.Request.Context(), userID, profileID, sectionID, req)
	if err != nil {
		if isProfileNotFound(err) || isNotFound(err, service.ErrSectionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update section"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// ─── DELETE /profiles/:id/sections/:sectionId ────────────────────────────────

func (h *ProfileHandler) DeleteSection(c *gin.Context) {
	userID := middleware.GetUserID(c)
	profileID, err := parseUUID(c, "id")
	if err != nil {
		return
	}
	sectionID, err := parseUUID(c, "sectionId")
	if err != nil {
		return
	}

	if err := h.svc.DeleteSection(c.Request.Context(), userID, profileID, sectionID); err != nil {
		if isProfileNotFound(err) || isNotFound(err, service.ErrSectionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete section"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "section deleted"})
}

// ─── PATCH /profiles/:id/sections/reorder ────────────────────────────────────

func (h *ProfileHandler) ReorderSections(c *gin.Context) {
	userID := middleware.GetUserID(c)
	profileID, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	var req model.ReorderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.svc.ReorderSections(c.Request.Context(), userID, profileID, req.Order); err != nil {
		if isProfileNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reorder sections"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "sections reordered"})
}

// ─── POST /sections/:sectionId/items ─────────────────────────────────────────

func (h *ProfileHandler) CreateItem(c *gin.Context) {
	userID := middleware.GetUserID(c)
	profileID, err := parseUUID(c, "id")
	if err != nil {
		return
	}
	sectionID, err := parseUUID(c, "sectionId")
	if err != nil {
		return
	}

	var req model.CreateItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.svc.CreateItem(c.Request.Context(), userID, profileID, sectionID, req)
	if err != nil {
		if isProfileNotFound(err) || isNotFound(err, service.ErrSectionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create item"})
		return
	}
	c.JSON(http.StatusCreated, resp)
}

// ─── PUT /profiles/:id/sections/:sectionId/items/:itemId ─────────────────────

func (h *ProfileHandler) UpdateItem(c *gin.Context) {
	userID := middleware.GetUserID(c)
	profileID, err := parseUUID(c, "id")
	if err != nil {
		return
	}
	sectionID, err := parseUUID(c, "sectionId")
	if err != nil {
		return
	}
	itemID, err := parseUUID(c, "itemId")
	if err != nil {
		return
	}

	var req model.UpdateItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.svc.UpdateItem(c.Request.Context(), userID, profileID, sectionID, itemID, req)
	if err != nil {
		if isProfileNotFound(err) || isNotFound(err, service.ErrSectionNotFound) || isNotFound(err, service.ErrItemNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update item"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// ─── DELETE /profiles/:id/sections/:sectionId/items/:itemId ──────────────────

func (h *ProfileHandler) DeleteItem(c *gin.Context) {
	userID := middleware.GetUserID(c)
	profileID, err := parseUUID(c, "id")
	if err != nil {
		return
	}
	sectionID, err := parseUUID(c, "sectionId")
	if err != nil {
		return
	}
	itemID, err := parseUUID(c, "itemId")
	if err != nil {
		return
	}

	if err := h.svc.DeleteItem(c.Request.Context(), userID, profileID, sectionID, itemID); err != nil {
		if isProfileNotFound(err) || isNotFound(err, service.ErrSectionNotFound) || isNotFound(err, service.ErrItemNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete item"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "item deleted"})
}

// ─── PATCH /profiles/:id/sections/:sectionId/items/reorder ───────────────────

func (h *ProfileHandler) ReorderItems(c *gin.Context) {
	userID := middleware.GetUserID(c)
	profileID, err := parseUUID(c, "id")
	if err != nil {
		return
	}
	sectionID, err := parseUUID(c, "sectionId")
	if err != nil {
		return
	}

	var req model.ReorderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.svc.ReorderItems(c.Request.Context(), userID, profileID, sectionID, req.Order); err != nil {
		if isProfileNotFound(err) || isNotFound(err, service.ErrSectionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reorder items"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "items reordered"})
}

// ─── Error helpers ────────────────────────────────────────────────────────────

func isProfileNotFound(err error) bool {
	return errors.Is(err, service.ErrProfileNotFound) || errors.Is(err, service.ErrProfileForbidden)
}

func isNotFound(err error, target error) bool {
	return errors.Is(err, target)
}
