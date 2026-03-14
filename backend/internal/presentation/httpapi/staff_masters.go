package httpapi

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/contactcategory"
	"github.com/s-union/PortalDots/backend/internal/domain/place"
	"github.com/s-union/PortalDots/backend/internal/domain/tag"
)

type staffTagResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type mutateStaffTagRequest struct {
	Name string `json:"name"`
}

type staffPlaceResponse struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Type  int32  `json:"type"`
	Notes string `json:"notes"`
}

type mutateStaffPlaceRequest struct {
	Name  string `json:"name"`
	Type  int32  `json:"type"`
	Notes string `json:"notes"`
}

type staffContactCategoryResponse struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type mutateStaffContactCategoryRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

func (h *staffMastersHandlers) listStaffTags(c echo.Context) error {
	if _, _, status, ok := h.requireStaffCapability(c, canReadTags); !ok {
		return c.JSON(status, map[string]string{"message": statusMessage(status)})
	}

	tags, err := h.tags.List()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "internal_error"})
	}

	response := make([]staffTagResponse, 0, len(tags))
	for _, item := range tags {
		response = append(response, staffTagResponse{ID: item.ID, Name: item.Name})
	}
	return c.JSON(http.StatusOK, response)
}

func (h *staffMastersHandlers) createStaffTag(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditTags)
	if !ok {
		return c.JSON(status, map[string]string{"message": statusMessage(status)})
	}

	var request mutateStaffTagRequest
	if err := c.Bind(&request); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid_request"})
	}
	request.Name = strings.TrimSpace(request.Name)
	if request.Name == "" {
		return c.JSON(http.StatusUnprocessableEntity, validationErrorResponse{
			Message: "validation_error",
			Errors:  map[string][]string{"name": {"タグ名を入力してください"}},
		})
	}

	created, err := h.tags.Create(request.Name)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "internal_error"})
	}
	recordActivity(h.activities, currentSession.User.ID, "staff.tag.created", "tag", created.ID, "", buildActivitySummary("staff がタグを作成しました", created.Name))
	return c.JSON(http.StatusCreated, staffTagResponse{ID: created.ID, Name: created.Name})
}

func (h *staffMastersHandlers) updateStaffTag(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditTags)
	if !ok {
		return c.JSON(status, map[string]string{"message": statusMessage(status)})
	}

	var request mutateStaffTagRequest
	if err := c.Bind(&request); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid_request"})
	}
	request.Name = strings.TrimSpace(request.Name)
	if request.Name == "" {
		return c.JSON(http.StatusUnprocessableEntity, validationErrorResponse{
			Message: "validation_error",
			Errors:  map[string][]string{"name": {"タグ名を入力してください"}},
		})
	}

	updated, err := h.tags.Update(c.Param("tagID"), request.Name)
	if errors.Is(err, tag.ErrNotFound) {
		return c.JSON(http.StatusNotFound, map[string]string{"message": "tag_not_found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "internal_error"})
	}

	recordActivity(h.activities, currentSession.User.ID, "staff.tag.updated", "tag", updated.ID, "", buildActivitySummary("staff がタグを更新しました", updated.Name))
	return c.JSON(http.StatusOK, staffTagResponse{ID: updated.ID, Name: updated.Name})
}

func (h *staffMastersHandlers) deleteStaffTag(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canDeleteTags)
	if !ok {
		return c.JSON(status, map[string]string{"message": statusMessage(status)})
	}

	if err := h.tags.Delete(c.Param("tagID")); errors.Is(err, tag.ErrNotFound) {
		return c.JSON(http.StatusNotFound, map[string]string{"message": "tag_not_found"})
	} else if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "internal_error"})
	}

	recordActivity(h.activities, currentSession.User.ID, "staff.tag.deleted", "tag", c.Param("tagID"), "", "staff がタグを削除しました")
	return c.NoContent(http.StatusNoContent)
}

