package tag

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

func (r *SQLCRepository) List() ([]Tag, error) {
	rows, err := r.queries.ListTags(context.Background())
	if err != nil {
		return nil, err
	}

	tags := make([]Tag, 0, len(rows))
	for _, row := range rows {
		tags = append(tags, Tag{
			ID:        row.ID,
			Name:      row.Name,
			CreatedAt: pgutil.FormatTimestamptz(row.CreatedAt),
			UpdatedAt: pgutil.FormatTimestamptz(row.UpdatedAt),
		})
	}

	return tags, nil
}

func (r *SQLCRepository) Create(name string) (Tag, error) {
	row, err := r.queries.CreateTag(context.Background(), name)
	if err != nil {
		return Tag{}, err
	}

	return Tag{
		ID:        row.ID,
		Name:      row.Name,
		CreatedAt: pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt: pgutil.FormatTimestamptz(row.UpdatedAt),
	}, nil
}

func (r *SQLCRepository) Update(id, name string) (Tag, error) {
	row, err := r.queries.UpdateTag(context.Background(), dbgen.UpdateTagParams{
		ID:   id,
		Name: name,
	})
	if err != nil {
		return Tag{}, err
	}

	return Tag{
		ID:        row.ID,
		Name:      row.Name,
		CreatedAt: pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt: pgutil.FormatTimestamptz(row.UpdatedAt),
	}, nil
}

func (r *SQLCRepository) Delete(id string) error {
	rows, err := r.queries.DeleteTag(context.Background(), id)
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}

	return nil
}
