package middlewares

import (
	"sync"
	"time"
)

type loginAttempt struct {
	count       int
	lastFail    time.Time
	lockedUntil *time.Time
}

type LoginAttemptTracker struct {
	mu              sync.RWMutex
	attempts        map[string]*loginAttempt
	maxAttempts     int
	lockoutDuration time.Duration
}

func NewLoginAttemptTracker(maxAttempts int, lockoutDuration time.Duration) *LoginAttemptTracker {
	return &LoginAttemptTracker{
		attempts:        make(map[string]*loginAttempt),
		maxAttempts:     maxAttempts,
		lockoutDuration: lockoutDuration,
	}
}

func (t *LoginAttemptTracker) IsLocked(ip string) (bool, time.Time) {
	t.mu.Lock()
	defer t.mu.Unlock()

	attempt, ok := t.attempts[ip]
	if !ok || attempt.lockedUntil == nil {
		return false, time.Time{}
	}
	if time.Now().Before(*attempt.lockedUntil) {
		return true, *attempt.lockedUntil
	}
	delete(t.attempts, ip)
	return false, time.Time{}
}

func (t *LoginAttemptTracker) RecordFailure(ip string) {
	t.mu.Lock()
	defer t.mu.Unlock()

	attempt, ok := t.attempts[ip]
	if !ok {
		attempt = &loginAttempt{}
		t.attempts[ip] = attempt
	}
	attempt.count++
	attempt.lastFail = time.Now()
	if attempt.count >= t.maxAttempts {
		lockedUntil := time.Now().Add(t.lockoutDuration)
		attempt.lockedUntil = &lockedUntil
	}
}

func (t *LoginAttemptTracker) RecordSuccess(ip string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	delete(t.attempts, ip)
}
