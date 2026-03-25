package controllers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strconv"
	"strings"

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

type staffUserFilterQuery struct {
	KeyName  string
	Operator string
	Value    string
}

type staffUserFilterMode string

const (
	staffUserFilterModeAnd staffUserFilterMode = "and"
	staffUserFilterModeOr  staffUserFilterMode = "or"
)

type staffUserFilterFieldType string

const (
	staffUserFilterFieldTypeString staffUserFilterFieldType = "string"
	staffUserFilterFieldTypeBool   staffUserFilterFieldType = "bool"
)

var staffUserFilterableFields = map[string]staffUserFilterFieldType{
	"id":              staffUserFilterFieldTypeString,
	"lastName":        staffUserFilterFieldTypeString,
	"firstName":       staffUserFilterFieldTypeString,
	"loginIds":        staffUserFilterFieldTypeString,
	"contactEmail":    staffUserFilterFieldTypeString,
	"phoneNumber":     staffUserFilterFieldTypeString,
	"isStaff":         staffUserFilterFieldTypeBool,
	"isAdmin":         staffUserFilterFieldTypeBool,
	"isEmailVerified": staffUserFilterFieldTypeBool,
	"isVerified":      staffUserFilterFieldTypeBool,
}

var staffUserSortableFields = map[string]struct{}{
	"id":              {},
	"lastName":        {},
	"firstName":       {},
	"loginIds":        {},
	"contactEmail":    {},
	"phoneNumber":     {},
	"isStaff":         {},
	"isAdmin":         {},
	"isEmailVerified": {},
	"isVerified":      {},
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

	updateStaffUserSession(sessionID, currentSession, updatedUser, h.sessions)
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

	updateStaffUserSession(sessionID, currentSession, updatedUser, h.sessions)
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

func parseStaffUserFilters(rawQueries string, rawMode string) ([]staffUserFilterQuery, staffUserFilterMode, error) {
	mode, err := parseStaffUserFilterMode(rawMode)
	if err != nil {
		return nil, "", err
	}

	if strings.TrimSpace(rawQueries) == "" {
		return []staffUserFilterQuery{}, mode, nil
	}

	var decoded []map[string]any
	if err := json.Unmarshal([]byte(rawQueries), &decoded); err != nil {
		return nil, "", err
	}

	if len(decoded) > 20 {
		return nil, "", errors.New("too many filters")
	}

	filters := make([]staffUserFilterQuery, 0, len(decoded))
	for _, item := range decoded {
		keyName := readFirstString(item, "key_name", "keyName")
		operator := normalizeStaffUserFilterOperator(readFirstString(item, "operator"))
		value := stringifyStaffUserFilterValue(item["value"])

		fieldType, exists := staffUserFilterableFields[keyName]
		if !exists {
			return nil, "", errors.New("unknown filter key")
		}
		if !isAllowedStaffUserFilterOperator(fieldType, operator) {
			return nil, "", errors.New("unknown filter operator")
		}
		if fieldType != staffUserFilterFieldTypeBool && value == "" {
			return nil, "", errors.New("empty filter value")
		}

		filters = append(filters, staffUserFilterQuery{
			KeyName:  keyName,
			Operator: operator,
			Value:    value,
		})
	}

	return filters, mode, nil
}

func parseStaffUserFilterMode(raw string) (staffUserFilterMode, error) {
	if strings.TrimSpace(raw) == "" {
		return staffUserFilterModeAnd, nil
	}

	normalized := strings.ToLower(strings.TrimSpace(raw))
	switch normalized {
	case string(staffUserFilterModeAnd):
		return staffUserFilterModeAnd, nil
	case string(staffUserFilterModeOr):
		return staffUserFilterModeOr, nil
	default:
		return "", errors.New("invalid filter mode")
	}
}

func parseStaffUserSortDirection(raw string) (string, error) {
	if strings.TrimSpace(raw) == "" {
		return "asc", nil
	}

	normalized := strings.ToLower(strings.TrimSpace(raw))
	switch normalized {
	case "asc", "desc":
		return normalized, nil
	default:
		return "", errors.New("invalid sort direction")
	}
}

func readFirstString(values map[string]any, keys ...string) string {
	for _, key := range keys {
		rawValue, exists := values[key]
		if !exists {
			continue
		}
		value, ok := rawValue.(string)
		if !ok {
			continue
		}
		return strings.TrimSpace(value)
	}
	return ""
}

func normalizeStaffUserFilterOperator(raw string) string {
	return strings.ToLower(strings.TrimSpace(strings.ReplaceAll(raw, "+", " ")))
}

func stringifyStaffUserFilterValue(raw any) string {
	switch value := raw.(type) {
	case nil:
		return ""
	case string:
		return strings.TrimSpace(value)
	case bool:
		if value {
			return "true"
		}
		return "false"
	case float64:
		return strconv.FormatFloat(value, 'f', -1, 64)
	default:
		return strings.TrimSpace(fmt.Sprintf("%v", value))
	}
}

func isAllowedStaffUserFilterOperator(fieldType staffUserFilterFieldType, operator string) bool {
	if operator == "" {
		return false
	}

	switch fieldType {
	case staffUserFilterFieldTypeString:
		return operator == "=" || operator == "!=" || operator == "like" || operator == "not like"
	case staffUserFilterFieldTypeBool:
		return operator == "=" || operator == "!="
	default:
		return false
	}
}

func filterStaffUsers(users []useradmin.User, queries []staffUserFilterQuery, mode staffUserFilterMode) []useradmin.User {
	if len(queries) == 0 {
		return users
	}

	filtered := make([]useradmin.User, 0, len(users))
	for _, userValue := range users {
		if matchesAll := matchesStaffUserFilters(userValue, queries, mode); matchesAll {
			filtered = append(filtered, userValue)
		}
	}

	return filtered
}

func matchesStaffUserFilters(userValue useradmin.User, queries []staffUserFilterQuery, mode staffUserFilterMode) bool {
	if mode == staffUserFilterModeOr {
		for _, query := range queries {
			if matchStaffUserFilter(userValue, query) {
				return true
			}
		}
		return false
	}

	for _, query := range queries {
		if !matchStaffUserFilter(userValue, query) {
			return false
		}
	}
	return true
}

func matchStaffUserFilter(userValue useradmin.User, query staffUserFilterQuery) bool {
	fieldType := staffUserFilterableFields[query.KeyName]
	switch fieldType {
	case staffUserFilterFieldTypeString:
		return matchStaffUserStringFilter(staffUserFilterStringValue(userValue, query.KeyName), query.Operator, query.Value)
	case staffUserFilterFieldTypeBool:
		fieldValue, ok := staffUserFilterBoolValue(userValue, query.KeyName)
		if !ok {
			return false
		}
		target, ok := parseStaffUserFilterBool(query.Value)
		if !ok {
			return false
		}
		switch query.Operator {
		case "=":
			return fieldValue == target
		case "!=":
			return fieldValue != target
		default:
			return false
		}
	default:
		return false
	}
}

func matchStaffUserStringFilter(fieldValue string, operator string, queryValue string) bool {
	left := strings.ToLower(fieldValue)
	right := strings.ToLower(queryValue)

	switch operator {
	case "=":
		return left == right
	case "!=":
		return left != right
	case "like":
		return strings.Contains(left, right)
	case "not like":
		return !strings.Contains(left, right)
	default:
		return false
	}
}

func staffUserFilterStringValue(userValue useradmin.User, keyName string) string {
	switch keyName {
	case "id":
		return userValue.ID
	case "lastName":
		return userValue.LastName
	case "firstName":
		return userValue.FirstName
	case "loginIds":
		return strings.Join(userValue.LoginIDs, " ")
	case "contactEmail":
		return userValue.ContactEmail
	case "phoneNumber":
		return userValue.PhoneNumber
	default:
		return ""
	}
}

func staffUserFilterBoolValue(userValue useradmin.User, keyName string) (bool, bool) {
	switch keyName {
	case "isStaff":
		return staffUserHasStaffRole(userValue), true
	case "isAdmin":
		return slices.Contains(userValue.Roles, "admin"), true
	case "isEmailVerified":
		return userValue.IsEmailVerified, true
	case "isVerified":
		return userValue.IsVerified, true
	default:
		return false, false
	}
}

func parseStaffUserFilterBool(raw string) (bool, bool) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "1", "true", "yes":
		return true, true
	case "0", "false", "no":
		return false, true
	default:
		return false, false
	}
}

