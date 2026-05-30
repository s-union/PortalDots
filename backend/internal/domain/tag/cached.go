package tag

import (
	"time"

	"github.com/s-union/PortalDots/backend/internal/platform/cache"
)

const DefaultCacheTTL = 5 * time.Minute

type CachedRepository struct {
	inner Repository
	cache *cache.TTL[[]Tag]
}

func NewCachedRepository(inner Repository) *CachedRepository {
	return &CachedRepository{
		inner: inner,
		cache: cache.NewTTL[[]Tag](DefaultCacheTTL),
	}
}

func (r *CachedRepository) List() ([]Tag, error) {
	if tags, ok := r.cache.Get("all"); ok {
		return tags, nil
	}

	tags, err := r.inner.List()
	if err != nil {
		return nil, err
	}

	r.cache.Set("all", tags)
	return tags, nil
}

func (r *CachedRepository) Create(name string) (Tag, error) {
	tag, err := r.inner.Create(name)
	if err != nil {
		return Tag{}, err
	}
	r.cache.Invalidate()
	return tag, nil
}

func (r *CachedRepository) Update(id, name string) (Tag, error) {
	tag, err := r.inner.Update(id, name)
	if err != nil {
		return Tag{}, err
	}
	r.cache.Invalidate()
	return tag, nil
}

func (r *CachedRepository) Delete(id string) error {
	err := r.inner.Delete(id)
	if err != nil {
		return err
	}
	r.cache.Invalidate()
	return nil
}
