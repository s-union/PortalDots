package place

import (
	"context"
	"time"

	"github.com/s-union/PortalDots/backend/internal/platform/cache"
)

const DefaultCacheTTL = 5 * time.Minute

type CachedRepository struct {
	inner Repository
	cache *cache.TTL[[]Place]
}

func NewCachedRepository(inner Repository) *CachedRepository {
	return &CachedRepository{
		inner: inner,
		cache: cache.NewTTL[[]Place](DefaultCacheTTL),
	}
}

func (r *CachedRepository) List(ctx context.Context) ([]Place, error) {
	if places, ok := r.cache.Get("all"); ok {
		return places, nil
	}

	places, err := r.inner.List(ctx)
	if err != nil {
		return nil, err
	}

	r.cache.Set("all", places)
	return places, nil
}

func (r *CachedRepository) Create(ctx context.Context, name string, placeType int32, notes string) (Place, error) {
	place, err := r.inner.Create(ctx, name, placeType, notes)
	if err != nil {
		return Place{}, err
	}
	r.cache.Invalidate()
	return place, nil
}

func (r *CachedRepository) Update(ctx context.Context, id, name string, placeType int32, notes string) (Place, error) {
	place, err := r.inner.Update(ctx, id, name, placeType, notes)
	if err != nil {
		return Place{}, err
	}
	r.cache.Invalidate()
	return place, nil
}

func (r *CachedRepository) Delete(ctx context.Context, id string) error {
	err := r.inner.Delete(ctx, id)
	if err != nil {
		return err
	}
	r.cache.Invalidate()
	return nil
}
