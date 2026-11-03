package controllers

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

func TestStaffMasterUpdatesUnknownIDsReturnNotFound(t *testing.T) {
	for _, backend := range []struct {
		name      string
		newServer func(*testing.T, config.Config) *echo.Echo
	}{
		{"memory", func(_ *testing.T, cfg config.Config) *echo.Echo { return NewServer(cfg) }},
		{"postgres", newSQLCIntegrationServer},
	} {
		t.Run(backend.name, func(t *testing.T) {
			server := backend.newServer(t, testStaffConfig())
			cookies := map[string]*http.Cookie{}
			loginAsStaff(t, server, cookies)
			authorizeStaff(t, server, cookies)

			tests := []struct {
				name    string
				path    string
				message string
				payload any
			}{
				{
					name:    "tag",
					path:    "/v1/staff/tags/0195ec00-0bad-7000-8000-000000000001",
					message: "tag_not_found",
					payload: map[string]any{"name": "probe-tag"},
				},
				{
					name:    "place",
					path:    "/v1/staff/places/0195ec00-0bad-7000-8000-000000000001",
					message: "place_not_found",
					payload: map[string]any{"name": "probe-place", "type": 1, "notes": ""},
				},
			}
			for _, tt := range tests {
				t.Run(tt.name, func(t *testing.T) {
					recorder := doJSONRequest(t, server, cookies, http.MethodPut, tt.path, tt.payload)
					if recorder.Code != http.StatusNotFound || !strings.Contains(recorder.Body.String(), tt.message) {
						t.Fatalf("status=%d body=%s; want 404 containing %q", recorder.Code, recorder.Body.String(), tt.message)
					}
				})
			}
		})
	}
}

func TestStaffUserDuplicateContactEmailReturnsValidationError(t *testing.T) {
	for _, backend := range []struct {
		name      string
		newServer func(*testing.T, config.Config) *echo.Echo
	}{
		{"memory", func(_ *testing.T, cfg config.Config) *echo.Echo { return NewServer(cfg) }},
		{"postgres", newSQLCIntegrationServer},
	} {
		t.Run(backend.name, func(t *testing.T) {
			server := backend.newServer(t, duplicateContactEmailTestConfig())
			cookies := map[string]*http.Cookie{}
			loginAsStaff(t, server, cookies)
			authorizeStaff(t, server, cookies)

			recorder := doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/users/0195ec00-0bad-7000-8000-000000000002", map[string]any{
				"lastName":         "Probe",
				"lastNameReading":  "",
				"firstName":        "Target",
				"firstNameReading": "",
				"displayName":      "Probe Target",
				"loginIds":         []string{"probe-target"},
				"contactEmail":     "DUP@example.com",
				"phoneNumber":      "",
			})
			if recorder.Code != http.StatusUnprocessableEntity {
				t.Fatalf("status=%d body=%s; want 422", recorder.Code, recorder.Body.String())
			}

			var response struct {
				Errors map[string][]string `json:"errors"`
			}
			if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
				t.Fatalf("unmarshal validation response: %v", err)
			}
			if len(response.Errors["contactEmail"]) == 0 {
				t.Fatalf("expected contactEmail validation error, got %#v", response.Errors)
			}
		})
	}
}

func duplicateContactEmailTestConfig() config.Config {
	cfg := testStaffConfig()
	cfg.Users = append(cfg.Users,
		config.User{
			ID:           "0195ec00-0bad-7000-8000-000000000001",
			LoginIDs:     []string{"probe-source"},
			DisplayName:  "Probe Source",
			Password:     "password",
			Roles:        []string{"participant"},
			ContactEmail: "dup@example.com",
			IsVerified:   true,
		},
		config.User{
			ID:           "0195ec00-0bad-7000-8000-000000000002",
			LoginIDs:     []string{"probe-target"},
			DisplayName:  "Probe Target",
			Password:     "password",
			Roles:        []string{"participant"},
			ContactEmail: "target@example.com",
			IsVerified:   true,
		},
	)
	return cfg
}