func (h *staffMastersHandlers) listStaffPlaces(c echo.Context) error {
	if _, _, status, ok := h.requireStaffCapability(c, canReadPlaces); !ok {
		return c.JSON(status, map[string]string{"message": statusMessage(status)})
	}

	items, err := h.places.List()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "internal_error"})
	}

	response := make([]staffPlaceResponse, 0, len(items))
	for _, item := range items {
		response = append(response, staffPlaceResponse{
			ID:    item.ID,
			Name:  item.Name,
			Type:  item.Type,
			Notes: item.Notes,
		})
	}
	return c.JSON(http.StatusOK, response)
}

func (h *staffMastersHandlers) createStaffPlace(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditPlaces)
	if !ok {
		return c.JSON(status, map[string]string{"message": statusMessage(status)})
	}

	request, valid := bindStaffPlaceRequest(c)
	if !valid {
		return c.JSON(http.StatusUnprocessableEntity, validationErrorResponse{
			Message: "validation_error",
			Errors:  map[string][]string{"request": {"場所情報が不正です"}},
		})
	}

	created, err := h.places.Create(request.Name, request.Type, request.Notes)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "internal_error"})
	}
	recordActivity(h.activities, currentSession.User.ID, "staff.place.created", "place", created.ID, "", buildActivitySummary("staff が場所を作成しました", created.Name))
	return c.JSON(http.StatusCreated, mapStaffPlace(created))
}

func (h *staffMastersHandlers) updateStaffPlace(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditPlaces)
	if !ok {
		return c.JSON(status, map[string]string{"message": statusMessage(status)})
	}

	request, valid := bindStaffPlaceRequest(c)
	if !valid {
		return c.JSON(http.StatusUnprocessableEntity, validationErrorResponse{
			Message: "validation_error",
			Errors:  map[string][]string{"request": {"場所情報が不正です"}},
		})
	}

	updated, err := h.places.Update(c.Param("placeID"), request.Name, request.Type, request.Notes)
	if errors.Is(err, place.ErrNotFound) {
		return c.JSON(http.StatusNotFound, map[string]string{"message": "place_not_found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "internal_error"})
	}

	recordActivity(h.activities, currentSession.User.ID, "staff.place.updated", "place", updated.ID, "", buildActivitySummary("staff が場所を更新しました", updated.Name))
	return c.JSON(http.StatusOK, mapStaffPlace(updated))
}

func (h *staffMastersHandlers) deleteStaffPlace(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canDeletePlaces)
	if !ok {
		return c.JSON(status, map[string]string{"message": statusMessage(status)})
	}

	if err := h.places.Delete(c.Param("placeID")); errors.Is(err, place.ErrNotFound) {
		return c.JSON(http.StatusNotFound, map[string]string{"message": "place_not_found"})
	} else if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "internal_error"})
	}

	recordActivity(h.activities, currentSession.User.ID, "staff.place.deleted", "place", c.Param("placeID"), "", "staff が場所を削除しました")
	return c.NoContent(http.StatusNoContent)
}

func (h *staffMastersHandlers) listStaffContactCategories(c echo.Context) error {
	if _, _, status, ok := h.requireStaffCapability(c, canReadContactCategories); !ok {
		return c.JSON(status, map[string]string{"message": statusMessage(status)})
	}

	items, err := h.contactCategories.List()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "internal_error"})
	}

	response := make([]staffContactCategoryResponse, 0, len(items))
	for _, item := range items {
		response = append(response, mapStaffContactCategory(item))
	}
	return c.JSON(http.StatusOK, response)
}

func (h *staffMastersHandlers) createStaffContactCategory(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditContactCategories)
	if !ok {
		return c.JSON(status, map[string]string{"message": statusMessage(status)})
	}

	request, validationErrors := bindStaffContactCategoryRequest(c)
	if len(validationErrors) > 0 {
		return c.JSON(http.StatusUnprocessableEntity, validationErrorResponse{
			Message: "validation_error",
			Errors:  validationErrors,
		})
	}

	created, err := h.contactCategories.Create(request.Name, request.Email)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "internal_error"})
	}

	recordActivity(h.activities, currentSession.User.ID, "staff.contact_category.created", "contact_category", created.ID, "", buildActivitySummary("staff が問い合わせカテゴリを作成しました", created.Name))
	return c.JSON(http.StatusCreated, mapStaffContactCategory(created))
}

