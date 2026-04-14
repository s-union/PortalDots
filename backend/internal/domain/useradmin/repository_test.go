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
