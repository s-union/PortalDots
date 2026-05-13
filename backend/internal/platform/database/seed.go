package database

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
	"golang.org/x/crypto/bcrypt"
)

func Seed(ctx context.Context, pool *pgxpool.Pool, cfg config.Config) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	q := dbgen.New(tx)

	if err := seedTags(ctx, q, cfg.Tags); err != nil {
		return err
	}
	// circles.participation_type_id → participation_types → forms → circles という循環依存を
	// 2パスで解決する: 1パス目は participation_type_id を NULL で挿入し、
	// forms・participation_types の挿入後に 2パス目で更新する。
	if err := seedCirclesWithoutParticipationType(ctx, q, cfg.Circles); err != nil {
		return err
	}
	if err := seedForms(ctx, q, cfg.Forms); err != nil {
		return err
	}
	if err := seedParticipationTypes(ctx, q, cfg.ParticipationTypes); err != nil {
		return err
	}
	if err := seedCircles(ctx, q, cfg.Circles); err != nil {
		return err
	}
	if cfg.AllowDangerously {
		if err := seedUsers(ctx, q, cfg.AuthUser, cfg.Users); err != nil {
			return err
		}
	}
	if err := seedDocuments(ctx, q, cfg.Documents); err != nil {
		return err
	}
	if err := seedPages(ctx, q, cfg.Pages); err != nil {
		return err
	}
	if err := seedPlaces(ctx, q, cfg.Places); err != nil {
		return err
	}
	if err := seedBooths(ctx, q, cfg.Booths); err != nil {
		return err
	}
	if err := seedContactCategories(ctx, q, cfg.ContactCategories); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func SyncConfiguredUsers(
	ctx context.Context,
	pool *pgxpool.Pool,
	authUser config.AuthUser,
	users []config.User,
) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	q := dbgen.New(tx)

	if err := seedUsers(ctx, q, authUser, users); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

type configuredUserConflictResolver interface {
	GetUserByLoginID(ctx context.Context, loginID string) (dbgen.GetUserByLoginIDRow, error)
	DeleteUser(ctx context.Context, id string) error
}

func deleteUsersConflictingWithConfiguredLoginIDs(
	ctx context.Context,
	q configuredUserConflictResolver,
	user config.User,
) error {
	deleted := make(map[string]struct{}, len(user.LoginIDs))
	for _, loginID := range user.LoginIDs {
		matched, err := q.GetUserByLoginID(ctx, loginID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				continue
			}
			return err
		}
		if matched.ID == user.ID {
			continue
		}
		if _, ok := deleted[matched.ID]; ok {
			continue
		}
		if err := q.DeleteUser(ctx, matched.ID); err != nil {
			return err
		}
		deleted[matched.ID] = struct{}{}
	}

	return nil
}

