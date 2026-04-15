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
	Create(ctx context.Context, userID uuid.UUID, title, templateID, colorTheme string, sections json.RawMessage, profileID *uuid.UUID, profileSnapshot json.RawMessage) (*repository.CV, error)
	GetByID(ctx context.Context, id uuid.UUID) (*repository.CV, error)
	ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]repository.CV, error)
	CountByUser(ctx context.Context, userID uuid.UUID) (int64, error)
	UpdateFields(ctx context.Context, id uuid.UUID, title, templateID, colorTheme *string, sections json.RawMessage) (*repository.CV, error)
	UpdateOverrides(ctx context.Context, id uuid.UUID, overrides json.RawMessage) (*repository.CV, error)
	RefreshSnapshot(ctx context.Context, id uuid.UUID, snapshot json.RawMessage) (*repository.CV, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

// ─── CVService ────────────────────────────────────────────────────────────────

type CVService struct {
	cvs     CVRepo
	profiles ProfileRepo // optional: used to snapshot profile on CV creation
}

func NewCVService(cvs CVRepo, profiles ProfileRepo) *CVService {
	return &CVService{cvs: cvs, profiles: profiles}
}

// ─── List ─────────────────────────────────────────────────────────────────────

func (s *CVService) List(ctx context.Context, userID uuid.UUID, q model.ListCVsQuery) (*model.ListCVsResponse, error) {
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

	// Build profile snapshot if profile_id provided
	var snapshot json.RawMessage
	if req.ProfileID != nil && s.profiles != nil {
		snap, err := s.buildProfileSnapshot(ctx, userID, *req.ProfileID)
		if err != nil {
			return nil, fmt.Errorf("build profile snapshot: %w", err)
		}
		snapshot = snap
	}

	cv, err := s.cvs.Create(ctx, userID, req.Title, req.TemplateID, req.ColorTheme, sections, req.ProfileID, snapshot)
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
		return nil, ErrCVForbidden
	}

	resp := toResponse(*cv)
	return &resp, nil
}

// ─── Update ───────────────────────────────────────────────────────────────────

func (s *CVService) Update(ctx context.Context, userID, cvID uuid.UUID, req model.UpdateCVRequest) (*model.CVResponse, error) {
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

// ─── UpdateOverrides ──────────────────────────────────────────────────────────

func (s *CVService) UpdateOverrides(ctx context.Context, userID, cvID uuid.UUID, req model.UpdateCVOverridesRequest) (*model.CVResponse, error) {
	existing, err := s.cvs.GetByID(ctx, cvID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCVNotFound
		}
		return nil, fmt.Errorf("get cv for overrides: %w", err)
	}
	if existing.UserID != userID {
		return nil, ErrCVForbidden
	}

	cv, err := s.cvs.UpdateOverrides(ctx, cvID, req.Overrides)
	if err != nil {
		return nil, fmt.Errorf("update overrides: %w", err)
	}

	resp := toResponse(*cv)
	return &resp, nil
}

// ─── SyncProfile — refresh snapshot from current profile data ─────────────────

func (s *CVService) SyncProfile(ctx context.Context, userID, cvID uuid.UUID) (*model.CVResponse, error) {
	existing, err := s.cvs.GetByID(ctx, cvID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCVNotFound
		}
		return nil, fmt.Errorf("get cv for sync: %w", err)
	}
	if existing.UserID != userID {
		return nil, ErrCVForbidden
	}
	if existing.ProfileID == nil {
		return nil, fmt.Errorf("cv has no linked profile")
	}

	snapshot, err := s.buildProfileSnapshot(ctx, userID, *existing.ProfileID)
	if err != nil {
		return nil, fmt.Errorf("build snapshot: %w", err)
	}

	cv, err := s.cvs.RefreshSnapshot(ctx, cvID, snapshot)
	if err != nil {
		return nil, fmt.Errorf("refresh snapshot: %w", err)
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

	// Duplicate keeps the same profile link + snapshot
	cv, err := s.cvs.Create(ctx, userID, newTitle, original.TemplateID, original.ColorTheme,
		original.Sections, original.ProfileID, original.ProfileSnapshot)
	if err != nil {
		return nil, fmt.Errorf("duplicate cv: %w", err)
	}

	resp := toResponse(*cv)
	return &resp, nil
}

