package tag

import (
	"errors"
	"fmt"
	"slices"
	"sync"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

var ErrNotFound = errors.New("tag not found")

type Tag struct {
	ID   string
	Name string
}

type Repository interface {
	List() ([]Tag, error)
	Create(name string) (Tag, error)
	Update(id, name string) (Tag, error)
	Delete(id string) error
}

type MemoryRepository struct {
	mu     sync.RWMutex
	items  []Tag
	nextID int
}

func NewMemoryRepository(cfg []config.Tag) *MemoryRepository {
	items := make([]Tag, 0, len(cfg))
	for _, item := range cfg {
		items = append(items, Tag{ID: item.ID, Name: item.Name})
	}

	slices.SortFunc(items, func(a, b Tag) int {
		return compareString(a.Name, b.Name)
	})

	return &MemoryRepository{
		items:  items,
		nextID: len(items) + 1,
	}
}

func (r *MemoryRepository) List() ([]Tag, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return slices.Clone(r.items), nil
}

func (r *MemoryRepository) Create(name string) (Tag, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	created := Tag{
		ID:   fmt.Sprintf("tag-generated-%d", r.nextID),
		Name: name,
	}
	r.nextID++
	r.items = append(r.items, created)
	slices.SortFunc(r.items, func(a, b Tag) int { return compareString(a.Name, b.Name) })

	return created, nil
}

func (r *MemoryRepository) Update(id, name string) (Tag, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index, item := range r.items {
		if item.ID != id {
			continue
		}
		r.items[index].Name = name
		slices.SortFunc(r.items, func(a, b Tag) int { return compareString(a.Name, b.Name) })
		return r.items[index], nil
	}

	return Tag{}, ErrNotFound
}

func (r *MemoryRepository) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index, item := range r.items {
		if item.ID != id {
			continue
		}
		r.items = append(r.items[:index], r.items[index+1:]...)
		return nil
	}

	return ErrNotFound
}

func compareString(left, right string) int {
	switch {
	case left < right:
		return -1
	case left > right:
		return 1
	default:
		return 0
	}
}
