package useradmin

import (
	"context"
	"errors"
	"slices"

	"github.com/jackc/pgx/v5"
	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
)

func (r *SQLCRepository) UpdateFull(userID, displayName string, loginIDs []string, lastName, lastNameReading, firstName, firstNameReading, contactEmail, phoneNumber string) (User, error) {
	ctx := context.Background()
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return User{}, err
	}
	defer tx.Rollback(ctx)

	queries := r.queries.WithTx(tx)
	userRow, err := queries.GetUserWithRelationsByID(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}

	for _, loginID := range loginIDs {
		if slices.Contains(userRow.LoginIds, loginID) {
			continue
		}

		owner, ownerErr := queries.GetUserByLoginID(ctx, loginID)
		if ownerErr == nil && owner.ID != userID {
			return User{}, ErrConflict
		}
		if ownerErr != nil && !errors.Is(ownerErr, pgx.ErrNoRows) {
			return User{}, ownerErr
		}
	}

	if _, err := queries.UpdateUserProfile(ctx, dbgen.UpdateUserProfileParams{
		ID:               userID,
		LastName:         lastName,
		LastNameReading:  lastNameReading,
		FirstName:        firstName,
		FirstNameReading: firstNameReading,
		ContactEmail:     contactEmail,
		PhoneNumber:      phoneNumber,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}

	if _, err := queries.UpdateUserDisplayName(ctx, dbgen.UpdateUserDisplayNameParams{
		ID:          userID,
		DisplayName: displayName,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}

	if err := queries.DeleteUserLoginIDs(ctx, userID); err != nil {
		return User{}, err
	}
	for _, loginID := range slices.Clone(loginIDs) {
		if err := queries.AddUserLoginID(ctx, dbgen.AddUserLoginIDParams{
			LoginID: loginID,
			UserID:  userID,
		}); err != nil {
			return User{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return User{}, err
	}

	return r.Find(userID)
}
