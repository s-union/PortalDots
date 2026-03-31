package place

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

func (r *SQLCRepository) List() ([]Place, error) {
	rows, err := r.queries.ListPlaces(context.Background())
	if err != nil {
		return nil, err
	}

	places := make([]Place, 0, len(rows))
	for _, row := range rows {
		places = append(places, Place{
			ID:    row.ID,
			Name:  row.Name,
			Type:  row.Type,
			Notes: row.Notes,
		})
	}

	return places, nil
}

func (r *SQLCRepository) Create(name string, placeType int32, notes string) (Place, error) {
	row, err := r.queries.CreatePlace(context.Background(), dbgen.CreatePlaceParams{
		Name:  name,
		Type:  placeType,
		Notes: notes,
	})
	if err != nil {
		return Place{}, err
	}

	return Place{
		ID:    row.ID,
		Name:  row.Name,
		Type:  row.Type,
		Notes: row.Notes,
	}, nil
}

func (r *SQLCRepository) Update(id, name string, placeType int32, notes string) (Place, error) {
	row, err := r.queries.UpdatePlace(context.Background(), dbgen.UpdatePlaceParams{
		ID:    id,
		Name:  name,
		Type:  placeType,
		Notes: notes,
	})
	if err != nil {
		return Place{}, err
	}

	return Place{
		ID:    row.ID,
		Name:  row.Name,
		Type:  row.Type,
		Notes: row.Notes,
	}, nil
}

func (r *SQLCRepository) Delete(id string) error {
	rows, err := r.queries.DeletePlace(context.Background(), id)
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}

	return nil
}
