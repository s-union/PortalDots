package place

import (
	"context"

	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
	"github.com/s-union/PortalDots/backend/internal/platform/postgres/pgutil"
)

type SQLCRepository struct {
	queries *dbgen.Queries
}

func NewSQLCRepository(queries *dbgen.Queries) *SQLCRepository {
	return &SQLCRepository{queries: queries}
}

func (r *SQLCRepository) List(ctx context.Context) ([]Place, error) {
	rows, err := r.queries.ListPlaces(ctx)
	if err != nil {
		return nil, err
	}

	places := make([]Place, 0, len(rows))
	for _, row := range rows {
		places = append(places, Place{
			ID:        row.ID,
			Name:      row.Name,
			Type:      row.Type,
			Notes:     row.Notes,
			CreatedAt: pgutil.FormatTimestamptz(row.CreatedAt),
			UpdatedAt: pgutil.FormatTimestamptz(row.UpdatedAt),
		})
	}

	return places, nil
}

func (r *SQLCRepository) Create(ctx context.Context, name string, placeType int32, notes string) (Place, error) {
	row, err := r.queries.CreatePlace(ctx, dbgen.CreatePlaceParams{
		Name:  name,
		Type:  placeType,
		Notes: notes,
	})
	if err != nil {
		return Place{}, err
	}

	return Place{
		ID:        row.ID,
		Name:      row.Name,
		Type:      row.Type,
		Notes:     row.Notes,
		CreatedAt: pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt: pgutil.FormatTimestamptz(row.UpdatedAt),
	}, nil
}

func (r *SQLCRepository) Update(ctx context.Context, id, name string, placeType int32, notes string) (Place, error) {
	row, err := r.queries.UpdatePlace(ctx, dbgen.UpdatePlaceParams{
		ID:    id,
		Name:  name,
		Type:  placeType,
		Notes: notes,
	})
	if err != nil {
		return Place{}, err
	}

	return Place{
		ID:        row.ID,
		Name:      row.Name,
		Type:      row.Type,
		Notes:     row.Notes,
		CreatedAt: pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt: pgutil.FormatTimestamptz(row.UpdatedAt),
	}, nil
}

func (r *SQLCRepository) Delete(ctx context.Context, id string) error {
	rows, err := r.queries.DeletePlace(ctx, id)
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}

	return nil
}
