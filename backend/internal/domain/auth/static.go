package auth

import (
	"context"
	"crypto/subtle"
	"errors"
	"slices"
	"strings"
	"sync"

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

type RegisterParams struct {
	ID           string
	DisplayName  string
	LoginIDs     []string
	ContactEmail string
	Password     string
	Roles        []string
	Permissions  []string
}

type RegistrationAuthenticator interface {
	RegisterUser(params RegisterParams)
}

type staticCredential struct {
	user         User
	loginIDs     []string
	contactEmail string
	password     string
}

type StaticAuthenticator struct {
	mu    sync.RWMutex
	users map[string]staticCredential
}

func NewStaticAuthenticator(cfg config.AuthUser, users []config.User) *StaticAuthenticator {
	built := map[string]staticCredential{
		cfg.ID: {
			user: User{
				ID:          cfg.ID,
				DisplayName: cfg.DisplayName,
				Roles:       slices.Clone(cfg.Roles),
				Permissions: slices.Clone(cfg.Permissions),
			},
			loginIDs: slices.Clone(cfg.LoginIDs),
			password: cfg.Password,
		},
	}

	for _, configured := range users {
		if configured.ID == cfg.ID {
			current := built[cfg.ID]
			if current.contactEmail == "" {
				current.contactEmail = configured.ContactEmail
			}
			built[cfg.ID] = current
			continue
		}
		built[configured.ID] = staticCredential{
			user: User{
				ID:          configured.ID,
				DisplayName: configured.DisplayName,
				Roles:       slices.Clone(configured.Roles),
				Permissions: slices.Clone(configured.Permissions),
			},
			loginIDs:     slices.Clone(configured.LoginIDs),
			contactEmail: configured.ContactEmail,
			password:     configured.Password,
		}
	}

	return &StaticAuthenticator{users: built}
}

func (a *StaticAuthenticator) Authenticate(_ context.Context, loginID, password string) (*User, bool) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	normalizedLoginID := strings.TrimSpace(strings.ToLower(loginID))
	for _, candidate := range a.users {
		if subtle.ConstantTimeCompare([]byte(password), []byte(candidate.password)) != 1 {
			continue
		}
		if !matchesStaticLoginID(candidate, normalizedLoginID) {
			continue
		}

		user := candidate.user
		user.Roles = slices.Clone(candidate.user.Roles)
		user.Permissions = slices.Clone(candidate.user.Permissions)
		return &user, true
	}

	return nil, false
}

func (a *StaticAuthenticator) ChangePassword(_ context.Context, userID, currentPassword, newPassword string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	current, ok := a.users[userID]
	if !ok {
		return ErrInvalidPassword
	}
	if subtle.ConstantTimeCompare([]byte(currentPassword), []byte(current.password)) != 1 {
		return ErrInvalidPassword
	}

	current.password = newPassword
	a.users[userID] = current
	return nil
}

func (a *StaticAuthenticator) RegisterUser(params RegisterParams) {
	a.mu.Lock()
	defer a.mu.Unlock()

	a.users[params.ID] = staticCredential{
		user: User{
			ID:          params.ID,
			DisplayName: params.DisplayName,
			Roles:       slices.Clone(params.Roles),
			Permissions: slices.Clone(params.Permissions),
		},
		loginIDs:     slices.Clone(params.LoginIDs),
		contactEmail: params.ContactEmail,
		password:     params.Password,
	}
}

func matchesStaticLoginID(candidate staticCredential, loginID string) bool {
	if strings.TrimSpace(strings.ToLower(candidate.contactEmail)) == loginID {
		return true
	}

	for _, current := range candidate.loginIDs {
		if strings.TrimSpace(strings.ToLower(current)) == loginID {
			return true
		}
	}

	return false
}
