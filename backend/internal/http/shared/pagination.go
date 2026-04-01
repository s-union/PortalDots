//go:build ignore

package shared

import (
	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/models"
)

// ReadPagination extracts pagination parameters from a request query string.
func ReadPagination(c echo.Context) models.PaginationParams {
	return models.ReadPagination(c)
}

// PaginateItems applies pagination to a slice and returns a paginated response.
func PaginateItems[T any](items []T, pagination models.PaginationParams) models.PaginatedResponse[T] {
	return models.PaginateItems(items, pagination)
}
