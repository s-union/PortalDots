package middlewares

import (
	"fmt"
	"testing"
	"time"
)

func TestLoginAttemptTrackerClearsExpiredLockout(t *testing.T) {
	t.Parallel()

	tracker := NewLoginAttemptTracker(2, time.Minute)
	ip := "192.0.2.10"
	tracker.RecordFailure(ip)
	tracker.RecordFailure(ip)

	if locked, _ := tracker.IsLocked(ip); !locked {
		t.Fatal("expected tracker to lock after max failures")
	}

	tracker.mu.Lock()
	expired := time.Now().Add(-time.Second)
	tracker.attempts[ip].lockedUntil = &expired
	tracker.mu.Unlock()

	if locked, _ := tracker.IsLocked(ip); locked {
		t.Fatal("expected expired lockout to be cleared")
	}

	tracker.RecordFailure(ip)

	tracker.mu.RLock()
	count := tracker.attempts[ip].count
	tracker.mu.RUnlock()
	if count != 1 {
		t.Fatalf("expected failure count to restart after lockout expiry, got %d", count)
	}
}

func TestLoginAttemptTrackerScopesLockoutsByKey(t *testing.T) {
	t.Parallel()

	tracker := NewLoginAttemptTracker(2, time.Minute)
	tracker.RecordFailure("account-a:client")
	tracker.RecordFailure("account-a:client")

	if locked, _ := tracker.IsLocked("account-a:client"); !locked {
		t.Fatal("expected failed account and client pair to be locked")
	}
	if locked, _ := tracker.IsLocked("account-b:client"); locked {
		t.Fatal("expected another account from the same client to remain unlocked")
	}
}

func TestLoginAttemptTrackerBoundsTrackedKeys(t *testing.T) {
	t.Parallel()

	tracker := NewLoginAttemptTracker(2, time.Hour)
	for index := 0; index <= maxTrackedLoginAttempts; index++ {
		tracker.RecordFailure(fmt.Sprintf("key-%d", index))
	}

	tracker.mu.RLock()
	tracked := len(tracker.attempts)
	tracker.mu.RUnlock()
	if tracked != maxTrackedLoginAttempts {
		t.Fatalf("tracked attempts = %d; want %d", tracked, maxTrackedLoginAttempts)
	}
}
