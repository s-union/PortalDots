package controllers

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
)

// staffFormRecipientCandidateResponse is the minimal user information exposed
// when configuring staff-copy recipients. It deliberately omits the fields a
// forms_manager does not need (roles, verification state, phone number, etc.).
type staffFormRecipientCandidateResponse struct {
	ID           string   `json:"id"`
	DisplayName  string   `json:"displayName"`
	LoginIDs     []string `json:"loginIds"`
	ContactEmail string   `json:"contactEmail"`
}

func mapStaffFormRecipientCandidate(userValue useradmin.User) staffFormRecipientCandidateResponse {
	return staffFormRecipientCandidateResponse{
		ID:           userValue.ID,
		DisplayName:  userValue.DisplayName,
		LoginIDs:     userValue.LoginIDs,
		ContactEmail: userValue.ContactEmail,
	}
}

func (h *staffFormHandlers) searchStaffFormRecipientCandidates(c *echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canEditForms)
	if !ok {
		return statusError(c, status)
	}

	query := escapeIlikePattern(c.QueryParam("query"))
	users, err := h.users.ListByQuery(query)
	if err != nil {
		return internalError(c)
	}

	candidates := make([]staffFormRecipientCandidateResponse, 0, len(users))
	for _, userValue := range users {
		if !hasCurrentFormAnswerAccess(userValue) {
			continue
		}
		candidates = append(candidates, mapStaffFormRecipientCandidate(userValue))
	}

	totalUnfiltered := len(candidates)
	if c.QueryParam("query") != "" {
		unfilteredUsers, err := h.users.List()
		if err != nil {
			return internalError(c)
		}
		totalUnfiltered = 0
		for _, userValue := range unfilteredUsers {
			if hasCurrentFormAnswerAccess(userValue) {
				totalUnfiltered++
			}
		}
	}

	return c.JSON(http.StatusOK, paginateItems(candidates, readPagination(c), totalUnfiltered))
}

func (h *staffFormHandlers) getStaffFormRecipientCandidate(c *echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canEditForms)
	if !ok {
		return statusError(c, status)
	}

	userValue, err := h.users.Find(c.Param("userID"))
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "user_not_found")
	}
	if err != nil {
		return internalError(c)
	}
	if !hasCurrentFormAnswerAccess(userValue) {
		return errorJSON(c, http.StatusNotFound, "user_not_found")
	}

	return c.JSON(http.StatusOK, mapStaffFormRecipientCandidate(userValue))
}
