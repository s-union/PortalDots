package useradmin

import (
	"errors"
	"testing"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

func TestNewStaticRepositoryAssignsTimestampsToSeededUsers(t *testing.T) {
	t.Parallel()

	repo := NewStaticRepository(
		config.AuthUser{
			ID:          "auth-user",
			LoginIDs:    []string{"staff"},
			DisplayName: "Staff User",
			Roles:       []string{"staff"},
			Permissions: []string{"forms.read"},
		},
		[]config.User{
			{
				ID:              "auth-user",
				LoginIDs:        []string{"staff"},
				DisplayName:     "Staff User",
				ContactEmail:    "staff@example.com",
				IsVerified:      true,
				IsEmailVerified: true,
			},
			{
				ID:              "seed-user",
				LoginIDs:        []string{"participant"},
				DisplayName:     "Participant User",
				ContactEmail:    "participant@example.com",
				IsVerified:      true,
				IsEmailVerified: true,
			},
		},
	)

	users, err := repo.List()
	if err != nil {
		t.Fatalf("expected seeded users to list, got %v", err)
	}
	if len(users) != 2 {
		t.Fatalf("expected 2 users, got %d", len(users))
	}

	for _, user := range users {
		if user.CreatedAt.IsZero() {
			t.Fatalf("expected %s createdAt to be set", user.ID)
		}
		if user.UpdatedAt.IsZero() {
			t.Fatalf("expected %s updatedAt to be set", user.ID)
		}
		if !user.CreatedAt.Equal(user.UpdatedAt) {
			t.Fatalf("expected %s timestamps to match on initialization, got %s and %s", user.ID, user.CreatedAt, user.UpdatedAt)
		}
	}
}

func TestStaticRepositoryFindByNormalizedLoginID(t *testing.T) {
	t.Parallel()

	repo := NewStaticRepository(
		config.AuthUser{
			ID:          "auth-user",
			LoginIDs:    []string{"staff"},
			DisplayName: "Staff User",
			Roles:       []string{"staff"},
			Permissions: []string{"forms.read"},
		},
		[]config.User{
			{
				ID:              "auth-user",
				LoginIDs:        []string{"staff"},
				DisplayName:     "Staff User",
				ContactEmail:    "staff@example.com",
				IsVerified:      true,
				IsEmailVerified: true,
			},
			{
				ID:              "mixed-user",
				LoginIDs:        []string{"MiXeDLoginID"},
				DisplayName:     "Mixed User",
				ContactEmail:    "mixed@example.com",
				IsVerified:      true,
				IsEmailVerified: true,
			},
		},
	)

	userValue, err := repo.FindByNormalizedLoginID(" mixedloginid ")
	if err != nil {
		t.Fatalf("expected to find user by normalized login id: %v", err)
	}
	if userValue.ID != "mixed-user" {
		t.Fatalf("expected mixed-user, got %s", userValue.ID)
	}

	_, err = repo.FindByNormalizedLoginID("mixed")
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound for fuzzy login id, got %v", err)
	}
}

func TestStaticRepositoryCreateRejectsCaseInsensitiveDuplicateLoginID(t *testing.T) {
	t.Parallel()

	repo := NewStaticRepository(config.AuthUser{
		ID:          "auth-user",
		LoginIDs:    []string{"staff"},
		DisplayName: "Staff User",
		Roles:       []string{"staff"},
		Permissions: []string{"forms.read"},
	}, nil)

	if _, err := repo.Create(CreateParams{
		ID:           "user-a",
		DisplayName:  "User A",
		LoginIDs:     []string{"S001"},
		ContactEmail: "a@example.com",
	}); err != nil {
		t.Fatalf("create first user: %v", err)
	}

	_, err := repo.Create(CreateParams{
		ID:           "user-b",
		DisplayName:  "User B",
		LoginIDs:     []string{" s001 "},
		ContactEmail: "b@example.com",
	})
	if !errors.Is(err, ErrConflict) {
		t.Fatalf("expected ErrConflict, got %v", err)
	}
}

func TestStaticRepositoryUpdateRejectsCaseInsensitiveDuplicateLoginID(t *testing.T) {
	t.Parallel()

	repo := NewStaticRepository(config.AuthUser{
		ID:          "auth-user",
		LoginIDs:    []string{"staff"},
		DisplayName: "Staff User",
		Roles:       []string{"staff"},
		Permissions: []string{"forms.read"},
	}, nil)

	if _, err := repo.Create(CreateParams{
		ID:           "user-a",
		DisplayName:  "User A",
		LoginIDs:     []string{"S001"},
		ContactEmail: "a@example.com",
	}); err != nil {
		t.Fatalf("create first user: %v", err)
	}
	if _, err := repo.Create(CreateParams{
		ID:           "user-b",
		DisplayName:  "User B",
		LoginIDs:     []string{"S002"},
		ContactEmail: "b@example.com",
	}); err != nil {
		t.Fatalf("create second user: %v", err)
	}

	_, err := repo.Update("user-b", "User B", []string{" s001 "})
	if !errors.Is(err, ErrConflict) {
		t.Fatalf("expected ErrConflict, got %v", err)
	}
}

func TestStaticRepositoryContactEmailConflicts(t *testing.T) {
	t.Parallel()

	repo := NewStaticRepository(config.AuthUser{
		ID:          "auth-user",
		LoginIDs:    []string{"staff"},
		DisplayName: "Staff User",
		Roles:       []string{"staff"},
		Permissions: []string{"forms.read"},
	}, nil)
	for _, params := range []CreateParams{
		{ID: "user-a", DisplayName: "User A", LoginIDs: []string{"S001"}, ContactEmail: "a@example.com"},
		{ID: "user-b", DisplayName: "User B", LoginIDs: []string{"S002"}, ContactEmail: "b@example.com"},
		{ID: "user-empty", DisplayName: "User Empty", LoginIDs: []string{"S003"}},
	} {
		if _, err := repo.Create(params); err != nil {
			t.Fatalf("create %s: %v", params.ID, err)
		}
	}

	_, err := repo.UpdateFull("user-b", "User B", []string{"S002"}, "", "", "", "", "A@EXAMPLE.COM", "")
	if !errors.Is(err, ErrContactEmailConflict) || !errors.Is(err, ErrConflict) {
		t.Fatalf("expected contact email conflict wrapping ErrConflict, got %v", err)
	}

	updated, err := repo.UpdateFull("user-b", "User B", []string{"S002"}, "", "", "", "", "B@EXAMPLE.COM", "")
	if err != nil {
		t.Fatalf("expected own email update to succeed, got %v", err)
	}
	if updated.ContactEmail != "B@EXAMPLE.COM" {
		t.Fatalf("expected own email update to be preserved, got %q", updated.ContactEmail)
	}

	if _, err := repo.UpdateProfile("user-b", "", "", "", "", "", ""); err != nil {
		t.Fatalf("expected empty contact email update to succeed, got %v", err)
	}
	if _, err := repo.Create(CreateParams{ID: "user-empty-2", DisplayName: "User Empty 2", LoginIDs: []string{"S004"}}); err != nil {
		t.Fatalf("expected multiple empty contact emails to remain allowed, got %v", err)
	}
}
