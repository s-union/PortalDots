package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"golang.org/x/crypto/bcrypt"
)

func Seed(ctx context.Context, pool *pgxpool.Pool, cfg config.Config) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if err := seedUsers(ctx, tx, cfg.AuthUser, cfg.Users); err != nil {
		return err
	}
	if err := seedForms(ctx, tx, cfg.Forms); err != nil {
		return err
	}
	if err := seedParticipationTypes(ctx, tx, cfg.ParticipationTypes); err != nil {
		return err
	}
	if err := seedCircles(ctx, tx, cfg.Circles); err != nil {
		return err
	}
	if err := seedPages(ctx, tx, cfg.Pages); err != nil {
		return err
	}
	if err := seedDocuments(ctx, tx, cfg.Documents); err != nil {
		return err
	}
	if err := seedTags(ctx, tx, cfg.Tags); err != nil {
		return err
	}
	if err := seedPlaces(ctx, tx, cfg.Places); err != nil {
		return err
	}
	if err := seedContactCategories(ctx, tx, cfg.ContactCategories); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func seedUsers(ctx context.Context, tx pgx.Tx, authUser config.AuthUser, users []config.User) error {
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
		passwordHash, err := hashPassword(user.Password)
		if err != nil {
			return fmt.Errorf("hash user password: %w", err)
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO users (id, display_name, password, is_verified)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (id) DO UPDATE
			SET display_name = EXCLUDED.display_name,
			    password = EXCLUDED.password,
			    is_verified = EXCLUDED.is_verified
		`, user.ID, user.DisplayName, passwordHash, user.IsVerified); err != nil {
			return err
		}

		if _, err := tx.Exec(ctx, `DELETE FROM user_login_ids WHERE user_id = $1`, user.ID); err != nil {
			return err
		}
		for _, loginID := range user.LoginIDs {
			if _, err := tx.Exec(ctx, `
				INSERT INTO user_login_ids (login_id, user_id)
				VALUES ($1, $2)
				ON CONFLICT (login_id) DO UPDATE
				SET user_id = EXCLUDED.user_id
			`, loginID, user.ID); err != nil {
				return err
			}
		}

		if _, err := tx.Exec(ctx, `DELETE FROM user_roles WHERE user_id = $1`, user.ID); err != nil {
			return err
		}
		for _, role := range user.Roles {
			if _, err := tx.Exec(ctx, `
				INSERT INTO user_roles (user_id, role)
				VALUES ($1, $2)
				ON CONFLICT (user_id, role) DO NOTHING
			`, user.ID, role); err != nil {
				return err
			}
		}

		if _, err := tx.Exec(ctx, `DELETE FROM user_permissions WHERE user_id = $1`, user.ID); err != nil {
			return err
		}
		for _, permission := range user.Permissions {
			if _, err := tx.Exec(ctx, `
				INSERT INTO user_permissions (user_id, permission)
				VALUES ($1, $2)
				ON CONFLICT (user_id, permission) DO NOTHING
			`, user.ID, permission); err != nil {
				return err
			}
		}

		if _, err := tx.Exec(ctx, `DELETE FROM circle_user WHERE user_id = $1`, user.ID); err != nil {
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
			if _, err := tx.Exec(ctx, `
				INSERT INTO circle_user (circle_id, user_id, is_leader)
				VALUES ($1, $2, $3)
				ON CONFLICT (circle_id, user_id) DO UPDATE
				SET is_leader = EXCLUDED.is_leader
			`, circleID, user.ID, isLeader); err != nil {
				return err
			}
		}
	}

	return nil
}

func seedCircles(ctx context.Context, tx pgx.Tx, circles []config.Circle) error {
	for _, item := range circles {
		if _, err := tx.Exec(ctx, `
			INSERT INTO circles (id, name, group_name, participation_type_id, participation_type_name, tags)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (id) DO UPDATE
			SET name = EXCLUDED.name,
			    group_name = EXCLUDED.group_name,
			    participation_type_id = EXCLUDED.participation_type_id,
			    participation_type_name = EXCLUDED.participation_type_name,
			    tags = EXCLUDED.tags
		`, item.ID, item.Name, item.GroupName, nullableTextArg(item.ParticipationTypeID), item.ParticipationTypeName, item.Tags); err != nil {
			return err
		}
	}

	return nil
}

func seedParticipationTypes(ctx context.Context, tx pgx.Tx, items []config.ParticipationType) error {
	for _, item := range items {
		if _, err := tx.Exec(ctx, `
			INSERT INTO participation_types (id, name, description, users_count_min, users_count_max, tags, form_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (id) DO UPDATE
			SET name = EXCLUDED.name,
			    description = EXCLUDED.description,
			    users_count_min = EXCLUDED.users_count_min,
			    users_count_max = EXCLUDED.users_count_max,
			    tags = EXCLUDED.tags,
			    form_id = EXCLUDED.form_id,
			    updated_at = now()
		`, item.ID, item.Name, item.Description, item.UsersCountMin, item.UsersCountMax, item.Tags, item.FormID); err != nil {
			return err
		}
	}

	return nil
}

func seedPages(ctx context.Context, tx pgx.Tx, pages []config.Page) error {
	for _, item := range pages {
		publishedAt, err := parseRFC3339(item.PublishedAt)
		if err != nil {
			return fmt.Errorf("parse page published_at for %s: %w", item.ID, err)
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO pages (
				id,
				circle_id,
				title,
				body,
				notes,
				is_pinned,
				is_public,
				viewable_tags,
				document_ids,
				published_at
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			ON CONFLICT (id) DO UPDATE
			SET circle_id = EXCLUDED.circle_id,
			    title = EXCLUDED.title,
			    body = EXCLUDED.body,
			    notes = EXCLUDED.notes,
			    is_pinned = EXCLUDED.is_pinned,
			    is_public = EXCLUDED.is_public,
			    viewable_tags = EXCLUDED.viewable_tags,
			    document_ids = EXCLUDED.document_ids,
			    published_at = EXCLUDED.published_at
		`, item.ID, item.CircleID, item.Title, item.Body, item.Notes, item.IsPinned, item.IsPublic, item.ViewableTags, item.DocumentIDs, publishedAt); err != nil {
			return err
		}
	}

	return nil
}

