package config

import (
	"os"
	"slices"
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
		DatabaseURL:              "postgres://example",
		MigrationsDir:            "db/migrations",
		SessionTTL:               time.Hour,
		RegistrationVerifyTTL:    time.Hour,
		PortalUnivemailLocalPart: "student_id",
		SMTPHost:                 "smtp.example.com",
		SMTPPort:                 587,
		SMTPUsername:             "mailer",
		SMTPPassword:             "super-secret-password",
		SMTPFrom:                 "noreply@example.com",
		StaffVerifyCode:          "654321",
		staffVerifyCodeProvided:  true,
		AuthUser: AuthUser{
			Password: "strong-production-password",
		},
		authPasswordProvided: true,
	}

	if err := cfg.ValidateForAPI(); err != nil {
		t.Fatalf("expected secure config to pass validation, got %v", err)
	}
}

func TestValidateForAPIRejectsDefaultAuthPassword(t *testing.T) {
	t.Parallel()

	cfg := Config{
		DatabaseURL:             "postgres://example",
		MigrationsDir:           "db/migrations",
		SessionTTL:              time.Hour,
		StaffVerifyCode:         "654321",
		staffVerifyCodeProvided: true,
		AuthUser: AuthUser{
			Password: defaultAuthPassword,
		},
		authPasswordProvided: true,
	}

	err := cfg.ValidateForAPI()
	if err == nil {
		t.Fatal("expected default auth password to be rejected")
	}
	if !strings.Contains(err.Error(), "PORTALDOTS_AUTH_PASSWORD") {
		t.Fatalf("expected auth password error, got %v", err)
	}
}

func TestValidateForAPIRejectsUnprovidedAuthPassword(t *testing.T) {
	t.Parallel()

	cfg := Config{
		DatabaseURL:             "postgres://example",
		MigrationsDir:           "db/migrations",
		SessionTTL:              time.Hour,
		StaffVerifyCode:         "654321",
		staffVerifyCodeProvided: true,
		// authPasswordProvided is false (default) → not explicitly set
	}

	err := cfg.ValidateForAPI()
	if err == nil {
		t.Fatal("expected unprovided auth password to be rejected")
	}
	if !strings.Contains(err.Error(), "PORTALDOTS_AUTH_PASSWORD") {
		t.Fatalf("expected auth password error, got %v", err)
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

func TestFromEnvUsesLegacyPrimaryColorFallback(t *testing.T) {
	t.Parallel()

	keys := []string{
		"PORTAL_PRIMARY_COLOR_H",
		"PORTAL_PRIMARY_COLOR_S",
		"PORTAL_PRIMARY_COLOR_L",
	}
	for _, key := range keys {
		if err := os.Unsetenv(key); err != nil {
			t.Fatalf("unset env %s: %v", key, err)
		}
	}

	cfg := FromEnv()
	if cfg.PortalPrimaryColorH != 214 || cfg.PortalPrimaryColorS != 91 || cfg.PortalPrimaryColorL != 53 {
		t.Fatalf(
			"expected legacy primary color fallback 214/91/53, got %d/%d/%d",
			cfg.PortalPrimaryColorH,
			cfg.PortalPrimaryColorS,
			cfg.PortalPrimaryColorL,
		)
	}
}

func TestDefaultDemoUsersKeepLegacyStaffRoles(t *testing.T) {
	t.Parallel()

	users := defaultDemoUsers()

	var demoStaffRoles []string
	var demoStaffPermissions []string
	var demoStaffSubRoles []string
	var demoStaffSubPermissions []string
	for _, user := range users {
		switch {
		case slices.Contains(user.LoginIDs, "demo-staff"):
			demoStaffRoles = append([]string{}, user.Roles...)
			demoStaffPermissions = append([]string{}, user.Permissions...)
		case slices.Contains(user.LoginIDs, "demo-staff-sub"):
			demoStaffSubRoles = append([]string{}, user.Roles...)
			demoStaffSubPermissions = append([]string{}, user.Permissions...)
		}
	}

	if len(demoStaffRoles) != 1 || demoStaffRoles[0] != "content_manager" {
		t.Fatalf("expected demo-staff role to be content_manager, got %#v", demoStaffRoles)
	}
	expectedDemoStaffPermissions := []string{
		"staff.users",
		"staff.circles",
		"staff.forms",
		"staff.permissions",
	}
	if !slices.Equal(demoStaffPermissions, expectedDemoStaffPermissions) {
		t.Fatalf(
			"expected demo-staff permissions to be %#v, got %#v",
			expectedDemoStaffPermissions,
			demoStaffPermissions,
		)
	}
	if len(demoStaffSubRoles) != 1 || demoStaffSubRoles[0] != "content_manager" {
		t.Fatalf("expected demo-staff-sub role to be content_manager, got %#v", demoStaffSubRoles)
	}
	if !slices.Equal(demoStaffSubPermissions, expectedDemoStaffPermissions) {
		t.Fatalf(
			"expected demo-staff-sub permissions to be %#v, got %#v",
			expectedDemoStaffPermissions,
			demoStaffSubPermissions,
		)
	}
}
