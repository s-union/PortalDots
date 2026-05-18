package controllers

import (
	"strings"
	"testing"

	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/shared/externalid"
)

func TestBuildRegistrationVerifyURLEncodesPendingRegistrationID(t *testing.T) {
	t.Parallel()

	pendingRegistrationID := "019d58d9-77ae-7012-97bf-2c68633849cb"
	verifyURL := buildRegistrationVerifyURL("http://localhost:5173", pendingRegistrationID, "token-abc")

	if strings.Contains(verifyURL, pendingRegistrationID) {
		t.Fatalf("expected verify url to hide raw uuid, got %q", verifyURL)
	}

	externalPendingRegistrationID := externalid.MustEncodeUUIDString(pendingRegistrationID)
	expectedPath := "/email/verify/univemail/" + externalPendingRegistrationID + "?token=token-abc"
	if !strings.HasSuffix(verifyURL, expectedPath) {
		t.Fatalf("expected verify url to end with %q, got %q", expectedPath, verifyURL)
	}
}

func TestBuildAuthVerificationVerifyURLEncodesUserID(t *testing.T) {
	t.Parallel()

	userID := "019d58d9-77ae-7012-97bf-2c68633849cb"
	verifyURL := buildAuthVerificationVerifyURL("http://localhost:5173", "email", userID, "token-abc")

	if strings.Contains(verifyURL, userID) {
		t.Fatalf("expected verify url to hide raw uuid, got %q", verifyURL)
	}

	externalUserID := externalid.MustEncodeUUIDString(userID)
	expectedPath := "/email/verify/account/email/" + externalUserID + "?token=token-abc"
	if !strings.HasSuffix(verifyURL, expectedPath) {
		t.Fatalf("expected verify url to end with %q, got %q", expectedPath, verifyURL)
	}
}

func TestBuildAuthVerificationStatusAllowsCompletionWithUnverifiedContactEmail(t *testing.T) {
	t.Parallel()

	status := buildAuthVerificationStatus(useradmin.User{
		ID:                  "user-1",
		DisplayName:         "登録 太郎",
		ContactEmail:        "contact@example.com",
		IsEmailVerified:     false,
		IsUnivemailVerified: true,
	}, "user@example.ac.jp")

	if !status.Completed {
		t.Fatalf("expected verification to complete with verified university email, got %#v", status)
	}
}

func TestBuildAuthVerificationStatusAllowsCompletionWithoutContactEmail(t *testing.T) {
	t.Parallel()

	status := buildAuthVerificationStatus(useradmin.User{
		ID:                  "user-1",
		DisplayName:         "登録 太郎",
		ContactEmail:        "",
		IsEmailVerified:     false,
		IsUnivemailVerified: true,
	}, "user@example.ac.jp")

	if !status.Completed {
		t.Fatalf("expected verification to complete without contact email, got %#v", status)
	}
}
