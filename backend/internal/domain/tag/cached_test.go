package tag

import (
	"errors"
	"testing"
)

type mockRepository struct {
	listCallCount int
	items         []Tag
	createErr     error
	updateErr     error
	deleteErr     error
}

func (m *mockRepository) List() ([]Tag, error) {
	m.listCallCount++
	return m.items, nil
}

func (m *mockRepository) Create(name string) (Tag, error) {
	if m.createErr != nil {
		return Tag{}, m.createErr
	}
	tag := Tag{ID: "new-id", Name: name}
	m.items = append(m.items, tag)
	return tag, nil
}

func (m *mockRepository) Update(id, name string) (Tag, error) {
	if m.updateErr != nil {
		return Tag{}, m.updateErr
	}
	for i, item := range m.items {
		if item.ID == id {
			m.items[i].Name = name
			return m.items[i], nil
		}
	}
	return Tag{}, ErrNotFound
}

func (m *mockRepository) Delete(id string) error {
	if m.deleteErr != nil {
		return m.deleteErr
	}
	for i, item := range m.items {
		if item.ID == id {
			m.items = append(m.items[:i], m.items[i+1:]...)
			return nil
		}
	}
	return ErrNotFound
}

func TestCachedRepository_ListCachesResult(t *testing.T) {
	mock := &mockRepository{
		items: []Tag{{ID: "1", Name: "tag1"}, {ID: "2", Name: "tag2"}},
	}
	repo := NewCachedRepository(mock)

	tags1, err := repo.List()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(tags1) != 2 {
		t.Fatalf("expected 2 tags, got %d", len(tags1))
	}

	tags2, err := repo.List()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(tags2) != 2 {
		t.Fatalf("expected 2 tags, got %d", len(tags2))
	}

	if mock.listCallCount != 1 {
		t.Fatalf("expected inner List to be called once, got %d", mock.listCallCount)
	}
}

func TestCachedRepository_CreateInvalidatesCache(t *testing.T) {
	mock := &mockRepository{
		items: []Tag{{ID: "1", Name: "tag1"}},
	}
	repo := NewCachedRepository(mock)

	_, _ = repo.List()
	if mock.listCallCount != 1 {
		t.Fatalf("expected 1 call, got %d", mock.listCallCount)
	}

	_, err := repo.Create("new-tag")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, _ = repo.List()
	if mock.listCallCount != 2 {
		t.Fatalf("expected 2 calls after create invalidation, got %d", mock.listCallCount)
	}
}

func TestCachedRepository_UpdateInvalidatesCache(t *testing.T) {
	mock := &mockRepository{
		items: []Tag{{ID: "1", Name: "tag1"}},
	}
	repo := NewCachedRepository(mock)

	_, _ = repo.List()
	_, _ = repo.Update("1", "updated")
	_, _ = repo.List()

	if mock.listCallCount != 2 {
		t.Fatalf("expected 2 calls after update invalidation, got %d", mock.listCallCount)
	}
}

func TestCachedRepository_DeleteInvalidatesCache(t *testing.T) {
	mock := &mockRepository{
		items: []Tag{{ID: "1", Name: "tag1"}},
	}
	repo := NewCachedRepository(mock)

	_, _ = repo.List()
	_ = repo.Delete("1")
	_, _ = repo.List()

	if mock.listCallCount != 2 {
		t.Fatalf("expected 2 calls after delete invalidation, got %d", mock.listCallCount)
	}
}

func TestCachedRepository_CreateError(t *testing.T) {
	mock := &mockRepository{createErr: errors.New("create failed")}
	repo := NewCachedRepository(mock)

	_, err := repo.Create("tag")
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestCachedRepository_DeleteError(t *testing.T) {
	mock := &mockRepository{deleteErr: ErrNotFound}
	repo := NewCachedRepository(mock)

	err := repo.Delete("nonexistent")
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}
