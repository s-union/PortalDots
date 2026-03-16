package booth

import (
	"slices"
	"sync"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

type Assignment struct {
	PlaceID  string
	CircleID string
}

type Repository interface {
	List() ([]Assignment, error)
	DeleteByPlace(placeID string) error
	DeleteByCircle(circleID string) error
}

type MemoryRepository struct {
	mu    sync.RWMutex
	items []Assignment
}

func NewMemoryRepository(cfg []config.BoothAssignment) *MemoryRepository {
	items := make([]Assignment, 0, len(cfg))
	for _, item := range cfg {
		items = append(items, Assignment{PlaceID: item.PlaceID, CircleID: item.CircleID})
	}

	return &MemoryRepository{items: items}
}

func (r *MemoryRepository) List() ([]Assignment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return slices.Clone(r.items), nil
}

func (r *MemoryRepository) DeleteByPlace(placeID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.items = slices.DeleteFunc(r.items, func(item Assignment) bool {
		return item.PlaceID == placeID
	})
	return nil
}

func (r *MemoryRepository) DeleteByCircle(circleID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.items = slices.DeleteFunc(r.items, func(item Assignment) bool {
		return item.CircleID == circleID
	})
	return nil
}
