package contactcategory

import (
	"errors"
	"slices"
	"strings"
	"sync"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

var ErrNotFound = errors.New("contact category not found")

type Category struct {
	ID    string
	Name  string
	Email string
}

type Repository interface {
	List() ([]Category, error)
	Find(id string) (Category, error)
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
	slices.SortFunc(items, func(a, b Category) int { return strings.Compare(a.Name, b.Name) })

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

func (r *MemoryRepository) Find(id string) (Category, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, item := range r.items {
		if item.ID == id {
			return item, nil
		}
	}
	return Category{}, ErrNotFound
}

func (r *MemoryRepository) Create(name, email string) (Category, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	created := Category{
		ID:    uuidv7.MustString(),
		Name:  name,
		Email: email,
	}
	r.nextID++
	insertAt, _ := slices.BinarySearchFunc(r.items, created, func(item Category, target Category) int {
		return strings.Compare(item.Name, target.Name)
	})
	r.items = slices.Insert(r.items, insertAt, created)

	return created, nil
}

func (r *MemoryRepository) Update(id, name, email string) (Category, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index, item := range r.items {
		if item.ID != id {
			continue
		}
		updated := r.items[index]
		updated.Name = name
		updated.Email = email
		r.items = append(r.items[:index], r.items[index+1:]...)
		insertAt, _ := slices.BinarySearchFunc(r.items, updated, func(item Category, target Category) int {
			return strings.Compare(item.Name, target.Name)
		})
		r.items = slices.Insert(r.items, insertAt, updated)
		return updated, nil
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
