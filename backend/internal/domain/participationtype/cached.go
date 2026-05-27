package participationtype

import (
	"context"
	"time"

	"github.com/s-union/PortalDots/backend/internal/platform/cache"
)

const DefaultCacheTTL = 5 * time.Minute

type CachedRepository struct {
	inner     Repository
	listCache *cache.TTL[[]ParticipationType]
}

func NewCachedRepository(inner Repository) *CachedRepository {
	return &CachedRepository{
		inner:     inner,
		listCache: cache.NewTTL[[]ParticipationType](DefaultCacheTTL),
	}
}

func (r *CachedRepository) List(ctx context.Context) ([]ParticipationType, error) {
	if items, ok := r.listCache.Get("all"); ok {
		return items, nil
	}

	items, err := r.inner.List(ctx)
	if err != nil {
		return nil, err
	}

	r.listCache.Set("all", items)
	return items, nil
}

func (r *CachedRepository) Find(ctx context.Context, typeID string) (ParticipationType, error) {
	items, err := r.List(ctx)
	if err != nil {
		return ParticipationType{}, err
	}

	for _, item := range items {
		if item.ID == typeID {
			return item, nil
		}
	}
	return ParticipationType{}, ErrNotFound
}

func (r *CachedRepository) FindByFormID(ctx context.Context, formID string) (ParticipationType, error) {
	items, err := r.List(ctx)
	if err != nil {
		return ParticipationType{}, err
	}

	for _, item := range items {
		if item.FormID == formID {
			return item, nil
		}
	}
	return ParticipationType{}, ErrNotFound
}

func (r *CachedRepository) Create(ctx context.Context, name, description string, usersCountMin, usersCountMax int32, tags []string, formID string) (ParticipationType, error) {
	item, err := r.inner.Create(ctx, name, description, usersCountMin, usersCountMax, tags, formID)
	if err != nil {
		return ParticipationType{}, err
	}
	r.listCache.Invalidate()
	return item, nil
}

func (r *CachedRepository) Update(ctx context.Context, typeID, name, description string, usersCountMin, usersCountMax int32, tags []string) (ParticipationType, error) {
	item, err := r.inner.Update(ctx, typeID, name, description, usersCountMin, usersCountMax, tags)
	if err != nil {
		return ParticipationType{}, err
	}
	r.listCache.Invalidate()
	return item, nil
}

func (r *CachedRepository) Delete(ctx context.Context, typeID string) error {
	err := r.inner.Delete(ctx, typeID)
	if err != nil {
		return err
	}
	r.listCache.Invalidate()
	return nil
}
