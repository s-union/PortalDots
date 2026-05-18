package controllers

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"strings"
	"testing"
)

func TestLogQueuedMailInsecureIncludesRawContent(t *testing.T) {
	entry, rawLog := captureQueuedMailLog(t, true)

	if got := entry["subject"]; got != "secret-subject" {
		t.Fatalf("unexpected subject: %#v", got)
	}
	if got := entry["body"]; got != "secret-body" {
		t.Fatalf("unexpected body: %#v", got)
	}
	recipients, ok := entry["recipients"].([]any)
	if !ok || len(recipients) != 2 || recipients[0] != "first@example.com" || recipients[1] != "second@example.com" {
		t.Fatalf("unexpected recipients: %#v", entry["recipients"])
	}
	if _, exists := entry["recipientsCount"]; exists {
		t.Fatalf("did not expect recipientsCount in insecure mode: %#v", entry)
	}
	if !strings.Contains(rawLog, "secret-subject") || !strings.Contains(rawLog, "secret-body") || !strings.Contains(rawLog, "first@example.com") {
		t.Fatalf("expected raw content in insecure mode log, got %s", rawLog)
	}
}

func TestLogQueuedMailSecureRedactsSensitiveContent(t *testing.T) {
	entry, rawLog := captureQueuedMailLog(t, false)

	if got := entry["subject"]; got != "[redacted]" {
		t.Fatalf("expected redacted subject, got %#v", got)
	}
	if got := entry["body"]; got != "[redacted]" {
		t.Fatalf("expected redacted body, got %#v", got)
	}
	recipientsCount, ok := entry["recipientsCount"].(float64)
	if !ok || int(recipientsCount) != 2 {
		t.Fatalf("expected recipientsCount=2, got %#v", entry["recipientsCount"])
	}
	if _, exists := entry["recipients"]; exists {
		t.Fatalf("did not expect recipients field in secure mode: %#v", entry)
	}
	if strings.Contains(rawLog, "secret-subject") || strings.Contains(rawLog, "secret-body") || strings.Contains(rawLog, "first@example.com") {
		t.Fatalf("secure mode log leaked sensitive data: %s", rawLog)
	}
}

func captureQueuedMailLog(t *testing.T, allowDangerously bool) (map[string]any, string) {
	t.Helper()

	var logs bytes.Buffer
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&logs, nil)))
	t.Cleanup(func() {
		slog.SetDefault(previousLogger)
	})

	logQueuedMail(
		"mail_mock_test",
		"job-id",
		"circle-id",
		"user-id",
		"secret-subject",
		"secret-body",
		[]string{"first@example.com", "second@example.com"},
		allowDangerously,
	)

	rawLog := strings.TrimSpace(logs.String())
	if rawLog == "" {
		t.Fatal("expected one queued mail log entry")
	}

	var entry map[string]any
	if err := json.Unmarshal([]byte(rawLog), &entry); err != nil {
		t.Fatalf("unmarshal queued mail log: %v, raw=%s", err, rawLog)
	}

	return entry, rawLog
}
