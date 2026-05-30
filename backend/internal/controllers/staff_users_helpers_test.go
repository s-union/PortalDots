package controllers

import (
	"context"
	"slices"
	"testing"

	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
)

func TestNormalizeRequestedLoginIDsDeduplicatesCaseInsensitive(t *testing.T) {
	t.Parallel()

	got := normalizeRequestedLoginIDs([]string{
		" S001 ",
		"s001",
		"",
		" STAFF@example.com ",
		"staff@example.com",
	})

	want := []string{"S001", "STAFF@example.com"}
	if !slices.Equal(got, want) {
		t.Fatalf("unexpected normalized login IDs: got %#v want %#v", got, want)
	}
}

type recordingSessionStore struct {
	invalidatedUserID        string
	updateSawInvalidatedUser bool
	updatedSession           session.Session
	deletedUserID            string
}

func (s *recordingSessionStore) Create(context.Context, *auth.User) (string, session.Session, error) {
	return "", session.Session{}, nil
}

func (s *recordingSessionStore) Get(context.Context, string) (session.Session, bool) {
	return session.Session{}, false
}

func (s *recordingSessionStore) Delete(context.Context, string) error {
	return nil
}

func (s *recordingSessionStore) DeleteByUserID(_ context.Context, userID string) error {
	s.deletedUserID = userID
	return nil
}

func (s *recordingSessionStore) DeleteOtherSessionsByUserID(context.Context, string, string) error {
	return nil
}

func (s *recordingSessionStore) Update(_ context.Context, _ string, update func(*session.Session)) bool {
	s.updateSawInvalidatedUser = s.invalidatedUserID != ""
	s.updatedSession = session.Session{
		User: &auth.User{
			ID:          "user-1",
			DisplayName: "Old User",
			Roles:       []string{"participant"},
			Permissions: []string{"staff.pages.read"},
		},
	}
	update(&s.updatedSession)
	return true
}

func (s *recordingSessionStore) InvalidateUser(userID string) {
	s.invalidatedUserID = userID
}

func TestUpdateOrInvalidateStaffUserSessionInvalidatesBeforeUpdatingCurrentSession(t *testing.T) {
	t.Parallel()

	store := &recordingSessionStore{}

	updateOrInvalidateStaffUserSession(
		context.Background(),
		"session-1",
		session.Session{User: &auth.User{ID: "user-1"}},
		useradmin.User{
			ID:          "user-1",
			DisplayName: "Updated User",
			Roles:       []string{"staff"},
			Permissions: []string{"staff.users.read"},
		},
		store,
	)

	if store.invalidatedUserID != "user-1" {
		t.Fatalf("expected user cache to be invalidated, got %q", store.invalidatedUserID)
	}
	if !store.updateSawInvalidatedUser {
		t.Fatal("expected user cache invalidation before session update")
	}
	if store.updatedSession.User.DisplayName != "Updated User" {
		t.Fatalf("expected updated display name, got %#v", store.updatedSession.User)
	}
}

func TestUpdateOrInvalidateStaffUserSessionInvalidatesBeforeDeletingOtherUserSessions(t *testing.T) {
	t.Parallel()

	store := &recordingSessionStore{}

	updateOrInvalidateStaffUserSession(
		context.Background(),
		"session-1",
		session.Session{User: &auth.User{ID: "actor-user"}},
		useradmin.User{ID: "target-user"},
		store,
	)

	if store.invalidatedUserID != "target-user" {
		t.Fatalf("expected target user cache to be invalidated, got %q", store.invalidatedUserID)
	}
	if store.deletedUserID != "target-user" {
		t.Fatalf("expected target user sessions to be deleted, got %q", store.deletedUserID)
	}
}
