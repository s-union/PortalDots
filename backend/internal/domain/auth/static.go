package auth

import (
	"context"
	"errors"
	"fmt"
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

var (
	ErrInvalidPassword               = errors.New("invalid password")
	ErrDuplicateStaticAuthIdentifier = errors.New("duplicate static auth identifier")
)

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
	mu        sync.RWMutex
	users     map[string]staticCredential
	dummyHash string
}

func NewStaticAuthenticator(cfg config.AuthUser, users []config.User) (*StaticAuthenticator, error) {
	defaultPasswordHash, err := bcrypt.GenerateFromPassword([]byte(cfg.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash default auth password: %w", err)
	}

	dummyHashBytes, err := bcrypt.GenerateFromPassword([]byte("__dummy__"), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to generate dummy password hash: %w", err)
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
			return nil, fmt.Errorf("failed to hash configured user password: %w", err)
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

	if err := validateUniqueStaticAuthIdentifiers(built); err != nil {
		return nil, err
	}

	return &StaticAuthenticator{users: built, dummyHash: string(dummyHashBytes)}, nil
}

func (a *StaticAuthenticator) Authenticate(_ context.Context, loginID, password string) (*User, bool) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	normalizedLoginID := normalizeStaticLoginID(loginID)
	found := false
	for _, candidate := range a.users {
		if !matchesStaticLoginID(candidate, normalizedLoginID) {
			continue
		}
		found = true
		if bcrypt.CompareHashAndPassword([]byte(candidate.passwordHash), []byte(password)) != nil {
			continue
		}

		user := candidate.user
		user.Roles = slices.Clone(candidate.user.Roles)
		user.Permissions = slices.Clone(candidate.user.Permissions)
		return &user, true
	}

	if !found {
		_ = bcrypt.CompareHashAndPassword([]byte(a.dummyHash), []byte(password))
	}

	return nil, false
}

func (a *StaticAuthenticator) ChangePassword(_ context.Context, userID, currentPassword, newPassword string) error {
	if userID == "" || newPassword == "" {
		return ErrInvalidPassword
	}

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
	if userID == "" || newPassword == "" {
		return ErrInvalidPassword
	}

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

	if _, exists := a.users[params.ID]; exists {
		return fmt.Errorf("%w: user id %s", ErrDuplicateStaticAuthIdentifier, params.ID)
	}

	credential := staticCredential{
		user: User{
			ID:          params.ID,
			DisplayName: params.DisplayName,
			Roles:       slices.Clone(params.Roles),
			Permissions: slices.Clone(params.Permissions),
		},
		loginIDs:     slices.Clone(params.LoginIDs),
		contactEmail: params.ContactEmail,
	}
	if identifier, ownerID, ok := findDuplicateStaticAuthIdentifier(a.users, params.ID, credential); ok {
		return fmt.Errorf("%w: %s already used by %s", ErrDuplicateStaticAuthIdentifier, identifier, ownerID)
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(params.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	credential.passwordHash = string(passwordHash)
	a.users[params.ID] = credential
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

func validateUniqueStaticAuthIdentifiers(users map[string]staticCredential) error {
	owners := make(map[string]string)
	for userID, credential := range users {
		for _, identifier := range staticAuthIdentifiers(credential) {
			if ownerID, ok := owners[identifier]; ok && ownerID != userID {
				return fmt.Errorf("duplicate static auth identifier: %s", identifier)
			}
			owners[identifier] = userID
		}
	}
	return nil
}

func findDuplicateStaticAuthIdentifier(
	users map[string]staticCredential,
	candidateUserID string,
	candidate staticCredential,
) (string, string, bool) {
	owners := make(map[string]string, len(users))
	for userID, credential := range users {
		if userID == candidateUserID {
			continue
		}
		for _, identifier := range staticAuthIdentifiers(credential) {
			owners[identifier] = userID
		}
	}

	for _, identifier := range staticAuthIdentifiers(candidate) {
		if ownerID, ok := owners[identifier]; ok {
			return identifier, ownerID, true
		}
	}

	return "", "", false
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
