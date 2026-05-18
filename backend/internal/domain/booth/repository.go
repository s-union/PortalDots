package booth

import (
	"context"
	"slices"
	"sync"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

type Assignment struct {
	PlaceID  string
	CircleID string
}

type Repository interface {
	List(ctx context.Context) ([]Assignment, error)
	DeleteByPlace(ctx context.Context, placeID string) error
	DeleteByCircle(ctx context.Context, circleID string) error
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

func (r *MemoryRepository) List(_ context.Context) ([]Assignment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return slices.Clone(r.items), nil
}

func (r *MemoryRepository) DeleteByPlace(_ context.Context, placeID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.items = slices.DeleteFunc(r.items, func(item Assignment) bool {
		return item.PlaceID == placeID
	})
	return nil
}

func (r *MemoryRepository) DeleteByCircle(_ context.Context, circleID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.items = slices.DeleteFunc(r.items, func(item Assignment) bool {
		return item.CircleID == circleID
	})
	return nil
}
