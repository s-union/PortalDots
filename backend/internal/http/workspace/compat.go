//go:build ignore

package workspacehttp

import (
	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/http/shared"
)

func errorJSON(c echo.Context, status int, message string) error {
	return shared.ErrorJSON(c, status, message)
}

func internalError(c echo.Context) error {
	return shared.InternalError(c)
}

func validationError(c echo.Context, errors map[string][]string) error {
	return shared.ValidationError(c, errors)
}

func statusError(c echo.Context, status int) error {
	return shared.StatusError(c, status)
}

func readPagination(c echo.Context) PagesPagination {
	return shared.ReadPagination(c)
}

func paginateItems[T any](items []T, pagination PagesPagination) any {
	return shared.PaginateItems(items, pagination)
}
