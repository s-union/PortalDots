//go:build ignore

package shared

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/models"
)

// ErrorJSON writes a JSON error response with a single "message" field.
func ErrorJSON(c echo.Context, status int, message string) error {
	return c.JSON(status, map[string]string{"message": message})
}

// InternalError is a shorthand for a 500 Internal Server Error response.
func InternalError(c echo.Context) error {
	return ErrorJSON(c, http.StatusInternalServerError, "internal_error")
}

// ValidationError writes a 422 Unprocessable Entity response with field-level errors.
func ValidationError(c echo.Context, errors map[string][]string) error {
	return c.JSON(http.StatusUnprocessableEntity, models.ValidationErrorResponse{
		Message: "validation_error",
		Errors:  errors,
	})
}

// StatusMessage maps common HTTP status codes to API error message strings.
func StatusMessage(status int) string {
	switch status {
	case http.StatusUnauthorized:
		return "unauthenticated"
	case http.StatusForbidden:
		return "staff_forbidden"
	case http.StatusConflict:
		return "current_circle_required"
	case http.StatusNotFound:
		return "not_found"
	case http.StatusBadRequest:
		return "bad_request"
	default:
		return "unknown_error"
	}
}

// StatusError writes a JSON error response using the default message for the given HTTP status code.
func StatusError(c echo.Context, status int) error {
	return ErrorJSON(c, status, StatusMessage(status))
}
