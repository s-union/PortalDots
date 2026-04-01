package auth

import (
	"testing"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

func TestNewStaticAuthenticatorPanicsOnDuplicateIdentifiers(t *testing.T) {
	t.Parallel()

	cfg := config.AuthUser{
		ID:          "admin",
		LoginIDs:    []string{"admin"},
		DisplayName: "Admin",
		Password:    "password",
	}

	users := []config.User{
		{
			ID:          "user-a",
			LoginIDs:    []string{"duplicate@example.com"},
			DisplayName: "User A",
			Password:    "password",
		},
		{
			ID:           "user-b",
			ContactEmail: " duplicate@example.com ",
			DisplayName:  "User B",
			Password:     "password",
		},
	}

	defer func() {
		if recover() == nil {
			t.Fatal("expected panic for duplicate identifiers")
		}
	}()

	_ = NewStaticAuthenticator(cfg, users)
}
