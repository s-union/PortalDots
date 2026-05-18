package controllers

import (
	"testing"
	"time"

	"github.com/s-union/PortalDots/backend/internal/middlewares"
)

func TestLoginAttemptTrackerClearsExpiredLockout(t *testing.T) {
	t.Parallel()

	tracker := middlewares.NewLoginAttemptTracker(2, time.Minute)
	ip := "192.0.2.10"
	tracker.RecordFailure(ip)
	tracker.RecordFailure(ip)

	if locked, _ := tracker.IsLocked(ip); !locked {
		t.Fatal("expected tracker to lock after max failures")
	}

	tracker.RecordSuccess(ip)
	if locked, _ := tracker.IsLocked(ip); locked {
		t.Fatal("expected tracker to unlock after success")
	}

	tracker.RecordFailure(ip)
	tracker.RecordFailure(ip)
	if locked, _ := tracker.IsLocked(ip); !locked {
		t.Fatal("expected tracker to re-lock after subsequent failures")
	}
}
