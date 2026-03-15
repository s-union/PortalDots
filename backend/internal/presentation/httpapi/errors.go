package httpapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type validationErrorResponse struct {
	Message string              `json:"message"`
	Errors  map[string][]string `json:"errors"`
}

// errorJSON writes a JSON error response with a single "message" field.
func errorJSON(c echo.Context, status int, message string) error {
	return c.JSON(status, map[string]string{"message": message})
}

// internalError is a shorthand for a 500 Internal Server Error response.
func internalError(c echo.Context) error {
	return errorJSON(c, http.StatusInternalServerError, "internal_error")
}

// validationError writes a 422 Unprocessable Entity response with field-level errors.
func validationError(c echo.Context, errors map[string][]string) error {
	return c.JSON(http.StatusUnprocessableEntity, validationErrorResponse{
		Message: "validation_error",
		Errors:  errors,
	})
}

// statusMessage maps common HTTP status codes to API error message strings.
func statusMessage(status int) string {
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

// statusError writes a JSON error response using the default message for the given HTTP status code.
func statusError(c echo.Context, status int) error {
	return errorJSON(c, status, statusMessage(status))
}