func seedUsers(ctx context.Context, q *dbgen.Queries, authUser config.AuthUser, users []config.User) error {
	seedUsers := make([]config.User, 0, len(users)+1)
	seedUsers = append(seedUsers, config.User{
		ID:              authUser.ID,
		LoginIDs:        authUser.LoginIDs,
		DisplayName:     authUser.DisplayName,
		Password:        authUser.Password,
		Roles:           authUser.Roles,
		Permissions:     authUser.Permissions,
		CircleIDs:       []string{},
		LeaderCircleIDs: []string{},
		IsVerified:      true,
	})
	seedUsers = append(seedUsers, users...)

	for _, user := range seedUsers {
		if err := deleteUsersConflictingWithConfiguredLoginIDs(ctx, q, user); err != nil {
			return fmt.Errorf("delete conflicting configured users for %s: %w", user.ID, err)
		}

		passwordHash, err := hashPassword(user.Password)
		if err != nil {
			return fmt.Errorf("hash user password: %w", err)
		}

		if err := q.SeedUpsertUser(ctx, dbgen.SeedUpsertUserParams{
			ID:                  user.ID,
			LastName:            user.LastName,
			LastNameReading:     user.LastNameReading,
			FirstName:           user.FirstName,
			FirstNameReading:    user.FirstNameReading,
			DisplayName:         user.DisplayName,
			ContactEmail:        user.ContactEmail,
			PhoneNumber:         user.PhoneNumber,
			Password:            passwordHash,
			IsVerified:          user.IsVerified,
			IsEmailVerified:     user.IsEmailVerified,
			IsUnivemailVerified: user.IsUnivemailVerified,
		}); err != nil {
			return err
		}

		if err := q.DeleteUserLoginIDs(ctx, user.ID); err != nil {
			return err
		}
		for _, loginID := range user.LoginIDs {
			if err := q.AddUserLoginID(ctx, dbgen.AddUserLoginIDParams{
				LoginID: loginID,
				UserID:  user.ID,
			}); err != nil {
				return err
			}
		}

		if err := q.DeleteUserRoles(ctx, user.ID); err != nil {
			return err
		}
		for _, role := range user.Roles {
			if err := q.AddUserRole(ctx, dbgen.AddUserRoleParams{
				UserID: user.ID,
				Role:   role,
			}); err != nil {
				return err
			}
		}

		if err := q.DeleteUserPermissions(ctx, user.ID); err != nil {
			return err
		}
		for _, permission := range user.Permissions {
			if err := q.AddUserPermission(ctx, dbgen.AddUserPermissionParams{
				UserID:     user.ID,
				Permission: permission,
			}); err != nil {
				return err
			}
		}

		if err := q.SeedDeleteCircleUserByUserID(ctx, user.ID); err != nil {
			return err
		}
		for _, circleID := range user.CircleIDs {
			isLeader := false
			for _, leaderCircleID := range user.LeaderCircleIDs {
				if leaderCircleID == circleID {
					isLeader = true
					break
				}
			}
			if err := q.SeedUpsertCircleUser(ctx, dbgen.SeedUpsertCircleUserParams{
				CircleID: circleID,
				UserID:   user.ID,
				IsLeader: isLeader,
			}); err != nil {
				return err
			}
		}
	}

	return nil
}

func seedCirclesWithoutParticipationType(ctx context.Context, q *dbgen.Queries, circles []config.Circle) error {
	for _, item := range circles {
		if err := q.SeedUpsertCircleWithoutParticipationType(ctx, dbgen.SeedUpsertCircleWithoutParticipationTypeParams{
			ID:                    item.ID,
			Name:                  item.Name,
			NameYomi:              item.NameYomi,
			GroupName:             item.GroupName,
			GroupNameYomi:         item.GroupNameYomi,
			ParticipationTypeName: item.ParticipationTypeName,
			Tags:                  item.Tags,
		}); err != nil {
			return err
		}
	}

	return nil
}

func seedCircles(ctx context.Context, q *dbgen.Queries, circles []config.Circle) error {
	for _, item := range circles {
		if err := q.SeedUpsertCircle(ctx, dbgen.SeedUpsertCircleParams{
			ID:                    item.ID,
			Name:                  item.Name,
			NameYomi:              item.NameYomi,
			GroupName:             item.GroupName,
			GroupNameYomi:         item.GroupNameYomi,
			ParticipationTypeID:   optionalString(item.ParticipationTypeID),
			ParticipationTypeName: item.ParticipationTypeName,
			Tags:                  item.Tags,
		}); err != nil {
			return err
		}
	}

	return nil
}

func seedParticipationTypes(ctx context.Context, q *dbgen.Queries, items []config.ParticipationType) error {
	for _, item := range items {
		if err := q.SeedUpsertParticipationType(ctx, dbgen.SeedUpsertParticipationTypeParams{
			ID:            item.ID,
			Name:          item.Name,
			Description:   item.Description,
			UsersCountMin: item.UsersCountMin,
			UsersCountMax: item.UsersCountMax,
			Tags:          item.Tags,
			FormID:        item.FormID,
		}); err != nil {
			return err
		}
	}

	return nil
}

func seedForms(ctx context.Context, q *dbgen.Queries, forms []config.Form) error {
	for _, item := range forms {
		openAt, err := parseRFC3339(item.OpenAt)
		if err != nil {
			return fmt.Errorf("parse form open_at for %s: %w", item.ID, err)
		}
		closeAt, err := parseRFC3339(item.CloseAt)
		if err != nil {
			return fmt.Errorf("parse form close_at for %s: %w", item.ID, err)
		}

		if err := q.SeedUpsertForm(ctx, dbgen.SeedUpsertFormParams{
			ID:                  item.ID,
			CircleID:            optionalString(item.CircleID),
			Name:                item.Name,
			Description:         item.Description,
			IsPublic:            item.IsPublic,
			IsOpen:              item.IsOpen,
			OpenAt:              toTimestamptz(openAt),
			CloseAt:             toTimestamptz(closeAt),
			MaxAnswers:          item.MaxAnswers,
			AnswerableTags:      item.AnswerableTags,
			ConfirmationMessage: item.ConfirmationMessage,
			CreatedByUserID:     optionalString(item.CreatedByUserID),
		}); err != nil {
			return err
		}
	}

	return nil
}

