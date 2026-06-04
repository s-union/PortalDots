package contactcategory

import (
	"context"
	"time"

	"github.com/s-union/PortalDots/backend/internal/platform/cache"
)

const DefaultCacheTTL = 5 * time.Minute

type CachedRepository struct {
	inner Repository
	cache *cache.TTL[[]Category]
}

func NewCachedRepository(inner Repository) *CachedRepository {
	return &CachedRepository{
		inner: inner,
		cache: cache.NewTTL[[]Category](DefaultCacheTTL),
	}
}

func (r *CachedRepository) List(ctx context.Context) ([]Category, error) {
	if categories, ok := r.cache.Get("all"); ok {
		return categories, nil
	}

	categories, err := r.inner.List(ctx)
	if err != nil {
		return nil, err
	}

	r.cache.Set("all", categories)
	return categories, nil
}

func (r *CachedRepository) Find(ctx context.Context, id string) (Category, error) {
	categories, err := r.List(ctx)
	if err != nil {
		return Category{}, err
	}

	for _, c := range categories {
		if c.ID == id {
			return c, nil
		}
	}
	return Category{}, ErrNotFound
}

func (r *CachedRepository) Create(ctx context.Context, name, email string) (Category, error) {
	category, err := r.inner.Create(ctx, name, email)
	if err != nil {
		return Category{}, err
	}
	r.cache.Invalidate()
	return category, nil
}

func (r *CachedRepository) Update(ctx context.Context, id, name, email string) (Category, error) {
	category, err := r.inner.Update(ctx, id, name, email)
	if err != nil {
		return Category{}, err
	}
	r.cache.Invalidate()
	return category, nil
}

func (r *CachedRepository) Delete(ctx context.Context, id string) error {
	err := r.inner.Delete(ctx, id)
	if err != nil {
		return err
	}
	r.cache.Invalidate()
	return nil
}
