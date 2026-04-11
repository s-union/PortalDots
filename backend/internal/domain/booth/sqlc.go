package booth

import (
	"context"

	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
)

type SQLCRepository struct {
	queries *dbgen.Queries
}

func NewSQLCRepository(queries *dbgen.Queries) *SQLCRepository {
	return &SQLCRepository{queries: queries}
}

func (r *SQLCRepository) List(ctx context.Context) ([]Assignment, error) {
	rows, err := r.queries.ListBooths(ctx)
	if err != nil {
		return nil, err
	}

	items := make([]Assignment, 0, len(rows))
	for _, row := range rows {
		items = append(items, Assignment{PlaceID: row.PlaceID, CircleID: row.CircleID})
	}

	return items, nil
}

func (r *SQLCRepository) DeleteByPlace(ctx context.Context, placeID string) error {
	return r.queries.DeleteBoothsByPlace(ctx, placeID)
}

func (r *SQLCRepository) DeleteByCircle(ctx context.Context, circleID string) error {
	return r.queries.DeleteBoothsByCircle(ctx, circleID)
}
