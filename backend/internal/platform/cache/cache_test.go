package cache

import (
	"testing"
	"time"
)

func TestTTL_GetSet(t *testing.T) {
	c := NewTTL[string](time.Minute)

	c.Set("key", "value")

	got, ok := c.Get("key")
	if !ok {
		t.Fatal("expected cache hit")
	}
	if got != "value" {
		t.Fatalf("expected 'value', got %q", got)
	}
}

func TestTTL_GetMiss(t *testing.T) {
	c := NewTTL[string](time.Minute)

	_, ok := c.Get("missing")
	if ok {
		t.Fatal("expected cache miss")
	}
}

func TestTTL_Expiration(t *testing.T) {
	now := time.Now()
	c := NewTTL[string](time.Second)
	c.now = func() time.Time { return now }

	c.Set("key", "value")

	_, ok := c.Get("key")
	if !ok {
		t.Fatal("expected cache hit before expiration")
	}

	c.now = func() time.Time { return now.Add(2 * time.Second) }

	_, ok = c.Get("key")
	if ok {
		t.Fatal("expected cache miss after expiration")
	}
}

func TestTTL_Invalidate(t *testing.T) {
	c := NewTTL[string](time.Minute)

	c.Set("key1", "value1")
	c.Set("key2", "value2")

	c.Invalidate()

	_, ok := c.Get("key1")
	if ok {
		t.Fatal("expected cache miss after invalidate")
	}
	_, ok = c.Get("key2")
	if ok {
		t.Fatal("expected cache miss after invalidate")
	}
}

func TestTTL_Delete(t *testing.T) {
	c := NewTTL[string](time.Minute)

	c.Set("key1", "value1")
	c.Set("key2", "value2")

	c.Delete("key1")

	_, ok := c.Get("key1")
	if ok {
		t.Fatal("expected cache miss after delete")
	}
	got, ok := c.Get("key2")
	if !ok {
		t.Fatal("expected cache hit for key2")
	}
	if got != "value2" {
		t.Fatalf("expected 'value2', got %q", got)
	}
}
