// Package service — business logic for Template domain.
package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/yourname/generate-cv/internal/model"
	"github.com/yourname/generate-cv/internal/repository"
)

// ─── Sentinel errors ──────────────────────────────────────────────────────────

var ErrTemplateNotFound = errors.New("template not found")

// ─── Repo interface ───────────────────────────────────────────────────────────

type TemplateRepo interface {
	List(ctx context.Context, isPremium *bool, tag string) ([]repository.Template, error)
	GetByID(ctx context.Context, id string) (*repository.Template, error)
}

// ─── TemplateService ──────────────────────────────────────────────────────────

type TemplateService struct {
	templates TemplateRepo
}

func NewTemplateService(templates TemplateRepo) *TemplateService {
	return &TemplateService{templates: templates}
}

// ─── List ─────────────────────────────────────────────────────────────────────

func (s *TemplateService) List(ctx context.Context, q model.ListTemplatesQuery) (*model.ListTemplatesResponse, error) {
	templates, err := s.templates.List(ctx, q.IsPremium, q.Tag)
	if err != nil {
		return nil, fmt.Errorf("list templates: %w", err)
	}

	data := make([]model.TemplateResponse, 0, len(templates))
	for _, t := range templates {
		data = append(data, toTemplateResponse(t))
	}

	return &model.ListTemplatesResponse{
		Data:  data,
		Total: len(data),
	}, nil
}

// ─── Get ──────────────────────────────────────────────────────────────────────

func (s *TemplateService) Get(ctx context.Context, id string) (*model.TemplateResponse, error) {
	t, err := s.templates.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTemplateNotFound
		}
		return nil, fmt.Errorf("get template: %w", err)
	}

	resp := toTemplateResponse(*t)
	return &resp, nil
}

// ─── Helper ───────────────────────────────────────────────────────────────────

func toTemplateResponse(t repository.Template) model.TemplateResponse {
	tags := t.Tags
	if tags == nil {
		tags = []string{}
	}
	return model.TemplateResponse{
		ID:           t.ID,
		Name:         t.Name,
		ThumbnailURL: t.ThumbnailURL,
		PreviewURL:   t.PreviewURL,
		IsPremium:    t.IsPremium,
		Tags:         tags,
	}
}
