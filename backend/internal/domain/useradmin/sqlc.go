package useradmin

import (
	"context"
	"errors"
	"slices"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
)

type SQLCRepository struct {
	pool    *pgxpool.Pool
	queries *dbgen.Queries
}

func NewSQLCRepository(pool *pgxpool.Pool, queries *dbgen.Queries) *SQLCRepository {
	return &SQLCRepository{
		pool:    pool,
		queries: queries,
	}
}

func (r *SQLCRepository) List() ([]User, error) {
	rows, err := r.queries.ListUsersWithRelations(context.Background())
	if err != nil {
		return nil, err
	}

	users := make([]User, 0, len(rows))
	for _, row := range rows {
		users = append(users, User{
			ID:              row.ID,
			DisplayName:     row.DisplayName,
			LoginIDs:        row.LoginIds,
			Roles:           row.Roles,
			Permissions:     row.Permissions,
			CircleIDs:       row.CircleIds,
			LeaderCircleIDs: []string{},
			IsVerified:      row.IsVerified,
		})
	}

	return users, nil
}

func (r *SQLCRepository) Find(userID string) (User, error) {
	row, err := r.queries.GetUserWithRelationsByID(context.Background(), userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}

	return User{
		ID:              row.ID,
		DisplayName:     row.DisplayName,
		LoginIDs:        row.LoginIds,
		Roles:           row.Roles,
		Permissions:     row.Permissions,
		CircleIDs:       row.CircleIds,
		LeaderCircleIDs: []string{},
		IsVerified:      row.IsVerified,
	}, nil
}

