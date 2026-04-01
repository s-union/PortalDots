package controllers

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
)

func TestParseStaffUserFilters(t *testing.T) {
	t.Parallel()

	t.Run("parses filters and normalizes mode and values", func(t *testing.T) {
		t.Parallel()

		rawQueries := `[{"key_name":"lastName","operator":" like ","value":" Tanaka "},{"keyName":"isVerified","operator":"=","value":true}]`
		filters, mode, err := parseStaffUserFilters(rawQueries, " OR ")
		if err != nil {
			t.Fatalf("expected filters to parse, got %v", err)
		}
		want := []staffUserFilterQuery{
			{KeyName: "lastName", Operator: "like", Value: "Tanaka"},
			{KeyName: "isVerified", Operator: "=", Value: "true"},
		}
		if !reflect.DeepEqual(filters, want) {
			t.Fatalf("unexpected filters: %#v", filters)
		}
		if mode != staffUserFilterModeOr {
			t.Fatalf("expected OR mode, got %q", mode)
		}
	})

	t.Run("rejects invalid filter definitions", func(t *testing.T) {
		t.Parallel()

		tooMany := make([]map[string]any, 21)
		for i := range tooMany {
			tooMany[i] = map[string]any{
				"keyName":  "lastName",
				"operator": "=",
				"value":    "Tanaka",
			}
		}
		tooManyJSON, err := json.Marshal(tooMany)
		if err != nil {
			t.Fatalf("expected marshal to succeed, got %v", err)
		}

		testCases := []struct {
			name string
			raw  string
			mode string
		}{
			{
				name: "invalid mode",
				raw:  `[]`,
				mode: "xor",
			},
			{
				name: "unknown key",
				raw:  `[{"keyName":"unknown","operator":"=","value":"x"}]`,
				mode: "and",
			},
			{
				name: "empty string value",
				raw:  `[{"keyName":"lastName","operator":"=","value":" "}]`,
				mode: "and",
			},
			{
				name: "too many filters",
				raw:  string(tooManyJSON),
				mode: "and",
			},
		}

		for _, tc := range testCases {
			tc := tc
			t.Run(tc.name, func(t *testing.T) {
				t.Parallel()

				if _, _, err := parseStaffUserFilters(tc.raw, tc.mode); err == nil {
					t.Fatal("expected parse error")
				}
			})
		}
	})
}

func TestParseStaffUserSortDirection(t *testing.T) {
	t.Parallel()

	if direction, err := parseStaffUserSortDirection(""); err != nil || direction != "asc" {
		t.Fatalf("expected default asc, got %q %v", direction, err)
	}
	if _, err := parseStaffUserSortDirection("sideways"); err == nil {
		t.Fatal("expected invalid sort direction to fail")
	}
}

func TestFilterStaffUsers(t *testing.T) {
	t.Parallel()

	users := []useradmin.User{
		{
			ID:              "user-1",
			LastName:        "Tanaka",
			FirstName:       "Ichiro",
			LoginIDs:        []string{"alpha"},
			ContactEmail:    "alpha@example.com",
			PhoneNumber:     "090-1111-1111",
			Roles:           []string{"participant"},
			IsEmailVerified: false,
			IsVerified:      false,
		},
		{
			ID:              "user-2",
			LastName:        "Yamada",
			FirstName:       "Jiro",
			LoginIDs:        []string{"staff"},
			ContactEmail:    "staff@example.com",
			PhoneNumber:     "090-2222-2222",
			Roles:           []string{"staff"},
			IsEmailVerified: true,
			IsVerified:      true,
		},
		{
			ID:              "user-3",
			LastName:        "Suzuki",
			FirstName:       "Saburo",
			LoginIDs:        []string{"admin"},
			ContactEmail:    "admin@example.com",
			PhoneNumber:     "090-3333-3333",
			Roles:           []string{"admin"},
			IsEmailVerified: true,
			IsVerified:      true,
		},
	}

	andQueries := []staffUserFilterQuery{
		{KeyName: "lastName", Operator: "like", Value: "yama"},
		{KeyName: "isVerified", Operator: "=", Value: "true"},
	}
	filtered := filterStaffUsers(users, andQueries, staffUserFilterModeAnd)
	if len(filtered) != 1 || filtered[0].ID != "user-2" {
		t.Fatalf("expected AND filter to keep user-2, got %#v", filtered)
	}

	orQueries := []staffUserFilterQuery{
		{KeyName: "isAdmin", Operator: "=", Value: "true"},
		{KeyName: "contactEmail", Operator: "like", Value: "alpha"},
	}
	filtered = filterStaffUsers(users, orQueries, staffUserFilterModeOr)
	if len(filtered) != 2 || filtered[0].ID != "user-1" || filtered[1].ID != "user-3" {
		t.Fatalf("expected OR filter to keep user-1 and user-3, got %#v", filtered)
	}

	if !matchStaffUserStringFilter("Tanaka", "not like", "zzz") {
		t.Fatal("expected not like to succeed when substring is absent")
	}
	if value, ok := staffUserFilterBoolValue(users[2], "isAdmin"); !ok || !value {
		t.Fatalf("expected admin role to resolve as true, got %v %v", value, ok)
	}
	if value, ok := parseStaffUserFilterBool("yes"); !ok || !value {
		t.Fatalf("expected yes to parse as true, got %v %v", value, ok)
	}
	if staffUserHasStaffRole(users[0]) {
		t.Fatal("participant-only user should not be treated as staff")
	}
}

func TestSortStaffUsers(t *testing.T) {
	t.Parallel()

	users := []useradmin.User{
		{ID: "user-2", LastName: "Yamada", Roles: []string{"staff"}},
		{ID: "user-3", LastName: "Suzuki", Roles: []string{"admin"}},
		{ID: "user-1", LastName: "Tanaka", Roles: []string{"participant"}},
	}

	sortStaffUsers(users, "lastName", "asc")
	if users[0].ID != "user-3" || users[1].ID != "user-1" || users[2].ID != "user-2" {
		t.Fatalf("unexpected asc sort order: %#v", users)
	}

	sortStaffUsers(users, "isAdmin", "desc")
	if users[0].ID != "user-3" {
		t.Fatalf("expected admin user first in desc sort, got %#v", users)
	}
}
