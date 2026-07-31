package middlewares

import (
	"sync"
	"time"
)

const maxTrackedLoginAttempts = 10_000

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

func (t *LoginAttemptTracker) IsLocked(key string) (bool, time.Time) {
	t.mu.Lock()
	defer t.mu.Unlock()

	attempt, ok := t.attempts[key]
	if !ok || attempt.lockedUntil == nil {
		return false, time.Time{}
	}
	if time.Now().Before(*attempt.lockedUntil) {
		return true, *attempt.lockedUntil
	}
	delete(t.attempts, key)
	return false, time.Time{}
}

func (t *LoginAttemptTracker) RecordFailure(key string) {
	t.mu.Lock()
	defer t.mu.Unlock()

	now := time.Now()
	attempt, ok := t.attempts[key]
	if !ok {
		t.makeRoom(now)
		attempt = &loginAttempt{}
		t.attempts[key] = attempt
	}
	attempt.count++
	attempt.lastFail = now
	if attempt.count >= t.maxAttempts {
		lockedUntil := now.Add(t.lockoutDuration)
		attempt.lockedUntil = &lockedUntil
	}
}

func (t *LoginAttemptTracker) RecordSuccess(key string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	delete(t.attempts, key)
}

func (t *LoginAttemptTracker) makeRoom(now time.Time) {
	if len(t.attempts) < maxTrackedLoginAttempts {
		return
	}

	for key, attempt := range t.attempts {
		lockExpired := attempt.lockedUntil != nil && !now.Before(*attempt.lockedUntil)
		inactive := attempt.lockedUntil == nil && now.Sub(attempt.lastFail) >= t.lockoutDuration
		if lockExpired || inactive {
			delete(t.attempts, key)
		}
	}
	if len(t.attempts) < maxTrackedLoginAttempts {
		return
	}

	var oldestKey string
	var oldestFailure time.Time
	for key, attempt := range t.attempts {
		if oldestKey == "" || attempt.lastFail.Before(oldestFailure) {
			oldestKey = key
			oldestFailure = attempt.lastFail
		}
	}
	delete(t.attempts, oldestKey)
}
