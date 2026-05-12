package controllers

import (
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	backendform "github.com/s-union/PortalDots/backend/internal/domain/form"
	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
	"github.com/s-union/PortalDots/backend/internal/shared/externalid"
)

type staffParticipationTypeFormResponse struct {
	ID                  string   `json:"id"`
	Name                string   `json:"name"`
	Description         string   `json:"description"`
	OpenAt              string   `json:"openAt"`
	CloseAt             string   `json:"closeAt"`
	IsPublic            bool     `json:"isPublic"`
	IsOpen              bool     `json:"isOpen"`
	MaxAnswers          int32    `json:"maxAnswers"`
	AnswerableTags      []string `json:"answerableTags"`
	ConfirmationMessage string   `json:"confirmationMessage"`
}

type staffParticipationTypeResponse struct {
	ID            string                             `json:"id"`
	Name          string                             `json:"name"`
	Description   string                             `json:"description"`
	UsersCountMin int32                              `json:"usersCountMin"`
	UsersCountMax int32                              `json:"usersCountMax"`
	Tags          []string                           `json:"tags"`
	Form          staffParticipationTypeFormResponse `json:"form"`
}

type participationTypeResponse = staffParticipationTypeResponse

type mutateStaffParticipationTypeRequest struct {
	Name                    string   `json:"name"`
	Description             string   `json:"description"`
	UsersCountMin           int32    `json:"usersCountMin"`
	UsersCountMax           int32    `json:"usersCountMax"`
	Tags                    []string `json:"tags"`
	FormDescription         string   `json:"formDescription"`
	FormConfirmationMessage string   `json:"formConfirmationMessage"`
	OpenAt                  string   `json:"openAt"`
	CloseAt                 string   `json:"closeAt"`
	IsPublic                bool     `json:"isPublic"`
}

func (h *staffCircleHandlers) listStaffParticipationTypes(c echo.Context) error {
	_, _, status, ok := h.requireParticipationTypeRead(c)
	if !ok {
		return statusError(c, status)
	}

	items, err := h.participationTypes.List()
	if err != nil {
		return internalError(c)
	}

	response := make([]staffParticipationTypeResponse, 0, len(items))
	for _, item := range items {
		formValue, found := h.forms.FindByIDForStaff(item.FormID)
		if !found {
			continue
		}
		response = append(response, mapStaffParticipationType(item, formValue))
	}

	return c.JSON(http.StatusOK, response)
}

