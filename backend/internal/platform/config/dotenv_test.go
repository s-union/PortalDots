package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoadDotEnvLoadsMissingVariables(t *testing.T) {
	passwordKey := "PORTAL_AUTH_PASSWORD_LOAD_TEST"
	appNameKey := "APP_NAME_LOAD_TEST"

	path := filepath.Join(t.TempDir(), ".env")
	content := []byte(passwordKey + "=dev-password\n" + appNameKey + "=\"PortalDots Dev\"\n")
	if err := os.WriteFile(path, content, 0o600); err != nil {
		t.Fatalf("write .env: %v", err)
	}

	if err := LoadDotEnv(path); err != nil {
		t.Fatalf("load .env: %v", err)
	}

	if got := os.Getenv(passwordKey); got != "dev-password" {
		t.Fatalf("expected auth password to be loaded, got %q", got)
	}
	if got := os.Getenv(appNameKey); got != "PortalDots Dev" {
		t.Fatalf("expected quoted app name to be loaded, got %q", got)
	}
	if err := os.Unsetenv(passwordKey); err != nil {
		t.Fatalf("unset env %s: %v", passwordKey, err)
	}
	if err := os.Unsetenv(appNameKey); err != nil {
		t.Fatalf("unset env %s: %v", appNameKey, err)
	}
}

func TestLoadDotEnvDoesNotOverrideExistingVariables(t *testing.T) {
	key := "PORTAL_AUTH_PASSWORD_OVERRIDE_TEST"
	t.Setenv(key, "shell-value")

	path := filepath.Join(t.TempDir(), ".env")
	if err := os.WriteFile(path, []byte(key+"=file-value\n"), 0o600); err != nil {
		t.Fatalf("write .env: %v", err)
	}

	if err := LoadDotEnv(path); err != nil {
		t.Fatalf("load .env: %v", err)
	}

	if got := os.Getenv(key); got != "shell-value" {
		t.Fatalf("expected shell value to win, got %q", got)
	}
}

func TestLoadDotEnvRejectsInvalidFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), ".env")
	if err := os.WriteFile(path, []byte("INVALID LINE\n"), 0o600); err != nil {
		t.Fatalf("write .env: %v", err)
	}

	err := LoadDotEnv(path)
	if err == nil {
		t.Fatal("expected invalid dotenv file to fail")
	}
	if !strings.Contains(err.Error(), "unexpected character") {
		t.Fatalf("expected parse error, got %v", err)
	}
}
