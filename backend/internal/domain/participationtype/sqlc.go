package participationtype

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
)

type SQLCRepository struct {
	queries *dbgen.Queries
}

func NewSQLCRepository(queries *dbgen.Queries) *SQLCRepository {
	return &SQLCRepository{queries: queries}
}

func (r *SQLCRepository) List() ([]ParticipationType, error) {
	rows, err := r.queries.ListParticipationTypes(context.Background())
	if err != nil {
		return nil, err
	}

	items := make([]ParticipationType, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapParticipationTypeRow(row))
	}
	return items, nil
}

func (r *SQLCRepository) Find(typeID string) (ParticipationType, error) {
	row, err := r.queries.GetParticipationTypeByID(context.Background(), typeID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ParticipationType{}, ErrNotFound
		}
		return ParticipationType{}, err
	}
	return mapParticipationTypeRow(row), nil
}

func (r *SQLCRepository) FindByFormID(formID string) (ParticipationType, error) {
	row, err := r.queries.GetParticipationTypeByFormID(context.Background(), formID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ParticipationType{}, ErrNotFound
		}
		return ParticipationType{}, err
	}
	return mapParticipationTypeRow(row), nil
}

func (r *SQLCRepository) Create(name, description string, usersCountMin, usersCountMax int32, tags []string, formID string) (ParticipationType, error) {
	row, err := r.queries.CreateParticipationType(context.Background(), dbgen.CreateParticipationTypeParams{
		Name:          name,
		Description:   description,
		UsersCountMin: usersCountMin,
		UsersCountMax: usersCountMax,
		Tags:          tags,
		FormID:        formID,
	})
	if err != nil {
		return ParticipationType{}, err
	}
	return mapParticipationTypeRow(row), nil
}

func (r *SQLCRepository) Update(typeID, name, description string, usersCountMin, usersCountMax int32, tags []string) (ParticipationType, error) {
	row, err := r.queries.UpdateParticipationType(context.Background(), dbgen.UpdateParticipationTypeParams{
		ID:            typeID,
		Name:          name,
		Description:   description,
		UsersCountMin: usersCountMin,
		UsersCountMax: usersCountMax,
		Tags:          tags,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ParticipationType{}, ErrNotFound
		}
		return ParticipationType{}, err
	}
	return mapParticipationTypeRow(row), nil
}

func (r *SQLCRepository) Delete(typeID string) error {
	rows, err := r.queries.DeleteParticipationType(context.Background(), typeID)
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func mapParticipationTypeRow(row dbgen.ParticipationType) ParticipationType {
	return ParticipationType{
		ID:            row.ID,
		Name:          row.Name,
		Description:   row.Description,
		UsersCountMin: row.UsersCountMin,
		UsersCountMax: row.UsersCountMax,
		Tags:          append([]string{}, row.Tags...),
		FormID:        row.FormID,
	}
}
