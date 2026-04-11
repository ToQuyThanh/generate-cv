package service_test

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/yourname/generate-cv/internal/model"
	"github.com/yourname/generate-cv/internal/repository"
	"github.com/yourname/generate-cv/internal/service"
)

// ─── Mock ────────────────────────────────────────────────────────────────────

type mockTemplateRepo struct {
	templates []repository.Template
	one       *repository.Template
	err       error
}

func (m *mockTemplateRepo) List(_ context.Context, isPremium *bool, tag string) ([]repository.Template, error) {
	if m.err != nil {
		return nil, m.err
	}
	var out []repository.Template
	for _, t := range m.templates {
		if isPremium != nil && t.IsPremium != *isPremium {
			continue
		}
		if tag != "" {
			found := false
			for _, tg := range t.Tags {
				if tg == tag {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}
		out = append(out, t)
	}
	return out, nil
}

func (m *mockTemplateRepo) GetByID(_ context.Context, id string) (*repository.Template, error) {
	if m.err != nil {
		return nil, m.err
	}
	if m.one != nil && m.one.ID == id {
		return m.one, nil
	}
	return nil, pgx.ErrNoRows
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func seededTemplates() []repository.Template {
	freeTag := []string{"free", "modern"}
	premTag := []string{"premium", "executive"}
	return []repository.Template{
		{ID: "template_modern_01",    Name: "Modern",    IsPremium: false, Tags: freeTag},
		{ID: "template_classic_01",   Name: "Classic",   IsPremium: false, Tags: freeTag},
		{ID: "template_executive_01", Name: "Executive", IsPremium: true,  Tags: premTag},
	}
}

// ─── Tests ────────────────────────────────────────────────────────────────────

func TestTemplateService_List_All(t *testing.T) {
	svc := service.NewTemplateService(&mockTemplateRepo{templates: seededTemplates()})

	resp, err := svc.List(context.Background(), model.ListTemplatesQuery{})

	require.NoError(t, err)
	assert.Equal(t, 3, resp.Total)
	assert.Len(t, resp.Data, 3)
}

func TestTemplateService_List_FilterFree(t *testing.T) {
	isPrem := false
	svc := service.NewTemplateService(&mockTemplateRepo{templates: seededTemplates()})

	resp, err := svc.List(context.Background(), model.ListTemplatesQuery{IsPremium: &isPrem})

	require.NoError(t, err)
	assert.Equal(t, 2, resp.Total)
	for _, tmpl := range resp.Data {
		assert.False(t, tmpl.IsPremium) // ← fix: thêm t làm argument đầu tiên
	}
}

func TestTemplateService_List_FilterPremium(t *testing.T) {
	isPrem := true
	svc := service.NewTemplateService(&mockTemplateRepo{templates: seededTemplates()})

	resp, err := svc.List(context.Background(), model.ListTemplatesQuery{IsPremium: &isPrem})

	require.NoError(t, err)
	assert.Equal(t, 1, resp.Total)
	assert.True(t, resp.Data[0].IsPremium)
}

func TestTemplateService_Get_OK(t *testing.T) {
	tmpl := &repository.Template{ID: "template_modern_01", Name: "Modern", Tags: []string{"free"}}
	svc := service.NewTemplateService(&mockTemplateRepo{one: tmpl})

	resp, err := svc.Get(context.Background(), "template_modern_01")

	require.NoError(t, err)
	assert.Equal(t, "template_modern_01", resp.ID)
	assert.Equal(t, "Modern", resp.Name)
}

func TestTemplateService_Get_NotFound(t *testing.T) {
	svc := service.NewTemplateService(&mockTemplateRepo{})

	_, err := svc.Get(context.Background(), "nonexistent")

	assert.ErrorIs(t, err, service.ErrTemplateNotFound)
}
