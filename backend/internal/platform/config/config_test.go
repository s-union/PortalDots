package config

import (
	"strings"
	"testing"
	"time"
)

func TestValidateForAPIRejectsInsecureDefaults(t *testing.T) {
	t.Parallel()

	cfg := Config{
		DatabaseURL:     "postgres://example",
		MigrationsDir:   "db/migrations",
		SessionTTL:      time.Hour,
		StaffVerifyCode: "123456",
	}

	err := cfg.ValidateForAPI()
	if err == nil {
		t.Fatal("expected insecure defaults to be rejected")
	}
	if !strings.Contains(err.Error(), "PORTALDOTS_STAFF_VERIFY_CODE") {
		t.Fatalf("expected staff verify code error, got %v", err)
	}
}

func TestValidateForAPIAllowsSecureExplicitConfigurationWithoutDemoAuthSettings(t *testing.T) {
	t.Parallel()

	cfg := Config{
		DatabaseURL:             "postgres://example",
		MigrationsDir:           "db/migrations",
		SessionTTL:              time.Hour,
		StaffVerifyCode:         "654321",
		staffVerifyCodeProvided: true,
	}

	if err := cfg.ValidateForAPI(); err != nil {
		t.Fatalf("expected secure config to pass validation, got %v", err)
	}
}

func TestValidateForAPIRequiresDemoAuthSettingsWhenInsecureDefaultsEnabled(t *testing.T) {
	t.Parallel()

	cfg := Config{
		DatabaseURL:           "postgres://example",
		MigrationsDir:         "db/migrations",
		SessionTTL:            time.Hour,
		AllowInsecureDefaults: true,
		StaffVerifyCode:       "123456",
	}

	err := cfg.ValidateForAPI()
	if err == nil {
		t.Fatal("expected demo auth settings to be required")
	}
	if !strings.Contains(err.Error(), "PORTALDOTS_AUTH_LOGIN_IDS") {
		t.Fatalf("expected login ids error, got %v", err)
	}
	if !strings.Contains(err.Error(), "PORTALDOTS_AUTH_PASSWORD") {
		t.Fatalf("expected auth password error, got %v", err)
	}
}
