package controllers

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/booth"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/contactcategory"
	"github.com/s-union/PortalDots/backend/internal/domain/place"
	"github.com/s-union/PortalDots/backend/internal/domain/tag"
	"github.com/s-union/PortalDots/backend/internal/shared/cloudflareemail"
	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

type staffTagResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type mutateStaffTagRequest struct {
	Name string `json:"name"`
}

type staffPlaceResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Type      int32  `json:"type"`
	Notes     string `json:"notes"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
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
		return statusError(c, status)
	}
	filterQueries, filterMode, err := parseStaffListFilters(c.QueryParam("queries"), c.QueryParam("mode"), staffTagFilterableFields)
	if err != nil {
		return validationError(c, map[string][]string{"queries": {"絞り込み条件が正しくありません"}})
	}

	tags, err := h.tags.List()
	if err != nil {
		return internalError(c)
	}

	response := make([]staffTagResponse, 0, len(tags))
	for _, item := range tags {
		mapped := mapStaffTag(item)
		if !matchesStaffListSearch([]string{mapped.ID, mapped.Name}, c.QueryParam("query")) || !matchesStaffListFilters(staffTagFilterResolver(mapped), filterQueries, filterMode) {
			continue
		}
		response = append(response, mapped)
	}
	return c.JSON(http.StatusOK, response)
}

func (h *staffMastersHandlers) downloadStaffTagsCSV(c echo.Context) error {
	if _, _, status, ok := h.requireStaffCapability(c, canReadTags); !ok {
		return statusError(c, status)
	}

	tags, err := h.tags.List()
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	circles, err := h.circles.ListForStaff()
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	slices.SortFunc(circles, func(left, right circle.Circle) int {
		switch {
		case left.Name < right.Name:
			return -1
		case left.Name > right.Name:
			return 1
		default:
			return 0
		}
	})

	rows := [][]string{{
		"tag_id",
		"tag_name",
		"circle_id",
		"circle_name",
		"circle_name_yomi",
		"group_name",
		"group_name_yomi",
	}}
	for _, currentTag := range tags {
		matchedCircles := make([]circle.Circle, 0)
		for _, currentCircle := range circles {
			if slices.Contains(currentCircle.Tags, currentTag.Name) {
				matchedCircles = append(matchedCircles, currentCircle)
			}
		}

		if len(matchedCircles) == 0 {
			rows = append(rows, []string{currentTag.ID, currentTag.Name, "", "", "", "", ""})
			continue
		}

		for index, currentCircle := range matchedCircles {
			row := []string{"", "", currentCircle.ID, currentCircle.Name, currentCircle.NameYomi, currentCircle.GroupName, currentCircle.GroupNameYomi}
			if index == 0 {
				row[0] = currentTag.ID
				row[1] = currentTag.Name
			}
			rows = append(rows, row)
		}
	}

	csvBytes, err := writeCSV(rows)
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	filename := "staff-tags.csv"
	return csvResponse(c, filename, csvBytes)
}

func (h *staffMastersHandlers) createStaffTag(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditTags)
	if !ok {
		return statusError(c, status)
	}

	var request mutateStaffTagRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}
	request.Name = strings.TrimSpace(request.Name)
	if request.Name == "" {
		return validationError(c, map[string][]string{"name": {"タグ名を入力してください"}})
	}
	existingTags, err := h.tags.List()
	if err != nil {
		return internalError(c)
	}
	for _, existing := range existingTags {
		if strings.EqualFold(existing.Name, request.Name) {
			return validationError(c, map[string][]string{"name": {"同じ名前のタグがすでに存在します"}})
		}
	}

	created, err := h.tags.Create(request.Name)
	if err != nil {
		return internalError(c)
	}
	recordActivity(c.Request().Context(), h.activities, currentSession.User.ID, "staff.tag.created", "tag", created.ID, "", buildActivitySummary("staff がタグを作成しました", created.Name))
	return c.JSON(http.StatusCreated, mapStaffTag(created))
}

func (h *staffMastersHandlers) updateStaffTag(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditTags)
	if !ok {
		return statusError(c, status)
	}

	var request mutateStaffTagRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}
	request.Name = strings.TrimSpace(request.Name)
	if request.Name == "" {
		return validationError(c, map[string][]string{"name": {"タグ名を入力してください"}})
	}
	tagID := c.Param("tagID")
	existingTags, err := h.tags.List()
	if err != nil {
		return internalError(c)
	}
	for _, existing := range existingTags {
		if existing.ID != tagID && strings.EqualFold(existing.Name, request.Name) {
			return validationError(c, map[string][]string{"name": {"同じ名前のタグがすでに存在します"}})
		}
	}

	updated, err := h.tags.Update(tagID, request.Name)
	if errors.Is(err, tag.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "tag_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	recordActivity(c.Request().Context(), h.activities, currentSession.User.ID, "staff.tag.updated", "tag", updated.ID, "", buildActivitySummary("staff がタグを更新しました", updated.Name))
	return c.JSON(http.StatusOK, mapStaffTag(updated))
}

func (h *staffMastersHandlers) deleteStaffTag(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canDeleteTags)
	if !ok {
		return statusError(c, status)
	}

	if err := h.tags.Delete(c.Param("tagID")); errors.Is(err, tag.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "tag_not_found")
	} else if err != nil {
		return internalError(c)
	}

	recordActivity(c.Request().Context(), h.activities, currentSession.User.ID, "staff.tag.deleted", "tag", c.Param("tagID"), "", "staff がタグを削除しました")
	return c.NoContent(http.StatusNoContent)
}

func (h *staffMastersHandlers) listStaffPlaces(c echo.Context) error {
	if _, _, status, ok := h.requireStaffCapability(c, canReadPlaces); !ok {
		return statusError(c, status)
	}
	filterQueries, filterMode, err := parseStaffListFilters(c.QueryParam("queries"), c.QueryParam("mode"), staffPlaceFilterableFields)
	if err != nil {
		return validationError(c, map[string][]string{"queries": {"絞り込み条件が正しくありません"}})
	}

	items, err := h.places.List()
	if err != nil {
		return internalError(c)
	}

	response := make([]staffPlaceResponse, 0, len(items))
	for _, item := range items {
		mapped := mapStaffPlace(item)
		if !matchesStaffListSearch([]string{mapped.ID, mapped.Name, staffPlaceTypeLabel(mapped.Type), mapped.Notes}, c.QueryParam("query")) || !matchesStaffListFilters(staffPlaceFilterResolver(mapped), filterQueries, filterMode) {
			continue
		}
		response = append(response, mapped)
	}
	return c.JSON(http.StatusOK, response)
}

var staffTagFilterableFields = map[string]staffListFilterFieldType{
	"id":        staffListFilterFieldTypeString,
	"name":      staffListFilterFieldTypeString,
	"createdAt": staffListFilterFieldTypeString,
	"updatedAt": staffListFilterFieldTypeString,
}

var staffPlaceFilterableFields = map[string]staffListFilterFieldType{
	"id":        staffListFilterFieldTypeString,
	"name":      staffListFilterFieldTypeString,
	"typeLabel": staffListFilterFieldTypeString,
	"notes":     staffListFilterFieldTypeString,
	"createdAt": staffListFilterFieldTypeString,
	"updatedAt": staffListFilterFieldTypeString,
}

func staffTagFilterResolver(item staffTagResponse) func(string) (string, bool) {
	return func(key string) (string, bool) {
		switch key {
		case "id":
			return item.ID, true
		case "name":
			return item.Name, true
		case "createdAt":
			return item.CreatedAt, true
		case "updatedAt":
			return item.UpdatedAt, true
		default:
			return "", false
		}
	}
}

func staffPlaceFilterResolver(item staffPlaceResponse) func(string) (string, bool) {
	return func(key string) (string, bool) {
		switch key {
		case "id":
			return item.ID, true
		case "name":
			return item.Name, true
		case "typeLabel":
			return staffPlaceTypeLabel(item.Type), true
		case "notes":
			return item.Notes, true
		case "createdAt":
			return item.CreatedAt, true
		case "updatedAt":
			return item.UpdatedAt, true
		default:
			return "", false
		}
	}
}

func (h *staffMastersHandlers) downloadStaffPlacesCSV(c echo.Context) error {
	if _, _, status, ok := h.requireStaffCapability(c, canReadPlaces); !ok {
		return statusError(c, status)
	}

	places, err := h.places.List()
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	circles, err := h.circles.ListForStaff()
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	assignments, err := h.booths.List(c.Request().Context())
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	rows := buildStaffPlacesExportRows(places, circles, assignments)
	csvBytes, err := writeCSV(rows)
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	filename := "staff-places.csv"
	return csvResponse(c, filename, csvBytes)
}

func (h *staffMastersHandlers) createStaffPlace(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditPlaces)
	if !ok {
		return statusError(c, status)
	}

	request, valid := bindStaffPlaceRequest(c)
	if !valid {
		return validationError(c, map[string][]string{"request": {"場所情報が不正です"}})
	}
	existingPlaces, err := h.places.List()
	if err != nil {
		return internalError(c)
	}
	for _, existing := range existingPlaces {
		if strings.EqualFold(existing.Name, request.Name) {
			return validationError(c, map[string][]string{"name": {"同じ名前の場所がすでに存在します"}})
		}
	}

	created, err := h.places.Create(request.Name, request.Type, request.Notes)
	if err != nil {
		return internalError(c)
	}
	recordActivity(c.Request().Context(), h.activities, currentSession.User.ID, "staff.place.created", "place", created.ID, "", buildActivitySummary("staff が場所を作成しました", created.Name))
	return c.JSON(http.StatusCreated, mapStaffPlace(created))
}

func (h *staffMastersHandlers) updateStaffPlace(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditPlaces)
	if !ok {
		return statusError(c, status)
	}

	request, valid := bindStaffPlaceRequest(c)
	if !valid {
		return validationError(c, map[string][]string{"request": {"場所情報が不正です"}})
	}
	placeID := c.Param("placeID")
	existingPlaces, err := h.places.List()
	if err != nil {
		return internalError(c)
	}
	for _, existing := range existingPlaces {
		if existing.ID != placeID && strings.EqualFold(existing.Name, request.Name) {
			return validationError(c, map[string][]string{"name": {"同じ名前の場所がすでに存在します"}})
		}
	}

	updated, err := h.places.Update(placeID, request.Name, request.Type, request.Notes)
	if errors.Is(err, place.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "place_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	recordActivity(c.Request().Context(), h.activities, currentSession.User.ID, "staff.place.updated", "place", updated.ID, "", buildActivitySummary("staff が場所を更新しました", updated.Name))
	return c.JSON(http.StatusOK, mapStaffPlace(updated))
}

func (h *staffMastersHandlers) deleteStaffPlace(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canDeletePlaces)
	if !ok {
		return statusError(c, status)
	}

	if err := h.places.Delete(c.Param("placeID")); errors.Is(err, place.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "place_not_found")
	} else if err != nil {
		return internalError(c)
	}
	if err := h.booths.DeleteByPlace(c.Request().Context(), c.Param("placeID")); err != nil {
		return internalError(c)
	}

	recordActivity(c.Request().Context(), h.activities, currentSession.User.ID, "staff.place.deleted", "place", c.Param("placeID"), "", "staff が場所を削除しました")
	return c.NoContent(http.StatusNoContent)
}

func (h *staffMastersHandlers) listStaffContactCategories(c echo.Context) error {
	if _, _, status, ok := h.requireStaffCapability(c, canReadContactCategories); !ok {
		return statusError(c, status)
	}

	items, err := h.contactCategories.List()
	if err != nil {
		return internalError(c)
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
		return statusError(c, status)
	}

	request, validationErrors := bindStaffContactCategoryRequest(c)
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	created, err := h.contactCategories.Create(request.Name, request.Email)
	if err != nil {
		return internalError(c)
	}
	if err := h.enqueueContactCategoryAssignedMail(c.Request().Context(), currentSession.User.ID, created); err != nil {
		return internalError(c)
	}

	recordActivity(c.Request().Context(), h.activities, currentSession.User.ID, "staff.contact_category.created", "contact_category", created.ID, "", buildActivitySummary("staff が問い合わせカテゴリを作成しました", created.Name))
	return c.JSON(http.StatusCreated, mapStaffContactCategory(created))
}

func (h *staffMastersHandlers) updateStaffContactCategory(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditContactCategories)
	if !ok {
		return statusError(c, status)
	}

	request, validationErrors := bindStaffContactCategoryRequest(c)
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	old, err := h.contactCategories.Find(c.Param("categoryID"))
	if errors.Is(err, contactcategory.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "contact_category_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	updated, err := h.contactCategories.Update(c.Param("categoryID"), request.Name, request.Email)
	if errors.Is(err, contactcategory.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "contact_category_not_found")
	}
	if err != nil {
		return internalError(c)
	}
	if old.Email != updated.Email {
		if err := h.enqueueContactCategoryAssignedMail(c.Request().Context(), currentSession.User.ID, updated); err != nil {
			return internalError(c)
		}
	}

	recordActivity(c.Request().Context(), h.activities, currentSession.User.ID, "staff.contact_category.updated", "contact_category", updated.ID, "", buildActivitySummary("staff が問い合わせカテゴリを更新しました", updated.Name))
	return c.JSON(http.StatusOK, mapStaffContactCategory(updated))
}

func (h *staffMastersHandlers) deleteStaffContactCategory(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canDeleteContactCategories)
	if !ok {
		return statusError(c, status)
	}

	if err := h.contactCategories.Delete(c.Param("categoryID")); errors.Is(err, contactcategory.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "contact_category_not_found")
	} else if err != nil {
		return internalError(c)
	}

	recordActivity(c.Request().Context(), h.activities, currentSession.User.ID, "staff.contact_category.deleted", "contact_category", c.Param("categoryID"), "", "staff が問い合わせカテゴリを削除しました")
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
	if request.Email == "" || !isValidEmail(request.Email) {
		errors["email"] = []string{"メールアドレスを正しく入力してください"}
	}

	return request, errors
}

func mapStaffPlace(item place.Place) staffPlaceResponse {
	return staffPlaceResponse{
		ID:        item.ID,
		Name:      item.Name,
		Type:      item.Type,
		Notes:     item.Notes,
		CreatedAt: item.CreatedAt,
		UpdatedAt: item.UpdatedAt,
	}
}

func mapStaffTag(item tag.Tag) staffTagResponse {
	return staffTagResponse{
		ID:        item.ID,
		Name:      item.Name,
		CreatedAt: item.CreatedAt,
		UpdatedAt: item.UpdatedAt,
	}
}

func buildStaffPlacesExportRows(places []place.Place, circles []circle.Circle, assignments []booth.Assignment) [][]string {
	slices.SortFunc(places, func(left, right place.Place) int {
		switch {
		case left.Name < right.Name:
			return -1
		case left.Name > right.Name:
			return 1
		default:
			return 0
		}
	})

	circleByID := make(map[string]circle.Circle, len(circles))
	for _, currentCircle := range circles {
		circleByID[currentCircle.ID] = currentCircle
	}

	assignmentMap := make(map[string][]circle.Circle, len(places))
	for _, assignment := range assignments {
		currentCircle, ok := circleByID[assignment.CircleID]
		if !ok {
			continue
		}
		assignmentMap[assignment.PlaceID] = append(assignmentMap[assignment.PlaceID], currentCircle)
	}
	for placeID := range assignmentMap {
		slices.SortFunc(assignmentMap[placeID], func(left, right circle.Circle) int {
			switch {
			case left.Name < right.Name:
				return -1
			case left.Name > right.Name:
				return 1
			default:
				return 0
			}
		})
	}

	rows := [][]string{{
		"place_id",
		"place_name",
		"place_type",
		"place_notes",
		"circle_id",
		"circle_name",
		"circle_name_yomi",
		"group_name",
		"group_name_yomi",
	}}
	for _, currentPlace := range places {
		matchedCircles := assignmentMap[currentPlace.ID]
		if len(matchedCircles) == 0 {
			rows = append(rows, []string{
				currentPlace.ID,
				currentPlace.Name,
				staffPlaceTypeLabel(currentPlace.Type),
				currentPlace.Notes,
				"",
				"",
				"",
				"",
				"",
			})
			continue
		}

		for index, currentCircle := range matchedCircles {
			row := []string{
				"",
				"",
				"",
				"",
				currentCircle.ID,
				currentCircle.Name,
				currentCircle.NameYomi,
				currentCircle.GroupName,
				currentCircle.GroupNameYomi,
			}
			if index == 0 {
				row[0] = currentPlace.ID
				row[1] = currentPlace.Name
				row[2] = staffPlaceTypeLabel(currentPlace.Type)
				row[3] = currentPlace.Notes
			}
			rows = append(rows, row)
		}
	}

	return rows
}

func staffPlaceTypeLabel(placeType int32) string {
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

func mapStaffContactCategory(item contactcategory.Category) staffContactCategoryResponse {
	return staffContactCategoryResponse{
		ID:    item.ID,
		Name:  item.Name,
		Email: item.Email,
	}
}

func (h *staffMastersHandlers) enqueueContactCategoryAssignedMail(
	ctx context.Context,
	createdByUserID string,
	category contactcategory.Category,
) error {
	recipients := normalizeRecipients([]string{category.Email})
	if len(recipients) == 0 {
		return fmt.Errorf("contact category recipient not found")
	}

	subject := "お問い合わせ先に設定されました"
	body := strings.TrimSpace(fmt.Sprintf(
		`お問い合わせ先のメールアドレスとして設定されました

このメールアドレスは「%s」のお問い合わせ先として設定されています。

設定の詳細
- 項目名 : %s
- メールアドレス : %s`,
		h.appName,
		category.Name,
		category.Email,
	))

	jobID := "contact-category-" + uuidv7.MustString()
	if err := h.emailSender.Enqueue(ctx, cloudflareemail.EmailJob{
		JobId:    jobID,
		Template: "markdown-notice",
		Priority: cloudflareemail.PriorityNormal,
		From:     h.from,
		To:       recipients,
		Subject:  subject,
		Body:     body,
		Variables: map[string]string{
			"subject":      subject,
			"body":         body,
			"appName":      h.appName,
			"appURL":       h.appURL,
			"adminName":    h.adminName,
			"contactEmail": h.contactEmail,
			"preview":      subject,
		},
	}); err != nil {
		return err
	}
	logQueuedMail("contact_category_assigned", jobID, "", createdByUserID, subject, body, recipients, h.allowDangerously)

	return nil
}
