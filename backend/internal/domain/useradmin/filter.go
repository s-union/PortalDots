package useradmin

import (
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strconv"
	"strings"
	"time"
)

type FilterQuery struct {
	KeyName  string
	Operator string
	Value    string
}

type FilterMode string

const (
	FilterModeAnd FilterMode = "and"
	FilterModeOr  FilterMode = "or"
)

type FilterFieldType string

const (
	FilterFieldTypeString FilterFieldType = "string"
	FilterFieldTypeBool   FilterFieldType = "bool"
)

var FilterableFields = map[string]FilterFieldType{
	"id":              FilterFieldTypeString,
	"lastName":        FilterFieldTypeString,
	"firstName":       FilterFieldTypeString,
	"loginIds":        FilterFieldTypeString,
	"contactEmail":    FilterFieldTypeString,
	"univemail":       FilterFieldTypeString,
	"phoneNumber":     FilterFieldTypeString,
	"createdAt":       FilterFieldTypeString,
	"updatedAt":       FilterFieldTypeString,
	"isStaff":         FilterFieldTypeBool,
	"isAdmin":         FilterFieldTypeBool,
	"isEmailVerified": FilterFieldTypeBool,
	"isVerified":      FilterFieldTypeBool,
}

var SortableFields = map[string]struct{}{
	"id":              {},
	"lastName":        {},
	"firstName":       {},
	"loginIds":        {},
	"contactEmail":    {},
	"univemail":       {},
	"phoneNumber":     {},
	"createdAt":       {},
	"updatedAt":       {},
	"isStaff":         {},
	"isAdmin":         {},
	"isEmailVerified": {},
	"isVerified":      {},
}

func ParseFilters(rawQueries string, rawMode string) ([]FilterQuery, FilterMode, error) {
	mode, err := parseFilterMode(rawMode)
	if err != nil {
		return nil, "", err
	}

	if strings.TrimSpace(rawQueries) == "" {
		return []FilterQuery{}, mode, nil
	}

	var decoded []map[string]any
	if err := json.Unmarshal([]byte(rawQueries), &decoded); err != nil {
		return nil, "", err
	}

	if len(decoded) > 20 {
		return nil, "", errors.New("too many filters")
	}

	filters := make([]FilterQuery, 0, len(decoded))
	for _, item := range decoded {
		keyName := ReadFirstString(item, "key_name", "keyName")
		operator := NormalizeFilterOperator(ReadFirstString(item, "operator"))
		value := StringifyFilterValue(item["value"])

		fieldType, exists := FilterableFields[keyName]
		if !exists {
			return nil, "", errors.New("unknown filter key")
		}
		if !isAllowedFilterOperator(fieldType, operator) {
			return nil, "", errors.New("unknown filter operator")
		}
		if fieldType != FilterFieldTypeBool && value == "" {
			return nil, "", errors.New("empty filter value")
		}

		filters = append(filters, FilterQuery{
			KeyName:  keyName,
			Operator: operator,
			Value:    value,
		})
	}

	return filters, mode, nil
}

func parseFilterMode(raw string) (FilterMode, error) {
	if strings.TrimSpace(raw) == "" {
		return FilterModeAnd, nil
	}

	normalized := strings.ToLower(strings.TrimSpace(raw))
	switch normalized {
	case string(FilterModeAnd):
		return FilterModeAnd, nil
	case string(FilterModeOr):
		return FilterModeOr, nil
	default:
		return "", errors.New("invalid filter mode")
	}
}

func ParseSortDirection(raw string) (string, error) {
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

func ReadFirstString(values map[string]any, keys ...string) string {
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

func NormalizeFilterOperator(raw string) string {
	return strings.ToLower(strings.TrimSpace(strings.ReplaceAll(raw, "+", " ")))
}

func StringifyFilterValue(raw any) string {
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

func isAllowedFilterOperator(fieldType FilterFieldType, operator string) bool {
	if operator == "" {
		return false
	}

	switch fieldType {
	case FilterFieldTypeString:
		return operator == "=" || operator == "!=" || operator == "like" || operator == "not like"
	case FilterFieldTypeBool:
		return operator == "=" || operator == "!="
	default:
		return false
	}
}

func FilterUsers(users []User, queries []FilterQuery, mode FilterMode) []User {
	if len(queries) == 0 {
		return users
	}

	filtered := make([]User, 0, len(users))
	for _, userValue := range users {
		if matchesAll := matchesFilters(userValue, queries, mode); matchesAll {
			filtered = append(filtered, userValue)
		}
	}

	return filtered
}

func matchesFilters(userValue User, queries []FilterQuery, mode FilterMode) bool {
	if mode == FilterModeOr {
		for _, query := range queries {
			if matchFilter(userValue, query) {
				return true
			}
		}
		return false
	}

	for _, query := range queries {
		if !matchFilter(userValue, query) {
			return false
		}
	}
	return true
}

func matchFilter(userValue User, query FilterQuery) bool {
	fieldType := FilterableFields[query.KeyName]
	switch fieldType {
	case FilterFieldTypeString:
		return matchStringFilter(filterStringValue(userValue, query.KeyName), query.Operator, query.Value)
	case FilterFieldTypeBool:
		fieldValue, ok := filterBoolValue(userValue, query.KeyName)
		if !ok {
			return false
		}
		target, ok := parseFilterBool(query.Value)
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

func matchStringFilter(fieldValue string, operator string, queryValue string) bool {
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

func filterStringValue(userValue User, keyName string) string {
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
	case "univemail":
		return DeriveUnivemail(userValue.LoginIDs, userValue.ContactEmail)
	case "phoneNumber":
		return userValue.PhoneNumber
	case "createdAt":
		return FormatTimestamp(userValue.CreatedAt)
	case "updatedAt":
		return FormatTimestamp(userValue.UpdatedAt)
	default:
		return ""
	}
}

func filterBoolValue(userValue User, keyName string) (bool, bool) {
	switch keyName {
	case "isStaff":
		return HasStaffRole(userValue), true
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

func parseFilterBool(raw string) (bool, bool) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "1", "true", "yes":
		return true, true
	case "0", "false", "no":
		return false, true
	default:
		return false, false
	}
}

func HasStaffRole(userValue User) bool {
	for _, role := range userValue.Roles {
		if role != "participant" {
			return true
		}
	}
	return false
}

func SortUsers(users []User, sortKey string, sortDirection string) {
	direction := 1
	if sortDirection == "desc" {
		direction = -1
	}

	slices.SortStableFunc(users, func(left User, right User) int {
		leftValue := strings.ToLower(sortValue(left, sortKey))
		rightValue := strings.ToLower(sortValue(right, sortKey))

		if leftValue < rightValue {
			return -1 * direction
		}
		if leftValue > rightValue {
			return 1 * direction
		}
		return 0
	})
}

func sortValue(userValue User, sortKey string) string {
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
	case "univemail":
		return DeriveUnivemail(userValue.LoginIDs, userValue.ContactEmail)
	case "phoneNumber":
		return userValue.PhoneNumber
	case "createdAt":
		return FormatTimestamp(userValue.CreatedAt)
	case "updatedAt":
		return FormatTimestamp(userValue.UpdatedAt)
	case "isStaff":
		if HasStaffRole(userValue) {
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

func DeriveUnivemail(loginIDs []string, contactEmail string) string {
	for _, loginID := range loginIDs {
		trimmed := strings.TrimSpace(loginID)
		if strings.Contains(trimmed, "@") {
			return trimmed
		}
	}
	return strings.TrimSpace(contactEmail)
}

func FormatTimestamp(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}
