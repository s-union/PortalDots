package controllers

import (
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
)

type staffUserSummaryResponse struct {
	ID               string   `json:"id"`
	LastName         string   `json:"lastName"`
	LastNameReading  string   `json:"lastNameReading"`
	FirstName        string   `json:"firstName"`
	FirstNameReading string   `json:"firstNameReading"`
	DisplayName      string   `json:"displayName"`
	LoginIDs         []string `json:"loginIds"`
	ContactEmail     string   `json:"contactEmail"`
	PhoneNumber      string   `json:"phoneNumber"`
	Roles            []string `json:"roles"`
	IsVerified       bool     `json:"isVerified"`
	IsEmailVerified  bool     `json:"isEmailVerified"`
}

type updateStaffUserRequest struct {
	LastName         string   `json:"lastName"`
	LastNameReading  string   `json:"lastNameReading"`
	FirstName        string   `json:"firstName"`
	FirstNameReading string   `json:"firstNameReading"`
	DisplayName      string   `json:"displayName"`
	LoginIDs         []string `json:"loginIds"`
	ContactEmail     string   `json:"contactEmail"`
	PhoneNumber      string   `json:"phoneNumber"`
}

type updateStaffUserRolesRequest struct {
	Roles []string `json:"roles"`
}

func (h *staffUserHandlers) listStaffUsers(c echo.Context) error {
	_, _, status, ok := h.requireUserRead(c)
	if !ok {
		return statusError(c, status)
	}

	query := c.QueryParam("query")
	users, err := h.users.ListByQuery(query)
	if err != nil {
		return internalError(c)
	}

	filterQueries, filterMode, err := parseStaffUserFilters(c.QueryParam("queries"), c.QueryParam("mode"))
	if err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}
	if len(filterQueries) > 0 {
		users = filterStaffUsers(users, filterQueries, filterMode)
	}

	sortDirection, err := parseStaffUserSortDirection(c.QueryParam("sortDirection"))
	if err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}
	sortKey := strings.TrimSpace(c.QueryParam("sortKey"))
	if sortKey != "" {
		if _, exists := staffUserSortableFields[sortKey]; !exists {
			return errorJSON(c, http.StatusBadRequest, "invalid_request")
		}
		sortStaffUsers(users, sortKey, sortDirection)
	}

	pagination := readPagination(c)
	response := make([]staffUserSummaryResponse, 0, len(users))
	for _, currentUser := range users {
		response = append(response, mapStaffUser(currentUser))
	}

	return c.JSON(http.StatusOK, paginateItems(response, pagination))
}

func (h *staffUserHandlers) getStaffUser(c echo.Context) error {
	_, _, status, ok := h.requireUserRead(c)
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

	return c.JSON(http.StatusOK, mapStaffUser(userValue))
}

func (h *staffUserHandlers) updateStaffUser(c echo.Context) error {
	sessionID, currentSession, status, ok := h.requireUserEdit(c)
	if !ok {
		return statusError(c, status)
	}

	request, validationErrors, valid := bindAndValidateStaffUser(c)
	if !valid {
		return validationError(c, validationErrors)
	}

	updatedUser, err := h.users.Update(c.Param("userID"), request.DisplayName, request.LoginIDs)
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "user_not_found")
	}
	if errors.Is(err, useradmin.ErrConflict) {
		return validationError(c, map[string][]string{
			"loginIds": {"入力されたログイン ID はすでに登録されています"},
		})
	}
	if err != nil {
		return internalError(c)
	}

	updatedUser, err = h.users.UpdateProfile(
		c.Param("userID"),
		request.LastName,
		request.LastNameReading,
		request.FirstName,
		request.FirstNameReading,
		request.ContactEmail,
		request.PhoneNumber,
	)
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "user_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	updateOrInvalidateStaffUserSession(sessionID, currentSession, updatedUser, h.sessions)
	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.user.updated",
		"user",
		updatedUser.ID,
		"",
		buildActivitySummary("staff がユーザー情報を更新しました", updatedUser.DisplayName),
	)

	return c.JSON(http.StatusOK, mapStaffUser(updatedUser))
}