func (h *staffCircleHandlers) getStaffParticipationType(c echo.Context) error {
	_, _, status, ok := h.requireParticipationTypeAdmin(c)
	if !ok {
		return statusError(c, status)
	}

	item, err := h.participationTypes.Find(c.Param("typeID"))
	if errors.Is(err, participationtype.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "participation_type_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	formValue, found := h.forms.FindByIDForStaff(item.FormID)
	if !found {
		return errorJSON(c, http.StatusNotFound, "form_not_found")
	}

	return c.JSON(http.StatusOK, mapStaffParticipationType(item, formValue))
}

func (h *staffCircleHandlers) listStaffParticipationTypeCircles(c echo.Context) error {
	_, _, status, ok := h.requireParticipationTypeAdmin(c)
	if !ok {
		return statusError(c, status)
	}
	filterQueries, filterMode, err := parseStaffListFilters(c.QueryParam("queries"), c.QueryParam("mode"), staffCircleFilterableFields)
	if err != nil {
		return validationError(c, map[string][]string{"queries": {"絞り込み条件が正しくありません"}})
	}

	participationType, err := h.participationTypes.Find(c.Param("typeID"))
	if errors.Is(err, participationtype.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "participation_type_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	circles, err := h.circles.ListForStaff()
	if err != nil {
		return internalError(c)
	}

	filtered := make([]staffCircleResponse, 0)
	for _, currentCircle := range circles {
		if currentCircle.ParticipationTypeID != participationType.ID {
			continue
		}
		item := mapStaffCircle(currentCircle)
		if !matchesStaffCircleSearch(item, c.QueryParam("query")) || !matchesStaffListFilters(staffCircleFilterResolver(item), filterQueries, filterMode) {
			continue
		}
		filtered = append(filtered, item)
	}
	slices.SortFunc(filtered, func(a, b staffCircleResponse) int {
		return strings.Compare(a.Name, b.Name)
	})

	return c.JSON(http.StatusOK, paginateItems(filtered, readPagination(c)))
}

func (h *staffCircleHandlers) downloadStaffParticipationTypeCirclesCSV(c echo.Context) error {
	_, _, status, ok := h.requireParticipationTypeAdmin(c)
	if !ok {
		return statusError(c, status)
	}

	participationType, err := h.participationTypes.Find(c.Param("typeID"))
	if errors.Is(err, participationtype.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "participation_type_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	circles, err := h.circles.ListForStaff()
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	rows := [][]string{{"id", "participation_type_id", "participation_type_name", "name", "name_yomi", "group_name", "group_name_yomi", "tags", "notes", "submitted_at", "status", "places"}}
	for _, currentCircle := range circles {
		if currentCircle.ParticipationTypeID != participationType.ID {
			continue
		}
		submittedAt := ""
		if currentCircle.SubmittedAt != nil {
			submittedAt = currentCircle.SubmittedAt.UTC().Format("2006-01-02T15:04:05Z07:00")
		}
		rows = append(rows, []string{
			currentCircle.ID,
			participationType.ID,
			participationType.Name,
			currentCircle.Name,
			currentCircle.NameYomi,
			currentCircle.GroupName,
			currentCircle.GroupNameYomi,
			strings.Join(currentCircle.Tags, " "),
			currentCircle.Notes,
			submittedAt,
			currentCircle.Status,
			strings.Join(currentCircle.Places, " "),
		})
	}

	csvBytes, err := writeCSV(rows)
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	filename := fmt.Sprintf("staff-participation-type-%s-circles.csv", externalid.MustEncodeUUIDString(participationType.ID))
	return csvResponse(c, filename, csvBytes)
}

func (h *staffCircleHandlers) createStaffParticipationType(c echo.Context) error {
	_, currentSession, status, ok := h.requireParticipationTypeAdmin(c)
	if !ok {
		return statusError(c, status)
	}

	request, validationErrors, valid := bindAndValidateStaffParticipationType(c)
	if !valid {
		return validationError(c, validationErrors)
	}

	formValue := h.forms.Create(
		"",
		"企画参加登録",
		request.FormDescription,
		request.IsPublic,
		request.OpenAt,
		request.CloseAt,
		1,
		[]string{},
		request.FormConfirmationMessage,
	)
	if formValue.ID == "" {
		return internalError(c)
	}

	item, err := h.participationTypes.Create(
		request.Name,
		request.Description,
		request.UsersCountMin,
		request.UsersCountMax,
		request.Tags,
		formValue.ID,
	)
	if err != nil {
		return internalError(c)
	}

	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.participation_type.created",
		"participation_type",
		item.ID,
		"",
		buildActivitySummary("staff が参加種別を作成しました", item.Name),
	)

	return c.JSON(http.StatusCreated, mapStaffParticipationType(item, formValue))
}

func (h *staffCircleHandlers) updateStaffParticipationType(c echo.Context) error {
	_, currentSession, status, ok := h.requireParticipationTypeAdmin(c)
	if !ok {
		return statusError(c, status)
	}

	item, err := h.participationTypes.Find(c.Param("typeID"))
	if errors.Is(err, participationtype.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "participation_type_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	request, validationErrors, valid := bindAndValidateStaffParticipationType(c)
	if !valid {
		return validationError(c, validationErrors)
	}

	updatedForm, ok := h.forms.UpdateByID(
		item.FormID,
		"企画参加登録",
		request.FormDescription,
		request.IsPublic,
		request.OpenAt,
		request.CloseAt,
		1,
		[]string{},
		request.FormConfirmationMessage,
	)
	if !ok {
		return errorJSON(c, http.StatusNotFound, "form_not_found")
	}

	updatedType, err := h.participationTypes.Update(
		item.ID,
		request.Name,
		request.Description,
		request.UsersCountMin,
		request.UsersCountMax,
		request.Tags,
	)
	if errors.Is(err, participationtype.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "participation_type_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.participation_type.updated",
		"participation_type",
		updatedType.ID,
		"",
		buildActivitySummary("staff が参加種別を更新しました", updatedType.Name),
	)

	return c.JSON(http.StatusOK, mapStaffParticipationType(updatedType, updatedForm))
}

func (h *staffCircleHandlers) deleteStaffParticipationType(c echo.Context) error {
	_, currentSession, status, ok := h.requireParticipationTypeAdmin(c)
	if !ok {
		return statusError(c, status)
	}

	item, err := h.participationTypes.Find(c.Param("typeID"))
	if errors.Is(err, participationtype.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "participation_type_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	if err := h.participationTypes.Delete(item.ID); errors.Is(err, participationtype.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "participation_type_not_found")
	} else if err != nil {
		return internalError(c)
	}

	if deleted := h.forms.Delete("", item.FormID); !deleted {
		return errorJSON(c, http.StatusNotFound, "form_not_found")
	}

	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.participation_type.deleted",
		"participation_type",
		item.ID,
		"",
		buildActivitySummary("staff が参加種別を削除しました", item.Name),
	)

	return c.NoContent(http.StatusNoContent)
}

func bindAndValidateStaffParticipationType(c echo.Context) (mutateStaffParticipationTypeRequest, map[string][]string, bool) {
	var request mutateStaffParticipationTypeRequest
	if err := c.Bind(&request); err != nil {
		return mutateStaffParticipationTypeRequest{}, map[string][]string{"request": {"invalid_request"}}, false
	}

	request.Name = strings.TrimSpace(request.Name)
	request.Description = strings.TrimSpace(request.Description)
	request.FormDescription = strings.TrimSpace(request.FormDescription)
	request.FormConfirmationMessage = strings.TrimSpace(request.FormConfirmationMessage)
	request.OpenAt = strings.TrimSpace(request.OpenAt)
	request.CloseAt = strings.TrimSpace(request.CloseAt)

	errors := map[string][]string{}
	if request.Name == "" {
		errors["name"] = []string{"参加種別名を入力してください"}
	}
	if request.UsersCountMin < 1 {
		errors["usersCountMin"] = []string{"最低人数は 1 以上で入力してください"}
	}
	if request.UsersCountMax < request.UsersCountMin {
		errors["usersCountMax"] = []string{"最大人数は最低人数以上で入力してください"}
	}
	if request.OpenAt == "" {
		errors["openAt"] = []string{"受付開始日時を入力してください"}
	}
	if request.CloseAt == "" {
		errors["closeAt"] = []string{"受付終了日時を入力してください"}
	}
	if request.OpenAt != "" && request.CloseAt != "" {
		openAt, openErr := time.Parse(time.RFC3339, request.OpenAt)
		closeAt, closeErr := time.Parse(time.RFC3339, request.CloseAt)
		if openErr != nil {
			errors["openAt"] = []string{"受付開始日時は RFC3339 形式で入力してください"}
		}
		if closeErr != nil {
			errors["closeAt"] = []string{"受付終了日時は RFC3339 形式で入力してください"}
		}
		if openErr == nil && closeErr == nil && !closeAt.After(openAt) {
			errors["closeAt"] = []string{"受付終了日時は開始日時より後にしてください"}
		}
	}

	request.Tags = normalizeParticipationTypeTags(request.Tags)
	return request, errors, len(errors) == 0
}

func mapParticipationType(item participationtype.ParticipationType, formValue backendform.Form) participationTypeResponse {
	return participationTypeResponse{
		ID:            item.ID,
		Name:          item.Name,
		Description:   item.Description,
		UsersCountMin: item.UsersCountMin,
		UsersCountMax: item.UsersCountMax,
		Tags:          append([]string{}, item.Tags...),
		Form: staffParticipationTypeFormResponse{
			ID:                  formValue.ID,
			Name:                formValue.Name,
			Description:         formValue.Description,
			OpenAt:              formValue.OpenAt,
			CloseAt:             formValue.CloseAt,
			IsPublic:            formValue.IsPublic,
			IsOpen:              formValue.IsOpen,
			MaxAnswers:          formValue.MaxAnswers,
			AnswerableTags:      append([]string{}, formValue.AnswerableTags...),
			ConfirmationMessage: formValue.ConfirmationMessage,
		},
	}
}

func mapStaffParticipationType(item participationtype.ParticipationType, formValue backendform.Form) staffParticipationTypeResponse {
	return mapParticipationType(item, formValue)
}

func normalizeParticipationTypeTags(tags []string) []string {
	normalized := make([]string, 0, len(tags))
	seen := map[string]struct{}{}
	for _, tag := range tags {
		trimmed := strings.TrimSpace(tag)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		normalized = append(normalized, trimmed)
	}
	return normalized
}
