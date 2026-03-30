package registrationmail

import (
	"strings"
	"testing"
)

func TestBuildVerificationMailBodyEncodesSubjectHeader(t *testing.T) {
	t.Parallel()

	body := buildVerificationMailBody("from@example.com", Message{
		AppName:   "PortalDots",
		To:        "to@example.com",
		VerifyURL: "https://portal.example.com/verify",
	})
	if !strings.Contains(body, "Subject: =?UTF-8?") {
		t.Fatalf("expected RFC 2047 encoded subject header, got %q", body)
	}
}
