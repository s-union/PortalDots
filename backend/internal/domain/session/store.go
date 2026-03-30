package session

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"

	"github.com/s-union/PortalDots/backend/internal/domain/auth"
)

type Session struct {
	CSRFToken          string
	CurrentCircleID    string
	StaffAuthorized    bool
	StaffVerifyCode    string
	StaffVerifyExpires time.Time
	User               *auth.User
}

type Store interface {
	Create(user *auth.User) (string, Session, error)
	Get(id string) (Session, bool)
	Delete(id string)
	DeleteByUserID(userID string)
	Update(id string, update func(*Session)) bool
}

type memorySessionEntry struct {
	session   Session
	updatedAt time.Time
}

type MemoryStore struct {
	mu       sync.RWMutex
	now      func() time.Time
	ttl      time.Duration
	sessions map[string]memorySessionEntry
}

func NewMemoryStore(ttl time.Duration) *MemoryStore {
	return &MemoryStore{
		now:      time.Now,
		ttl:      ttl,
		sessions: map[string]memorySessionEntry{},
	}
}

func (s *MemoryStore) Create(user *auth.User) (string, Session, error) {
	id, err := randomToken(32)
	if err != nil {
		return "", Session{}, err
	}
	csrfToken, err := randomToken(32)
	if err != nil {
		return "", Session{}, err
	}

	session := Session{
		CSRFToken: csrfToken,
		User: &auth.User{
			ID:          user.ID,
			DisplayName: user.DisplayName,
			Roles:       append([]string{}, user.Roles...),
			Permissions: append([]string{}, user.Permissions...),
		},
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[id] = memorySessionEntry{
		session:   session,
		updatedAt: s.now(),
	}

	return id, session, nil
}

func (s *MemoryStore) Get(id string) (Session, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entry, ok := s.sessions[id]
	if !ok {
		return Session{}, false
	}
	if s.isExpired(entry.updatedAt) {
		delete(s.sessions, id)
		return Session{}, false
	}
	session := entry.session

	cloned := Session{
		CSRFToken:          session.CSRFToken,
		CurrentCircleID:    session.CurrentCircleID,
		StaffAuthorized:    session.StaffAuthorized,
		StaffVerifyCode:    session.StaffVerifyCode,
		StaffVerifyExpires: session.StaffVerifyExpires,
	}
	if session.User != nil {
		cloned.User = &auth.User{
			ID:          session.User.ID,
			DisplayName: session.User.DisplayName,
			Roles:       append([]string{}, session.User.Roles...),
			Permissions: append([]string{}, session.User.Permissions...),
		}
	}

	return cloned, true
}

func (s *MemoryStore) Delete(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, id)
}

func (s *MemoryStore) DeleteByUserID(userID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for id, entry := range s.sessions {
		if entry.session.User == nil || entry.session.User.ID != userID {
			continue
		}
		delete(s.sessions, id)
	}
}

func (s *MemoryStore) Update(id string, update func(*Session)) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	session, ok := s.sessions[id]
	if !ok {
		return false
	}
	if s.isExpired(session.updatedAt) {
		delete(s.sessions, id)
		return false
	}

	next := session.session
	update(&next)
	s.sessions[id] = memorySessionEntry{
		session:   next,
		updatedAt: s.now(),
	}
	return true
}

func (s *MemoryStore) isExpired(updatedAt time.Time) bool {
	if s.ttl <= 0 {
		return false
	}

	return s.now().After(updatedAt.Add(s.ttl))
}

func randomToken(bytesLen int) (string, error) {
	buf := make([]byte, bytesLen)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
