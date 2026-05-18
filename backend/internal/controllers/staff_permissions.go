package controllers

import (
	"encoding/json"
	"errors"
	"net/http"
	"slices"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/domain/staffpermission"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
)

type staffPermissionDefinitionResponse struct {
	Name        string `json:"name"`
	Group       string `json:"group"`
	DisplayName string `json:"displayName"`
	ShortName   string `json:"shortName"`
	Description string `json:"description"`
}

type staffPermissionUserSummaryResponse struct {
	ID          string                              `json:"id"`
	DisplayName string                              `json:"displayName"`
	LoginIDs    []string                            `json:"loginIds"`
	Roles       []string                            `json:"roles"`
	Permissions []staffPermissionDefinitionResponse `json:"permissions"`
	IsEditable  bool                                `json:"isEditable"`
}

type staffPermissionDetailResponse struct {
	User                    staffPermissionUserSummaryResponse  `json:"user"`
	DefinedPermissions      []staffPermissionDefinitionResponse `json:"definedPermissions"`
	AssignedPermissionNames []string                            `json:"assignedPermissionNames"`
}

type updateStaffPermissionsRequest struct {
	Permissions []string `json:"permissions"`
}

func (h *staffPermissionHandlers) listStaffPermissions(c echo.Context) error {
	_, currentSession, status, ok := h.requirePermissionsRead(c)
	if !ok {
		return statusError(c, status)
	}

	users, err := h.users.List()
	if err != nil {
		return internalError(c)
	}

	items := make([]staffPermissionUserSummaryResponse, 0, len(users))
	for _, currentUser := range users {
		if !isPermissionManagementTarget(currentUser) {
			continue
		}
		item := mapStaffPermissionUserSummary(currentSession, currentUser)
		if !matchesStaffPermissionSearch(item, c.QueryParam("query")) {
			continue
		}
		items = append(items, item)
	}

	return c.JSON(http.StatusOK, paginateItems(items, readPagination(c)))
}

func matchesStaffPermissionSearch(item staffPermissionUserSummaryResponse, query string) bool {
	values := []string{item.ID, item.DisplayName, strings.Join(item.LoginIDs, " "), strings.Join(item.Roles, " ")}
	for _, permission := range item.Permissions {
		values = append(values, permission.Name, permission.DisplayName, permission.ShortName)
	}
	return matchesStaffListSearch(values, query)
}

func (h *staffPermissionHandlers) getStaffPermission(c echo.Context) error {
	_, currentSession, status, ok := h.requirePermissionsRead(c)
	if !ok {
		return statusError(c, status)
	}

	userValue, err := h.users.Find(c.Param("userID"))
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "user_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	return c.JSON(http.StatusOK, staffPermissionDetailResponse{
		User:                    mapStaffPermissionUserSummary(currentSession, userValue),
		DefinedPermissions:      mapDefinedPermissions(staffpermission.Defined()),
		AssignedPermissionNames: slices.Clone(userValue.Permissions),
	})
}

func (h *staffPermissionHandlers) updateStaffPermissions(c echo.Context) error {
	sessionID, currentSession, status, ok := h.requirePermissionsEdit(c)
	if !ok {
		return statusError(c, status)
	}

	userValue, err := h.users.Find(c.Param("userID"))
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "user_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	var request updateStaffPermissionsRequest
	if err := json.NewDecoder(c.Request().Body).Decode(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	permissions, validationErrors := normalizeRequestedPermissions(request.Permissions)
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	if currentSession.User != nil && currentSession.User.ID == userValue.ID {
		return validationError(c, map[string][]string{
			"permissions": {"自分自身の権限設定は変更できません"},
		})
	}
	if slices.Contains(userValue.Roles, "admin") {
		return validationError(c, map[string][]string{
			"permissions": {"管理者に対して権限を設定することはできません"},
		})
	}

	updatedUser, err := h.users.UpdatePermissions(userValue.ID, permissions)
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "user_not_found")
	}
	if err != nil {
		return internalError(c)
	}
	updateOrInvalidateStaffUserSession(c.Request().Context(), sessionID, currentSession, updatedUser, h.sessions)

	actorUserID := ""
	if currentSession.User != nil {
		actorUserID = currentSession.User.ID
	}
	recordActivity(
		c.Request().Context(),
		h.activities,
		actorUserID,
		"staff.permission.updated",
		"user",
		updatedUser.ID,
		"",
		buildActivitySummary("staff がスタッフ権限を更新しました", updatedUser.DisplayName),
	)

	return c.JSON(http.StatusOK, staffPermissionDetailResponse{
		User:                    mapStaffPermissionUserSummary(currentSession, updatedUser),
		DefinedPermissions:      mapDefinedPermissions(staffpermission.Defined()),
		AssignedPermissionNames: slices.Clone(updatedUser.Permissions),
	})
}

