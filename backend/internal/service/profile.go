// Package service contains business logic for the Profile domain.
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
	ErrProfileNotFound  = errors.New("profile not found")
	ErrProfileForbidden = errors.New("profile not found") // 404 not 403
	ErrSectionNotFound  = errors.New("section not found")
	ErrItemNotFound     = errors.New("item not found")
)

// ─── ProfileRepo interface (for mocking in tests) ─────────────────────────────

type ProfileRepo interface {
	// Profile
	Create(ctx context.Context, p repository.CVProfile) (*repository.CVProfile, error)
	GetByID(ctx context.Context, id uuid.UUID) (*repository.CVProfile, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]repository.CVProfile, error)
	CountByUser(ctx context.Context, userID uuid.UUID) (int64, error)
	UpdateFields(ctx context.Context, id uuid.UUID,
		name, roleTarget, summary, fullName, email, phone,
		location, linkedinURL, githubURL, websiteURL, avatarURL *string,
	) (*repository.CVProfile, error)
	Delete(ctx context.Context, id uuid.UUID) error
	SetDefault(ctx context.Context, userID, profileID uuid.UUID) error
	// Section
	CreateSection(ctx context.Context, s repository.CVProfileSection) (*repository.CVProfileSection, error)
	GetSection(ctx context.Context, id uuid.UUID) (*repository.CVProfileSection, error)
	ListSections(ctx context.Context, profileID uuid.UUID) ([]repository.CVProfileSection, error)
	UpdateSection(ctx context.Context, id uuid.UUID, title *string, position *int, isVisible *bool) (*repository.CVProfileSection, error)
	DeleteSection(ctx context.Context, id uuid.UUID) error
	ReorderSections(ctx context.Context, profileID uuid.UUID, ids []uuid.UUID) error
	// Item
	CreateItem(ctx context.Context, item repository.CVProfileItem) (*repository.CVProfileItem, error)
	GetItem(ctx context.Context, id uuid.UUID) (*repository.CVProfileItem, error)
	ListItems(ctx context.Context, sectionID uuid.UUID) ([]repository.CVProfileItem, error)
	UpdateItem(ctx context.Context, id uuid.UUID, position *int, isVisible *bool, data json.RawMessage) (*repository.CVProfileItem, error)
	DeleteItem(ctx context.Context, id uuid.UUID) error
	ReorderItems(ctx context.Context, sectionID uuid.UUID, ids []uuid.UUID) error
	ListItemsBySections(ctx context.Context, sectionIDs []uuid.UUID) (map[uuid.UUID][]repository.CVProfileItem, error)
}

// ─── ProfileService ───────────────────────────────────────────────────────────

type ProfileService struct {
	repo ProfileRepo
}

func NewProfileService(repo ProfileRepo) *ProfileService {
	return &ProfileService{repo: repo}
}

// ─── Profile CRUD ─────────────────────────────────────────────────────────────

func (s *ProfileService) List(ctx context.Context, userID uuid.UUID) (*model.ListProfilesResponse, error) {
	profiles, err := s.repo.ListByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("list profiles: %w", err)
	}
	total, err := s.repo.CountByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("count profiles: %w", err)
	}

	data := make([]model.ProfileResponse, 0, len(profiles))
	for _, p := range profiles {
		data = append(data, toProfileResponse(p, nil))
	}
	return &model.ListProfilesResponse{Data: data, Total: total}, nil
}

func (s *ProfileService) Create(ctx context.Context, userID uuid.UUID, req model.CreateProfileRequest) (*model.ProfileResponse, error) {
	p, err := s.repo.Create(ctx, repository.CVProfile{
		UserID:      userID,
		Name:        req.Name,
		RoleTarget:  req.RoleTarget,
		Summary:     req.Summary,
		FullName:    req.FullName,
		Email:       req.Email,
		Phone:       req.Phone,
		Location:    req.Location,
		LinkedinURL: req.LinkedinURL,
		GithubURL:   req.GithubURL,
		WebsiteURL:  req.WebsiteURL,
		AvatarURL:   req.AvatarURL,
	})
	if err != nil {
		return nil, fmt.Errorf("create profile: %w", err)
	}
	resp := toProfileResponse(*p, nil)
	return &resp, nil
}

