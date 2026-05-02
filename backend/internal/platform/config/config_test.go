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
		SessionCookieName:        "portaldots_session",
		SessionCookieSecure:      true,
		SessionTTL:               time.Hour,
		AppURL:                   "https://portal.example.com",
		RegistrationVerifyTTL:    time.Hour,
		PortalUnivemailLocalPart: "student_id",
		EmailProducerURL:         "https://email-producer.example.com",
		EmailProducerToken:       "super-secret-token",
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
		SessionCookieName:       "portaldots_session",
		SessionTTL:              time.Hour,
		AppURL:                  "https://portal.example.com",
		SessionCookieSecure:     true,
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
		SessionCookieName:       "portaldots_session",
		SessionTTL:              time.Hour,
		AppURL:                  "https://portal.example.com",
		SessionCookieSecure:     true,
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
		DatabaseURL:       "postgres://example",
		MigrationsDir:     "db/migrations",
		SessionCookieName: "portaldots_session",
		SessionTTL:        time.Hour,
		AppURL:            "http://127.0.0.1:8080",
		AllowDangerously:  true,
		StaffVerifyCode:   "123456",
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

func TestValidateForAPIRejectsInsecureAppURLAndCookieInSecureMode(t *testing.T) {
	t.Parallel()

	cfg := Config{
		DatabaseURL:              "postgres://example",
		MigrationsDir:            "db/migrations",
		SessionCookieName:        "portaldots_session",
		SessionTTL:               time.Hour,
		AppURL:                   "http://portal.example.com",
		RegistrationVerifyTTL:    time.Hour,
		PortalUnivemailLocalPart: "student_id",
		EmailProducerURL:         "https://email-producer.example.com",
		EmailProducerToken:       "super-secret-token",
		StaffVerifyCode:          "654321",
		staffVerifyCodeProvided:  true,
		AuthUser: AuthUser{
			Password: "strong-production-password",
		},
		authPasswordProvided: true,
	}

	err := cfg.ValidateForAPI()
	if err == nil {
		t.Fatal("expected insecure app url and cookie config to be rejected")
	}
	if !strings.Contains(err.Error(), "APP_URL must use https") {
		t.Fatalf("expected APP_URL error, got %v", err)
	}
	if !strings.Contains(err.Error(), "PORTALDOTS_SESSION_COOKIE_SECURE") {
		t.Fatalf("expected secure cookie error, got %v", err)
	}
}

func TestAppOriginNormalizesPath(t *testing.T) {
	t.Parallel()

	cfg := Config{AppURL: "https://portal.example.com/app/path?ignored=1"}

	origin, err := cfg.AppOrigin()
	if err != nil {
		t.Fatalf("expected app origin, got %v", err)
	}
	if origin != "https://portal.example.com" {
		t.Fatalf("expected normalized origin, got %q", origin)
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

	if len(users) != 5 {
		t.Fatalf("expected 5 demo users to match demo.portaldots.com, got %d", len(users))
	}

	var demoStaffRoles []string
	var demoStaffPermissions []string
	var demoStaffSubRoles []string
	var demoStaffSubPermissions []string
	for _, user := range users {
		switch {
		case slices.Contains(user.LoginIDs, "DEMO-STAFF"):
			demoStaffRoles = append([]string{}, user.Roles...)
			demoStaffPermissions = append([]string{}, user.Permissions...)
		case slices.Contains(user.LoginIDs, "DEMO-STAFF-SUB"):
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

func TestDefaultDemoUsersAlignCircleProfileWithDemo(t *testing.T) {
	t.Parallel()

	users := defaultDemoUsers()

	for _, user := range users {
		if !slices.Contains(user.LoginIDs, "DEMO-CIRCLE") {
			continue
		}

		if !slices.Equal(user.LoginIDs, []string{"DEMO-CIRCLE"}) {
			t.Fatalf("expected demo-circle login IDs to match demo, got %#v", user.LoginIDs)
		}
		if user.LastName != "デモ" || user.LastNameReading != "でも" {
			t.Fatalf("expected demo-circle last name to use generic demo profile, got %#v", user)
		}
		if user.FirstName != "企画者" || user.FirstNameReading != "きかくしゃ" {
			t.Fatalf("expected demo-circle first name to match demo, got %#v", user)
		}
		if user.ContactEmail != "demo-circle@portaldots.com" {
			t.Fatalf("expected demo-circle contact email to match demo, got %q", user.ContactEmail)
		}
		if user.PhoneNumber != "090-0000-0003" {
			t.Fatalf("expected demo-circle phone number to match demo, got %q", user.PhoneNumber)
		}
		return
	}

	t.Fatal("expected demo-circle user to exist")
}

func TestDefaultDemoUsersAlignStaffProfilesWithDemo(t *testing.T) {
	t.Parallel()

	users := defaultDemoUsers()

	expectations := map[string]User{
		"DEMO-ADMIN": {
			LastName:         "デモ",
			LastNameReading:  "でも",
			FirstName:        "管理者",
			FirstNameReading: "かんりしゃ",
			ContactEmail:     "demo-admin@portaldots.com",
		},
		"DEMO-STAFF": {
			LastName:         "デモ",
			LastNameReading:  "でも",
			FirstName:        "スタッフ",
			FirstNameReading: "すたっふ",
			ContactEmail:     "demo-staff@portaldots.com",
		},
		"DEMO-STAFF-SUB": {
			LastName:         "デモ",
			LastNameReading:  "でも",
			FirstName:        "副スタッフ",
			FirstNameReading: "ふくすたっふ",
			ContactEmail:     "demo-staff-sub@portaldots.com",
		},
		"DEMO-CIRCLE-SUB": {
			LastName:         "デモ",
			LastNameReading:  "でも",
			FirstName:        "副企画者",
			FirstNameReading: "ふくきかくしゃ",
			ContactEmail:     "demo-circle-sub@portaldots.com",
		},
	}

	for loginID, want := range expectations {
		found := false
		for _, user := range users {
			if !slices.Contains(user.LoginIDs, loginID) {
				continue
			}
			found = true
			if user.LastName != want.LastName || user.LastNameReading != want.LastNameReading {
				t.Fatalf("expected %s last name to match demo, got %#v", loginID, user)
			}
			if user.FirstName != want.FirstName || user.FirstNameReading != want.FirstNameReading {
				t.Fatalf("expected %s first name to match demo, got %#v", loginID, user)
			}
			if user.ContactEmail != want.ContactEmail {
				t.Fatalf("expected %s contact email to match demo, got %q", loginID, user.ContactEmail)
			}
			break
		}
		if !found {
			t.Fatalf("expected %s user to exist", loginID)
		}
	}
}
