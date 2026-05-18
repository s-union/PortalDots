package controllers

import (
	"crypto/subtle"
	"sync"
	"time"
)

type authVerificationToken struct {
	TokenHash string
	ExpiresAt time.Time
}

type authVerificationTokenStore struct {
	mu     sync.RWMutex
	tokens map[string]map[string]authVerificationToken
}

func newAuthVerificationTokenStore() *authVerificationTokenStore {
	return &authVerificationTokenStore{
		tokens: map[string]map[string]authVerificationToken{},
	}
}

func (s *authVerificationTokenStore) Put(userID, verificationType, token string, expiresAt time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.pruneExpiredLocked(time.Now().UTC())
	if _, ok := s.tokens[userID]; !ok {
		s.tokens[userID] = map[string]authVerificationToken{}
	}
	s.tokens[userID][verificationType] = authVerificationToken{
		TokenHash: hashRegistrationToken(token),
		ExpiresAt: expiresAt.UTC(),
	}
}

func (s *authVerificationTokenStore) Match(userID, verificationType, token string, now time.Time) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.pruneExpiredLocked(now)
	byType, ok := s.tokens[userID]
	if !ok {
		return false
	}
	current, ok := byType[verificationType]
	if !ok {
		return false
	}

	tokenHash := hashRegistrationToken(token)
	return now.Before(current.ExpiresAt) &&
		len(current.TokenHash) == len(tokenHash) &&
		subtle.ConstantTimeCompare([]byte(current.TokenHash), []byte(tokenHash)) == 1
}

func (s *authVerificationTokenStore) Delete(userID, verificationType string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	byType, ok := s.tokens[userID]
	if !ok {
		return
	}
	delete(byType, verificationType)
	if len(byType) == 0 {
		delete(s.tokens, userID)
	}
}

func (s *authVerificationTokenStore) pruneExpiredLocked(now time.Time) {
	for userID, byType := range s.tokens {
		for verificationType, current := range byType {
			if !now.Before(current.ExpiresAt) {
				delete(byType, verificationType)
			}
		}
		if len(byType) == 0 {
			delete(s.tokens, userID)
		}
	}
}
