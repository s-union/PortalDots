package controllers

import (
	"slices"
	"strings"
	"time"

	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
)

type staffUserFilterQuery = useradmin.FilterQuery

type staffUserFilterMode = useradmin.FilterMode

const (
	staffUserFilterModeAnd = useradmin.FilterModeAnd
	staffUserFilterModeOr  = useradmin.FilterModeOr
)

var staffUserSortableFields = useradmin.SortableFields

func parseStaffUserFilters(rawQueries string, rawMode string) ([]staffUserFilterQuery, staffUserFilterMode, error) {
	return useradmin.ParseFilters(rawQueries, rawMode)
}

func parseStaffUserSortDirection(raw string) (string, error) {
	return useradmin.ParseSortDirection(raw)
}

func filterStaffUsers(users []useradmin.User, queries []staffUserFilterQuery, mode staffUserFilterMode) []useradmin.User {
	return useradmin.FilterUsers(users, queries, mode)
}

func sortStaffUsers(users []useradmin.User, sortKey string, sortDirection string) {
	useradmin.SortUsers(users, sortKey, sortDirection)
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

func staffUserFilterBoolValue(userValue useradmin.User, keyName string) (bool, bool) {
	switch keyName {
	case "isStaff":
		return useradmin.HasStaffRole(userValue), true
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
	return useradmin.HasStaffRole(userValue)
}

func deriveStaffUserUnivemail(loginIDs []string, contactEmail string) string {
	return useradmin.DeriveUnivemail(loginIDs, contactEmail)
}

func formatStaffUserTimestamp(value time.Time) string {
	return useradmin.FormatTimestamp(value)
}

func readFirstString(values map[string]any, keys ...string) string {
	return useradmin.ReadFirstString(values, keys...)
}

func normalizeStaffUserFilterOperator(raw string) string {
	return useradmin.NormalizeFilterOperator(raw)
}

func stringifyStaffUserFilterValue(raw any) string {
	return useradmin.StringifyFilterValue(raw)
}
