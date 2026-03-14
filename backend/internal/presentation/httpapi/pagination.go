package httpapi

import "github.com/labstack/echo/v4"

const (
	defaultPage     = 1
	defaultPageSize = 20
	maxPageSize     = 100
)

type paginationParams struct {
	Page     int `json:"page"`
	PageSize int `json:"pageSize"`
}

type paginatedResponse[T any] struct {
	Items    []T `json:"items"`
	Page     int `json:"page"`
	PageSize int `json:"pageSize"`
	Total    int `json:"total"`
}

func readPagination(c echo.Context) paginationParams {
	page := parsePositiveInt(c.QueryParam("page"), defaultPage)
	pageSize := parsePositiveInt(c.QueryParam("pageSize"), defaultPageSize)
	if pageSize > maxPageSize {
		pageSize = maxPageSize
	}

	return paginationParams{
		Page:     page,
		PageSize: pageSize,
	}
}

func paginateItems[T any](items []T, pagination paginationParams) paginatedResponse[T] {
	total := len(items)
	start := (pagination.Page - 1) * pagination.PageSize
	if start >= total {
		return paginatedResponse[T]{
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

	return paginatedResponse[T]{
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