func (r *SQLCRepository) UpdateDisplayName(userID, displayName string) (User, error) {
	_, err := r.queries.UpdateUserDisplayName(context.Background(), dbgen.UpdateUserDisplayNameParams{
		ID:          userID,
		DisplayName: displayName,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}

	return r.Find(userID)
}

func (r *SQLCRepository) Update(userID, displayName string, loginIDs []string) (User, error) {
	ctx := context.Background()
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return User{}, err
	}
	defer tx.Rollback(ctx)

	queries := r.queries.WithTx(tx)
	userRow, err := queries.GetUserWithRelationsByID(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}

	for _, loginID := range loginIDs {
		if slices.Contains(userRow.LoginIds, loginID) {
			continue
		}

		owner, ownerErr := queries.GetUserByLoginID(ctx, loginID)
		if ownerErr == nil && owner.ID != userID {
			return User{}, ErrConflict
		}
		if ownerErr != nil && !errors.Is(ownerErr, pgx.ErrNoRows) {
			return User{}, ownerErr
		}
	}

	if _, err := queries.UpdateUserDisplayName(ctx, dbgen.UpdateUserDisplayNameParams{
		ID:          userID,
		DisplayName: displayName,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}

	if err := queries.DeleteUserLoginIDs(ctx, userID); err != nil {
		return User{}, err
	}
	for _, loginID := range slices.Clone(loginIDs) {
		if err := queries.AddUserLoginID(ctx, dbgen.AddUserLoginIDParams{
			LoginID: loginID,
			UserID:  userID,
		}); err != nil {
			return User{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return User{}, err
	}

	return r.Find(userID)
}

func (r *SQLCRepository) UpdateRoles(userID string, roles []string) (User, error) {
	ctx := context.Background()
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return User{}, err
	}
	defer tx.Rollback(ctx)

	queries := r.queries.WithTx(tx)
	if _, err := queries.GetUserByID(ctx, userID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}
	if err := queries.DeleteUserRoles(ctx, userID); err != nil {
		return User{}, err
	}
	for _, role := range roles {
		if err := queries.AddUserRole(ctx, dbgen.AddUserRoleParams{
			UserID: userID,
			Role:   role,
		}); err != nil {
			return User{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return User{}, err
	}

	return r.Find(userID)
}

func (r *SQLCRepository) UpdatePermissions(userID string, permissions []string) (User, error) {
	ctx := context.Background()
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return User{}, err
	}
	defer tx.Rollback(ctx)

	queries := r.queries.WithTx(tx)
	if _, err := queries.GetUserByID(ctx, userID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}
	if err := queries.DeleteUserPermissions(ctx, userID); err != nil {
		return User{}, err
	}
	for _, permission := range permissions {
		if err := queries.AddUserPermission(ctx, dbgen.AddUserPermissionParams{
			UserID:     userID,
			Permission: permission,
		}); err != nil {
			return User{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return User{}, err
	}

	return r.Find(userID)
}

func (r *SQLCRepository) UpdateVerified(userID string, verified bool) (User, error) {
	_, err := r.queries.UpdateUserIsVerified(context.Background(), dbgen.UpdateUserIsVerifiedParams{
		ID:         userID,
		IsVerified: verified,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}

	return r.Find(userID)
}

func (r *SQLCRepository) Delete(userID string) error {
	err := r.queries.DeleteUser(context.Background(), userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}

	return nil
}

func (r *SQLCRepository) ListByCircleIDs(circleIDs []string) ([]User, error) {
	if len(circleIDs) == 0 {
		return r.List()
	}

	rows, err := r.queries.ListUsersByCircleIDs(context.Background(), circleIDs)
	if err != nil {
		return nil, err
	}

	users := make([]User, 0, len(rows))
	for _, row := range rows {
		users = append(users, User{
			ID:              row.ID,
			DisplayName:     row.DisplayName,
			LoginIDs:        row.LoginIds,
			Roles:           row.Roles,
			Permissions:     row.Permissions,
			CircleIDs:       row.CircleIds,
			LeaderCircleIDs: []string{},
			IsVerified:      row.IsVerified,
		})
	}

	return users, nil
}

func (r *SQLCRepository) ListLeadersByCircleIDs(circleIDs []string) ([]User, error) {
	if len(circleIDs) == 0 {
		return []User{}, nil
	}

	rows, err := r.queries.ListCircleLeadersByCircleIDs(context.Background(), circleIDs)
	if err != nil {
		return nil, err
	}

	users := make([]User, 0, len(rows))
	for _, row := range rows {
		users = append(users, User{
			ID:              row.ID,
			DisplayName:     row.DisplayName,
			LoginIDs:        row.LoginIds,
			Roles:           row.Roles,
			Permissions:     row.Permissions,
			CircleIDs:       row.CircleIds,
			LeaderCircleIDs: row.CircleIds,
			IsVerified:      row.IsVerified,
		})
	}

	return users, nil
}

func (r *SQLCRepository) ListVerifiedByCircleIDs(circleIDs []string) ([]User, error) {
	var (
		rows any
		err  error
	)

	if len(circleIDs) == 0 {
		rows, err = r.queries.ListVerifiedUsersWithRelations(context.Background())
	} else {
		rows, err = r.queries.ListVerifiedUsersByCircleIDs(context.Background(), circleIDs)
	}
	if err != nil {
		return nil, err
	}

	switch typed := rows.(type) {
	case []dbgen.ListVerifiedUsersWithRelationsRow:
		users := make([]User, 0, len(typed))
		for _, row := range typed {
			users = append(users, User{
				ID:              row.ID,
				DisplayName:     row.DisplayName,
				LoginIDs:        row.LoginIds,
				Roles:           row.Roles,
				Permissions:     row.Permissions,
				CircleIDs:       row.CircleIds,
				LeaderCircleIDs: []string{},
				IsVerified:      row.IsVerified,
			})
		}
		return users, nil
	case []dbgen.ListVerifiedUsersByCircleIDsRow:
		users := make([]User, 0, len(typed))
		for _, row := range typed {
			users = append(users, User{
				ID:              row.ID,
				DisplayName:     row.DisplayName,
				LoginIDs:        row.LoginIds,
				Roles:           row.Roles,
				Permissions:     row.Permissions,
				CircleIDs:       row.CircleIds,
				LeaderCircleIDs: []string{},
				IsVerified:      row.IsVerified,
			})
		}
		return users, nil
	default:
		return nil, nil
	}
}

func (r *SQLCRepository) ListVerifiedLeadersByCircleIDs(circleIDs []string) ([]User, error) {
	if len(circleIDs) == 0 {
		return []User{}, nil
	}

	rows, err := r.queries.ListVerifiedCircleLeadersByCircleIDs(context.Background(), circleIDs)
	if err != nil {
		return nil, err
	}

	users := make([]User, 0, len(rows))
	for _, row := range rows {
		users = append(users, User{
			ID:              row.ID,
			DisplayName:     row.DisplayName,
			LoginIDs:        row.LoginIds,
			Roles:           row.Roles,
			Permissions:     row.Permissions,
			CircleIDs:       row.CircleIds,
			LeaderCircleIDs: row.CircleIds,
			IsVerified:      row.IsVerified,
		})
	}

	return users, nil
}
