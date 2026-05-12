package controllers

import (
	"encoding/json"
	"errors"
	"strings"
)

type staffListFilterFieldType string

const (
	staffListFilterFieldTypeString staffListFilterFieldType = "string"
	staffListFilterFieldTypeBool   staffListFilterFieldType = "bool"
)

type staffListFilterQuery struct {
	KeyName  string
	Operator string
	Value    string
}

type staffListFilterMode string

const (
	staffListFilterModeAnd staffListFilterMode = "and"
	staffListFilterModeOr  staffListFilterMode = "or"
)

func parseStaffListFilters(rawQueries string, rawMode string, fields map[string]staffListFilterFieldType) ([]staffListFilterQuery, staffListFilterMode, error) {
	mode, err := parseStaffListFilterMode(rawMode)
	if err != nil {
		return nil, "", err
	}
	if strings.TrimSpace(rawQueries) == "" {
		return []staffListFilterQuery{}, mode, nil
	}

	var decoded []map[string]any
	if err := json.Unmarshal([]byte(rawQueries), &decoded); err != nil {
		return nil, "", err
	}
	if len(decoded) > 20 {
		return nil, "", errors.New("too many filters")
	}

	filters := make([]staffListFilterQuery, 0, len(decoded))
	for _, item := range decoded {
		keyName := readFirstString(item, "key_name", "keyName")
		operator := normalizeStaffUserFilterOperator(readFirstString(item, "operator"))
		value := stringifyStaffUserFilterValue(item["value"])
		fieldType, exists := fields[keyName]
		if !exists {
			return nil, "", errors.New("unknown filter key")
		}
		if !isAllowedStaffListFilterOperator(fieldType, operator) {
			return nil, "", errors.New("unknown filter operator")
		}
		if fieldType != staffListFilterFieldTypeBool && value == "" {
			return nil, "", errors.New("empty filter value")
		}
		filters = append(filters, staffListFilterQuery{KeyName: keyName, Operator: operator, Value: value})
	}

	return filters, mode, nil
}

func parseStaffListFilterMode(raw string) (staffListFilterMode, error) {
	if strings.TrimSpace(raw) == "" {
		return staffListFilterModeAnd, nil
	}
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case string(staffListFilterModeAnd):
		return staffListFilterModeAnd, nil
	case string(staffListFilterModeOr):
		return staffListFilterModeOr, nil
	default:
		return "", errors.New("invalid filter mode")
	}
}

func isAllowedStaffListFilterOperator(fieldType staffListFilterFieldType, operator string) bool {
	switch fieldType {
	case staffListFilterFieldTypeString:
		return operator == "=" || operator == "!=" || operator == "like" || operator == "not like"
	case staffListFilterFieldTypeBool:
		return operator == "=" || operator == "!="
	default:
		return false
	}
}

func matchesStaffListSearch(values []string, query string) bool {
	normalized := strings.ToLower(strings.TrimSpace(query))
	if normalized == "" {
		return true
	}
	return strings.Contains(strings.ToLower(strings.Join(values, " ")), normalized)
}

func matchesStaffListFilters(resolve func(string) (string, bool), queries []staffListFilterQuery, mode staffListFilterMode) bool {
	if len(queries) == 0 {
		return true
	}
	if mode == staffListFilterModeOr {
		for _, query := range queries {
			if matchStaffListFilter(resolve, query) {
				return true
			}
		}
		return false
	}
	for _, query := range queries {
		if !matchStaffListFilter(resolve, query) {
			return false
		}
	}
	return true
}

func matchStaffListFilter(resolve func(string) (string, bool), query staffListFilterQuery) bool {
	value, ok := resolve(query.KeyName)
	if !ok {
		return false
	}
	return matchStaffUserStringFilter(value, query.Operator, query.Value)
}