func seedPages(ctx context.Context, q *dbgen.Queries, pages []config.Page) error {
	for _, item := range pages {
		createdAt, err := parseRFC3339(item.CreatedAt)
		if err != nil {
			return fmt.Errorf("parse page created_at for %s: %w", item.ID, err)
		}
		updatedAt, err := parseRFC3339(item.UpdatedAt)
		if err != nil {
			return fmt.Errorf("parse page updated_at for %s: %w", item.ID, err)
		}

		if err := q.SeedUpsertPage(ctx, dbgen.SeedUpsertPageParams{
			ID:           item.ID,
			Title:        item.Title,
			Body:         item.Body,
			Notes:        item.Notes,
			IsPinned:     item.IsPinned,
			IsPublic:     item.IsPublic,
			ViewableTags: item.ViewableTags,
			DocumentIds:  item.DocumentIDs,
			CreatedAt:    toTimestamptz(createdAt),
			UpdatedAt:    toTimestamptz(updatedAt),
		}); err != nil {
			return err
		}
	}

	return nil
}

func seedDocuments(ctx context.Context, q *dbgen.Queries, documents []config.Document) error {
	for _, item := range documents {
		createdAt, err := parseRFC3339(item.CreatedAt)
		if err != nil {
			return fmt.Errorf("parse document created_at for %s: %w", item.ID, err)
		}
		updatedAt, err := parseRFC3339(item.UpdatedAt)
		if err != nil {
			return fmt.Errorf("parse document updated_at for %s: %w", item.ID, err)
		}

		if err := q.SeedUpsertDocument(ctx, dbgen.SeedUpsertDocumentParams{
			ID:           item.ID,
			Name:         item.Name,
			Description:  item.Description,
			Notes:        item.Notes,
			IsPublic:     item.IsPublic,
			ViewableTags: item.ViewableTags,
			IsImportant:  item.IsImportant,
			Filename:     item.Filename,
			MimeType:     item.MimeType,
			Content:      []byte(item.Content),
			CreatedAt:    toTimestamptz(createdAt),
			UpdatedAt:    toTimestamptz(updatedAt),
		}); err != nil {
			return err
		}
	}

	return nil
}

func seedTags(ctx context.Context, q *dbgen.Queries, tags []config.Tag) error {
	for _, item := range tags {
		if err := q.SeedUpsertTag(ctx, dbgen.SeedUpsertTagParams{
			ID:   item.ID,
			Name: item.Name,
		}); err != nil {
			return err
		}
	}

	return nil
}

func seedPlaces(ctx context.Context, q *dbgen.Queries, places []config.Place) error {
	for _, item := range places {
		if err := q.SeedUpsertPlace(ctx, dbgen.SeedUpsertPlaceParams{
			ID:    item.ID,
			Name:  item.Name,
			Type:  int32(item.Type),
			Notes: item.Notes,
		}); err != nil {
			return err
		}
	}

	return nil
}

func seedBooths(ctx context.Context, q *dbgen.Queries, booths []config.BoothAssignment) error {
	for _, item := range booths {
		if err := q.SeedUpsertBooth(ctx, dbgen.SeedUpsertBoothParams{
			PlaceID:  item.PlaceID,
			CircleID: item.CircleID,
		}); err != nil {
			return err
		}
	}

	return nil
}

func seedContactCategories(ctx context.Context, q *dbgen.Queries, categories []config.ContactCategory) error {
	for _, item := range categories {
		if err := q.SeedUpsertContactCategory(ctx, dbgen.SeedUpsertContactCategoryParams{
			ID:    item.ID,
			Name:  item.Name,
			Email: item.Email,
		}); err != nil {
			return err
		}
	}

	return nil
}

func parseRFC3339(value string) (time.Time, error) {
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return time.Time{}, err
	}

	return parsed, nil
}

func optionalString(value string) *string {
	if value == "" {
		return nil
	}
	s := value
	return &s
}

func toTimestamptz(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: t, Valid: true}
}

func hashPassword(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	return string(hashed), nil
}
