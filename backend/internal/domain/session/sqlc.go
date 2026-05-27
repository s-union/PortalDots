package session

import (
	"context"
	"errors"
	"time"

	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/platform/cache"
	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
	"github.com/s-union/PortalDots/backend/internal/platform/postgres/pgutil"
)

const userCacheTTL = 1 * time.Minute

type SQLCStore struct {
	queries   *dbgen.Queries
	now       func() time.Time
	ttl       time.Duration
	userCache *cache.TTL[auth.User]
}

var ErrSessionNotFound = errors.New("session not found after create")

func NewSQLCStore(queries *dbgen.Queries, ttl time.Duration) *SQLCStore {
	return &SQLCStore{
		queries:   queries,
		now:       time.Now,
		ttl:       ttl,
		userCache: cache.NewTTL[auth.User](userCacheTTL),
	}
}

func (s *SQLCStore) Create(ctx context.Context, user *auth.User) (string, Session, error) {
	id, err := randomToken(32)
	if err != nil {
		return "", Session{}, err
	}
	csrfToken, err := randomToken(32)
	if err != nil {
		return "", Session{}, err
	}

	err = s.queries.CreateSession(ctx, dbgen.CreateSessionParams{
		ID:                 id,
		UserID:             user.ID,
		CsrfToken:          csrfToken,
		CurrentCircleID:    nil,
		StaffAuthorized:    false,
		StaffVerifyCode:    "",
		StaffVerifyExpires: pgutil.Timestamptz(time.Time{}),
	})
	if err != nil {
		return "", Session{}, err
	}

	session, ok := s.Get(ctx, id)
	if !ok {
		return "", Session{}, ErrSessionNotFound
	}

	return id, session, nil
}

func (s *SQLCStore) Get(ctx context.Context, id string) (Session, bool) {
	sessionRow, err := s.queries.GetSessionByID(ctx, id)
	if err != nil {
		return Session{}, false
	}
	if s.isExpired(sessionRow.UpdatedAt.Time) {
		s.Delete(ctx, id)
		return Session{}, false
	}

	user, ok := s.getUser(ctx, sessionRow.UserID)
	if !ok {
		return Session{}, false
	}

	currentCircleID := ""
	if sessionRow.CurrentCircleID != nil {
		currentCircleID = *sessionRow.CurrentCircleID
	}

	return Session{
		CSRFToken:          sessionRow.CsrfToken,
		CurrentCircleID:    currentCircleID,
		StaffAuthorized:    sessionRow.StaffAuthorized,
		StaffVerifyCode:    sessionRow.StaffVerifyCode,
		StaffVerifyExpires: sessionRow.StaffVerifyExpires.Time,
		User:               &user,
	}, true
}

func (s *SQLCStore) getUser(ctx context.Context, userID string) (auth.User, bool) {
	if cached, ok := s.userCache.Get(userID); ok {
		return cached, true
	}

	userRow, err := s.queries.GetUserByID(ctx, userID)
	if err != nil {
		return auth.User{}, false
	}

	roles, err := s.queries.ListUserRoles(ctx, userRow.ID)
	if err != nil {
		return auth.User{}, false
	}
	permissions, err := s.queries.ListUserPermissions(ctx, userRow.ID)
	if err != nil {
		return auth.User{}, false
	}

	user := auth.User{
		ID:          userRow.ID,
		DisplayName: userRow.DisplayName,
		Roles:       roles,
		Permissions: permissions,
	}
	s.userCache.Set(userID, user)
	return user, true
}

func (s *SQLCStore) InvalidateUser(userID string) {
	s.userCache.Delete(userID)
}

func (s *SQLCStore) Delete(ctx context.Context, id string) error {
	return s.queries.DeleteSession(ctx, id)
}

func (s *SQLCStore) DeleteByUserID(ctx context.Context, userID string) error {
	return s.queries.DeleteSessionsByUserID(ctx, userID)
}

func (s *SQLCStore) DeleteOtherSessionsByUserID(ctx context.Context, userID string, currentSessionID string) error {
	return s.queries.DeleteOtherSessionsByUserID(ctx, dbgen.DeleteOtherSessionsByUserIDParams{
		UserID: userID,
		ID:     currentSessionID,
	})
}

func (s *SQLCStore) Update(ctx context.Context, id string, update func(*Session)) bool {
	current, ok := s.Get(ctx, id)
	if !ok {
		return false
	}

	update(&current)

	err := s.queries.UpdateSession(ctx, dbgen.UpdateSessionParams{
		ID:                 id,
		CurrentCircleID:    pgutil.OptionalString(current.CurrentCircleID),
		StaffAuthorized:    current.StaffAuthorized,
		StaffVerifyCode:    current.StaffVerifyCode,
		StaffVerifyExpires: pgutil.Timestamptz(current.StaffVerifyExpires),
	})
	return err == nil
}

func (s *SQLCStore) isExpired(updatedAt time.Time) bool {
	if s.ttl <= 0 {
		return false
	}

	return s.now().After(updatedAt.Add(s.ttl))
}
