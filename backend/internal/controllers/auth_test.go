package controllers

import (
	"testing"
	"time"
)

func TestLoginAttemptTrackerClearsExpiredLockout(t *testing.T) {
	t.Parallel()

	tracker := newLoginAttemptTracker(2, time.Minute)
	ip := "192.0.2.10"
	tracker.recordFailure(ip)
	tracker.recordFailure(ip)

	if locked, _ := tracker.isLocked(ip); !locked {
		t.Fatal("expected tracker to lock after max failures")
	}

	tracker.mu.Lock()
	expired := time.Now().Add(-time.Second)
	tracker.attempts[ip].lockedUntil = &expired
	tracker.mu.Unlock()

	if locked, _ := tracker.isLocked(ip); locked {
		t.Fatal("expected expired lockout to be cleared")
	}

	tracker.recordFailure(ip)

	tracker.mu.RLock()
	count := tracker.attempts[ip].count
	tracker.mu.RUnlock()
	if count != 1 {
		t.Fatalf("expected failure count to restart after lockout expiry, got %d", count)
	}
}
