package main

import (
	"strings"
	"testing"

	"github.com/s-union/PortalDots/backend/internal/app/worker"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

func TestBuildMailSenderUsesLogSenderWithInsecureDefaults(t *testing.T) {
	t.Parallel()

	sender, err := buildMailSender(config.Config{AllowInsecureDefaults: true})
	if err != nil {
		t.Fatalf("buildMailSender() returned error: %v", err)
	}

	if _, ok := sender.(*worker.LogMailSender); !ok {
		t.Fatalf("expected *worker.LogMailSender, got %T", sender)
	}
}

func TestBuildMailSenderRequiresSMTPWhenInsecureDefaultsDisabled(t *testing.T) {
	t.Parallel()

	sender, err := buildMailSender(config.Config{
		AllowInsecureDefaults: false,
		SMTPPort:              0,
	})
	if err == nil {
		t.Fatal("buildMailSender() expected error, got nil")
	}
	if sender != nil {
		t.Fatalf("buildMailSender() expected nil sender on error, got %T", sender)
	}

	requiredKeys := []string{
		"PORTALDOTS_SMTP_HOST",
		"PORTALDOTS_SMTP_PORT",
		"PORTALDOTS_SMTP_USERNAME",
		"PORTALDOTS_SMTP_PASSWORD",
		"PORTALDOTS_SMTP_FROM",
	}
	for _, key := range requiredKeys {
		if !strings.Contains(err.Error(), key) {
			t.Fatalf("expected error to contain %q, got %q", key, err.Error())
		}
	}
}

func TestBuildMailSenderUsesSMTPSenderWithValidSMTPConfig(t *testing.T) {
	t.Parallel()

	sender, err := buildMailSender(config.Config{
		AllowInsecureDefaults: false,
		SMTPHost:              "smtp.example.com",
		SMTPPort:              587,
		SMTPUsername:          "mailer",
		SMTPPassword:          "secret",
		SMTPFrom:              "noreply@example.com",
	})
	if err != nil {
		t.Fatalf("buildMailSender() returned error: %v", err)
	}

	if _, ok := sender.(*worker.SMTPMailSender); !ok {
		t.Fatalf("expected *worker.SMTPMailSender, got %T", sender)
	}
}
