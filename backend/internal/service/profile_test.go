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

// ─── Mock ProfileRepo ─────────────────────────────────────────────────────────

type mockProfileRepo struct {
	profiles map[uuid.UUID]*repository.CVProfile
	sections map[uuid.UUID]*repository.CVProfileSection
	items    map[uuid.UUID]*repository.CVProfileItem
}

func newMockProfileRepo() *mockProfileRepo {
	return &mockProfileRepo{
		profiles: make(map[uuid.UUID]*repository.CVProfile),
		sections: make(map[uuid.UUID]*repository.CVProfileSection),
		items:    make(map[uuid.UUID]*repository.CVProfileItem),
	}
}

func (m *mockProfileRepo) Create(_ context.Context, p repository.CVProfile) (*repository.CVProfile, error) {
	p.ID = uuid.New()
	p.CreatedAt = time.Now()
	p.UpdatedAt = time.Now()
	m.profiles[p.ID] = &p
	return &p, nil
}

func (m *mockProfileRepo) GetByID(_ context.Context, id uuid.UUID) (*repository.CVProfile, error) {
	if p, ok := m.profiles[id]; ok {
		return p, nil
	}
	return nil, pgx.ErrNoRows
}

func (m *mockProfileRepo) ListByUser(_ context.Context, userID uuid.UUID) ([]repository.CVProfile, error) {
	var result []repository.CVProfile
	for _, p := range m.profiles {
		if p.UserID == userID {
			result = append(result, *p)
		}
	}
	return result, nil
}

func (m *mockProfileRepo) CountByUser(_ context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	for _, p := range m.profiles {
		if p.UserID == userID {
			count++
		}
	}
	return count, nil
}

func (m *mockProfileRepo) UpdateFields(_ context.Context, id uuid.UUID, name, roleTarget, summary, fullName, email, phone, location, linkedinURL, githubURL, websiteURL, avatarURL *string) (*repository.CVProfile, error) {
	p, ok := m.profiles[id]
	if !ok {
		return nil, pgx.ErrNoRows
	}
	if name != nil {
		p.Name = *name
	}
	if roleTarget != nil {
		p.RoleTarget = roleTarget
	}
	if summary != nil {
		p.Summary = summary
	}
	if fullName != nil {
		p.FullName = fullName
	}
	if email != nil {
		p.Email = email
	}
	p.UpdatedAt = time.Now()
	return p, nil
}

func (m *mockProfileRepo) Delete(_ context.Context, id uuid.UUID) error {
	if _, ok := m.profiles[id]; !ok {
		return pgx.ErrNoRows
	}
	delete(m.profiles, id)
	return nil
}

func (m *mockProfileRepo) SetDefault(_ context.Context, userID, profileID uuid.UUID) error {
	for _, p := range m.profiles {
		if p.UserID == userID {
			p.IsDefault = (p.ID == profileID)
		}
	}
	return nil
}

// ── Section mock methods ──────────────────────────────────────────────────────

func (m *mockProfileRepo) CreateSection(_ context.Context, s repository.CVProfileSection) (*repository.CVProfileSection, error) {
	s.ID = uuid.New()
	m.sections[s.ID] = &s
	return &s, nil
}

func (m *mockProfileRepo) GetSection(_ context.Context, id uuid.UUID) (*repository.CVProfileSection, error) {
	if s, ok := m.sections[id]; ok {
		return s, nil
	}
	return nil, pgx.ErrNoRows
}

func (m *mockProfileRepo) ListSections(_ context.Context, profileID uuid.UUID) ([]repository.CVProfileSection, error) {
	var result []repository.CVProfileSection
	for _, s := range m.sections {
		if s.ProfileID == profileID {
			result = append(result, *s)
		}
	}
	return result, nil
}

