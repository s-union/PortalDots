package session

import (
	"reflect"
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

func TestMemoryStoreClonesStoredSessions(t *testing.T) {
	t.Parallel()

	store := NewMemoryStore(time.Hour)
	sessionID, _, err := store.Create(&auth.User{
		ID:          "user-1",
		DisplayName: "User One",
		Roles:       []string{"participant"},
		Permissions: []string{"forms:read"},
	})
	if err != nil {
		t.Fatalf("expected Create to succeed, got %v", err)
	}

	stored, ok := store.Get(sessionID)
	if !ok {
		t.Fatal("expected session to exist")
	}
	stored.User.Roles[0] = "admin"
	stored.User.Permissions[0] = "forms:edit"

	again, ok := store.Get(sessionID)
	if !ok {
		t.Fatal("expected session to still exist")
	}
	if !reflect.DeepEqual(again.User.Roles, []string{"participant"}) {
		t.Fatalf("expected roles to remain unchanged, got %#v", again.User.Roles)
	}
	if !reflect.DeepEqual(again.User.Permissions, []string{"forms:read"}) {
		t.Fatalf("expected permissions to remain unchanged, got %#v", again.User.Permissions)
	}
}

func TestMemoryStoreDeleteAndDeleteByUserID(t *testing.T) {
	t.Parallel()

	store := NewMemoryStore(time.Hour)
	user1 := &auth.User{ID: "user-1"}
	user2 := &auth.User{ID: "user-2"}

	session1, _, err := store.Create(user1)
	if err != nil {
		t.Fatalf("expected first session to be created, got %v", err)
	}
	session2, _, err := store.Create(user1)
	if err != nil {
		t.Fatalf("expected second session to be created, got %v", err)
	}
	session3, _, err := store.Create(user2)
	if err != nil {
		t.Fatalf("expected third session to be created, got %v", err)
	}

	_ = store.Delete(session1)
	if _, ok := store.Get(session1); ok {
		t.Fatal("expected deleted session to be removed")
	}

	_ = store.DeleteByUserID("user-1")
	if _, ok := store.Get(session2); ok {
		t.Fatal("expected user-1 session to be removed")
	}
	if _, ok := store.Get(session3); !ok {
		t.Fatal("expected user-2 session to remain")
	}
}

func TestMemoryStoreUpdate(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, time.April, 1, 12, 0, 0, 0, time.UTC)
	store := NewMemoryStore(time.Hour)
	store.now = func() time.Time {
		return now
	}

	sessionID, _, err := store.Create(&auth.User{ID: "user-1"})
	if err != nil {
		t.Fatalf("expected session to be created, got %v", err)
	}

	updated := store.Update(sessionID, func(current *Session) {
		current.StaffAuthorized = true
		current.CurrentCircleID = "circle-1"
	})
	if !updated {
		t.Fatal("expected update to succeed")
	}

	current, ok := store.Get(sessionID)
	if !ok {
		t.Fatal("expected updated session to exist")
	}
	if !current.StaffAuthorized || current.CurrentCircleID != "circle-1" {
		t.Fatalf("unexpected updated session: %#v", current)
	}

	if store.Update("missing", func(current *Session) {}) {
		t.Fatal("expected missing session update to fail")
	}

	now = now.Add(2 * time.Hour)
	if store.Update(sessionID, func(current *Session) {}) {
		t.Fatal("expected expired session update to fail")
	}
	if _, ok := store.Get(sessionID); ok {
		t.Fatal("expected expired session to be removed")
	}
}
