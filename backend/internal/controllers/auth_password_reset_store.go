package controllers

import (
	"crypto/subtle"
	"sync"
	"time"
)

type passwordResetToken struct {
	TokenHash string
	ExpiresAt time.Time
}

type passwordResetTokenStore struct {
	mu     sync.RWMutex
	tokens map[string]passwordResetToken
}

func newPasswordResetTokenStore() *passwordResetTokenStore {
	return &passwordResetTokenStore{
		tokens: map[string]passwordResetToken{},
	}
}

func (s *passwordResetTokenStore) Put(userID, token string, expiresAt time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.pruneExpiredLocked(time.Now().UTC())
	s.tokens[userID] = passwordResetToken{
		TokenHash: hashRegistrationToken(token),
		ExpiresAt: expiresAt,
	}
}

func (s *passwordResetTokenStore) Match(userID, token string, now time.Time) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.pruneExpiredLocked(now)
	current, ok := s.tokens[userID]
	if !ok {
		return false
	}

	tokenHash := hashRegistrationToken(token)
	return now.Before(current.ExpiresAt) &&
		len(current.TokenHash) == len(tokenHash) &&
		subtle.ConstantTimeCompare([]byte(current.TokenHash), []byte(tokenHash)) == 1
}

func (s *passwordResetTokenStore) Delete(userID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.tokens, userID)
}

func (s *passwordResetTokenStore) pruneExpiredLocked(now time.Time) {
	for userID, current := range s.tokens {
		if !now.Before(current.ExpiresAt) {
			delete(s.tokens, userID)
		}
	}
}
