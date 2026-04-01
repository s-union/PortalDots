//go:build ignore

package staffhttp

import (
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strconv"
	"strings"

	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
)

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
