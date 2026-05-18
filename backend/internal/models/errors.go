package models

// ValidationErrorResponse represents a 422 validation error response with field-level errors.
type ValidationErrorResponse struct {
	Message string              `json:"message"`
	Errors  map[string][]string `json:"errors"`
}
