// Package service contains business logic for the CV domain.
package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/yourname/generate-cv/internal/model"
	"github.com/yourname/generate-cv/internal/repository"
)

// ─── Sentinel errors ──────────────────────────────────────────────────────────

var (
	ErrCVNotFound  = errors.New("cv not found")
	ErrCVForbidden = errors.New("cv not found") // intentionally same message — return 404 not 403
)

// ─── Pagination constants ─────────────────────────────────────────────────────

const (
	defaultPerPage = 10
	maxPerPage     = 50
)

// ─── CVRepo interface (for mocking in tests) ──────────────────────────────────

type CVRepo interface {
	Create(ctx context.Context, userID uuid.UUID, title, templateID, colorTheme string, sections json.RawMessage) (*repository.CV, error)
	GetByID(ctx context.Context, id uuid.UUID) (*repository.CV, error)
	ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]repository.CV, error)
	CountByUser(ctx context.Context, userID uuid.UUID) (int64, error)
	UpdateFields(ctx context.Context, id uuid.UUID, title, templateID, colorTheme *string, sections json.RawMessage) (*repository.CV, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

// ─── CVService ────────────────────────────────────────────────────────────────

type CVService struct {
	cvs CVRepo
}

func NewCVService(cvs CVRepo) *CVService {
	return &CVService{cvs: cvs}
}

// ─── List ─────────────────────────────────────────────────────────────────────

func (s *CVService) List(ctx context.Context, userID uuid.UUID, q model.ListCVsQuery) (*model.ListCVsResponse, error) {
	// Normalise pagination
	page := q.Page
	if page < 1 {
		page = 1
	}
	perPage := q.PerPage
	if perPage < 1 {
		perPage = defaultPerPage
	}
	if perPage > maxPerPage {
		perPage = maxPerPage
	}
	offset := (page - 1) * perPage

	cvs, err := s.cvs.ListByUser(ctx, userID, perPage, offset)
	if err != nil {
		return nil, fmt.Errorf("list cvs: %w", err)
	}

	total, err := s.cvs.CountByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("count cvs: %w", err)
	}

	totalPages := int(total) / perPage
	if int(total)%perPage != 0 {
		totalPages++
	}

	data := make([]model.CVResponse, 0, len(cvs))
	for _, cv := range cvs {
		data = append(data, toResponse(cv))
	}

	return &model.ListCVsResponse{
		Data:       data,
		Total:      total,
		Page:       page,
		PerPage:    perPage,
		TotalPages: totalPages,
	}, nil
}

// ─── Create ───────────────────────────────────────────────────────────────────

func (s *CVService) Create(ctx context.Context, userID uuid.UUID, req model.CreateCVRequest) (*model.CVResponse, error) {
	sections := req.Sections
	if sections == nil {
		sections = json.RawMessage("[]")
	}

	cv, err := s.cvs.Create(ctx, userID, req.Title, req.TemplateID, req.ColorTheme, sections)
	if err != nil {
		return nil, fmt.Errorf("create cv: %w", err)
	}

	resp := toResponse(*cv)
	return &resp, nil
}

// ─── Get ──────────────────────────────────────────────────────────────────────

func (s *CVService) Get(ctx context.Context, userID, cvID uuid.UUID) (*model.CVResponse, error) {
	cv, err := s.cvs.GetByID(ctx, cvID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCVNotFound
		}
		return nil, fmt.Errorf("get cv: %w", err)
	}

	if cv.UserID != userID {
		// Return 404 not 403 — don't confirm existence to other users
		return nil, ErrCVForbidden
	}

	resp := toResponse(*cv)
	return &resp, nil
}

// ─── Update ───────────────────────────────────────────────────────────────────

func (s *CVService) Update(ctx context.Context, userID, cvID uuid.UUID, req model.UpdateCVRequest) (*model.CVResponse, error) {
	// Ownership check first
	existing, err := s.cvs.GetByID(ctx, cvID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCVNotFound
		}
		return nil, fmt.Errorf("get cv for update: %w", err)
	}
	if existing.UserID != userID {
		return nil, ErrCVForbidden
	}

	cv, err := s.cvs.UpdateFields(ctx, cvID, req.Title, req.TemplateID, req.ColorTheme, req.Sections)
	if err != nil {
		return nil, fmt.Errorf("update cv: %w", err)
	}

	resp := toResponse(*cv)
	return &resp, nil
}

// ─── Delete ───────────────────────────────────────────────────────────────────

func (s *CVService) Delete(ctx context.Context, userID, cvID uuid.UUID) error {
	existing, err := s.cvs.GetByID(ctx, cvID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrCVNotFound
		}
		return fmt.Errorf("get cv for delete: %w", err)
	}
	if existing.UserID != userID {
		return ErrCVForbidden
	}

	if err := s.cvs.Delete(ctx, cvID); err != nil {
		return fmt.Errorf("delete cv: %w", err)
	}
	return nil
}

// ─── Duplicate ────────────────────────────────────────────────────────────────

func (s *CVService) Duplicate(ctx context.Context, userID, cvID uuid.UUID) (*model.CVResponse, error) {
	original, err := s.cvs.GetByID(ctx, cvID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCVNotFound
		}
		return nil, fmt.Errorf("get cv for duplicate: %w", err)
	}
	if original.UserID != userID {
		return nil, ErrCVForbidden
	}

	newTitle := original.Title + " (bản sao)"
	if len(newTitle) > 200 {
		newTitle = newTitle[:200]
	}

	cv, err := s.cvs.Create(ctx, userID, newTitle, original.TemplateID, original.ColorTheme, original.Sections)
	if err != nil {
		return nil, fmt.Errorf("duplicate cv: %w", err)
	}

	resp := toResponse(*cv)
	return &resp, nil
}

// ─── Helper ───────────────────────────────────────────────────────────────────

func toResponse(cv repository.CV) model.CVResponse {
	return model.CVResponse{
		ID:         cv.ID,
		UserID:     cv.UserID,
		Title:      cv.Title,
		TemplateID: cv.TemplateID,
		ColorTheme: cv.ColorTheme,
		Sections:   cv.Sections,
		CreatedAt:  cv.CreatedAt,
		UpdatedAt:  cv.UpdatedAt,
	}
}
