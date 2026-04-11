package service_test

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/yourname/generate-cv/internal/model"
	"github.com/yourname/generate-cv/internal/repository"
	"github.com/yourname/generate-cv/internal/service"
)

// ─── Mock CVRepo ──────────────────────────────────────────────────────────────

type mockCVRepo struct {
	store map[uuid.UUID]*repository.CV
}

func newMockCVRepo() *mockCVRepo {
	return &mockCVRepo{store: make(map[uuid.UUID]*repository.CV)}
}

func (m *mockCVRepo) Create(_ context.Context, userID uuid.UUID, title, templateID, colorTheme string, sections json.RawMessage) (*repository.CV, error) {
	cv := &repository.CV{
		ID:         uuid.New(),
		UserID:     userID,
		Title:      title,
		TemplateID: templateID,
		ColorTheme: colorTheme,
		Sections:   sections,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}
	m.store[cv.ID] = cv
	return cv, nil
}

func (m *mockCVRepo) GetByID(_ context.Context, id uuid.UUID) (*repository.CV, error) {
	if cv, ok := m.store[id]; ok {
		return cv, nil
	}
	return nil, pgx.ErrNoRows
}

func (m *mockCVRepo) ListByUser(_ context.Context, userID uuid.UUID, limit, offset int) ([]repository.CV, error) {
	var result []repository.CV
	for _, cv := range m.store {
		if cv.UserID == userID {
			result = append(result, *cv)
		}
	}
	// naive pagination
	start := offset
	if start > len(result) {
		return []repository.CV{}, nil
	}
	end := start + limit
	if end > len(result) {
		end = len(result)
	}
	return result[start:end], nil
}

func (m *mockCVRepo) CountByUser(_ context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	for _, cv := range m.store {
		if cv.UserID == userID {
			count++
		}
	}
	return count, nil
}

func (m *mockCVRepo) UpdateFields(_ context.Context, id uuid.UUID, title, templateID, colorTheme *string, sections json.RawMessage) (*repository.CV, error) {
	cv, ok := m.store[id]
	if !ok {
		return nil, pgx.ErrNoRows
	}
	if title != nil {
		cv.Title = *title
	}
	if templateID != nil {
		cv.TemplateID = *templateID
	}
	if colorTheme != nil {
		cv.ColorTheme = *colorTheme
	}
	if sections != nil {
		cv.Sections = sections
	}
	cv.UpdatedAt = time.Now()
	return cv, nil
}

