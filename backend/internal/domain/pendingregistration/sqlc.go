package pendingregistration

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
	"github.com/s-union/PortalDots/backend/internal/platform/postgres/pgutil"
)

type SQLCRepository struct {
	queries *dbgen.Queries
}

func NewSQLCRepository(queries *dbgen.Queries) *SQLCRepository {
	return &SQLCRepository{queries: queries}
}

func (r *SQLCRepository) Save(ctx context.Context, univemail, studentID, tokenHash string, expiresAt time.Time) (PendingRegistration, error) {

	if _, err := r.queries.DeleteExpiredPendingRegistrations(ctx, pgutil.Timestamptz(time.Now().UTC())); err != nil {
		return PendingRegistration{}, err
	}

	row, err := r.queries.GetPendingRegistrationByUnivemail(ctx, normalizeEmail(univemail))
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			return PendingRegistration{}, err
		}

		created, createErr := r.queries.CreatePendingRegistration(ctx, dbgen.CreatePendingRegistrationParams{
			Univemail: normalizeEmail(univemail),
			StudentID: studentID,
			TokenHash: tokenHash,
			ExpiresAt: pgutil.Timestamptz(expiresAt.UTC()),
		})
		if createErr != nil {
			return PendingRegistration{}, createErr
		}
		return mapPendingRegistration(created), nil
	}

	updated, err := r.queries.UpdatePendingRegistrationByID(ctx, dbgen.UpdatePendingRegistrationByIDParams{
		ID:        row.ID,
		StudentID: studentID,
		TokenHash: tokenHash,
		ExpiresAt: pgutil.Timestamptz(expiresAt.UTC()),
	})
	if err != nil {
		return PendingRegistration{}, err
	}

	return mapPendingRegistration(updated), nil
}

func (r *SQLCRepository) Find(ctx context.Context, id string) (PendingRegistration, error) {
	if _, err := r.queries.DeleteExpiredPendingRegistrations(ctx, pgutil.Timestamptz(time.Now().UTC())); err != nil {
		return PendingRegistration{}, err
	}

	row, err := r.queries.GetPendingRegistrationByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return PendingRegistration{}, ErrNotFound
		}
		return PendingRegistration{}, err
	}

	return mapPendingRegistration(row), nil
}

func (r *SQLCRepository) Delete(ctx context.Context, id string) error {
	rows, err := r.queries.DeletePendingRegistration(ctx, id)
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *SQLCRepository) DeleteExpired(ctx context.Context, now time.Time) error {
	_, err := r.queries.DeleteExpiredPendingRegistrations(ctx, pgutil.Timestamptz(now.UTC()))
	return err
}

func (r *SQLCRepository) MarkVerified(ctx context.Context, id string, verifiedAt time.Time) (PendingRegistration, error) {
	row, err := r.queries.MarkPendingRegistrationVerified(ctx, dbgen.MarkPendingRegistrationVerifiedParams{
		ID:         id,
		VerifiedAt: pgutil.Timestamptz(verifiedAt.UTC()),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return PendingRegistration{}, ErrNotFound
		}
		return PendingRegistration{}, err
	}

	return mapPendingRegistration(row), nil
}

func mapPendingRegistration(row dbgen.PendingRegistration) PendingRegistration {
	item := PendingRegistration{
		ID:        row.ID,
		Univemail: row.Univemail,
		StudentID: row.StudentID,
		TokenHash: row.TokenHash,
		ExpiresAt: row.ExpiresAt.Time,
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}
	if row.VerifiedAt.Valid {
		item.VerifiedAt = row.VerifiedAt.Time
	}
	return item
}
