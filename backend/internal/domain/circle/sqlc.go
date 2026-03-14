package circle

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
)

type SQLCCatalog struct {
	queries *dbgen.Queries
}

func NewSQLCCatalog(queries *dbgen.Queries) *SQLCCatalog {
	return &SQLCCatalog{queries: queries}
}

func (c *SQLCCatalog) ListSelectable(_ *auth.User) ([]Circle, error) {
	rows, err := c.queries.ListCircles(context.Background())
	if err != nil {
		return nil, err
	}

	circles := make([]Circle, 0, len(rows))
	for _, row := range rows {
		circles = append(circles, Circle{
			ID:                    row.ID,
			Name:                  row.Name,
			GroupName:             row.GroupName,
			ParticipationTypeID:   nullableTextValue(row.ParticipationTypeID),
			ParticipationTypeName: row.ParticipationTypeName,
			Tags:                  append([]string{}, row.Tags...),
		})
	}

	return circles, nil
}

func (c *SQLCCatalog) FindSelectable(_ *auth.User, circleID string) (Circle, error) {
	row, err := c.queries.GetCircleByID(context.Background(), circleID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Circle{}, ErrNotFound
		}
		return Circle{}, err
	}

	return Circle{
		ID:                    row.ID,
		Name:                  row.Name,
		GroupName:             row.GroupName,
		ParticipationTypeID:   nullableTextValue(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
	}, nil
}

func (c *SQLCCatalog) ListForStaff() ([]Circle, error) {
	return c.ListSelectable(nil)
}

func (c *SQLCCatalog) Find(circleID string) (Circle, error) {
	return c.FindSelectable(nil, circleID)
}

func (c *SQLCCatalog) Create(name, groupName, participationTypeID, participationTypeName string, tags []string) (Circle, error) {
	row, err := c.queries.CreateCircle(context.Background(), dbgen.CreateCircleParams{
		Name:                  name,
		GroupName:             groupName,
		ParticipationTypeID:   nullableText(participationTypeID),
		ParticipationTypeName: participationTypeName,
		Tags:                  tags,
	})
	if err != nil {
		return Circle{}, err
	}

	return Circle{
		ID:                    row.ID,
		Name:                  row.Name,
		GroupName:             row.GroupName,
		ParticipationTypeID:   nullableTextValue(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
	}, nil
}

func (c *SQLCCatalog) Update(circleID, name, groupName, participationTypeID, participationTypeName string, tags []string) (Circle, error) {
	row, err := c.queries.UpdateCircle(context.Background(), dbgen.UpdateCircleParams{
		ID:                    circleID,
		Name:                  name,
		GroupName:             groupName,
		ParticipationTypeID:   nullableText(participationTypeID),
		ParticipationTypeName: participationTypeName,
		Tags:                  tags,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Circle{}, ErrNotFound
		}
		return Circle{}, err
	}

	return Circle{
		ID:                    row.ID,
		Name:                  row.Name,
		GroupName:             row.GroupName,
		ParticipationTypeID:   nullableTextValue(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
	}, nil
}

func (c *SQLCCatalog) Delete(circleID string) error {
	err := c.queries.DeleteCircle(context.Background(), circleID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}

	return nil
}

func nullableText(value string) pgtype.Text {
	if value == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: value, Valid: true}
}

func nullableTextValue(value pgtype.Text) string {
	if !value.Valid {
		return ""
	}
	return value.String
}
