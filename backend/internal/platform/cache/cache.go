package cache

import (
	"sync"
	"time"
)

type entry[T any] struct {
	value     T
	expiresAt time.Time
}

type TTL[T any] struct {
	mu   sync.RWMutex
	data map[string]entry[T]
	ttl  time.Duration
	now  func() time.Time
}

func NewTTL[T any](ttl time.Duration) *TTL[T] {
	return &TTL[T]{
		data: make(map[string]entry[T]),
		ttl:  ttl,
		now:  time.Now,
	}
}

func (c *TTL[T]) Get(key string) (T, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	e, ok := c.data[key]
	if !ok || c.now().After(e.expiresAt) {
		var zero T
		return zero, false
	}
	return e.value, true
}

func (c *TTL[T]) Set(key string, value T) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.data[key] = entry[T]{
		value:     value,
		expiresAt: c.now().Add(c.ttl),
	}
}

func (c *TTL[T]) Invalidate() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.data = make(map[string]entry[T])
}

func (c *TTL[T]) Delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.data, key)
}
