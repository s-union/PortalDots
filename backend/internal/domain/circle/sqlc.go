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
			ParticipationTypeID:   derefString(row.ParticipationTypeID),
			ParticipationTypeName: row.ParticipationTypeName,
			Tags:                  append([]string{}, row.Tags...),
			InvitationToken:       nullableTextValue(row.InvitationToken),
			SubmittedAt:           nullableTime(row.SubmittedAt),
			UpdatedAt:             requiredTime(row.UpdatedAt),
			Notes:                 row.Notes,
			CanChangeGroupName:    row.CanChangeGroupName,
			Status:                row.Status,
			StatusReason:          row.StatusReason,
			StatusSetAt:           nullableTime(row.StatusSetAt),
			StatusSetByID:         row.StatusSetBy,
			Places:                []string{},
		})
	}
	return circles, nil
}

func (c *SQLCCatalog) FindSelectable(user *auth.User, circleID string) (Circle, error) {
	var (
		circle Circle
		err    error
	)

	if user == nil {
		row, queryErr := c.queries.GetCircleByID(context.Background(), circleID)
		if queryErr == nil {
			circle = circleFromGetByIDRow(row)
		}
		err = queryErr
	} else {
		row, queryErr := c.queries.GetUserCircle(context.Background(), dbgen.GetUserCircleParams{
			ID:     circleID,
			UserID: user.ID,
		})
		if queryErr == nil {
			circle = circleFromGetUserCircleRow(row)
		}
		err = queryErr
	}

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Circle{}, ErrNotFound
		}
		return Circle{}, err
	}

	return circle, nil
}

func (c *SQLCCatalog) ListForStaff() ([]Circle, error) {
	rows, err := c.queries.ListCircles(context.Background())
	if err != nil {
		return nil, err
	}

	circles := make([]Circle, 0, len(rows))
	ids := make([]string, 0, len(rows))
	for _, row := range rows {
		circles = append(circles, circleFromListRow(row))
		ids = append(ids, row.ID)
	}

	if len(ids) > 0 {
		placeRows, err := c.queries.ListCirclePlaceNames(context.Background(), ids)
		if err != nil {
			return nil, err
		}
		placeMap := make(map[string][]string)
		for _, p := range placeRows {
			placeMap[p.CircleID] = append(placeMap[p.CircleID], p.Name)
		}
		for i := range circles {
			if places, ok := placeMap[circles[i].ID]; ok {
				circles[i].Places = places
			}
		}
	}

	return circles, nil
}

func (c *SQLCCatalog) Find(circleID string) (Circle, error) {
	row, err := c.queries.GetCircleByID(context.Background(), circleID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Circle{}, ErrNotFound
		}
		return Circle{}, err
	}

	circle := circleFromGetByIDRow(row)

	placeRows, err := c.queries.ListCirclePlaceNames(context.Background(), []string{circleID})
	if err != nil {
		return Circle{}, err
	}
	places := make([]string, 0, len(placeRows))
	for _, p := range placeRows {
		places = append(places, p.Name)
	}
	circle.Places = places

	return circle, nil
}

func (c *SQLCCatalog) Create(name, nameYomi, groupName, groupNameYomi, participationTypeID, participationTypeName, notes string, tags []string, status, statusReason, setByUserID string, placeIDs []string) (Circle, error) {
	if status == "" {
		status = "pending"
	}

	row, err := c.queries.CreateCircle(context.Background(), dbgen.CreateCircleParams{
		Name:                  name,
		GroupName:             groupName,
		ParticipationTypeID:   optionalString(participationTypeID),
		ParticipationTypeName: participationTypeName,
		Tags:                  tags,
	})
	if err != nil {
		return Circle{}, err
	}

	detailRow, err := c.queries.UpdateCircleDetails(context.Background(), dbgen.UpdateCircleDetailsParams{
		ID:            row.ID,
		Name:          name,
		NameYomi:      nameYomi,
		GroupName:     groupName,
		GroupNameYomi: groupNameYomi,
		Notes:         notes,
	})
	if err != nil {
		return Circle{}, err
	}

	statusRow, err := c.queries.SetCircleStatus(context.Background(), dbgen.SetCircleStatusParams{
		ID:           detailRow.ID,
		Status:       status,
		StatusReason: statusReason,
		Column4:      setByUserID,
	})
	if err != nil {
		return Circle{}, err
	}

	if err := c.setCircleBooths(row.ID, placeIDs); err != nil {
		return Circle{}, err
	}

	placeRows, err := c.queries.ListCirclePlaceNames(context.Background(), []string{row.ID})
	if err != nil {
		return Circle{}, err
	}
	placeNames := make([]string, 0, len(placeRows))
	for _, p := range placeRows {
		placeNames = append(placeNames, p.Name)
	}

	return circleFromSetStatusRow(statusRow, placeNames), nil
}

