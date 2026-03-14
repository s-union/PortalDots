package session

import (
	"testing"
	"time"

	"github.com/s-union/PortalDots/backend/internal/domain/auth"
)

func TestMemoryStoreExpiresSessions(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, time.March, 12, 12, 0, 0, 0, time.UTC)
	store := NewMemoryStore(time.Hour)
	store.now = func() time.Time {
		return now
	}

	sessionID, _, err := store.Create(&auth.User{ID: "user-1"})
	if err != nil {
		t.Fatalf("expected Create to succeed, got %v", err)
	}

	now = now.Add(2 * time.Hour)

	if _, ok := store.Get(sessionID); ok {
		t.Fatal("expected expired session to be removed")
	}
}
