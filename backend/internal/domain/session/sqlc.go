package session

import (
	"context"
	"errors"
	"time"

	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
	"github.com/s-union/PortalDots/backend/internal/platform/postgres/pgutil"
)

type SQLCStore struct {
	queries *dbgen.Queries
	now     func() time.Time
	ttl     time.Duration
}

var ErrSessionNotFound = errors.New("session not found after create")

func NewSQLCStore(queries *dbgen.Queries, ttl time.Duration) *SQLCStore {
	return &SQLCStore{
		queries: queries,
		now:     time.Now,
		ttl:     ttl,
	}
}

func (s *SQLCStore) Create(user *auth.User) (string, Session, error) {
	id, err := randomToken(32)
	if err != nil {
		return "", Session{}, err
	}
	csrfToken, err := randomToken(32)
	if err != nil {
		return "", Session{}, err
	}

	err = s.queries.CreateSession(context.Background(), dbgen.CreateSessionParams{
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

	session, ok := s.Get(id)
	if !ok {
		return "", Session{}, ErrSessionNotFound
	}

	return id, session, nil
}

func (s *SQLCStore) Get(id string) (Session, bool) {
	sessionRow, err := s.queries.GetSessionByID(context.Background(), id)
	if err != nil {
		return Session{}, false
	}
	if s.isExpired(sessionRow.UpdatedAt.Time) {
		s.Delete(id)
		return Session{}, false
	}

	userRow, err := s.queries.GetUserByID(context.Background(), sessionRow.UserID)
	if err != nil {
		return Session{}, false
	}

	roles, err := s.queries.ListUserRoles(context.Background(), userRow.ID)
	if err != nil {
		return Session{}, false
	}
	permissions, err := s.queries.ListUserPermissions(context.Background(), userRow.ID)
	if err != nil {
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
		User: &auth.User{
			ID:          userRow.ID,
			DisplayName: userRow.DisplayName,
			Roles:       roles,
			Permissions: permissions,
		},
	}, true
}

func (s *SQLCStore) Delete(id string) {
	_ = s.queries.DeleteSession(context.Background(), id)
}

func (s *SQLCStore) DeleteByUserID(userID string) {
	_ = s.queries.DeleteSessionsByUserID(context.Background(), userID)
}

func (s *SQLCStore) Update(id string, update func(*Session)) bool {
	current, ok := s.Get(id)
	if !ok {
		return false
	}

	update(&current)

	err := s.queries.UpdateSession(context.Background(), dbgen.UpdateSessionParams{
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
