package controllers

import (
	"slices"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
)

var manageableRoles = []string{
	"participant",
	"content_manager",
	"forms_manager",
	"circle_manager",
	"user_manager",
	"admin",
}

func (h *staffUserHandlers) requireUserRead(c echo.Context) (string, session.Session, int, bool) {
	return h.requireStaffCapability(c, canReadUsers)
}

func (h *staffUserHandlers) requireUserEdit(c echo.Context) (string, session.Session, int, bool) {
	return h.requireStaffCapability(c, canEditUsers)
}

func rolesGrantUserManagement(roles []string) bool {
	for _, role := range roles {
		if role == "admin" || role == "user_manager" {
			return true
		}
	}
	return false
}

func bindAndValidateStaffUser(c echo.Context) (updateStaffUserRequest, map[string][]string, bool) {
	var request updateStaffUserRequest
	if err := c.Bind(&request); err != nil {
		return updateStaffUserRequest{}, map[string][]string{
			"request": {"invalid_request"},
		}, false
	}

	request.DisplayName = strings.TrimSpace(request.DisplayName)
	loginIDs := normalizeRequestedLoginIDs(request.LoginIDs)
	request.LoginIDs = loginIDs

	errors := map[string][]string{}
	if request.DisplayName == "" {
		errors["displayName"] = []string{"表示名を入力してください"}
	}
	if len(loginIDs) == 0 {
		errors["loginIds"] = []string{"ログイン ID を 1 つ以上入力してください"}
	}

	return request, errors, len(errors) == 0
}

func normalizeRequestedRoles(input []string) ([]string, map[string][]string) {
	normalized := make([]string, 0, len(input))
	seen := map[string]struct{}{}
	errors := map[string][]string{}

	for _, role := range input {
		trimmed := strings.TrimSpace(role)
		if trimmed == "" {
			continue
		}
		if !slices.Contains(manageableRoles, trimmed) {
			errors["roles"] = []string{"許可されていないロールが含まれています"}
			return nil, errors
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		normalized = append(normalized, trimmed)
	}

	if len(normalized) == 0 {
		errors["roles"] = []string{"ロールを 1 つ以上選択してください"}
	}

	return normalized, errors
}

func normalizeRequestedLoginIDs(input []string) []string {
	normalized := make([]string, 0, len(input))
	seen := map[string]struct{}{}
	for _, loginID := range input {
		trimmed := strings.TrimSpace(loginID)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		normalized = append(normalized, trimmed)
	}

	return normalized
}

func updateStaffUserSession(sessionID string, currentSession session.Session, updatedUser useradmin.User, store session.Store) {
	if currentSession.User == nil || currentSession.User.ID != updatedUser.ID {
		return
	}

	store.Update(sessionID, func(next *session.Session) {
		if next.User == nil {
			return
		}
		next.User.DisplayName = updatedUser.DisplayName
		next.User.Roles = slices.Clone(updatedUser.Roles)
		next.User.Permissions = slices.Clone(updatedUser.Permissions)
	})
}

func updateOrInvalidateStaffUserSession(sessionID string, currentSession session.Session, updatedUser useradmin.User, store session.Store) {
	if currentSession.User != nil && currentSession.User.ID == updatedUser.ID {
		updateStaffUserSession(sessionID, currentSession, updatedUser, store)
		return
	}

	store.DeleteByUserID(updatedUser.ID)
}

func mapStaffUser(userValue useradmin.User) staffUserSummaryResponse {
	return staffUserSummaryResponse{
		ID:               userValue.ID,
		LastName:         userValue.LastName,
		LastNameReading:  userValue.LastNameReading,
		FirstName:        userValue.FirstName,
		FirstNameReading: userValue.FirstNameReading,
		DisplayName:      userValue.DisplayName,
		LoginIDs:         slices.Clone(userValue.LoginIDs),
		ContactEmail:     userValue.ContactEmail,
		Univemail:        deriveStaffUserUnivemail(userValue.LoginIDs, userValue.ContactEmail),
		PhoneNumber:      userValue.PhoneNumber,
		Roles:            slices.Clone(userValue.Roles),
		IsVerified:       userValue.IsVerified,
		IsEmailVerified:  userValue.IsEmailVerified,
		CreatedAt:        formatStaffUserTimestamp(userValue.CreatedAt),
		UpdatedAt:        formatStaffUserTimestamp(userValue.UpdatedAt),
	}
}

func deriveStaffUserUnivemail(loginIDs []string, contactEmail string) string {
	for _, loginID := range loginIDs {
		trimmed := strings.TrimSpace(loginID)
		if strings.Contains(trimmed, "@") {
			return trimmed
		}
	}
	return strings.TrimSpace(contactEmail)
}

func formatStaffUserTimestamp(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}