func (m *mockProfileRepo) UpdateSection(_ context.Context, id uuid.UUID, title *string, position *int, isVisible *bool) (*repository.CVProfileSection, error) {
	s, ok := m.sections[id]
	if !ok {
		return nil, pgx.ErrNoRows
	}
	if title != nil {
		s.Title = *title
	}
	if position != nil {
		s.Position = *position
	}
	if isVisible != nil {
		s.IsVisible = *isVisible
	}
	return s, nil
}

func (m *mockProfileRepo) DeleteSection(_ context.Context, id uuid.UUID) error {
	delete(m.sections, id)
	return nil
}

func (m *mockProfileRepo) ReorderSections(_ context.Context, _ uuid.UUID, ids []uuid.UUID) error {
	for i, id := range ids {
		if s, ok := m.sections[id]; ok {
			s.Position = i
		}
	}
	return nil
}

// ── Item mock methods ─────────────────────────────────────────────────────────

func (m *mockProfileRepo) CreateItem(_ context.Context, item repository.CVProfileItem) (*repository.CVProfileItem, error) {
	item.ID = uuid.New()
	m.items[item.ID] = &item
	return &item, nil
}

func (m *mockProfileRepo) GetItem(_ context.Context, id uuid.UUID) (*repository.CVProfileItem, error) {
	if it, ok := m.items[id]; ok {
		return it, nil
	}
	return nil, pgx.ErrNoRows
}

func (m *mockProfileRepo) ListItems(_ context.Context, sectionID uuid.UUID) ([]repository.CVProfileItem, error) {
	var result []repository.CVProfileItem
	for _, it := range m.items {
		if it.SectionID == sectionID {
			result = append(result, *it)
		}
	}
	return result, nil
}

func (m *mockProfileRepo) UpdateItem(_ context.Context, id uuid.UUID, position *int, isVisible *bool, data json.RawMessage) (*repository.CVProfileItem, error) {
	it, ok := m.items[id]
	if !ok {
		return nil, pgx.ErrNoRows
	}
	if position != nil {
		it.Position = *position
	}
	if isVisible != nil {
		it.IsVisible = *isVisible
	}
	if data != nil {
		it.Data = data
	}
	return it, nil
}

func (m *mockProfileRepo) DeleteItem(_ context.Context, id uuid.UUID) error {
	delete(m.items, id)
	return nil
}

func (m *mockProfileRepo) ReorderItems(_ context.Context, _ uuid.UUID, ids []uuid.UUID) error {
	for i, id := range ids {
		if it, ok := m.items[id]; ok {
			it.Position = i
		}
	}
	return nil
}

