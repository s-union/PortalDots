package auth

import (
	"context"
	"errors"
	"slices"
	"strings"
	"sync"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"golang.org/x/crypto/bcrypt"
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

type PasswordResetter interface {
	ResetPassword(ctx context.Context, userID, newPassword string) error
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
	RegisterUser(params RegisterParams) error
}

type staticCredential struct {
	user         User
	loginIDs     []string
	contactEmail string
	passwordHash string
}

type StaticAuthenticator struct {
	mu    sync.RWMutex
	users map[string]staticCredential
}

func NewStaticAuthenticator(cfg config.AuthUser, users []config.User) *StaticAuthenticator {
	defaultPasswordHash, err := bcrypt.GenerateFromPassword([]byte(cfg.Password), bcrypt.DefaultCost)
	if err != nil {
		panic("failed to hash default auth password: " + err.Error())
	}

	built := map[string]staticCredential{
		cfg.ID: {
			user: User{
				ID:          cfg.ID,
				DisplayName: cfg.DisplayName,
				Roles:       slices.Clone(cfg.Roles),
				Permissions: slices.Clone(cfg.Permissions),
			},
			loginIDs:     slices.Clone(cfg.LoginIDs),
			passwordHash: string(defaultPasswordHash),
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
		passwordHash, err := bcrypt.GenerateFromPassword([]byte(configured.Password), bcrypt.DefaultCost)
		if err != nil {
			panic("failed to hash configured user password: " + err.Error())
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
			passwordHash: string(passwordHash),
		}
	}

	validateUniqueStaticAuthIdentifiers(built)

	return &StaticAuthenticator{users: built}
}

func (a *StaticAuthenticator) Authenticate(_ context.Context, loginID, password string) (*User, bool) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	normalizedLoginID := normalizeStaticLoginID(loginID)
	for _, candidate := range a.users {
		if !matchesStaticLoginID(candidate, normalizedLoginID) {
			continue
		}
		if bcrypt.CompareHashAndPassword([]byte(candidate.passwordHash), []byte(password)) != nil {
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
	if bcrypt.CompareHashAndPassword([]byte(current.passwordHash), []byte(currentPassword)) != nil {
		return ErrInvalidPassword
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	current.passwordHash = string(newHash)
	a.users[userID] = current
	return nil
}

func (a *StaticAuthenticator) ResetPassword(_ context.Context, userID, newPassword string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	current, ok := a.users[userID]
	if !ok {
		return ErrInvalidPassword
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	current.passwordHash = string(newHash)
	a.users[userID] = current
	return nil
}

func (a *StaticAuthenticator) RegisterUser(params RegisterParams) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(params.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	a.users[params.ID] = staticCredential{
		user: User{
			ID:          params.ID,
			DisplayName: params.DisplayName,
			Roles:       slices.Clone(params.Roles),
			Permissions: slices.Clone(params.Permissions),
		},
		loginIDs:     slices.Clone(params.LoginIDs),
		contactEmail: params.ContactEmail,
		passwordHash: string(passwordHash),
	}
	return nil
}

func matchesStaticLoginID(candidate staticCredential, loginID string) bool {
	if normalizeStaticLoginID(candidate.contactEmail) == loginID {
		return true
	}

	for _, current := range candidate.loginIDs {
		if normalizeStaticLoginID(current) == loginID {
			return true
		}
	}

	return false
}

func validateUniqueStaticAuthIdentifiers(users map[string]staticCredential) {
	owners := make(map[string]string)
	for userID, credential := range users {
		for _, identifier := range staticAuthIdentifiers(credential) {
			if ownerID, ok := owners[identifier]; ok && ownerID != userID {
				panic("duplicate static auth identifier: " + identifier)
			}
			owners[identifier] = userID
		}
	}
}

func staticAuthIdentifiers(credential staticCredential) []string {
	identifiers := make([]string, 0, len(credential.loginIDs)+1)
	seen := make(map[string]struct{}, len(credential.loginIDs)+1)
	appendIdentifier := func(raw string) {
		normalized := normalizeStaticLoginID(raw)
		if normalized == "" {
			return
		}
		if _, ok := seen[normalized]; ok {
			return
		}
		seen[normalized] = struct{}{}
		identifiers = append(identifiers, normalized)
	}

	appendIdentifier(credential.contactEmail)
	for _, loginID := range credential.loginIDs {
		appendIdentifier(loginID)
	}

	return identifiers
}

func normalizeStaticLoginID(loginID string) string {
	return strings.TrimSpace(strings.ToLower(loginID))
}