func (c *SQLCCatalog) Update(circleID, name, nameYomi, groupName, groupNameYomi, participationTypeID, participationTypeName, notes string, tags []string, status, statusReason, setByUserID string, placeIDs []string) (Circle, error) {
	if status == "" {
		status = "pending"
	}

	_, err := c.queries.UpdateCircle(context.Background(), dbgen.UpdateCircleParams{
		ID:                    circleID,
		Name:                  name,
		GroupName:             groupName,
		ParticipationTypeID:   optionalString(participationTypeID),
		ParticipationTypeName: participationTypeName,
		Tags:                  tags,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Circle{}, ErrNotFound
		}
		return Circle{}, err
	}

	detailRow, err := c.queries.UpdateCircleDetails(context.Background(), dbgen.UpdateCircleDetailsParams{
		ID:            circleID,
		Name:          name,
		NameYomi:      nameYomi,
		GroupName:     groupName,
		GroupNameYomi: groupNameYomi,
		Notes:         notes,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Circle{}, ErrNotFound
		}
		return Circle{}, err
	}

	statusRow, err := c.queries.SetCircleStatus(context.Background(), dbgen.SetCircleStatusParams{
		ID:           detailRow.ID,
		Status:       status,
		StatusReason: statusReason,
		Column4:      setByUserID,
	})
	if err != nil {
		return Circle{}, err
	}

	if err := c.setCircleBooths(circleID, placeIDs); err != nil {
		return Circle{}, err
	}

	// reload place names from DB since placeIDs are IDs, not names
	placeRows, err := c.queries.ListCirclePlaceNames(context.Background(), []string{circleID})
	if err != nil {
		return Circle{}, err
	}
	placeNames := make([]string, 0, len(placeRows))
	for _, p := range placeRows {
		placeNames = append(placeNames, p.Name)
	}

	return circleFromSetStatusRow(statusRow, placeNames), nil
}

