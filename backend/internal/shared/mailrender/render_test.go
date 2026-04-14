package mailrender

import (
	"fmt"
	"strings"
	"testing"
)

func TestRenderMarkdownNoticeRendersHTMLAndText(t *testing.T) {
	t.Parallel()

	rendered, err := RenderMarkdownNotice(Branding{
		AppName:      "PortalDots",
		AppURL:       "https://portal.example.com",
		AdminName:    "PortalDots 実行委員会",
		ContactEmail: "contact@example.com",
	}, "件名", "# 見出し\n\n[リンク](https://example.com)")
	if err != nil {
		t.Fatalf("render markdown notice: %v", err)
	}
	if !strings.Contains(rendered.HTML, "<h1") || !strings.Contains(rendered.HTML, "件名") {
		t.Fatalf("expected subject heading in html, got %q", rendered.HTML)
	}
	if !strings.Contains(rendered.HTML, `<a href="https://example.com">リンク</a>`) {
		t.Fatalf("expected markdown link in html, got %q", rendered.HTML)
	}
	if !strings.Contains(rendered.Text, "# 見出し") {
		t.Fatalf("expected markdown text fallback, got %q", rendered.Text)
	}
}

func TestRenderMarkdownNoticeEscapesRawHTML(t *testing.T) {
	t.Parallel()

	rendered, err := RenderMarkdownNotice(Branding{}, "件名", "<script>alert('x')</script>")
	if err != nil {
		t.Fatalf("render markdown notice: %v", err)
	}
	if strings.Contains(rendered.HTML, "<script>") {
		t.Fatalf("expected raw html to stay escaped, got %q", rendered.HTML)
	}
}

func TestRenderRegistrationVerifyRendersVerifyURL(t *testing.T) {
	t.Parallel()

	rendered, err := RenderRegistrationVerify(Branding{
		AppName:      "PortalDots",
		AppURL:       "https://portal.example.com",
		AdminName:    "PortalDots 実行委員会",
		ContactEmail: "contact@example.com",
	}, "PortalDots ユーザー登録の確認", "https://portal.example.com/verify")
	if err != nil {
		t.Fatalf("render registration verify: %v", err)
	}
	if !strings.Contains(rendered.HTML, "認証URLを開く") {
		t.Fatalf("expected verify button label, got %q", rendered.HTML)
	}
	if !strings.Contains(rendered.HTML, "https://portal.example.com/verify") {
		t.Fatalf("expected verify url in html, got %q", rendered.HTML)
	}
	if !strings.Contains(rendered.Text, "https://portal.example.com/verify") {
		t.Fatalf("expected verify url in text, got %q", rendered.Text)
	}
}

func TestBuildMultipartAlternativeMessageBuildsMultipartMessage(t *testing.T) {
	t.Parallel()

	message := BuildMultipartAlternativeMessage("from@example.com", "to@example.com", RenderedMail{
		Subject: "件名",
		Text:    "本文",
		HTML:    "<p>本文</p>",
	})

	if !strings.Contains(message, "Content-Type: multipart/alternative") {
		t.Fatalf("expected multipart content type, got %q", message)
	}
	if !strings.Contains(message, "Content-Transfer-Encoding: quoted-printable") {
		t.Fatalf("expected quoted-printable body, got %q", message)
	}
	if !strings.Contains(message, "Subject: =?UTF-8?") {
		t.Fatalf("expected encoded subject header, got %q", message)
	}

	boundary := extractBoundary(t, message)
	if strings.Count(message, "--"+boundary) != 3 {
		t.Fatalf("expected multipart boundary markers to appear 3 times, got %q", message)
	}
}

func TestBuildMultipartAlternativeMessageUsesUniqueBoundary(t *testing.T) {
	t.Parallel()

	legacyBoundaryLine := "--PortalDots_Multipart_Alternative"
	rendered := RenderedMail{
		Subject: "件名",
		Text:    "before\n" + legacyBoundaryLine + "\nafter",
		HTML:    fmt.Sprintf("<p>before</p>\n<p>%s</p>\n<p>after</p>", legacyBoundaryLine),
	}

	first := BuildMultipartAlternativeMessage("from@example.com", "to@example.com", rendered)
	second := BuildMultipartAlternativeMessage("from@example.com", "to@example.com", rendered)

	firstBoundary := extractBoundary(t, first)
	secondBoundary := extractBoundary(t, second)

	if firstBoundary == "PortalDots_Multipart_Alternative" {
		t.Fatalf("expected generated boundary to differ from legacy fixed boundary, got %q", firstBoundary)
	}
	if firstBoundary == secondBoundary {
		t.Fatalf("expected generated boundaries to differ between messages, got %q", firstBoundary)
	}
	if strings.Contains(rendered.Text, "--"+firstBoundary) || strings.Contains(rendered.HTML, "--"+firstBoundary) {
		t.Fatalf("expected generated boundary to avoid body collisions, got %q", firstBoundary)
	}
	if !strings.Contains(first, legacyBoundaryLine) {
		t.Fatalf("expected legacy boundary line to remain in encoded body, got %q", first)
	}
	if strings.Count(first, "--"+firstBoundary) != 3 {
		t.Fatalf("expected generated boundary markers to appear 3 times, got %q", first)
	}
}

func TestBuildMultipartAlternativeMessageSanitizesHeaderFolding(t *testing.T) {
	t.Parallel()

	message := BuildMultipartAlternativeMessage(
		"PortalDots\r\n\tBcc: hidden@example.com",
		"user@example.com\r\n\tCc: copied@example.com",
		RenderedMail{
			Subject: "件名\r\n\tX-Injected: true",
			Text:    "本文",
			HTML:    "<p>本文</p>",
		},
	)

	headerSection, _, _ := strings.Cut(message, "\r\n\r\n")
	if strings.Contains(headerSection, "\r\n\t") {
		t.Fatalf("expected folded header continuation to be removed, got %q", headerSection)
	}
	if strings.Contains(headerSection, "\r\nBcc:") || strings.Contains(headerSection, "\r\nCc:") || strings.Contains(headerSection, "\r\nX-Injected:") {
		t.Fatalf("expected injected headers to be folded into a single line, got %q", headerSection)
	}
}

func extractBoundary(t *testing.T, message string) string {
	t.Helper()

	const prefix = `Content-Type: multipart/alternative; boundary="`
	start := strings.Index(message, prefix)
	if start == -1 {
		t.Fatalf("multipart boundary header not found in %q", message)
	}
	start += len(prefix)

	end := strings.Index(message[start:], "\"")
	if end == -1 {
		t.Fatalf("multipart boundary header was not terminated in %q", message)
	}

	return message[start : start+end]
}