func (s *ProfileService) Get(ctx context.Context, userID, profileID uuid.UUID) (*model.ProfileResponse, error) {
	p, err := s.repo.GetByID(ctx, profileID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProfileNotFound
		}
		return nil, fmt.Errorf("get profile: %w", err)
	}
	if p.UserID != userID {
		return nil, ErrProfileForbidden
	}

	// Load sections + items
	sections, err := s.repo.ListSections(ctx, profileID)
	if err != nil {
		return nil, fmt.Errorf("list sections: %w", err)
	}

	sectionIDs := make([]uuid.UUID, len(sections))
	for i, sec := range sections {
		sectionIDs[i] = sec.ID
	}
	itemsMap, err := s.repo.ListItemsBySections(ctx, sectionIDs)
	if err != nil {
		return nil, fmt.Errorf("list items: %w", err)
	}

	resp := toProfileResponse(*p, buildSectionResponses(sections, itemsMap))
	return &resp, nil
}

func (s *ProfileService) Update(ctx context.Context, userID, profileID uuid.UUID, req model.UpdateProfileRequest) (*model.ProfileResponse, error) {
	existing, err := s.checkOwnership(ctx, userID, profileID)
	if err != nil {
		return nil, err
	}
	_ = existing

	p, err := s.repo.UpdateFields(ctx, profileID,
		req.Name, req.RoleTarget, req.Summary, req.FullName, req.Email,
		req.Phone, req.Location, req.LinkedinURL, req.GithubURL, req.WebsiteURL, req.AvatarURL,
	)
	if err != nil {
		return nil, fmt.Errorf("update profile: %w", err)
	}
	resp := toProfileResponse(*p, nil)
	return &resp, nil
}

func (s *ProfileService) Delete(ctx context.Context, userID, profileID uuid.UUID) error {
	if _, err := s.checkOwnership(ctx, userID, profileID); err != nil {
		return err
	}
	if err := s.repo.Delete(ctx, profileID); err != nil {
		return fmt.Errorf("delete profile: %w", err)
	}
	return nil
}

func (s *ProfileService) SetDefault(ctx context.Context, userID, profileID uuid.UUID) error {
	if _, err := s.checkOwnership(ctx, userID, profileID); err != nil {
		return err
	}
	if err := s.repo.SetDefault(ctx, userID, profileID); err != nil {
		return fmt.Errorf("set default: %w", err)
	}
	return nil
}

// ─── Section ops ──────────────────────────────────────────────────────────────

func (s *ProfileService) CreateSection(ctx context.Context, userID, profileID uuid.UUID, req model.CreateSectionRequest) (*model.ProfileSectionResponse, error) {
	if _, err := s.checkOwnership(ctx, userID, profileID); err != nil {
		return nil, err
	}
	sec, err := s.repo.CreateSection(ctx, repository.CVProfileSection{
		ProfileID: profileID,
		Type:      string(req.Type),
		Title:     req.Title,
		Position:  req.Position,
		IsVisible: true,
	})
	if err != nil {
		return nil, fmt.Errorf("create section: %w", err)
	}
	resp := toSectionResponse(*sec, nil)
	return &resp, nil
}

func (s *ProfileService) ListSections(ctx context.Context, userID, profileID uuid.UUID) ([]model.ProfileSectionResponse, error) {
	if _, err := s.checkOwnership(ctx, userID, profileID); err != nil {
		return nil, err
	}
	sections, err := s.repo.ListSections(ctx, profileID)
	if err != nil {
		return nil, fmt.Errorf("list sections: %w", err)
	}
	out := make([]model.ProfileSectionResponse, 0, len(sections))
	for _, sec := range sections {
		out = append(out, toSectionResponse(sec, nil))
	}
	return out, nil
}

