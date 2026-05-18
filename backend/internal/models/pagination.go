package models

import (
	"math"

	"github.com/labstack/echo/v4"
)

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
	page, pageSize := NormalizePagination(pagination, total)

	start := (page - 1) * pageSize
	if start >= total {
		return PaginatedResponse[T]{
			Items:    []T{},
			Page:     page,
			PageSize: pageSize,
			Total:    total,
		}
	}

	end := start + pageSize
	if end > total {
		end = total
	}

	return PaginatedResponse[T]{
		Items:    items[start:end],
		Page:     page,
		PageSize: pageSize,
		Total:    total,
	}
}

func NormalizePagination(pagination PaginationParams, total int) (int, int) {
	page := pagination.Page
	if page <= 0 {
		page = DefaultPage
	}
	pageSize := pagination.PageSize
	if pageSize <= 0 {
		pageSize = DefaultPageSize
	}
	if pageSize > MaxPageSize {
		pageSize = MaxPageSize
	}
	if total <= 0 {
		return DefaultPage, pageSize
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	if page > totalPages {
		page = totalPages
	}

	return page, pageSize
}

func parsePositiveInt(raw string, fallback int) int {
	if raw == "" {
		return fallback
	}

	maxInt := int(^uint(0) >> 1)
	value := 0
	for _, char := range raw {
		if char < '0' || char > '9' {
			return fallback
		}
		digit := int(char - '0')
		if value > (maxInt-digit)/10 {
			return fallback
		}
		value = value*10 + digit
	}

	if value <= 0 {
		return fallback
	}

	return value
}
