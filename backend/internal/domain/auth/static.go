package auth

import (
	"context"
	"crypto/subtle"
	"errors"
	"slices"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

type User struct {
	ID          string
	DisplayName string
	Roles       []string
	Permissions []string
}

type Authenticator interface {
	Authenticate(ctx context.Context, loginID, password string) (*User, bool)
}

var ErrInvalidPassword = errors.New("invalid password")

type PasswordChanger interface {
	ChangePassword(ctx context.Context, userID, currentPassword, newPassword string) error
}

type StaticAuthenticator struct {
	user     User
	loginIDs []string
	password string
}

func NewStaticAuthenticator(cfg config.AuthUser) *StaticAuthenticator {
	return &StaticAuthenticator{
		user: User{
			ID:          cfg.ID,
			DisplayName: cfg.DisplayName,
			Roles:       slices.Clone(cfg.Roles),
			Permissions: slices.Clone(cfg.Permissions),
		},
		loginIDs: slices.Clone(cfg.LoginIDs),
		password: cfg.Password,
	}
}

func (a *StaticAuthenticator) Authenticate(_ context.Context, loginID, password string) (*User, bool) {
	if subtle.ConstantTimeCompare([]byte(password), []byte(a.password)) != 1 {
		return nil, false
	}
	if !slices.Contains(a.loginIDs, loginID) {
		return nil, false
	}

	user := a.user
	user.Roles = slices.Clone(a.user.Roles)
	user.Permissions = slices.Clone(a.user.Permissions)
	return &user, true
}

func (a *StaticAuthenticator) ChangePassword(_ context.Context, userID, currentPassword, newPassword string) error {
	if userID != a.user.ID {
		return ErrInvalidPassword
	}
	if subtle.ConstantTimeCompare([]byte(currentPassword), []byte(a.password)) != 1 {
		return ErrInvalidPassword
	}

	a.password = newPassword
	return nil
}
