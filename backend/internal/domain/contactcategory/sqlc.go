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

func (r *SQLCRepository) List() ([]Category, error) {
	rows, err := r.queries.ListContactCategories(context.Background())
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

func (r *SQLCRepository) Create(name, email string) (Category, error) {
	row, err := r.queries.CreateContactCategory(context.Background(), dbgen.CreateContactCategoryParams{
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

func (r *SQLCRepository) Update(id, name, email string) (Category, error) {
	row, err := r.queries.UpdateContactCategory(context.Background(), dbgen.UpdateContactCategoryParams{
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

func (r *SQLCRepository) Delete(id string) error {
	rows, err := r.queries.DeleteContactCategory(context.Background(), id)
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}

	return nil
}
