package auth

import (
	"context"
	"errors"
	"testing"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

func TestNewStaticAuthenticatorReturnsErrorOnDuplicateIdentifiers(t *testing.T) {
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

	_, err := NewStaticAuthenticator(cfg, users)
	if err == nil {
		t.Fatal("expected error for duplicate identifiers")
	}
}

func TestRegisterUserRejectsDuplicateLoginID(t *testing.T) {
	t.Parallel()

	authenticator, err := NewStaticAuthenticator(config.AuthUser{
		ID:          "admin",
		LoginIDs:    []string{"admin"},
		DisplayName: "Admin",
		Password:    "password",
	}, nil)
	if err != nil {
		t.Fatalf("NewStaticAuthenticator: %v", err)
	}

	if err := authenticator.RegisterUser(RegisterParams{
		ID:           "user-a",
		DisplayName:  "User A",
		LoginIDs:     []string{"s001"},
		ContactEmail: "a@example.com",
		Password:     "password-a",
		Roles:        []string{"participant"},
	}); err != nil {
		t.Fatalf("register first user: %v", err)
	}

	err = authenticator.RegisterUser(RegisterParams{
		ID:           "user-b",
		DisplayName:  "User B",
		LoginIDs:     []string{" S001 "},
		ContactEmail: "b@example.com",
		Password:     "password-b",
		Roles:        []string{"participant"},
	})
	if !errors.Is(err, ErrDuplicateStaticAuthIdentifier) {
		t.Fatalf("expected duplicate identifier error, got %v", err)
	}
}

func TestRegisterUserRejectsDuplicateContactEmail(t *testing.T) {
	t.Parallel()

	authenticator, err := NewStaticAuthenticator(config.AuthUser{
		ID:          "admin",
		LoginIDs:    []string{"admin"},
		DisplayName: "Admin",
		Password:    "password",
	}, nil)
	if err != nil {
		t.Fatalf("NewStaticAuthenticator: %v", err)
	}

	if err := authenticator.RegisterUser(RegisterParams{
		ID:           "user-a",
		DisplayName:  "User A",
		LoginIDs:     []string{"s001"},
		ContactEmail: "shared@example.com",
		Password:     "password-a",
		Roles:        []string{"participant"},
	}); err != nil {
		t.Fatalf("register first user: %v", err)
	}

	err = authenticator.RegisterUser(RegisterParams{
		ID:           "user-b",
		DisplayName:  "User B",
		LoginIDs:     []string{"s002"},
		ContactEmail: " Shared@example.com ",
		Password:     "password-b",
		Roles:        []string{"participant"},
	})
	if !errors.Is(err, ErrDuplicateStaticAuthIdentifier) {
		t.Fatalf("expected duplicate identifier error, got %v", err)
	}
}

func TestRegisterUserAllowsAuthenticateWithUniqueIdentifiers(t *testing.T) {
	t.Parallel()

	authenticator, err := NewStaticAuthenticator(config.AuthUser{
		ID:          "admin",
		LoginIDs:    []string{"admin"},
		DisplayName: "Admin",
		Password:    "password",
	}, nil)
	if err != nil {
		t.Fatalf("NewStaticAuthenticator: %v", err)
	}

	if err := authenticator.RegisterUser(RegisterParams{
		ID:           "user-a",
		DisplayName:  "User A",
		LoginIDs:     []string{"s001"},
		ContactEmail: "a@example.com",
		Password:     "password-a",
		Roles:        []string{"participant"},
	}); err != nil {
		t.Fatalf("register user: %v", err)
	}

	byLoginID, ok := authenticator.Authenticate(context.Background(), "s001", "password-a")
	if !ok || byLoginID == nil {
		t.Fatal("expected authentication by login ID to succeed")
	}
	if byLoginID.ID != "user-a" {
		t.Fatalf("unexpected user for login ID auth: %#v", byLoginID)
	}

	byEmail, ok := authenticator.Authenticate(context.Background(), " a@example.com ", "password-a")
	if !ok || byEmail == nil {
		t.Fatal("expected authentication by contact email to succeed")
	}
	if byEmail.ID != "user-a" {
		t.Fatalf("unexpected user for contact email auth: %#v", byEmail)
	}
}
