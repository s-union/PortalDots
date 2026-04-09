package auth

import (
	"context"
	"fmt"

	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
	"golang.org/x/crypto/bcrypt"
)

type SQLCAuthenticator struct {
	queries *dbgen.Queries
}

func NewSQLCAuthenticator(queries *dbgen.Queries) *SQLCAuthenticator {
	return &SQLCAuthenticator{
		queries: queries,
	}
}

func (a *SQLCAuthenticator) Authenticate(ctx context.Context, loginID, password string) (*User, bool) {
	userRow, err := a.queries.GetUserByAuthIdentifier(ctx, loginID)
	if err != nil {
		return nil, false
	}
	if err := bcrypt.CompareHashAndPassword([]byte(userRow.Password), []byte(password)); err != nil {
		return nil, false
	}

	roles, err := a.queries.ListUserRoles(ctx, userRow.ID)
	if err != nil {
		return nil, false
	}
	permissions, err := a.queries.ListUserPermissions(ctx, userRow.ID)
	if err != nil {
		return nil, false
	}

	return &User{
		ID:          userRow.ID,
		DisplayName: userRow.DisplayName,
		Roles:       roles,
		Permissions: permissions,
	}, true
}

func (a *SQLCAuthenticator) ChangePassword(
	ctx context.Context,
	userID string,
	currentPassword string,
	newPassword string,
) error {
	userRow, err := a.queries.GetUserByID(ctx, userID)
	if err != nil {
		return ErrInvalidPassword
	}
	if err := bcrypt.CompareHashAndPassword([]byte(userRow.Password), []byte(currentPassword)); err != nil {
		return ErrInvalidPassword
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = a.queries.UpdateUserPassword(ctx, dbgen.UpdateUserPasswordParams{
		ID:       userID,
		Password: string(hashed),
	})
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

func (a *SQLCAuthenticator) ResetPassword(ctx context.Context, userID, newPassword string) error {
	if _, err := a.queries.GetUserByID(ctx, userID); err != nil {
		return ErrInvalidPassword
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = a.queries.UpdateUserPassword(ctx, dbgen.UpdateUserPasswordParams{
		ID:       userID,
		Password: string(hashed),
	})
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}