// ─── buildProfileSnapshot — serialize profile+sections+items as JSONB ─────────

func (s *CVService) buildProfileSnapshot(ctx context.Context, userID, profileID uuid.UUID) (json.RawMessage, error) {
	if s.profiles == nil {
		return nil, nil
	}

	p, err := s.profiles.GetByID(ctx, profileID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProfileNotFound
		}
		return nil, err
	}
	if p.UserID != userID {
		return nil, ErrProfileForbidden
	}

	sections, err := s.profiles.ListSections(ctx, profileID)
	if err != nil {
		return nil, err
	}

	sectionIDs := make([]uuid.UUID, len(sections))
	for i, sec := range sections {
		sectionIDs[i] = sec.ID
	}
	itemsMap, err := s.profiles.ListItemsBySections(ctx, sectionIDs)
	if err != nil {
		return nil, err
	}

	// Build snapshot struct
	type itemSnap struct {
		ID        uuid.UUID      `json:"id"`
		Position  int            `json:"position"`
		IsVisible bool           `json:"is_visible"`
		Data      map[string]any `json:"data"`
	}
	type sectionSnap struct {
		ID        uuid.UUID  `json:"id"`
		Type      string     `json:"type"`
		Title     string     `json:"title"`
		Position  int        `json:"position"`
		IsVisible bool       `json:"is_visible"`
		Items     []itemSnap `json:"items"`
	}
	type profileSnap struct {
		ID          uuid.UUID     `json:"id"`
		Name        string        `json:"name"`
		RoleTarget  *string       `json:"role_target,omitempty"`
		Summary     *string       `json:"summary,omitempty"`
		FullName    *string       `json:"full_name,omitempty"`
		Email       *string       `json:"email,omitempty"`
		Phone       *string       `json:"phone,omitempty"`
		Location    *string       `json:"location,omitempty"`
		LinkedinURL *string       `json:"linkedin_url,omitempty"`
		GithubURL   *string       `json:"github_url,omitempty"`
		WebsiteURL  *string       `json:"website_url,omitempty"`
		AvatarURL   *string       `json:"avatar_url,omitempty"`
		Sections    []sectionSnap `json:"sections"`
	}

	snap := profileSnap{
		ID:          p.ID,
		Name:        p.Name,
		RoleTarget:  p.RoleTarget,
		Summary:     p.Summary,
		FullName:    p.FullName,
		Email:       p.Email,
		Phone:       p.Phone,
		Location:    p.Location,
		LinkedinURL: p.LinkedinURL,
		GithubURL:   p.GithubURL,
		WebsiteURL:  p.WebsiteURL,
		AvatarURL:   p.AvatarURL,
	}

	for _, sec := range sections {
		ss := sectionSnap{
			ID:        sec.ID,
			Type:      sec.Type,
			Title:     sec.Title,
			Position:  sec.Position,
			IsVisible: sec.IsVisible,
		}
		for _, it := range itemsMap[sec.ID] {
			var data map[string]any
			_ = json.Unmarshal(it.Data, &data)
			ss.Items = append(ss.Items, itemSnap{
				ID:        it.ID,
				Position:  it.Position,
				IsVisible: it.IsVisible,
				Data:      data,
			})
		}
		snap.Sections = append(snap.Sections, ss)
	}

	return json.Marshal(snap)
}

// ─── Helper ───────────────────────────────────────────────────────────────────

func toResponse(cv repository.CV) model.CVResponse {
	return model.CVResponse{
		ID:              cv.ID,
		UserID:          cv.UserID,
		ProfileID:       cv.ProfileID,
		Title:           cv.Title,
		TemplateID:      cv.TemplateID,
		ColorTheme:      cv.ColorTheme,
		Sections:        cv.Sections,
		ProfileSnapshot: cv.ProfileSnapshot,
		Overrides:       cv.Overrides,
		CreatedAt:       cv.CreatedAt,
		UpdatedAt:       cv.UpdatedAt,
	}
}