func (h *staffUserHandlers) updateStaffUserRoles(c echo.Context) error {
	sessionID, currentSession, status, ok := h.requireUserEdit(c)
	if !ok {
		return statusError(c, status)
	}

	var request updateStaffUserRolesRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	roles, validationErrors := normalizeRequestedRoles(request.Roles)
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	if currentSession.User != nil && currentSession.User.ID == c.Param("userID") && !rolesGrantUserManagement(roles) {
		return validationError(c, map[string][]string{
			"roles": {"自分自身からユーザー管理権限を外すことはできません"},
		})
	}

	targetUser, err := h.users.Find(c.Param("userID"))
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "user_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	if !slices.Contains(currentSession.User.Roles, "admin") {
		targetHasAdmin := slices.Contains(targetUser.Roles, "admin")
		requestedHasAdmin := slices.Contains(roles, "admin")
		if !targetHasAdmin && requestedHasAdmin {
			return validationError(c, map[string][]string{
				"roles": {"admin ロールを付与する権限がありません"},
			})
		}
		if targetHasAdmin && !requestedHasAdmin {
			return validationError(c, map[string][]string{
				"roles": {"admin ロールを削除する権限がありません"},
			})
		}
	}

	updatedUser, err := h.users.UpdateRoles(c.Param("userID"), roles)
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "user_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	updateOrInvalidateStaffUserSession(sessionID, currentSession, updatedUser, h.sessions)
	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.user.roles_updated",
		"user",
		updatedUser.ID,
		"",
		buildActivitySummary("staff がユーザーロールを更新しました", updatedUser.DisplayName),
	)

	return c.JSON(http.StatusOK, mapStaffUser(updatedUser))
}

func (h *staffUserHandlers) verifyStaffUser(c echo.Context) error {
	_, currentSession, status, ok := h.requireUserEdit(c)
	if !ok {
		return statusError(c, status)
	}

	currentUser, err := h.users.Find(c.Param("userID"))
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "user_not_found")
	}
	if err != nil {
		return internalError(c)
	}
	if currentUser.IsVerified {
		return validationError(c, map[string][]string{
			"user": {"すでに認証済みのユーザーです"},
		})
	}

	updatedUser, err := h.users.UpdateVerified(c.Param("userID"), true)
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "user_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.user.verified",
		"user",
		updatedUser.ID,
		"",
		buildActivitySummary("staff が本人確認を完了しました", updatedUser.DisplayName),
	)

	return c.JSON(http.StatusOK, mapStaffUser(updatedUser))
}

func (h *staffUserHandlers) deleteStaffUser(c echo.Context) error {
	_, currentSession, status, ok := h.requireUserEdit(c)
	if !ok {
		return statusError(c, status)
	}

	userID := c.Param("userID")
	if currentSession.User != nil && currentSession.User.ID == userID {
		return validationError(c, map[string][]string{
			"user": {"自分自身を削除することはできません"},
		})
	}

	currentUser, err := h.users.Find(userID)
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "user_not_found")
	}
	if err != nil {
		return internalError(c)
	}
	if currentSession.User != nil &&
		!slices.Contains(currentSession.User.Roles, "admin") &&
		slices.Contains(currentUser.Roles, "admin") {
		return validationError(c, map[string][]string{
			"user": {"admin ロールを持つユーザーを削除する権限がありません"},
		})
	}

	if err := h.users.Delete(userID); errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "user_not_found")
	} else if err != nil {
		return internalError(c)
	}

	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.user.deleted",
		"user",
		userID,
		"",
		buildActivitySummary("staff がユーザーを削除しました", currentUser.DisplayName),
	)

	return c.NoContent(http.StatusNoContent)
}

func (h *staffUserHandlers) downloadStaffUsersCSV(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canExportUsers)
	if !ok {
		return statusError(c, status)
	}

	users, err := h.users.List()
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	rows := [][]string{{"id", "last_name", "last_name_reading", "first_name", "first_name_reading", "display_name", "login_ids", "contact_email", "phone_number", "roles", "is_verified", "is_email_verified"}}
	for _, userValue := range users {
		rows = append(rows, []string{
			userValue.ID,
			userValue.LastName,
			userValue.LastNameReading,
			userValue.FirstName,
			userValue.FirstNameReading,
			userValue.DisplayName,
			strings.Join(userValue.LoginIDs, ","),
			userValue.ContactEmail,
			userValue.PhoneNumber,
			strings.Join(userValue.Roles, ","),
			boolString(userValue.IsVerified),
			boolString(userValue.IsEmailVerified),
		})
	}

	csvBytes, err := writeCSV(rows)
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	filename := "staff-users.csv"
	c.Response().Header().Set(echo.HeaderContentType, "text/csv; charset=utf-8")
	c.Response().Header().Set(echo.HeaderContentDisposition, fmt.Sprintf("attachment; filename=%q", filename))
	return c.Blob(http.StatusOK, "text/csv; charset=utf-8", csvBytes)
}