func (s *ProfileService) UpdateSection(ctx context.Context, userID, profileID, sectionID uuid.UUID, req model.UpdateSectionRequest) (*model.ProfileSectionResponse, error) {
	if _, err := s.checkOwnership(ctx, userID, profileID); err != nil {
		return nil, err
	}
	if err := s.checkSectionBelongsToProfile(ctx, sectionID, profileID); err != nil {
		return nil, err
	}
	sec, err := s.repo.UpdateSection(ctx, sectionID, req.Title, req.Position, req.IsVisible)
	if err != nil {
		return nil, fmt.Errorf("update section: %w", err)
	}
	resp := toSectionResponse(*sec, nil)
	return &resp, nil
}

func (s *ProfileService) DeleteSection(ctx context.Context, userID, profileID, sectionID uuid.UUID) error {
	if _, err := s.checkOwnership(ctx, userID, profileID); err != nil {
		return err
	}
	if err := s.checkSectionBelongsToProfile(ctx, sectionID, profileID); err != nil {
		return err
	}
	if err := s.repo.DeleteSection(ctx, sectionID); err != nil {
		return fmt.Errorf("delete section: %w", err)
	}
	return nil
}

func (s *ProfileService) ReorderSections(ctx context.Context, userID, profileID uuid.UUID, ids []uuid.UUID) error {
	if _, err := s.checkOwnership(ctx, userID, profileID); err != nil {
		return err
	}
	if err := s.repo.ReorderSections(ctx, profileID, ids); err != nil {
		return fmt.Errorf("reorder sections: %w", err)
	}
	return nil
}

// ─── Item ops ─────────────────────────────────────────────────────────────────

func (s *ProfileService) CreateItem(ctx context.Context, userID, profileID, sectionID uuid.UUID, req model.CreateItemRequest) (*model.ProfileItemResponse, error) {
	if _, err := s.checkOwnership(ctx, userID, profileID); err != nil {
		return nil, err
	}
	if err := s.checkSectionBelongsToProfile(ctx, sectionID, profileID); err != nil {
		return nil, err
	}

	dataBytes, err := json.Marshal(req.Data)
	if err != nil {
		return nil, fmt.Errorf("marshal item data: %w", err)
	}

	isVisible := true
	if req.IsVisible != nil {
		isVisible = *req.IsVisible
	}

	item, err := s.repo.CreateItem(ctx, repository.CVProfileItem{
		SectionID: sectionID,
		Position:  req.Position,
		IsVisible: isVisible,
		Data:      dataBytes,
	})
	if err != nil {
		return nil, fmt.Errorf("create item: %w", err)
	}
	resp := toItemResponse(*item)
	return &resp, nil
}

func (s *ProfileService) UpdateItem(ctx context.Context, userID, profileID, sectionID, itemID uuid.UUID, req model.UpdateItemRequest) (*model.ProfileItemResponse, error) {
	if _, err := s.checkOwnership(ctx, userID, profileID); err != nil {
		return nil, err
	}
	if err := s.checkSectionBelongsToProfile(ctx, sectionID, profileID); err != nil {
		return nil, err
	}
	if err := s.checkItemBelongsToSection(ctx, itemID, sectionID); err != nil {
		return nil, err
	}

	var dataBytes json.RawMessage
	if req.Data != nil {
		b, err := json.Marshal(req.Data)
		if err != nil {
			return nil, fmt.Errorf("marshal item data: %w", err)
		}
		dataBytes = b
	}

	item, err := s.repo.UpdateItem(ctx, itemID, req.Position, req.IsVisible, dataBytes)
	if err != nil {
		return nil, fmt.Errorf("update item: %w", err)
	}
	resp := toItemResponse(*item)
	return &resp, nil
}

