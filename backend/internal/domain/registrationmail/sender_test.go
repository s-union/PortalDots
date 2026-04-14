package registrationmail

import (
	"strings"
	"testing"

	"github.com/s-union/PortalDots/backend/internal/shared/mailrender"
)

func TestBuildVerificationMailBodyEncodesSubjectHeader(t *testing.T) {
	t.Parallel()

	rendered, err := mailrender.RenderRegistrationVerify(mailrender.Branding{
		AppName:      "PortalDots",
		AppURL:       "https://portal.example.com",
		AdminName:    "PortalDots 実行委員会",
		ContactEmail: "contact@example.com",
	}, "PortalDots ユーザー登録の確認", "https://portal.example.com/verify")
	if err != nil {
		t.Fatalf("render registration verify: %v", err)
	}
	body := mailrender.BuildMultipartAlternativeMessage("from@example.com", "to@example.com", rendered)
	if !strings.Contains(body, "Subject: =?UTF-8?") {
		t.Fatalf("expected RFC 2047 encoded subject header, got %q", body)
	}
	if !strings.Contains(body, "Content-Type: multipart/alternative") {
		t.Fatalf("expected multipart body, got %q", body)
	}
}