func seedDocuments(ctx context.Context, tx pgx.Tx, documents []config.Document) error {
	for _, item := range documents {
		createdAt, err := parseRFC3339(item.CreatedAt)
		if err != nil {
			return fmt.Errorf("parse document created_at for %s: %w", item.ID, err)
		}
		updatedAt, err := parseRFC3339(item.UpdatedAt)
		if err != nil {
			return fmt.Errorf("parse document updated_at for %s: %w", item.ID, err)
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO documents (id, circle_id, name, description, notes, is_public, is_important, filename, mime_type, content, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			ON CONFLICT (id) DO UPDATE
			SET circle_id = EXCLUDED.circle_id,
			    name = EXCLUDED.name,
			    description = EXCLUDED.description,
			    notes = EXCLUDED.notes,
			    is_public = EXCLUDED.is_public,
			    is_important = EXCLUDED.is_important,
			    filename = EXCLUDED.filename,
			    mime_type = EXCLUDED.mime_type,
			    content = EXCLUDED.content,
			    created_at = EXCLUDED.created_at,
			    updated_at = EXCLUDED.updated_at
		`, item.ID, item.CircleID, item.Name, item.Description, item.Notes, item.IsPublic, item.IsImportant, item.Filename, item.MimeType, []byte(item.Content), createdAt, updatedAt); err != nil {
			return err
		}
	}

	return nil
}

func seedForms(ctx context.Context, tx pgx.Tx, forms []config.Form) error {
	for _, item := range forms {
		openAt, err := parseRFC3339(item.OpenAt)
		if err != nil {
			return fmt.Errorf("parse form open_at for %s: %w", item.ID, err)
		}
		closeAt, err := parseRFC3339(item.CloseAt)
		if err != nil {
			return fmt.Errorf("parse form close_at for %s: %w", item.ID, err)
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO forms (
				id,
				circle_id,
				name,
				description,
				is_public,
				is_open,
				open_at,
				close_at,
				max_answers,
				answerable_tags,
				confirmation_message
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			ON CONFLICT (id) DO UPDATE
			SET circle_id = EXCLUDED.circle_id,
			    name = EXCLUDED.name,
			    description = EXCLUDED.description,
			    is_public = EXCLUDED.is_public,
			    is_open = EXCLUDED.is_open,
			    open_at = EXCLUDED.open_at,
			    close_at = EXCLUDED.close_at,
			    max_answers = EXCLUDED.max_answers,
			    answerable_tags = EXCLUDED.answerable_tags,
			    confirmation_message = EXCLUDED.confirmation_message
		`, item.ID, nullableTextArg(item.CircleID), item.Name, item.Description, item.IsPublic, item.IsOpen, openAt, closeAt, item.MaxAnswers, item.AnswerableTags, item.ConfirmationMessage); err != nil {
			return err
		}
	}

	return nil
}

func seedTags(ctx context.Context, tx pgx.Tx, tags []config.Tag) error {
	for _, item := range tags {
		if _, err := tx.Exec(ctx, `
			INSERT INTO tags (id, name)
			VALUES ($1, $2)
			ON CONFLICT (id) DO UPDATE
			SET name = EXCLUDED.name,
			    updated_at = now()
		`, item.ID, item.Name); err != nil {
			return err
		}
	}

	return nil
}

func seedPlaces(ctx context.Context, tx pgx.Tx, places []config.Place) error {
	for _, item := range places {
		if _, err := tx.Exec(ctx, `
			INSERT INTO places (id, name, type, notes)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (id) DO UPDATE
			SET name = EXCLUDED.name,
			    type = EXCLUDED.type,
			    notes = EXCLUDED.notes,
			    updated_at = now()
		`, item.ID, item.Name, item.Type, item.Notes); err != nil {
			return err
		}
	}

	return nil
}

func seedContactCategories(ctx context.Context, tx pgx.Tx, categories []config.ContactCategory) error {
	for _, item := range categories {
		if _, err := tx.Exec(ctx, `
			INSERT INTO contact_categories (id, name, email)
			VALUES ($1, $2, $3)
			ON CONFLICT (id) DO UPDATE
			SET name = EXCLUDED.name,
			    email = EXCLUDED.email,
			    updated_at = now()
		`, item.ID, item.Name, item.Email); err != nil {
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

func nullableTextArg(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func hashPassword(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	return string(hashed), nil
}