func staffUserHasStaffRole(userValue useradmin.User) bool {
	for _, role := range userValue.Roles {
		if role != "participant" {
			return true
		}
	}
	return false
}

func sortStaffUsers(users []useradmin.User, sortKey string, sortDirection string) {
	direction := 1
	if sortDirection == "desc" {
		direction = -1
	}

	slices.SortStableFunc(users, func(left useradmin.User, right useradmin.User) int {
		leftValue := strings.ToLower(staffUserSortValue(left, sortKey))
		rightValue := strings.ToLower(staffUserSortValue(right, sortKey))

		if leftValue < rightValue {
			return -1 * direction
		}
		if leftValue > rightValue {
			return 1 * direction
		}
		return 0
	})
}

func staffUserSortValue(userValue useradmin.User, sortKey string) string {
	switch sortKey {
	case "id":
		return userValue.ID
	case "lastName":
		return userValue.LastName
	case "firstName":
		return userValue.FirstName
	case "loginIds":
		return strings.Join(userValue.LoginIDs, ",")
	case "contactEmail":
		return userValue.ContactEmail
	case "phoneNumber":
		return userValue.PhoneNumber
	case "isStaff":
		if staffUserHasStaffRole(userValue) {
			return "1"
		}
		return "0"
	case "isAdmin":
		if slices.Contains(userValue.Roles, "admin") {
			return "1"
		}
		return "0"
	case "isEmailVerified":
		if userValue.IsEmailVerified {
			return "1"
		}
		return "0"
	case "isVerified":
		if userValue.IsVerified {
			return "1"
		}
		return "0"
	default:
		return userValue.ID
	}
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
	})
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
		PhoneNumber:      userValue.PhoneNumber,
		Roles:            slices.Clone(userValue.Roles),
		IsVerified:       userValue.IsVerified,
		IsEmailVerified:  userValue.IsEmailVerified,
	}
}