func (m *mockCVRepo) Delete(_ context.Context, id uuid.UUID) error {
	if _, ok := m.store[id]; !ok {
		return pgx.ErrNoRows
	}
	delete(m.store, id)
	return nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func newCVService() (*service.CVService, *mockCVRepo) {
	repo := newMockCVRepo()
	return service.NewCVService(repo), repo
}

func newCVRequest() model.CreateCVRequest {
	return model.CreateCVRequest{
		Title:      "My CV",
		TemplateID: "template_modern_01",
		ColorTheme: "#1a56db",
		Sections:   json.RawMessage(`[]`),
	}
}

// ─── Tests ────────────────────────────────────────────────────────────────────

func TestCVService_Create_Success(t *testing.T) {
	svc, _ := newCVService()
	userID := uuid.New()

	resp, err := svc.Create(context.Background(), userID, newCVRequest())
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if resp.ID == uuid.Nil {
		t.Error("expected non-nil CV ID")
	}
	if resp.Title != "My CV" {
		t.Errorf("expected title 'My CV', got '%s'", resp.Title)
	}
	if resp.UserID != userID {
		t.Errorf("expected userID %s, got %s", userID, resp.UserID)
	}
}

func TestCVService_Create_DefaultSections(t *testing.T) {
	svc, _ := newCVService()

	req := newCVRequest()
	req.Sections = nil // no sections provided

	resp, err := svc.Create(context.Background(), uuid.New(), req)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if string(resp.Sections) != "[]" {
		t.Errorf("expected sections '[]', got '%s'", resp.Sections)
	}
}

func TestCVService_Get_Success(t *testing.T) {
	svc, _ := newCVService()
	userID := uuid.New()

	created, _ := svc.Create(context.Background(), userID, newCVRequest())

	got, err := svc.Get(context.Background(), userID, created.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.ID != created.ID {
		t.Errorf("expected ID %s, got %s", created.ID, got.ID)
	}
}

func TestCVService_Get_NotFound(t *testing.T) {
	svc, _ := newCVService()

	_, err := svc.Get(context.Background(), uuid.New(), uuid.New())
	if !errors.Is(err, service.ErrCVNotFound) {
		t.Errorf("expected ErrCVNotFound, got: %v", err)
	}
}

func TestCVService_Get_WrongOwner_Returns404(t *testing.T) {
	svc, _ := newCVService()
	ownerID := uuid.New()
	attackerID := uuid.New()

	created, _ := svc.Create(context.Background(), ownerID, newCVRequest())

	// Attacker tries to access owner's CV → must get 404, not 403
	_, err := svc.Get(context.Background(), attackerID, created.ID)
	if !errors.Is(err, service.ErrCVNotFound) && !errors.Is(err, service.ErrCVForbidden) {
		t.Errorf("expected not-found error for wrong owner, got: %v", err)
	}
}

func TestCVService_List_Pagination(t *testing.T) {
	svc, _ := newCVService()
	userID := uuid.New()

	// Create 3 CVs
	for i := 0; i < 3; i++ {
		req := newCVRequest()
		req.Title = "CV " + string(rune('A'+i))
		_, err := svc.Create(context.Background(), userID, req)
		if err != nil {
			t.Fatalf("create cv %d: %v", i, err)
		}
	}

	resp, err := svc.List(context.Background(), userID, model.ListCVsQuery{Page: 1, PerPage: 2})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if resp.Total != 3 {
		t.Errorf("expected total 3, got %d", resp.Total)
	}
	if resp.TotalPages != 2 {
		t.Errorf("expected 2 total pages, got %d", resp.TotalPages)
	}
	if len(resp.Data) != 2 {
		t.Errorf("expected 2 items on page 1, got %d", len(resp.Data))
	}
}

func TestCVService_List_DefaultPagination(t *testing.T) {
	svc, _ := newCVService()
	userID := uuid.New()

	resp, err := svc.List(context.Background(), userID, model.ListCVsQuery{})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if resp.Page != 1 {
		t.Errorf("expected page 1, got %d", resp.Page)
	}
	if resp.PerPage != 10 {
		t.Errorf("expected per_page 10, got %d", resp.PerPage)
	}
}

func TestCVService_Update_Success(t *testing.T) {
	svc, _ := newCVService()
	userID := uuid.New()

	created, _ := svc.Create(context.Background(), userID, newCVRequest())

	newTitle := "Updated Title"
	updated, err := svc.Update(context.Background(), userID, created.ID, model.UpdateCVRequest{
		Title: &newTitle,
	})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.Title != newTitle {
		t.Errorf("expected title '%s', got '%s'", newTitle, updated.Title)
	}
	// Other fields unchanged
	if updated.TemplateID != created.TemplateID {
		t.Errorf("template_id should not change")
	}
}

func TestCVService_Update_WrongOwner(t *testing.T) {
	svc, _ := newCVService()
	ownerID := uuid.New()

	created, _ := svc.Create(context.Background(), ownerID, newCVRequest())

	newTitle := "Hack"
	_, err := svc.Update(context.Background(), uuid.New(), created.ID, model.UpdateCVRequest{Title: &newTitle})
	if !errors.Is(err, service.ErrCVNotFound) && !errors.Is(err, service.ErrCVForbidden) {
		t.Errorf("expected ownership error, got: %v", err)
	}
}

func TestCVService_Delete_Success(t *testing.T) {
	svc, _ := newCVService()
	userID := uuid.New()

	created, _ := svc.Create(context.Background(), userID, newCVRequest())

	if err := svc.Delete(context.Background(), userID, created.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}

	// Should be gone
	_, err := svc.Get(context.Background(), userID, created.ID)
	if !errors.Is(err, service.ErrCVNotFound) {
		t.Errorf("expected ErrCVNotFound after delete, got: %v", err)
	}
}

func TestCVService_Delete_WrongOwner(t *testing.T) {
	svc, _ := newCVService()
	ownerID := uuid.New()

	created, _ := svc.Create(context.Background(), ownerID, newCVRequest())

	err := svc.Delete(context.Background(), uuid.New(), created.ID)
	if !errors.Is(err, service.ErrCVNotFound) && !errors.Is(err, service.ErrCVForbidden) {
		t.Errorf("expected ownership error, got: %v", err)
	}
}

func TestCVService_Duplicate_Success(t *testing.T) {
	svc, _ := newCVService()
	userID := uuid.New()

	original, _ := svc.Create(context.Background(), userID, newCVRequest())

	dupe, err := svc.Duplicate(context.Background(), userID, original.ID)
	if err != nil {
		t.Fatalf("duplicate: %v", err)
	}
	if dupe.ID == original.ID {
		t.Error("duplicate should have a new ID")
	}
	if dupe.Title != original.Title+" (bản sao)" {
		t.Errorf("expected title with suffix, got '%s'", dupe.Title)
	}
	if dupe.TemplateID != original.TemplateID {
		t.Error("template_id should match original")
	}
	if dupe.ColorTheme != original.ColorTheme {
		t.Error("color_theme should match original")
	}
}

func TestCVService_Duplicate_WrongOwner(t *testing.T) {
	svc, _ := newCVService()
	ownerID := uuid.New()

	original, _ := svc.Create(context.Background(), ownerID, newCVRequest())

	_, err := svc.Duplicate(context.Background(), uuid.New(), original.ID)
	if !errors.Is(err, service.ErrCVNotFound) && !errors.Is(err, service.ErrCVForbidden) {
		t.Errorf("expected ownership error, got: %v", err)
	}
}

func TestCVService_Duplicate_LongTitleTruncated(t *testing.T) {
	svc, _ := newCVService()
	userID := uuid.New()

	// Create a CV with title exactly 200 chars
	req := newCVRequest()
	longTitle := ""
	for len(longTitle) < 196 {
		longTitle += "A"
	}
	req.Title = longTitle
	original, _ := svc.Create(context.Background(), userID, req)

	dupe, err := svc.Duplicate(context.Background(), userID, original.ID)
	if err != nil {
		t.Fatalf("duplicate: %v", err)
	}
	if len(dupe.Title) > 200 {
		t.Errorf("duplicated title exceeds 200 chars: len=%d", len(dupe.Title))
	}
}
