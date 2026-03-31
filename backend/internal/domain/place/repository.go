package place

import (
	"errors"
	"fmt"
	"slices"
	"strings"
	"sync"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

var ErrNotFound = errors.New("place not found")

type Place struct {
	ID    string
	Name  string
	Type  int32
	Notes string
}

type Repository interface {
	List() ([]Place, error)
	Create(name string, placeType int32, notes string) (Place, error)
	Update(id, name string, placeType int32, notes string) (Place, error)
	Delete(id string) error
}

type MemoryRepository struct {
	mu     sync.RWMutex
	items  []Place
	nextID int
}

func NewMemoryRepository(cfg []config.Place) *MemoryRepository {
	items := make([]Place, 0, len(cfg))
	for _, item := range cfg {
		items = append(items, Place{
			ID:    item.ID,
			Name:  item.Name,
			Type:  int32(item.Type),
			Notes: item.Notes,
		})
	}
	slices.SortFunc(items, func(a, b Place) int { return strings.Compare(a.Name, b.Name) })

	return &MemoryRepository{
		items:  items,
		nextID: len(items) + 1,
	}
}

func (r *MemoryRepository) List() ([]Place, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return slices.Clone(r.items), nil
}

func (r *MemoryRepository) Create(name string, placeType int32, notes string) (Place, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	created := Place{
		ID:    fmt.Sprintf("place-generated-%d", r.nextID),
		Name:  name,
		Type:  placeType,
		Notes: notes,
	}
	r.nextID++
	insertAt, _ := slices.BinarySearchFunc(r.items, created, func(item Place, target Place) int {
		return strings.Compare(item.Name, target.Name)
	})
	r.items = slices.Insert(r.items, insertAt, created)

	return created, nil
}

func (r *MemoryRepository) Update(id, name string, placeType int32, notes string) (Place, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index, item := range r.items {
		if item.ID != id {
			continue
		}
		updated := r.items[index]
		updated.Name = name
		updated.Type = placeType
		updated.Notes = notes
		r.items = append(r.items[:index], r.items[index+1:]...)
		insertAt, _ := slices.BinarySearchFunc(r.items, updated, func(item Place, target Place) int {
			return strings.Compare(item.Name, target.Name)
		})
		r.items = slices.Insert(r.items, insertAt, updated)
		return updated, nil
	}

	return Place{}, ErrNotFound
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