func (h *staffMastersHandlers) updateStaffContactCategory(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditContactCategories)
	if !ok {
		return c.JSON(status, map[string]string{"message": statusMessage(status)})
	}

	request, validationErrors := bindStaffContactCategoryRequest(c)
	if len(validationErrors) > 0 {
		return c.JSON(http.StatusUnprocessableEntity, validationErrorResponse{
			Message: "validation_error",
			Errors:  validationErrors,
		})
	}

	updated, err := h.contactCategories.Update(c.Param("categoryID"), request.Name, request.Email)
	if errors.Is(err, contactcategory.ErrNotFound) {
		return c.JSON(http.StatusNotFound, map[string]string{"message": "contact_category_not_found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "internal_error"})
	}

	recordActivity(h.activities, currentSession.User.ID, "staff.contact_category.updated", "contact_category", updated.ID, "", buildActivitySummary("staff が問い合わせカテゴリを更新しました", updated.Name))
	return c.JSON(http.StatusOK, mapStaffContactCategory(updated))
}

func (h *staffMastersHandlers) deleteStaffContactCategory(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canDeleteContactCategories)
	if !ok {
		return c.JSON(status, map[string]string{"message": statusMessage(status)})
	}

	if err := h.contactCategories.Delete(c.Param("categoryID")); errors.Is(err, contactcategory.ErrNotFound) {
		return c.JSON(http.StatusNotFound, map[string]string{"message": "contact_category_not_found"})
	} else if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "internal_error"})
	}

	recordActivity(h.activities, currentSession.User.ID, "staff.contact_category.deleted", "contact_category", c.Param("categoryID"), "", "staff が問い合わせカテゴリを削除しました")
	return c.NoContent(http.StatusNoContent)
}

func bindStaffPlaceRequest(c echo.Context) (mutateStaffPlaceRequest, bool) {
	var request mutateStaffPlaceRequest
	if err := c.Bind(&request); err != nil {
		return mutateStaffPlaceRequest{}, false
	}
	request.Name = strings.TrimSpace(request.Name)
	request.Notes = strings.TrimSpace(request.Notes)
	if request.Name == "" {
		return mutateStaffPlaceRequest{}, false
	}
	if request.Type < 1 || request.Type > 3 {
		return mutateStaffPlaceRequest{}, false
	}
	return request, true
}

func bindStaffContactCategoryRequest(c echo.Context) (mutateStaffContactCategoryRequest, map[string][]string) {
	var request mutateStaffContactCategoryRequest
	if err := c.Bind(&request); err != nil {
		return mutateStaffContactCategoryRequest{}, map[string][]string{"request": {"invalid_request"}}
	}
	request.Name = strings.TrimSpace(request.Name)
	request.Email = strings.TrimSpace(request.Email)
	errors := map[string][]string{}
	if request.Name == "" {
		errors["name"] = []string{"カテゴリ名を入力してください"}
	}
	if request.Email == "" || !strings.Contains(request.Email, "@") {
		errors["email"] = []string{"メールアドレスを入力してください"}
	}

	return request, errors
}

func mapStaffPlace(item place.Place) staffPlaceResponse {
	return staffPlaceResponse{
		ID:    item.ID,
		Name:  item.Name,
		Type:  item.Type,
		Notes: item.Notes,
	}
}

func mapStaffContactCategory(item contactcategory.Category) staffContactCategoryResponse {
	return staffContactCategoryResponse{
		ID:    item.ID,
		Name:  item.Name,
		Email: item.Email,
	}
}

func placeTypeLabel(placeType int32) string {
	switch placeType {
	case 1:
		return "屋内"
	case 2:
		return "屋外"
	case 3:
		return "特殊場所"
	default:
		return strconv.Itoa(int(placeType))
	}
}
