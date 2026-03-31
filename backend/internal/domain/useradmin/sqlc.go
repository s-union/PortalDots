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
			ID:                  row.ID,
			LastName:            row.LastName,
			LastNameReading:     row.LastNameReading,
			FirstName:           row.FirstName,
			FirstNameReading:    row.FirstNameReading,
			DisplayName:         row.DisplayName,
			LoginIDs:            row.LoginIds,
			ContactEmail:        row.ContactEmail,
			PhoneNumber:         row.PhoneNumber,
			Roles:               row.Roles,
			Permissions:         row.Permissions,
			CircleIDs:           row.CircleIds,
			LeaderCircleIDs:     row.LeaderCircleIds,
			IsVerified:          row.IsVerified,
			IsEmailVerified:     row.IsEmailVerified,
			IsUnivemailVerified: row.IsUnivemailVerified,
		})
	}

	return users, nil
}

func (r *SQLCRepository) ListByQuery(query string) ([]User, error) {
	rows, err := r.queries.ListUsersWithQuery(context.Background(), query)
	if err != nil {
		return nil, err
	}

	users := make([]User, 0, len(rows))
	for _, row := range rows {
		users = append(users, User{
			ID:                  row.ID,
			LastName:            row.LastName,
			LastNameReading:     row.LastNameReading,
			FirstName:           row.FirstName,
			FirstNameReading:    row.FirstNameReading,
			DisplayName:         row.DisplayName,
			LoginIDs:            row.LoginIds,
			ContactEmail:        row.ContactEmail,
			PhoneNumber:         row.PhoneNumber,
			Roles:               row.Roles,
			Permissions:         row.Permissions,
			CircleIDs:           row.CircleIds,
			LeaderCircleIDs:     row.LeaderCircleIds,
			IsVerified:          row.IsVerified,
			IsEmailVerified:     row.IsEmailVerified,
			IsUnivemailVerified: row.IsUnivemailVerified,
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
		ID:                  row.ID,
		LastName:            row.LastName,
		LastNameReading:     row.LastNameReading,
		FirstName:           row.FirstName,
		FirstNameReading:    row.FirstNameReading,
		DisplayName:         row.DisplayName,
		LoginIDs:            row.LoginIds,
		ContactEmail:        row.ContactEmail,
		PhoneNumber:         row.PhoneNumber,
		Roles:               row.Roles,
		Permissions:         row.Permissions,
		CircleIDs:           row.CircleIds,
		LeaderCircleIDs:     row.LeaderCircleIds,
		IsVerified:          row.IsVerified,
		IsEmailVerified:     row.IsEmailVerified,
		IsUnivemailVerified: row.IsUnivemailVerified,
	}, nil
}

func (r *SQLCRepository) FindByLoginID(loginID string) (User, error) {
	userRow, err := r.queries.GetUserByLoginID(context.Background(), loginID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}

	return r.Find(userRow.ID)
}

func (r *SQLCRepository) FindByContactEmail(contactEmail string) (User, error) {
	userRow, err := r.queries.GetUserByContactEmail(context.Background(), contactEmail)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}

	return r.Find(userRow.ID)
}

func (r *SQLCRepository) Create(params CreateParams) (User, error) {
	ctx := context.Background()
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return User{}, err
	}
	defer tx.Rollback(ctx)

	queries := r.queries.WithTx(tx)
	row, err := queries.CreateUser(ctx, dbgen.CreateUserParams{
		Column1:             params.ID,
		LastName:            params.LastName,
		LastNameReading:     params.LastNameReading,
		FirstName:           params.FirstName,
		FirstNameReading:    params.FirstNameReading,
		DisplayName:         params.DisplayName,
		ContactEmail:        params.ContactEmail,
		PhoneNumber:         params.PhoneNumber,
		Password:            params.PasswordHash,
		IsVerified:          params.IsVerified,
		IsEmailVerified:     params.IsEmailVerified,
		IsUnivemailVerified: params.IsUnivemailVerified,
	})
	if err != nil {
		return User{}, err
	}

	for _, loginID := range params.LoginIDs {
		if err := queries.AddUserLoginID(ctx, dbgen.AddUserLoginIDParams{
			LoginID: loginID,
			UserID:  row.ID,
		}); err != nil {
			return User{}, err
		}
	}
	for _, role := range params.Roles {
		if err := queries.AddUserRole(ctx, dbgen.AddUserRoleParams{
			UserID: row.ID,
			Role:   role,
		}); err != nil {
			return User{}, err
		}
	}
	for _, permission := range params.Permissions {
		if err := queries.AddUserPermission(ctx, dbgen.AddUserPermissionParams{
			UserID:     row.ID,
			Permission: permission,
		}); err != nil {
			return User{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return User{}, err
	}

	return r.Find(row.ID)
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

func (r *SQLCRepository) UpdateProfile(userID, lastName, lastNameReading, firstName, firstNameReading, contactEmail, phoneNumber string) (User, error) {
	_, err := r.queries.UpdateUserProfile(context.Background(), dbgen.UpdateUserProfileParams{
		ID:               userID,
		LastName:         lastName,
		LastNameReading:  lastNameReading,
		FirstName:        firstName,
		FirstNameReading: firstNameReading,
		ContactEmail:     contactEmail,
		PhoneNumber:      phoneNumber,
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

func (r *SQLCRepository) UpdateFull(userID, displayName string, loginIDs []string, lastName, lastNameReading, firstName, firstNameReading, contactEmail, phoneNumber string) (User, error) {
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

	if _, err := queries.UpdateUserProfile(ctx, dbgen.UpdateUserProfileParams{
		ID:               userID,
		LastName:         lastName,
		LastNameReading:  lastNameReading,
		FirstName:        firstName,
		FirstNameReading: firstNameReading,
		ContactEmail:     contactEmail,
		PhoneNumber:      phoneNumber,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
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

func (r *SQLCRepository) UpdateEmailVerified(userID string, verified bool) (User, error) {
	_, err := r.queries.UpdateUserEmailVerification(context.Background(), dbgen.UpdateUserEmailVerificationParams{
		ID:              userID,
		IsEmailVerified: verified,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}

	return r.Find(userID)
}

func (r *SQLCRepository) UpdateUnivemailVerified(userID string, verified bool) (User, error) {
	_, err := r.queries.UpdateUserUnivemailVerification(context.Background(), dbgen.UpdateUserUnivemailVerificationParams{
		ID:                  userID,
		IsUnivemailVerified: verified,
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
			ID:                  row.ID,
			LastName:            row.LastName,
			LastNameReading:     row.LastNameReading,
			FirstName:           row.FirstName,
			FirstNameReading:    row.FirstNameReading,
			DisplayName:         row.DisplayName,
			LoginIDs:            row.LoginIds,
			ContactEmail:        row.ContactEmail,
			PhoneNumber:         row.PhoneNumber,
			Roles:               row.Roles,
			Permissions:         row.Permissions,
			CircleIDs:           row.CircleIds,
			LeaderCircleIDs:     []string{},
			IsVerified:          row.IsVerified,
			IsEmailVerified:     row.IsEmailVerified,
			IsUnivemailVerified: row.IsUnivemailVerified,
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
			ID:                  row.ID,
			LastName:            row.LastName,
			LastNameReading:     row.LastNameReading,
			FirstName:           row.FirstName,
			FirstNameReading:    row.FirstNameReading,
			DisplayName:         row.DisplayName,
			LoginIDs:            row.LoginIds,
			ContactEmail:        row.ContactEmail,
			PhoneNumber:         row.PhoneNumber,
			Roles:               row.Roles,
			Permissions:         row.Permissions,
			CircleIDs:           row.CircleIds,
			LeaderCircleIDs:     row.CircleIds,
			IsVerified:          row.IsVerified,
			IsEmailVerified:     row.IsEmailVerified,
			IsUnivemailVerified: row.IsUnivemailVerified,
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
				ID:                  row.ID,
				LastName:            row.LastName,
				LastNameReading:     row.LastNameReading,
				FirstName:           row.FirstName,
				FirstNameReading:    row.FirstNameReading,
				DisplayName:         row.DisplayName,
				LoginIDs:            row.LoginIds,
				ContactEmail:        row.ContactEmail,
				PhoneNumber:         row.PhoneNumber,
				Roles:               row.Roles,
				Permissions:         row.Permissions,
				CircleIDs:           row.CircleIds,
				LeaderCircleIDs:     []string{},
				IsVerified:          row.IsVerified,
				IsEmailVerified:     row.IsEmailVerified,
				IsUnivemailVerified: row.IsUnivemailVerified,
			})
		}
		return users, nil
	case []dbgen.ListVerifiedUsersByCircleIDsRow:
		users := make([]User, 0, len(typed))
		for _, row := range typed {
			users = append(users, User{
				ID:                  row.ID,
				LastName:            row.LastName,
				LastNameReading:     row.LastNameReading,
				FirstName:           row.FirstName,
				FirstNameReading:    row.FirstNameReading,
				DisplayName:         row.DisplayName,
				LoginIDs:            row.LoginIds,
				ContactEmail:        row.ContactEmail,
				PhoneNumber:         row.PhoneNumber,
				Roles:               row.Roles,
				Permissions:         row.Permissions,
				CircleIDs:           row.CircleIds,
				LeaderCircleIDs:     []string{},
				IsVerified:          row.IsVerified,
				IsEmailVerified:     row.IsEmailVerified,
				IsUnivemailVerified: row.IsUnivemailVerified,
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
			ID:                  row.ID,
			LastName:            row.LastName,
			LastNameReading:     row.LastNameReading,
			FirstName:           row.FirstName,
			FirstNameReading:    row.FirstNameReading,
			DisplayName:         row.DisplayName,
			LoginIDs:            row.LoginIds,
			ContactEmail:        row.ContactEmail,
			PhoneNumber:         row.PhoneNumber,
			Roles:               row.Roles,
			Permissions:         row.Permissions,
			CircleIDs:           row.CircleIds,
			LeaderCircleIDs:     row.CircleIds,
			IsVerified:          row.IsVerified,
			IsEmailVerified:     row.IsEmailVerified,
			IsUnivemailVerified: row.IsUnivemailVerified,
		})
	}

	return users, nil
}
