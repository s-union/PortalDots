package controllers

import (
	"bytes"
	"encoding/csv"
	"net/http"
	"slices"
	"strings"
	"testing"

	"github.com/s-union/PortalDots/backend/internal/domain/auth"
)

func TestCanUseStaffExportsRequiresEveryRepresentedExportCapability(t *testing.T) {
	t.Parallel()

	allPermissions := []string{
		"staff.pages.read,export",
		"staff.documents.read,export",
		"staff.forms.read,export",
		"staff.forms.answers.read,export",
	}
	tests := []struct {
		name string
		user *auth.User
		want bool
	}{
		{
			name: "all explicit exports",
			user: &auth.User{Permissions: allPermissions},
			want: true,
		},
		{
			name: "page export only",
			user: &auth.User{Permissions: allPermissions[:1]},
			want: false,
		},
		{
			name: "content manager only",
			user: &auth.User{Roles: []string{"content_manager"}},
			want: false,
		},
		{
			name: "forms manager only",
			user: &auth.User{Roles: []string{"forms_manager"}},
			want: false,
		},
		{
			name: "admin",
			user: &auth.User{Roles: []string{"admin"}},
			want: true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			if got := canUseStaffExports(test.user); got != test.want {
				t.Fatalf("canUseStaffExports(%#v) = %v, want %v", test.user, got, test.want)
			}
		})
	}
}

func TestStaffTagAndPlaceExportsRequireExportCapability(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		permissions []string
		wantStatus  int
	}{
		{
			name:        "read only",
			permissions: []string{"staff.tags.read", "staff.places.read"},
			wantStatus:  http.StatusForbidden,
		},
		{
			name:        "explicit export",
			permissions: []string{"staff.tags.read,export", "staff.places.read,export"},
			wantStatus:  http.StatusOK,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			cfg := testStaffConfig()
			cfg.AuthUser.Roles = nil
			cfg.AuthUser.Permissions = test.permissions
			server := NewServer(cfg)
			cookies := map[string]*http.Cookie{}

			loginAsStaff(t, server, cookies)
			authorizeStaff(t, server, cookies)

			for _, path := range []string{"/v1/staff/tags/export", "/v1/staff/places/export"} {
				recorder := doJSONRequest(t, server, cookies, http.MethodGet, path, nil)
				if recorder.Code != test.wantStatus {
					t.Fatalf("GET %s status = %d, want %d; body=%s", path, recorder.Code, test.wantStatus, recorder.Body.String())
				}
			}
		})
	}
}

func TestStaffUsersAllowSelfManagerRoleRemoval(t *testing.T) {
	t.Parallel()

	cfg := testStaffConfig()
	cfg.AuthUser.Roles = []string{"admin", "forms_manager"}
	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(
		t,
		server,
		cookies,
		http.MethodPut,
		"/v1/staff/users/0195ec00-0098-7000-8000-000000000001/roles",
		map[string]any{"roles": []string{"admin"}},
	)
	if recorder.Code != http.StatusOK {
		t.Fatalf("self manager role removal status = %d, want %d; body=%s", recorder.Code, http.StatusOK, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/session/bootstrap", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("bootstrap status = %d, want %d; body=%s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	if strings.Contains(recorder.Body.String(), "forms_manager") {
		t.Fatalf("removed self manager role remained in the session: %s", recorder.Body.String())
	}
}

func TestStaffUsersRejectSelfManagerRoleAddition(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(
		t,
		server,
		cookies,
		http.MethodPut,
		"/v1/staff/users/0195ec00-0098-7000-8000-000000000001/roles",
		map[string]any{"roles": []string{"admin", "forms_manager"}},
	)
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("self role addition status = %d, want %d; body=%s", recorder.Code, http.StatusUnprocessableEntity, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/session/bootstrap", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("bootstrap status = %d, want %d; body=%s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	if strings.Contains(recorder.Body.String(), "forms_manager") {
		t.Fatalf("rejected self-added manager role reached the session: %s", recorder.Body.String())
	}
}

func TestWriteCSVNeutralizesFormulaCells(t *testing.T) {
	t.Parallel()

	data, err := writeCSV([][]string{
		{"header"},
		{"=formula", "+formula", "-formula", "@formula", "\tformula", "\rformula", "safe", ""},
	})
	if err != nil {
		t.Fatalf("writeCSV() error = %v", err)
	}

	reader := csv.NewReader(bytes.NewReader(data))
	reader.FieldsPerRecord = -1
	rows, err := reader.ReadAll()
	if err != nil {
		t.Fatalf("read generated CSV: %v", err)
	}
	want := []string{"'=formula", "'+formula", "'-formula", "'@formula", "'\tformula", "'\rformula", "safe", ""}
	if len(rows) != 2 || !slices.Equal(rows[1], want) {
		t.Fatalf("formula-neutralized row = %#v, want %#v", rows, want)
	}
}