func (h *staffPermissionHandlers) requirePermissionsRead(c echo.Context) (string, session.Session, int, bool) {
	sessionID, currentSession, status, ok := h.requireStaffMode(c)
	if !ok {
		return "", session.Session{}, status, false
	}
	if currentSession.User == nil {
		return "", session.Session{}, http.StatusForbidden, false
	}
	if !canReadPermissions(currentSession.User) {
		return "", session.Session{}, http.StatusForbidden, false
	}
	return sessionID, currentSession, http.StatusOK, true
}

func (h *staffPermissionHandlers) requirePermissionsEdit(c echo.Context) (string, session.Session, int, bool) {
	sessionID, currentSession, status, ok := h.requireStaffMode(c)
	if !ok {
		return "", session.Session{}, status, false
	}
	if currentSession.User == nil {
		return "", session.Session{}, http.StatusForbidden, false
	}
	if !canEditPermissions(currentSession.User) {
		return "", session.Session{}, http.StatusForbidden, false
	}
	return sessionID, currentSession, http.StatusOK, true
}

func isPermissionManagementTarget(userValue useradmin.User) bool {
	return hasStaffAccess(userValue.Roles, userValue.Permissions) || len(userValue.Permissions) > 0
}

func normalizeRequestedPermissions(input []string) ([]string, map[string][]string) {
	normalized := make([]string, 0, len(input))
	seen := map[string]struct{}{}
	errors := map[string][]string{}

	for _, permission := range input {
		trimmed := strings.TrimSpace(permission)
		if trimmed == "" {
			continue
		}
		if !staffpermission.IsDefined(trimmed) {
			errors["permissions"] = []string{"利用できない権限が選択されました"}
			return nil, errors
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		normalized = append(normalized, trimmed)
	}

	slices.Sort(normalized)
	return normalized, errors
}

func mapDefinedPermissions(items []staffpermission.Definition) []staffPermissionDefinitionResponse {
	response := make([]staffPermissionDefinitionResponse, 0, len(items))
	for _, item := range items {
		response = append(response, mapPermissionDefinition(item))
	}
	return response
}

func mapStaffPermissionUserSummary(currentSession session.Session, userValue useradmin.User) staffPermissionUserSummaryResponse {
	permissions := make([]staffPermissionDefinitionResponse, 0, len(userValue.Permissions))
	for _, name := range userValue.Permissions {
		if definition, ok := staffpermission.Find(name); ok {
			permissions = append(permissions, mapPermissionDefinition(definition))
			continue
		}
		permissions = append(permissions, staffPermissionDefinitionResponse{
			Name:        name,
			Group:       "不明な権限",
			DisplayName: name,
			ShortName:   "（不明）",
			Description: "現在の定義には含まれていない権限です。",
		})
	}

	return staffPermissionUserSummaryResponse{
		ID:          userValue.ID,
		DisplayName: userValue.DisplayName,
		LoginIDs:    slices.Clone(userValue.LoginIDs),
		Roles:       slices.Clone(userValue.Roles),
		Permissions: permissions,
		IsEditable:  currentSession.User == nil || (currentSession.User.ID != userValue.ID && !slices.Contains(userValue.Roles, "admin")),
	}
}

func mapPermissionDefinition(item staffpermission.Definition) staffPermissionDefinitionResponse {
	return staffPermissionDefinitionResponse{
		Name:        item.Name,
		Group:       item.Group,
		DisplayName: item.DisplayName,
		ShortName:   item.ShortName,
		Description: item.Description,
	}
}
