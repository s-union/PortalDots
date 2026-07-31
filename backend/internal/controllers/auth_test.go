package controllers

import (
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/labstack/echo/v5"
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

func TestLoginAttemptKeyNormalizesAndSeparatesAccounts(t *testing.T) {
	t.Parallel()

	first := loginAttemptKey("  User@Example.COM ", "192.0.2.10")
	normalized := loginAttemptKey("user@example.com", "192.0.2.10")
	otherAccount := loginAttemptKey("other@example.com", "192.0.2.10")

	if first != normalized {
		t.Fatalf("normalized key mismatch: %q != %q", first, normalized)
	}
	if first == otherAccount {
		t.Fatal("expected separate keys for different accounts from the same client")
	}
	if strings.Contains(first, "user@example.com") {
		t.Fatalf("login attempt key exposes the account identifier: %q", first)
	}
}

func TestTrustedClientSignalRespectsConfiguredTrustBoundary(t *testing.T) {
	t.Parallel()

	// Mirrors the IPExtractor configured in NewServerWithDependencies: a
	// reverse proxy terminates TLS in front of the API, so only forwarded
	// headers from a trusted hop are believed.
	e := echo.New()
	e.IPExtractor = echo.ExtractIPFromXFFHeader()

	untrusted := httptest.NewRequest("POST", "/v1/auth/login", nil)
	untrusted.RemoteAddr = "198.51.100.10:54321"
	untrusted.Header.Set(echo.HeaderXForwardedFor, "203.0.113.30")
	if signal := trustedClientSignal(e.NewContext(untrusted, httptest.NewRecorder())); signal != "198.51.100.10" {
		t.Fatalf("trustedClientSignal() = %q; want direct peer address for an untrusted proxy hop", signal)
	}

	trusted := httptest.NewRequest("POST", "/v1/auth/login", nil)
	trusted.RemoteAddr = "127.0.0.1:54321"
	trusted.Header.Set(echo.HeaderXForwardedFor, "203.0.113.30")
	if signal := trustedClientSignal(e.NewContext(trusted, httptest.NewRecorder())); signal != "203.0.113.30" {
		t.Fatalf("trustedClientSignal() = %q; want header address for a trusted proxy hop", signal)
	}
}