func (s *ProfileService) DeleteItem(ctx context.Context, userID, profileID, sectionID, itemID uuid.UUID) error {
	if _, err := s.checkOwnership(ctx, userID, profileID); err != nil {
		return err
	}
	if err := s.checkSectionBelongsToProfile(ctx, sectionID, profileID); err != nil {
		return err
	}
	if err := s.checkItemBelongsToSection(ctx, itemID, sectionID); err != nil {
		return err
	}
	if err := s.repo.DeleteItem(ctx, itemID); err != nil {
		return fmt.Errorf("delete item: %w", err)
	}
	return nil
}

func (s *ProfileService) ReorderItems(ctx context.Context, userID, profileID, sectionID uuid.UUID, ids []uuid.UUID) error {
	if _, err := s.checkOwnership(ctx, userID, profileID); err != nil {
		return err
	}
	if err := s.checkSectionBelongsToProfile(ctx, sectionID, profileID); err != nil {
		return err
	}
	if err := s.repo.ReorderItems(ctx, sectionID, ids); err != nil {
		return fmt.Errorf("reorder items: %w", err)
	}
	return nil
}

// ─── Private helpers ──────────────────────────────────────────────────────────

func (s *ProfileService) checkOwnership(ctx context.Context, userID, profileID uuid.UUID) (*repository.CVProfile, error) {
	p, err := s.repo.GetByID(ctx, profileID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProfileNotFound
		}
		return nil, fmt.Errorf("get profile: %w", err)
	}
	if p.UserID != userID {
		return nil, ErrProfileForbidden
	}
	return p, nil
}

func (s *ProfileService) checkSectionBelongsToProfile(ctx context.Context, sectionID, profileID uuid.UUID) error {
	sec, err := s.repo.GetSection(ctx, sectionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrSectionNotFound
		}
		return fmt.Errorf("get section: %w", err)
	}
	if sec.ProfileID != profileID {
		return ErrSectionNotFound
	}
	return nil
}

func (s *ProfileService) checkItemBelongsToSection(ctx context.Context, itemID, sectionID uuid.UUID) error {
	item, err := s.repo.GetItem(ctx, itemID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrItemNotFound
		}
		return fmt.Errorf("get item: %w", err)
	}
	if item.SectionID != sectionID {
		return ErrItemNotFound
	}
	return nil
}

// ─── Response converters ──────────────────────────────────────────────────────

func toProfileResponse(p repository.CVProfile, sections []model.ProfileSectionResponse) model.ProfileResponse {
	return model.ProfileResponse{
		ID:          p.ID,
		UserID:      p.UserID,
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
		IsDefault:   p.IsDefault,
		Sections:    sections,
		CreatedAt:   p.CreatedAt,
		UpdatedAt:   p.UpdatedAt,
	}
}

func toSectionResponse(s repository.CVProfileSection, items []model.ProfileItemResponse) model.ProfileSectionResponse {
	return model.ProfileSectionResponse{
		ID:        s.ID,
		ProfileID: s.ProfileID,
		Type:      model.SectionType(s.Type),
		Title:     s.Title,
		Position:  s.Position,
		IsVisible: s.IsVisible,
		Items:     items,
	}
}

func toItemResponse(it repository.CVProfileItem) model.ProfileItemResponse {
	var data map[string]any
	_ = json.Unmarshal(it.Data, &data)
	return model.ProfileItemResponse{
		ID:        it.ID,
		SectionID: it.SectionID,
		Position:  it.Position,
		IsVisible: it.IsVisible,
		Data:      data,
	}
}

func buildSectionResponses(sections []repository.CVProfileSection, itemsMap map[uuid.UUID][]repository.CVProfileItem) []model.ProfileSectionResponse {
	result := make([]model.ProfileSectionResponse, 0, len(sections))
	for _, sec := range sections {
		repoItems := itemsMap[sec.ID]
		items := make([]model.ProfileItemResponse, 0, len(repoItems))
		for _, it := range repoItems {
			items = append(items, toItemResponse(it))
		}
		result = append(result, toSectionResponse(sec, items))
	}
	return result
}
