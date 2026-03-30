package controllers

import (
	"sync"
	"time"
)

// participantVerifyCode holds a verification code and its expiration time.
type participantVerifyCode struct {
	Code      string
	ExpiresAt time.Time
}

// participantVerifyCodeStore stores verification codes per session and type.
type participantVerifyCodeStore struct {
	mu    sync.RWMutex
	codes map[string]map[string]participantVerifyCode
}

func newParticipantVerifyCodeStore() *participantVerifyCodeStore {
	return &participantVerifyCodeStore{
		codes: map[string]map[string]participantVerifyCode{},
	}
}

func (s *participantVerifyCodeStore) Put(sessionID, verificationType, code string, expiresAt time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.pruneExpiredLocked(time.Now().UTC())

	if _, ok := s.codes[sessionID]; !ok {
		s.codes[sessionID] = map[string]participantVerifyCode{}
	}
	s.codes[sessionID][verificationType] = participantVerifyCode{
		Code:      code,
		ExpiresAt: expiresAt,
	}
}

func (s *participantVerifyCodeStore) Match(sessionID, verificationType, code string, now time.Time) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.pruneExpiredLocked(now)

	byType, ok := s.codes[sessionID]
	if !ok {
		return false
	}
	current, ok := byType[verificationType]
	if !ok {
		return false
	}

	return current.Code == code && now.Before(current.ExpiresAt)
}

func (s *participantVerifyCodeStore) Clear(sessionID, verificationType string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.pruneExpiredLocked(time.Now().UTC())

	byType, ok := s.codes[sessionID]
	if !ok {
		return
	}
	delete(byType, verificationType)
	if len(byType) == 0 {
		delete(s.codes, sessionID)
	}
}

func (s *participantVerifyCodeStore) pruneExpiredLocked(now time.Time) {
	for sessionID, byType := range s.codes {
		for verificationType, current := range byType {
			if !now.Before(current.ExpiresAt) {
				delete(byType, verificationType)
			}
		}
		if len(byType) == 0 {
			delete(s.codes, sessionID)
		}
	}
}
