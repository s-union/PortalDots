package contactcategory

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

func (r *SQLCRepository) List(ctx context.Context) ([]Category, error) {
	rows, err := r.queries.ListContactCategories(ctx)
	if err != nil {
		return nil, err
	}

	categories := make([]Category, 0, len(rows))
	for _, row := range rows {
		categories = append(categories, Category{
			ID:    row.ID,
			Name:  row.Name,
			Email: row.Email,
		})
	}

	return categories, nil
}

func (r *SQLCRepository) Find(ctx context.Context, id string) (Category, error) {
	items, err := r.List(ctx)
	if err != nil {
		return Category{}, err
	}
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return Category{}, ErrNotFound
}

func (r *SQLCRepository) Create(ctx context.Context, name, email string) (Category, error) {
	row, err := r.queries.CreateContactCategory(ctx, dbgen.CreateContactCategoryParams{
		Name:  name,
		Email: email,
	})
	if err != nil {
		return Category{}, err
	}

	return Category{
		ID:    row.ID,
		Name:  row.Name,
		Email: row.Email,
	}, nil
}

func (r *SQLCRepository) Update(ctx context.Context, id, name, email string) (Category, error) {
	row, err := r.queries.UpdateContactCategory(ctx, dbgen.UpdateContactCategoryParams{
		ID:    id,
		Name:  name,
		Email: email,
	})
	if err != nil {
		return Category{}, err
	}

	return Category{
		ID:    row.ID,
		Name:  row.Name,
		Email: row.Email,
	}, nil
}

func (r *SQLCRepository) Delete(ctx context.Context, id string) error {
	rows, err := r.queries.DeleteContactCategory(ctx, id)
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}

	return nil
}
