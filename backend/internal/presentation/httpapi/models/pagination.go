package models

import "github.com/labstack/echo/v4"

const (
	DefaultPage     = 1
	DefaultPageSize = 20
	MaxPageSize     = 100
)

// PaginationParams represents pagination query parameters.
type PaginationParams struct {
	Page     int `json:"page"`
	PageSize int `json:"pageSize"`
}

// PaginatedResponse represents a paginated API response.
type PaginatedResponse[T any] struct {
	Items    []T `json:"items"`
	Page     int `json:"page"`
	PageSize int `json:"pageSize"`
	Total    int `json:"total"`
}

// ReadPagination extracts pagination parameters from a request query string.
func ReadPagination(c echo.Context) PaginationParams {
	page := parsePositiveInt(c.QueryParam("page"), DefaultPage)
	pageSize := parsePositiveInt(c.QueryParam("pageSize"), DefaultPageSize)
	if pageSize > MaxPageSize {
		pageSize = MaxPageSize
	}

	return PaginationParams{
		Page:     page,
		PageSize: pageSize,
	}
}

// PaginateItems applies pagination to a slice and returns a paginated response.
func PaginateItems[T any](items []T, pagination PaginationParams) PaginatedResponse[T] {
	total := len(items)
	start := (pagination.Page - 1) * pagination.PageSize
	if start >= total {
		return PaginatedResponse[T]{
			Items:    []T{},
			Page:     pagination.Page,
			PageSize: pagination.PageSize,
			Total:    total,
		}
	}

	end := start + pagination.PageSize
	if end > total {
		end = total
	}

	return PaginatedResponse[T]{
		Items:    items[start:end],
		Page:     pagination.Page,
		PageSize: pagination.PageSize,
		Total:    total,
	}
}

func parsePositiveInt(raw string, fallback int) int {
	if raw == "" {
		return fallback
	}

	value := 0
	for _, char := range raw {
		if char < '0' || char > '9' {
			return fallback
		}
		value = value*10 + int(char-'0')
	}

	if value <= 0 {
		return fallback
	}

	return value
}
