package useradmin

import (
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
