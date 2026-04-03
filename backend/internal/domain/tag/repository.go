package tag

import (
	"errors"
	"slices"
	"strings"
	"sync"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
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

	slices.SortFunc(items, func(a, b Tag) int { return strings.Compare(a.Name, b.Name) })

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
		ID:   uuidv7.MustString(),
		Name: name,
	}
	r.nextID++
	insertAt, _ := slices.BinarySearchFunc(r.items, created, func(item Tag, target Tag) int {
		return strings.Compare(item.Name, target.Name)
	})
	r.items = slices.Insert(r.items, insertAt, created)

	return created, nil
}

func (r *MemoryRepository) Update(id, name string) (Tag, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index, item := range r.items {
		if item.ID != id {
			continue
		}
		updated := r.items[index]
		updated.Name = name
		r.items = append(r.items[:index], r.items[index+1:]...)
		insertAt, _ := slices.BinarySearchFunc(r.items, updated, func(item Tag, target Tag) int {
			return strings.Compare(item.Name, target.Name)
		})
		r.items = slices.Insert(r.items, insertAt, updated)
		return updated, nil
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
