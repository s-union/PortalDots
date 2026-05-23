package controllers

import (
	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/models"
)

// readPagination extracts pagination parameters from a request query string.
// This is a convenience wrapper around models.ReadPagination.
func readPagination(c *echo.Context) models.PaginationParams {
	return models.ReadPagination(c)
}

// paginateItems applies pagination to a slice and returns a paginated response.
// This is a convenience wrapper around models.PaginateItems.
func paginateItems[T any](items []T, pagination models.PaginationParams) models.PaginatedResponse[T] {
	return models.PaginateItems(items, pagination)
}