func (m *mockProfileRepo) ListItemsBySections(_ context.Context, sectionIDs []uuid.UUID) (map[uuid.UUID][]repository.CVProfileItem, error) {
	idSet := make(map[uuid.UUID]struct{}, len(sectionIDs))
	for _, id := range sectionIDs {
		idSet[id] = struct{}{}
	}
	result := make(map[uuid.UUID][]repository.CVProfileItem)
	for _, it := range m.items {
		if _, ok := idSet[it.SectionID]; ok {
			result[it.SectionID] = append(result[it.SectionID], *it)
		}
	}
	return result, nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func newProfileService() (*service.ProfileService, *mockProfileRepo) {
	repo := newMockProfileRepo()
	return service.NewProfileService(repo), repo
}

func makeCreateProfileReq(name string) model.CreateProfileRequest {
	email := "dev@example.com"
	return model.CreateProfileRequest{
		Name:  name,
		Email: &email,
	}
}

// ─── Profile CRUD tests ───────────────────────────────────────────────────────

func TestProfileService_Create_Success(t *testing.T) {
	svc, _ := newProfileService()
	userID := uuid.New()

	resp, err := svc.Create(context.Background(), userID, makeCreateProfileReq("Senior Backend"))
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if resp.ID == uuid.Nil {
		t.Error("expected non-nil profile ID")
	}
	if resp.Name != "Senior Backend" {
		t.Errorf("expected name 'Senior Backend', got '%s'", resp.Name)
	}
	if resp.UserID != userID {
		t.Errorf("expected userID %s, got %s", userID, resp.UserID)
	}
}

func TestProfileService_Get_Success(t *testing.T) {
	svc, _ := newProfileService()
	userID := uuid.New()

	created, _ := svc.Create(context.Background(), userID, makeCreateProfileReq("Freelance"))
	got, err := svc.Get(context.Background(), userID, created.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.ID != created.ID {
		t.Errorf("expected ID %s, got %s", created.ID, got.ID)
	}
}

func TestProfileService_Get_NotFound(t *testing.T) {
	svc, _ := newProfileService()

	_, err := svc.Get(context.Background(), uuid.New(), uuid.New())
	if !errors.Is(err, service.ErrProfileNotFound) {
		t.Errorf("expected ErrProfileNotFound, got: %v", err)
	}
}

func TestProfileService_Get_WrongOwner_Returns404(t *testing.T) {
	svc, _ := newProfileService()
	ownerID := uuid.New()

	created, _ := svc.Create(context.Background(), ownerID, makeCreateProfileReq("My Profile"))

	_, err := svc.Get(context.Background(), uuid.New(), created.ID)
	if !errors.Is(err, service.ErrProfileNotFound) && !errors.Is(err, service.ErrProfileForbidden) {
		t.Errorf("expected not-found error for wrong owner, got: %v", err)
	}
}

func TestProfileService_List_ReturnsAllForUser(t *testing.T) {
	svc, _ := newProfileService()
	userID := uuid.New()
	otherID := uuid.New()

	svc.Create(context.Background(), userID, makeCreateProfileReq("Profile A"))
	svc.Create(context.Background(), userID, makeCreateProfileReq("Profile B"))
	svc.Create(context.Background(), otherID, makeCreateProfileReq("Other"))

	resp, err := svc.List(context.Background(), userID)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if resp.Total != 2 {
		t.Errorf("expected total 2, got %d", resp.Total)
	}
	if len(resp.Data) != 2 {
		t.Errorf("expected 2 items, got %d", len(resp.Data))
	}
}

func TestProfileService_Update_Success(t *testing.T) {
	svc, _ := newProfileService()
	userID := uuid.New()

	created, _ := svc.Create(context.Background(), userID, makeCreateProfileReq("Old Name"))

	newName := "New Name"
	updated, err := svc.Update(context.Background(), userID, created.ID, model.UpdateProfileRequest{
		Name: &newName,
	})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.Name != newName {
		t.Errorf("expected name '%s', got '%s'", newName, updated.Name)
	}
}

func TestProfileService_Update_WrongOwner(t *testing.T) {
	svc, _ := newProfileService()
	ownerID := uuid.New()

	created, _ := svc.Create(context.Background(), ownerID, makeCreateProfileReq("Profile"))

	newName := "Hacked"
	_, err := svc.Update(context.Background(), uuid.New(), created.ID, model.UpdateProfileRequest{Name: &newName})
	if !errors.Is(err, service.ErrProfileNotFound) && !errors.Is(err, service.ErrProfileForbidden) {
		t.Errorf("expected ownership error, got: %v", err)
	}
}

func TestProfileService_Delete_Success(t *testing.T) {
	svc, _ := newProfileService()
	userID := uuid.New()

	created, _ := svc.Create(context.Background(), userID, makeCreateProfileReq("To Delete"))
	if err := svc.Delete(context.Background(), userID, created.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}

	_, err := svc.Get(context.Background(), userID, created.ID)
	if !errors.Is(err, service.ErrProfileNotFound) {
		t.Errorf("expected ErrProfileNotFound after delete, got: %v", err)
	}
}

func TestProfileService_SetDefault_Success(t *testing.T) {
	svc, repo := newProfileService()
	userID := uuid.New()

	p1, _ := svc.Create(context.Background(), userID, makeCreateProfileReq("P1"))
	p2, _ := svc.Create(context.Background(), userID, makeCreateProfileReq("P2"))

	if err := svc.SetDefault(context.Background(), userID, p2.ID); err != nil {
		t.Fatalf("set default: %v", err)
	}
	if !repo.profiles[p2.ID].IsDefault {
		t.Error("p2 should be default")
	}
	if repo.profiles[p1.ID].IsDefault {
		t.Error("p1 should not be default after setting p2")
	}
}

// ─── Section tests ────────────────────────────────────────────────────────────

func TestProfileService_CreateSection_Success(t *testing.T) {
	svc, _ := newProfileService()
	userID := uuid.New()

	profile, _ := svc.Create(context.Background(), userID, makeCreateProfileReq("My Profile"))

	sec, err := svc.CreateSection(context.Background(), userID, profile.ID, model.CreateSectionRequest{
		Type:     model.SectionTypeWorkExperience,
		Title:    "Work Experience",
		Position: 0,
	})
	if err != nil {
		t.Fatalf("create section: %v", err)
	}
	if sec.ID == uuid.Nil {
		t.Error("expected non-nil section ID")
	}
	if sec.Type != model.SectionTypeWorkExperience {
		t.Errorf("expected type work_experience, got %s", sec.Type)
	}
}

func TestProfileService_CreateSection_WrongOwner(t *testing.T) {
	svc, _ := newProfileService()
	ownerID := uuid.New()

	profile, _ := svc.Create(context.Background(), ownerID, makeCreateProfileReq("My Profile"))

	_, err := svc.CreateSection(context.Background(), uuid.New(), profile.ID, model.CreateSectionRequest{
		Type:  model.SectionTypeSkills,
		Title: "Skills",
	})
	if !errors.Is(err, service.ErrProfileNotFound) && !errors.Is(err, service.ErrProfileForbidden) {
		t.Errorf("expected ownership error, got: %v", err)
	}
}

func TestProfileService_UpdateSection_Success(t *testing.T) {
	svc, _ := newProfileService()
	userID := uuid.New()

	profile, _ := svc.Create(context.Background(), userID, makeCreateProfileReq("Profile"))
	sec, _ := svc.CreateSection(context.Background(), userID, profile.ID, model.CreateSectionRequest{
		Type: model.SectionTypeEducation, Title: "Education",
	})

	newTitle := "Học vấn"
	updated, err := svc.UpdateSection(context.Background(), userID, profile.ID, sec.ID, model.UpdateSectionRequest{
		Title: &newTitle,
	})
	if err != nil {
		t.Fatalf("update section: %v", err)
	}
	if updated.Title != newTitle {
		t.Errorf("expected title '%s', got '%s'", newTitle, updated.Title)
	}
}

func TestProfileService_DeleteSection_Success(t *testing.T) {
	svc, _ := newProfileService()
	userID := uuid.New()

	profile, _ := svc.Create(context.Background(), userID, makeCreateProfileReq("Profile"))
	sec, _ := svc.CreateSection(context.Background(), userID, profile.ID, model.CreateSectionRequest{
		Type: model.SectionTypeSkills, Title: "Skills",
	})

	if err := svc.DeleteSection(context.Background(), userID, profile.ID, sec.ID); err != nil {
		t.Fatalf("delete section: %v", err)
	}
}

func TestProfileService_ReorderSections_Success(t *testing.T) {
	svc, _ := newProfileService()
	userID := uuid.New()

	profile, _ := svc.Create(context.Background(), userID, makeCreateProfileReq("Profile"))
	s1, _ := svc.CreateSection(context.Background(), userID, profile.ID, model.CreateSectionRequest{Type: model.SectionTypeWorkExperience, Title: "Work", Position: 0})
	s2, _ := svc.CreateSection(context.Background(), userID, profile.ID, model.CreateSectionRequest{Type: model.SectionTypeSkills, Title: "Skills", Position: 1})

	err := svc.ReorderSections(context.Background(), userID, profile.ID, []uuid.UUID{s2.ID, s1.ID})
	if err != nil {
		t.Fatalf("reorder sections: %v", err)
	}
}

// ─── Item tests ───────────────────────────────────────────────────────────────

func TestProfileService_CreateItem_Success(t *testing.T) {
	svc, _ := newProfileService()
	userID := uuid.New()

	profile, _ := svc.Create(context.Background(), userID, makeCreateProfileReq("Profile"))
	sec, _ := svc.CreateSection(context.Background(), userID, profile.ID, model.CreateSectionRequest{
		Type: model.SectionTypeWorkExperience, Title: "Work",
	})

	item, err := svc.CreateItem(context.Background(), userID, profile.ID, sec.ID, model.CreateItemRequest{
		Position: 0,
		Data: map[string]any{
			"company":  "Acme Corp",
			"position": "Backend Engineer",
		},
	})
	if err != nil {
		t.Fatalf("create item: %v", err)
	}
	if item.ID == uuid.Nil {
		t.Error("expected non-nil item ID")
	}
	if item.Data["company"] != "Acme Corp" {
		t.Errorf("expected company 'Acme Corp', got '%v'", item.Data["company"])
	}
}

func TestProfileService_UpdateItem_Success(t *testing.T) {
	svc, _ := newProfileService()
	userID := uuid.New()

	profile, _ := svc.Create(context.Background(), userID, makeCreateProfileReq("Profile"))
	sec, _ := svc.CreateSection(context.Background(), userID, profile.ID, model.CreateSectionRequest{
		Type: model.SectionTypeSkills, Title: "Skills",
	})
	item, _ := svc.CreateItem(context.Background(), userID, profile.ID, sec.ID, model.CreateItemRequest{
		Data: map[string]any{"group_name": "Backend", "skills": []string{"Go", "Postgres"}},
	})

	visible := false
	updated, err := svc.UpdateItem(context.Background(), userID, profile.ID, sec.ID, item.ID, model.UpdateItemRequest{
		IsVisible: &visible,
		Data:      map[string]any{"group_name": "Backend Updated"},
	})
	if err != nil {
		t.Fatalf("update item: %v", err)
	}
	if updated.IsVisible {
		t.Error("expected is_visible=false")
	}
}

func TestProfileService_DeleteItem_Success(t *testing.T) {
	svc, _ := newProfileService()
	userID := uuid.New()

	profile, _ := svc.Create(context.Background(), userID, makeCreateProfileReq("Profile"))
	sec, _ := svc.CreateSection(context.Background(), userID, profile.ID, model.CreateSectionRequest{
		Type: model.SectionTypeProjects, Title: "Projects",
	})
	item, _ := svc.CreateItem(context.Background(), userID, profile.ID, sec.ID, model.CreateItemRequest{
		Data: map[string]any{"name": "MyProject"},
	})

	err := svc.DeleteItem(context.Background(), userID, profile.ID, sec.ID, item.ID)
	if err != nil {
		t.Fatalf("delete item: %v", err)
	}
}

func TestProfileService_CreateItem_SectionBelongsToDifferentProfile(t *testing.T) {
	svc, _ := newProfileService()
	userID := uuid.New()

	p1, _ := svc.Create(context.Background(), userID, makeCreateProfileReq("P1"))
	p2, _ := svc.Create(context.Background(), userID, makeCreateProfileReq("P2"))

	// Section belongs to p2
	sec, _ := svc.CreateSection(context.Background(), userID, p2.ID, model.CreateSectionRequest{
		Type: model.SectionTypeSkills, Title: "Skills",
	})

	// Try to add item via p1 → should fail
	_, err := svc.CreateItem(context.Background(), userID, p1.ID, sec.ID, model.CreateItemRequest{
		Data: map[string]any{"foo": "bar"},
	})
	if !errors.Is(err, service.ErrSectionNotFound) {
		t.Errorf("expected ErrSectionNotFound for cross-profile section, got: %v", err)
	}
}
