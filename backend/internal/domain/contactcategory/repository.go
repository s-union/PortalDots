package contactcategory

import (
	"errors"
	"fmt"
	"slices"
	"sync"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

var ErrNotFound = errors.New("contact category not found")

type Category struct {
	ID    string
	Name  string
	Email string
}

type Repository interface {
	List() ([]Category, error)
	Create(name, email string) (Category, error)
	Update(id, name, email string) (Category, error)
	Delete(id string) error
}

type MemoryRepository struct {
	mu     sync.RWMutex
	items  []Category
	nextID int
}

func NewMemoryRepository(cfg []config.ContactCategory) *MemoryRepository {
	items := make([]Category, 0, len(cfg))
	for _, item := range cfg {
		items = append(items, Category{
			ID:    item.ID,
			Name:  item.Name,
			Email: item.Email,
		})
	}
	slices.SortFunc(items, func(a, b Category) int { return compareString(a.Name, b.Name) })

	return &MemoryRepository{
		items:  items,
		nextID: len(items) + 1,
	}
}

func (r *MemoryRepository) List() ([]Category, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return slices.Clone(r.items), nil
}

func (r *MemoryRepository) Create(name, email string) (Category, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	created := Category{
		ID:    fmt.Sprintf("contact-category-generated-%d", r.nextID),
		Name:  name,
		Email: email,
	}
	r.nextID++
	r.items = append(r.items, created)
	slices.SortFunc(r.items, func(a, b Category) int { return compareString(a.Name, b.Name) })

	return created, nil
}

func (r *MemoryRepository) Update(id, name, email string) (Category, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index, item := range r.items {
		if item.ID != id {
			continue
		}
		r.items[index].Name = name
		r.items[index].Email = email
		slices.SortFunc(r.items, func(a, b Category) int { return compareString(a.Name, b.Name) })
		return r.items[index], nil
	}

	return Category{}, ErrNotFound
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
