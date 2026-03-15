package circle

import (
	"context"
	"errors"
	"time"

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

func (c *SQLCCatalog) ListSelectable(user *auth.User) ([]Circle, error) {
	if user == nil {
		rows, err := c.queries.ListCircles(context.Background())
		if err != nil {
			return nil, err
		}
		circles := make([]Circle, 0, len(rows))
		for _, row := range rows {
			circles = append(circles, circleFromListRow(row))
		}
		return circles, nil
	}

	rows, err := c.queries.ListUserCircles(context.Background(), user.ID)
	if err != nil {
		return nil, err
	}
	circles := make([]Circle, 0, len(rows))
	for _, row := range rows {
		circles = append(circles, Circle{
			ID:                    row.ID,
			Name:                  row.Name,
			NameYomi:              row.NameYomi,
			GroupName:             row.GroupName,
			GroupNameYomi:         row.GroupNameYomi,
			ParticipationTypeID:   nullableTextValue(row.ParticipationTypeID),
			ParticipationTypeName: row.ParticipationTypeName,
			Tags:                  append([]string{}, row.Tags...),
			InvitationToken:       nullableTextValue(row.InvitationToken),
			SubmittedAt:           nullableTime(row.SubmittedAt),
			Notes:                 row.Notes,
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

	return circleFromGetByIDRow(row), nil
}

func (c *SQLCCatalog) ListForStaff() ([]Circle, error) {
	rows, err := c.queries.ListCircles(context.Background())
	if err != nil {
		return nil, err
	}
	circles := make([]Circle, 0, len(rows))
	for _, row := range rows {
		circles = append(circles, circleFromListRow(row))
	}
	return circles, nil
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
		NameYomi:              row.NameYomi,
		GroupName:             row.GroupName,
		GroupNameYomi:         row.GroupNameYomi,
		ParticipationTypeID:   nullableTextValue(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		Notes:                 row.Notes,
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
		NameYomi:              row.NameYomi,
		GroupName:             row.GroupName,
		GroupNameYomi:         row.GroupNameYomi,
		ParticipationTypeID:   nullableTextValue(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		Notes:                 row.Notes,
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

func (c *SQLCCatalog) GetUserCircle(user *auth.User, circleID string) (Circle, error) {
	row, err := c.queries.GetUserCircle(context.Background(), dbgen.GetUserCircleParams{
		ID:     circleID,
		UserID: user.ID,
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
		NameYomi:              row.NameYomi,
		GroupName:             row.GroupName,
		GroupNameYomi:         row.GroupNameYomi,
		ParticipationTypeID:   nullableTextValue(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		Notes:                 row.Notes,
	}, nil
}

func (c *SQLCCatalog) CreateForUser(user *auth.User, params CreateCircleParams) (Circle, error) {
	row, err := c.queries.CreateUserCircle(context.Background(), dbgen.CreateUserCircleParams{
		Name:                  params.Name,
		NameYomi:              params.NameYomi,
		GroupName:             params.GroupName,
		GroupNameYomi:         params.GroupNameYomi,
		ParticipationTypeID:   nullableText(params.ParticipationTypeID),
		ParticipationTypeName: params.ParticipationTypeName,
		Notes:                 params.Notes,
	})
	if err != nil {
		return Circle{}, err
	}

	created := Circle{
		ID:                    row.ID,
		Name:                  row.Name,
		NameYomi:              row.NameYomi,
		GroupName:             row.GroupName,
		GroupNameYomi:         row.GroupNameYomi,
		ParticipationTypeID:   nullableTextValue(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		Notes:                 row.Notes,
	}

	if err := c.queries.CreateCircleUser(context.Background(), dbgen.CreateCircleUserParams{
		CircleID: created.ID,
		UserID:   user.ID,
		IsLeader: true,
	}); err != nil {
		return Circle{}, err
	}

	return created, nil
}

func (c *SQLCCatalog) UpdateForUser(user *auth.User, circleID string, params UpdateCircleParams) (Circle, error) {
	isMember, err := c.queries.IsCircleMember(context.Background(), dbgen.IsCircleMemberParams{
		CircleID: circleID,
		UserID:   user.ID,
	})
	if err != nil {
		return Circle{}, err
	}
	if !isMember {
		return Circle{}, ErrForbidden
	}

	row, err := c.queries.UpdateCircleDetails(context.Background(), dbgen.UpdateCircleDetailsParams{
		ID:            circleID,
		Name:          params.Name,
		NameYomi:      params.NameYomi,
		GroupName:     params.GroupName,
		GroupNameYomi: params.GroupNameYomi,
		Notes:         params.Notes,
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
		NameYomi:              row.NameYomi,
		GroupName:             row.GroupName,
		GroupNameYomi:         row.GroupNameYomi,
		ParticipationTypeID:   nullableTextValue(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		Notes:                 row.Notes,
	}, nil
}

func (c *SQLCCatalog) DeleteForUser(user *auth.User, circleID string) error {
	isLeader, err := c.queries.IsCircleLeader(context.Background(), dbgen.IsCircleLeaderParams{
		CircleID: circleID,
		UserID:   user.ID,
	})
	if err != nil {
		return err
	}
	if !isLeader {
		return ErrForbidden
	}

	return c.queries.DeleteCircle(context.Background(), circleID)
}

func (c *SQLCCatalog) Submit(user *auth.User, circleID string) (Circle, error) {
	isMember, err := c.queries.IsCircleMember(context.Background(), dbgen.IsCircleMemberParams{
		CircleID: circleID,
		UserID:   user.ID,
	})
	if err != nil {
		return Circle{}, err
	}
	if !isMember {
		return Circle{}, ErrForbidden
	}

	row, err := c.queries.SubmitCircle(context.Background(), circleID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Circle{}, ErrNotFound
		}
		return Circle{}, err
	}

	return Circle{
		ID:                    row.ID,
		Name:                  row.Name,
		NameYomi:              row.NameYomi,
		GroupName:             row.GroupName,
		GroupNameYomi:         row.GroupNameYomi,
		ParticipationTypeID:   nullableTextValue(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		Notes:                 row.Notes,
	}, nil
}

func (c *SQLCCatalog) ListMembers(circleID string) ([]CircleMember, error) {
	rows, err := c.queries.ListCircleMembers(context.Background(), circleID)
	if err != nil {
		return nil, err
	}

	members := make([]CircleMember, 0, len(rows))
	for _, row := range rows {
		members = append(members, CircleMember{
			UserID:      row.ID,
			DisplayName: row.DisplayName,
			IsLeader:    row.IsLeader,
		})
	}
	return members, nil
}

func (c *SQLCCatalog) RemoveMember(requester *auth.User, circleID, targetUserID string) error {
	isLeader, err := c.queries.IsCircleLeader(context.Background(), dbgen.IsCircleLeaderParams{
		CircleID: circleID,
		UserID:   requester.ID,
	})
	if err != nil {
		return err
	}

	isSelf := requester.ID == targetUserID
	if !isLeader && !isSelf {
		return ErrForbidden
	}

	targetIsLeader, err := c.queries.IsCircleLeader(context.Background(), dbgen.IsCircleLeaderParams{
		CircleID: circleID,
		UserID:   targetUserID,
	})
	if err != nil {
		return err
	}
	if targetIsLeader {
		return ErrForbidden
	}

	return c.queries.RemoveCircleMember(context.Background(), dbgen.RemoveCircleMemberParams{
		CircleID: circleID,
		UserID:   targetUserID,
	})
}

func (c *SQLCCatalog) RegenerateInvitationToken(user *auth.User, circleID string) (Circle, error) {
	isLeader, err := c.queries.IsCircleLeader(context.Background(), dbgen.IsCircleLeaderParams{
		CircleID: circleID,
		UserID:   user.ID,
	})
	if err != nil {
		return Circle{}, err
	}
	if !isLeader {
		return Circle{}, ErrForbidden
	}

	row, err := c.queries.UpdateCircleInvitationToken(context.Background(), circleID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Circle{}, ErrNotFound
		}
		return Circle{}, err
	}

	return Circle{
		ID:                    row.ID,
		Name:                  row.Name,
		NameYomi:              row.NameYomi,
		GroupName:             row.GroupName,
		GroupNameYomi:         row.GroupNameYomi,
		ParticipationTypeID:   nullableTextValue(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		Notes:                 row.Notes,
	}, nil
}

func (c *SQLCCatalog) JoinByToken(user *auth.User, token string) (Circle, error) {
	row, err := c.queries.GetCircleByInvitationToken(context.Background(), nullableText(token))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Circle{}, ErrNotFound
		}
		return Circle{}, err
	}

	isMember, err := c.queries.IsCircleMember(context.Background(), dbgen.IsCircleMemberParams{
		CircleID: row.ID,
		UserID:   user.ID,
	})
	if err != nil {
		return Circle{}, err
	}
	if isMember {
		return Circle{}, ErrAlreadyMember
	}

	if err := c.queries.CreateCircleUser(context.Background(), dbgen.CreateCircleUserParams{
		CircleID: row.ID,
		UserID:   user.ID,
		IsLeader: false,
	}); err != nil {
		return Circle{}, err
	}

	return Circle{
		ID:                    row.ID,
		Name:                  row.Name,
		NameYomi:              row.NameYomi,
		GroupName:             row.GroupName,
		GroupNameYomi:         row.GroupNameYomi,
		ParticipationTypeID:   nullableTextValue(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		Notes:                 row.Notes,
	}, nil
}

func circleFromListRow(row dbgen.ListCirclesRow) Circle {
	return Circle{
		ID:                    row.ID,
		Name:                  row.Name,
		NameYomi:              row.NameYomi,
		GroupName:             row.GroupName,
		GroupNameYomi:         row.GroupNameYomi,
		ParticipationTypeID:   nullableTextValue(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		Notes:                 row.Notes,
	}
}

func circleFromGetByIDRow(row dbgen.GetCircleByIDRow) Circle {
	return Circle{
		ID:                    row.ID,
		Name:                  row.Name,
		NameYomi:              row.NameYomi,
		GroupName:             row.GroupName,
		GroupNameYomi:         row.GroupNameYomi,
		ParticipationTypeID:   nullableTextValue(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		Notes:                 row.Notes,
	}
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

func nullableTime(value pgtype.Timestamptz) *time.Time {
	if !value.Valid {
		return nil
	}
	t := value.Time
	return &t
}
