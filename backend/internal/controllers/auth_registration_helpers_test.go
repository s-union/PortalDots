package controllers

import (
	"strings"
	"testing"

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