func (c *SQLCCatalog) UpdateTags(circleID string, tags []string) (Circle, error) {
	current, err := c.Find(circleID)
	if err != nil {
		return Circle{}, err
	}

	row, err := c.queries.UpdateCircle(context.Background(), dbgen.UpdateCircleParams{
		ID:                    circleID,
		Name:                  current.Name,
		GroupName:             current.GroupName,
		ParticipationTypeID:   optionalString(current.ParticipationTypeID),
		ParticipationTypeName: current.ParticipationTypeName,
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
		ParticipationTypeID:   derefString(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		UpdatedAt:             requiredTime(row.UpdatedAt),
		Notes:                 row.Notes,
		CanChangeGroupName:    row.CanChangeGroupName,
		Status:                row.Status,
		StatusReason:          row.StatusReason,
		StatusSetAt:           nullableTime(row.StatusSetAt),
		StatusSetByID:         row.StatusSetBy,
		Places:                current.Places,
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
		ParticipationTypeID:   derefString(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		UpdatedAt:             requiredTime(row.UpdatedAt),
		Notes:                 row.Notes,
		CanChangeGroupName:    row.CanChangeGroupName,
		Status:                row.Status,
		StatusReason:          row.StatusReason,
		StatusSetAt:           nullableTime(row.StatusSetAt),
		StatusSetByID:         row.StatusSetBy,
		Places:                []string{},
	}, nil
}

func (c *SQLCCatalog) CreateForUser(user *auth.User, params CreateCircleParams) (Circle, error) {
	row, err := c.queries.CreateUserCircle(context.Background(), dbgen.CreateUserCircleParams{
		Name:                  params.Name,
		NameYomi:              params.NameYomi,
		GroupName:             params.GroupName,
		GroupNameYomi:         params.GroupNameYomi,
		ParticipationTypeID:   optionalString(params.ParticipationTypeID),
		ParticipationTypeName: params.ParticipationTypeName,
		Notes:                 params.Notes,
		CanChangeGroupName:    params.CanChangeGroupName,
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
		ParticipationTypeID:   derefString(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		UpdatedAt:             requiredTime(row.UpdatedAt),
		Notes:                 row.Notes,
		CanChangeGroupName:    row.CanChangeGroupName,
		Status:                row.Status,
		StatusReason:          row.StatusReason,
		StatusSetAt:           nullableTime(row.StatusSetAt),
		StatusSetByID:         row.StatusSetBy,
		Places:                []string{},
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
		ParticipationTypeID:   derefString(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		UpdatedAt:             requiredTime(row.UpdatedAt),
		Notes:                 row.Notes,
		CanChangeGroupName:    row.CanChangeGroupName,
		Status:                row.Status,
		StatusReason:          row.StatusReason,
		StatusSetAt:           nullableTime(row.StatusSetAt),
		StatusSetByID:         row.StatusSetBy,
		Places:                []string{},
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
	current, err := c.Find(circleID)
	if err != nil {
		return Circle{}, err
	}
	if current.SubmittedAt != nil {
		return Circle{}, ErrAlreadySubmitted
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
		ParticipationTypeID:   derefString(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		UpdatedAt:             requiredTime(row.UpdatedAt),
		Notes:                 row.Notes,
		CanChangeGroupName:    row.CanChangeGroupName,
		Status:                row.Status,
		StatusReason:          row.StatusReason,
		StatusSetAt:           nullableTime(row.StatusSetAt),
		StatusSetByID:         row.StatusSetBy,
		Places:                []string{},
	}, nil
}

func (c *SQLCCatalog) SubmitByStaff(circleID string) error {
	_, err := c.queries.SubmitCircle(context.Background(), circleID)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	return err
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

func (c *SQLCCatalog) AddMemberAsStaff(circleID, targetUserID, _ string) error {
	isMember, err := c.queries.IsCircleMember(context.Background(), dbgen.IsCircleMemberParams{
		CircleID: circleID,
		UserID:   targetUserID,
	})
	if err != nil {
		return err
	}
	if isMember {
		return ErrAlreadyMember
	}

	if err := c.queries.CreateCircleUser(context.Background(), dbgen.CreateCircleUserParams{
		CircleID: circleID,
		UserID:   targetUserID,
		IsLeader: false,
	}); err != nil {
		return err
	}

	return nil
}

func (c *SQLCCatalog) RemoveMemberAsStaff(circleID, targetUserID string) error {
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

func (c *SQLCCatalog) AddMember(requester *auth.User, circleID, targetUserID, _ string, verified bool) error {
	isLeader, err := c.queries.IsCircleLeader(context.Background(), dbgen.IsCircleLeaderParams{
		CircleID: circleID,
		UserID:   requester.ID,
	})
	if err != nil {
		return err
	}
	if !isLeader {
		return ErrForbidden
	}
	if !verified {
		return ErrInviteeUnverified
	}

	isMember, err := c.queries.IsCircleMember(context.Background(), dbgen.IsCircleMemberParams{
		CircleID: circleID,
		UserID:   targetUserID,
	})
	if err != nil {
		return err
	}
	if isMember {
		return ErrAlreadyMember
	}

	if err := c.queries.CreateCircleUser(context.Background(), dbgen.CreateCircleUserParams{
		CircleID: circleID,
		UserID:   targetUserID,
		IsLeader: false,
	}); err != nil {
		return err
	}

	return nil
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
		ParticipationTypeID:   derefString(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		UpdatedAt:             requiredTime(row.UpdatedAt),
		Notes:                 row.Notes,
		CanChangeGroupName:    row.CanChangeGroupName,
		Status:                row.Status,
		StatusReason:          row.StatusReason,
		StatusSetAt:           nullableTime(row.StatusSetAt),
		StatusSetByID:         row.StatusSetBy,
		Places:                []string{},
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
		ParticipationTypeID:   derefString(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		UpdatedAt:             requiredTime(row.UpdatedAt),
		Notes:                 row.Notes,
		CanChangeGroupName:    row.CanChangeGroupName,
		Status:                row.Status,
		StatusReason:          row.StatusReason,
		StatusSetAt:           nullableTime(row.StatusSetAt),
		StatusSetByID:         row.StatusSetBy,
		Places:                []string{},
	}, nil
}

func (c *SQLCCatalog) FindByInvitationToken(token string) (Circle, error) {
	row, err := c.queries.GetCircleByInvitationToken(context.Background(), nullableText(token))
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
		ParticipationTypeID:   derefString(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		UpdatedAt:             requiredTime(row.UpdatedAt),
		Notes:                 row.Notes,
		CanChangeGroupName:    row.CanChangeGroupName,
		Status:                row.Status,
		StatusReason:          row.StatusReason,
		StatusSetAt:           nullableTime(row.StatusSetAt),
		StatusSetByID:         row.StatusSetBy,
		Places:                []string{},
	}, nil
}

func (c *SQLCCatalog) setCircleBooths(circleID string, placeIDs []string) error {
	if err := c.queries.DeleteBoothsByCircle(context.Background(), circleID); err != nil {
		return err
	}
	for _, placeID := range placeIDs {
		if err := c.queries.AddCircleBooth(context.Background(), dbgen.AddCircleBoothParams{
			PlaceID:  placeID,
			CircleID: circleID,
		}); err != nil {
			return err
		}
	}
	return nil
}

func circleFromListRow(row dbgen.ListCirclesRow) Circle {
	return Circle{
		ID:                    row.ID,
		Name:                  row.Name,
		NameYomi:              row.NameYomi,
		GroupName:             row.GroupName,
		GroupNameYomi:         row.GroupNameYomi,
		ParticipationTypeID:   derefString(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		UpdatedAt:             requiredTime(row.UpdatedAt),
		Notes:                 row.Notes,
		CanChangeGroupName:    row.CanChangeGroupName,
		Status:                row.Status,
		StatusReason:          row.StatusReason,
		StatusSetAt:           nullableTime(row.StatusSetAt),
		StatusSetByID:         row.StatusSetBy,
		Places:                []string{},
	}
}

func circleFromGetByIDRow(row dbgen.GetCircleByIDRow) Circle {
	return Circle{
		ID:                    row.ID,
		Name:                  row.Name,
		NameYomi:              row.NameYomi,
		GroupName:             row.GroupName,
		GroupNameYomi:         row.GroupNameYomi,
		ParticipationTypeID:   derefString(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		UpdatedAt:             requiredTime(row.UpdatedAt),
		Notes:                 row.Notes,
		CanChangeGroupName:    row.CanChangeGroupName,
		Status:                row.Status,
		StatusReason:          row.StatusReason,
		StatusSetAt:           nullableTime(row.StatusSetAt),
		StatusSetByID:         row.StatusSetBy,
		Places:                []string{},
	}
}

func circleFromGetUserCircleRow(row dbgen.GetUserCircleRow) Circle {
	return Circle{
		ID:                    row.ID,
		Name:                  row.Name,
		NameYomi:              row.NameYomi,
		GroupName:             row.GroupName,
		GroupNameYomi:         row.GroupNameYomi,
		ParticipationTypeID:   derefString(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		UpdatedAt:             requiredTime(row.UpdatedAt),
		Notes:                 row.Notes,
		CanChangeGroupName:    row.CanChangeGroupName,
		Status:                row.Status,
		StatusReason:          row.StatusReason,
		StatusSetAt:           nullableTime(row.StatusSetAt),
		StatusSetByID:         row.StatusSetBy,
		Places:                []string{},
	}
}

func circleFromSetStatusRow(row dbgen.SetCircleStatusRow, places []string) Circle {
	return Circle{
		ID:                    row.ID,
		Name:                  row.Name,
		NameYomi:              row.NameYomi,
		GroupName:             row.GroupName,
		GroupNameYomi:         row.GroupNameYomi,
		ParticipationTypeID:   derefString(row.ParticipationTypeID),
		ParticipationTypeName: row.ParticipationTypeName,
		Tags:                  append([]string{}, row.Tags...),
		InvitationToken:       nullableTextValue(row.InvitationToken),
		SubmittedAt:           nullableTime(row.SubmittedAt),
		Notes:                 row.Notes,
		Status:                row.Status,
		StatusReason:          row.StatusReason,
		StatusSetAt:           nullableTime(row.StatusSetAt),
		StatusSetByID:         row.StatusSetBy,
		Places:                places,
	}
}

// nullableText converts a string to pgtype.Text for text (non-UUID) columns.
func nullableText(value string) pgtype.Text {
	if value == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: value, Valid: true}
}

// nullableTextValue extracts a string from pgtype.Text for text (non-UUID) columns.
func nullableTextValue(value pgtype.Text) string {
	if !value.Valid {
		return ""
	}
	return value.String
}

func optionalString(value string) *string {
	if value == "" {
		return nil
	}
	s := value
	return &s
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func nullableTime(value pgtype.Timestamptz) *time.Time {
	if !value.Valid {
		return nil
	}
	t := value.Time
	return &t
}

func requiredTime(value pgtype.Timestamptz) time.Time {
	if !value.Valid {
		return time.Time{}
	}
	return value.Time
}
