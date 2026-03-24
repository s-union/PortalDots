package controllers

import (
	"encoding/csv"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	backendform "github.com/s-union/PortalDots/backend/internal/domain/form"
	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
)

type staffFormSummaryResponse struct {
	ID                  string `json:"id"`
	Name                string `json:"name"`
	OpenAt              string `json:"openAt"`
	CloseAt             string `json:"closeAt"`
	IsPublic            bool   `json:"isPublic"`
	IsOpen              bool   `json:"isOpen"`
	MaxAnswers          int32  `json:"maxAnswers"`
	IsParticipationForm bool   `json:"isParticipationForm"`
}

type staffFormAnswerResponse struct {
	ID        string                     `json:"id"`
	Body      string                     `json:"body"`
	CreatedAt string                     `json:"createdAt"`
	UpdatedAt string                     `json:"updatedAt"`
	Details   map[string][]string        `json:"details"`
	Uploads   []formAnswerUploadResponse `json:"uploads"`
}

type staffFormDetailResponse struct {
	ID                  string                   `json:"id"`
	Name                string                   `json:"name"`
	Description         string                   `json:"description"`
	OpenAt              string                   `json:"openAt"`
	CloseAt             string                   `json:"closeAt"`
	IsPublic            bool                     `json:"isPublic"`
	IsOpen              bool                     `json:"isOpen"`
	MaxAnswers          int32                    `json:"maxAnswers"`
	AnswerableTags      []string                 `json:"answerableTags"`
	ConfirmationMessage string                   `json:"confirmationMessage"`
	IsParticipationForm bool                     `json:"isParticipationForm"`
	Questions           []staffFormQuestion      `json:"questions"`
	Answer              *staffFormAnswerResponse `json:"answer"`
}

type staffFormQuestion struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Type         string   `json:"type"`
	IsRequired   bool     `json:"isRequired"`
	NumberMin    *int32   `json:"numberMin"`
	NumberMax    *int32   `json:"numberMax"`
	AllowedTypes string   `json:"allowedTypes"`
	Options      []string `json:"options"`
	Priority     int32    `json:"priority"`
	CreatedAt    string   `json:"createdAt"`
	UpdatedAt    string   `json:"updatedAt"`
}

type createStaffFormQuestionRequest struct {
	Type string `json:"type"`
}

type updateStaffFormQuestionRequest struct {
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Type         string   `json:"type"`
	IsRequired   bool     `json:"isRequired"`
	NumberMin    *int32   `json:"numberMin"`
	NumberMax    *int32   `json:"numberMax"`
	AllowedTypes string   `json:"allowedTypes"`
	Options      []string `json:"options"`
	Priority     int32    `json:"priority"`
}

type reorderStaffFormQuestionsRequest struct {
	QuestionIDs []string `json:"questionIds"`
}

type mutateStaffFormRequest struct {
	Name                string   `json:"name"`
	Description         string   `json:"description"`
	OpenAt              string   `json:"openAt"`
	CloseAt             string   `json:"closeAt"`
	IsPublic            bool     `json:"isPublic"`
	MaxAnswers          int32    `json:"maxAnswers"`
	AnswerableTags      []string `json:"answerableTags"`
	ConfirmationMessage string   `json:"confirmationMessage"`
}

func (h *staffFormHandlers) listStaffForms(c echo.Context) error {
	_, _, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canReadForms)
	if !ok {
		return statusError(c, status)
	}

	forms := h.forms.ListByCircleForStaff(selectedCircle.ID)
	response := make([]staffFormSummaryResponse, 0, len(forms))
	for _, currentForm := range forms {
		if h.isParticipationForm(currentForm.ID) {
			continue
		}
		response = append(response, h.mapStaffFormSummary(currentForm))
	}

	return c.JSON(http.StatusOK, response)
}

func (h *staffFormHandlers) getStaffForm(c echo.Context) error {
	_, _, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canReadForms)
	if !ok {
		return statusError(c, status)
	}

	form, found := h.findStaffFormForManagement(selectedCircle.ID, c.Param("formID"), true)
	if !found {
		return errorJSON(c, http.StatusNotFound, "form_not_found")
	}

	questions, err := h.formQuestions.List(form.ID)
	if err != nil {
		return internalError(c)
	}

	var answerResponse *staffFormAnswerResponse
	if answerValue, found := h.answers.Get(form.ID, selectedCircle.ID); found {
		answerResponse = &staffFormAnswerResponse{
			ID:        answerValue.ID,
			Body:      answerValue.Body,
			CreatedAt: answerValue.CreatedAt,
			UpdatedAt: answerValue.UpdatedAt,
			Details:   cloneAnswerDetails(answerValue.Details),
			Uploads:   mapFormAnswerUploads(h.answers.ListUploads(form.ID, selectedCircle.ID)),
		}
	}

	return c.JSON(http.StatusOK, h.buildStaffFormDetailResponse(form, questions, answerResponse))
}

func (h *staffFormHandlers) createStaffForm(c echo.Context) error {
	_, currentSession, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canEditForms)
	if !ok {
		return statusError(c, status)
	}

	request, validationErrors, valid := bindAndValidateStaffForm(c)
	if !valid {
		return validationError(c, validationErrors)
	}

	created := h.forms.Create(
		selectedCircle.ID,
		request.Name,
		request.Description,
		request.IsPublic,
		request.OpenAt,
		request.CloseAt,
		request.MaxAnswers,
		request.AnswerableTags,
		request.ConfirmationMessage,
	)
	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.form.created",
		"form",
		created.ID,
		selectedCircle.ID,
		buildActivitySummary("staff がフォームを作成しました", created.Name),
	)

	return c.JSON(http.StatusCreated, h.mapStaffFormSummary(created))
}

func (h *staffFormHandlers) updateStaffForm(c echo.Context) error {
	_, currentSession, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canEditForms)
	if !ok {
		return statusError(c, status)
	}

	request, validationErrors, valid := bindAndValidateStaffForm(c)
	if !valid {
		return validationError(c, validationErrors)
	}

	formValue, found := h.findStaffFormForManagement(selectedCircle.ID, c.Param("formID"), true)
	if !found {
		return errorJSON(c, http.StatusNotFound, "form_not_found")
	}
	if h.isParticipationForm(formValue.ID) {
		return errorJSON(c, http.StatusBadRequest, "participation_form_locked")
	}

	updated, found := h.forms.Update(
		selectedCircle.ID,
		c.Param("formID"),
		request.Name,
		request.Description,
		request.IsPublic,
		request.OpenAt,
		request.CloseAt,
		request.MaxAnswers,
		request.AnswerableTags,
		request.ConfirmationMessage,
	)
	if !found {
		return errorJSON(c, http.StatusNotFound, "form_not_found")
	}

	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.form.updated",
		"form",
		updated.ID,
		selectedCircle.ID,
		buildActivitySummary("staff がフォームを更新しました", updated.Name),
	)

	return c.JSON(http.StatusOK, h.mapStaffFormSummary(updated))
}

func (h *staffFormHandlers) previewStaffForm(c echo.Context) error {
	_, _, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canReadForms)
	if !ok {
		return statusError(c, status)
	}

	formValue, found := h.findStaffFormForManagement(selectedCircle.ID, c.Param("formID"), true)
	if !found {
		return errorJSON(c, http.StatusNotFound, "form_not_found")
	}

	questions, err := h.formQuestions.List(formValue.ID)
	if err != nil {
		return internalError(c)
	}

	return c.JSON(http.StatusOK, formDetailResponse{
		ID:          formValue.ID,
		Name:        formValue.Name,
		Description: formValue.Description,
		OpenAt:      formValue.OpenAt,
		CloseAt:     formValue.CloseAt,
		IsPublic:    formValue.IsPublic,
		IsOpen:      formValue.IsOpen,
		MaxAnswers:  formValue.MaxAnswers,
		Questions:   mapStaffFormQuestions(questions),
	})
}

func (h *staffFormHandlers) copyStaffForm(c echo.Context) error {
	_, currentSession, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canDuplicateForms)
	if !ok {
		return statusError(c, status)
	}

	source, found := h.findStaffFormForManagement(selectedCircle.ID, c.Param("formID"), true)
	if !found {
		return errorJSON(c, http.StatusNotFound, "form_not_found")
	}
	if h.isParticipationForm(source.ID) {
		return errorJSON(c, http.StatusBadRequest, "participation_form_locked")
	}

	sourceQuestions, err := h.formQuestions.List(source.ID)
	if err != nil {
		return internalError(c)
	}

	copied := h.forms.Create(
		selectedCircle.ID,
		source.Name+" (コピー)",
		source.Description,
		source.IsPublic,
		source.OpenAt,
		source.CloseAt,
		source.MaxAnswers,
		source.AnswerableTags,
		source.ConfirmationMessage,
	)
	if copied.ID == "" {
		return errorJSON(c, http.StatusInternalServerError, "copy_failed")
	}

	for _, sourceQuestion := range sourceQuestions {
		created, err := h.formQuestions.Create(copied.ID, sourceQuestion.Type)
		if err != nil {
			return errorJSON(c, http.StatusInternalServerError, "copy_failed")
		}
		created.Name = sourceQuestion.Name
		created.Description = sourceQuestion.Description
		created.IsRequired = sourceQuestion.IsRequired
		created.NumberMin = sourceQuestion.NumberMin
		created.NumberMax = sourceQuestion.NumberMax
		created.AllowedTypes = sourceQuestion.AllowedTypes
		created.Options = slices.Clone(sourceQuestion.Options)
		created.Priority = sourceQuestion.Priority
		if _, err := h.formQuestions.Update(created); err != nil {
			return errorJSON(c, http.StatusInternalServerError, "copy_failed")
		}
	}

	if len(sourceQuestions) > 0 {
		orderedQuestionIDs, err := questionIDsByPriority(h.formQuestions.List(copied.ID))
		if err != nil {
			return errorJSON(c, http.StatusInternalServerError, "copy_failed")
		}
		if err := h.formQuestions.ReplaceOrder(copied.ID, orderedQuestionIDs); err != nil {
			return errorJSON(c, http.StatusInternalServerError, "copy_failed")
		}
	}

	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.form.copied",
		"form",
		copied.ID,
		selectedCircle.ID,
		buildActivitySummary("staff がフォームを複製しました", copied.Name),
	)

	return c.JSON(http.StatusCreated, h.mapStaffFormSummary(copied))
}

func (h *staffFormHandlers) deleteStaffForm(c echo.Context) error {
	_, currentSession, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canDeleteForms)
	if !ok {
		return statusError(c, status)
	}

	formValue, found := h.findStaffFormForManagement(selectedCircle.ID, c.Param("formID"), true)
	if !found {
		return errorJSON(c, http.StatusNotFound, "form_not_found")
	}
	if h.isParticipationForm(formValue.ID) {
		return errorJSON(c, http.StatusBadRequest, "participation_form_locked")
	}
	if deleted := h.forms.Delete(selectedCircle.ID, formValue.ID); !deleted {
		return errorJSON(c, http.StatusNotFound, "form_not_found")
	}

	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.form.deleted",
		"form",
		formValue.ID,
		selectedCircle.ID,
		buildActivitySummary("staff がフォームを削除しました", formValue.Name),
	)

	return c.NoContent(http.StatusNoContent)
}

func (h *staffFormHandlers) downloadStaffFormsCSV(c echo.Context) error {
	_, _, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canExportForms)
	if !ok {
		return statusError(c, status)
	}

	rows := append([][]string{{
		"フォームID",
		"フォーム名",
		"公開",
		"受付状態",
		"受付開始日時",
		"受付終了日時",
		"最大回答数",
		"回答可能タグ",
		"完了メッセージ",
	}}, staffFormRowsExtended(h.filterEditableStaffForms(h.forms.ListByCircleForStaff(selectedCircle.ID)))...)

	buffer := strings.Builder{}
	writer := csv.NewWriter(&buffer)
	if err := writer.WriteAll(rows); err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	filename := fmt.Sprintf("%s-forms.csv", selectedCircle.ID)
	c.Response().Header().Set(echo.HeaderContentType, "text/csv; charset=utf-8")
	c.Response().Header().Set(echo.HeaderContentDisposition, fmt.Sprintf("attachment; filename=%q", filename))
	return c.Blob(http.StatusOK, "text/csv; charset=utf-8", []byte(buffer.String()))
}

func (h *staffFormHandlers) downloadStaffFormUpload(c echo.Context) error {
	_, _, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canReadForms)
	if !ok {
		return statusError(c, status)
	}

	if _, found := h.forms.FindByCircleForStaff(selectedCircle.ID, c.Param("formID")); !found {
		return errorJSON(c, http.StatusNotFound, "form_not_found")
	}

	upload, found := h.answers.FindUpload(c.Param("formID"), selectedCircle.ID, c.Param("uploadID"))
	if !found {
		return errorJSON(c, http.StatusNotFound, "upload_not_found")
	}

	c.Response().Header().Set(echo.HeaderContentDisposition, `attachment; filename="`+upload.Filename+`"`)
	return c.Blob(http.StatusOK, upload.MimeType, upload.Content)
}

func (h *staffFormHandlers) createStaffFormQuestion(c echo.Context) error {
	_, currentSession, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canEditForms)
	if !ok {
		return statusError(c, status)
	}

	formValue, found := h.findStaffFormForManagement(selectedCircle.ID, c.Param("formID"), true)
	if !found {
		return errorJSON(c, http.StatusNotFound, "form_not_found")
	}

	var request createStaffFormQuestionRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}
	request.Type = strings.TrimSpace(request.Type)
	if !slices.Contains(formquestion.AllowedTypes, request.Type) {
		return validationError(c, map[string][]string{"type": {"設問タイプが不正です"}})
	}

	created, err := h.formQuestions.Create(formValue.ID, request.Type)
	if err != nil {
		return internalError(c)
	}

	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.form.question.created",
		"form_question",
		created.ID,
		selectedCircle.ID,
		buildActivitySummary("staff がフォーム設問を追加しました", formValue.Name),
	)

	return c.JSON(http.StatusCreated, mapStaffFormQuestion(created))
}

func (h *staffFormHandlers) updateStaffFormQuestion(c echo.Context) error {
	_, currentSession, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canEditForms)
	if !ok {
		return statusError(c, status)
	}

	formValue, found := h.findStaffFormForManagement(selectedCircle.ID, c.Param("formID"), true)
	if !found {
		return errorJSON(c, http.StatusNotFound, "form_not_found")
	}

	var request updateStaffFormQuestionRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	request.Name = strings.TrimSpace(request.Name)
	request.Description = strings.TrimSpace(request.Description)
	request.Type = strings.TrimSpace(request.Type)
	request.AllowedTypes = strings.TrimSpace(request.AllowedTypes)
	request.Options = normalizeQuestionOptions(request.Options)

	validationErrors := validateStaffFormQuestionRequest(request)
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	updated, err := h.formQuestions.Update(formquestion.Question{
		ID:           c.Param("questionID"),
		FormID:       formValue.ID,
		Name:         request.Name,
		Description:  request.Description,
		Type:         request.Type,
		IsRequired:   request.IsRequired,
		NumberMin:    request.NumberMin,
		NumberMax:    request.NumberMax,
		AllowedTypes: request.AllowedTypes,
		Options:      request.Options,
		Priority:     request.Priority,
	})
	if errors.Is(err, formquestion.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "question_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.form.question.updated",
		"form_question",
		updated.ID,
		selectedCircle.ID,
		buildActivitySummary("staff がフォーム設問を更新しました", formValue.Name),
	)

	return c.JSON(http.StatusOK, mapStaffFormQuestion(updated))
}

func (h *staffFormHandlers) deleteStaffFormQuestion(c echo.Context) error {
	_, currentSession, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canEditForms)
	if !ok {
		return statusError(c, status)
	}

	formValue, found := h.findStaffFormForManagement(selectedCircle.ID, c.Param("formID"), true)
	if !found {
		return errorJSON(c, http.StatusNotFound, "form_not_found")
	}

	if err := h.formQuestions.Delete(formValue.ID, c.Param("questionID")); errors.Is(err, formquestion.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "question_not_found")
	} else if err != nil {
		return internalError(c)
	}

	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.form.question.deleted",
		"form_question",
		c.Param("questionID"),
		selectedCircle.ID,
		buildActivitySummary("staff がフォーム設問を削除しました", formValue.Name),
	)

	return c.NoContent(http.StatusNoContent)
}

func (h *staffFormHandlers) reorderStaffFormQuestions(c echo.Context) error {
	_, currentSession, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canEditForms)
	if !ok {
		return statusError(c, status)
	}

	formValue, found := h.findStaffFormForManagement(selectedCircle.ID, c.Param("formID"), true)
	if !found {
		return errorJSON(c, http.StatusNotFound, "form_not_found")
	}

	var request reorderStaffFormQuestionsRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	if len(request.QuestionIDs) == 0 {
		return validationError(c, map[string][]string{"questionIds": {"並び順を指定してください"}})
	}

	for index := range request.QuestionIDs {
		request.QuestionIDs[index] = strings.TrimSpace(request.QuestionIDs[index])
	}

	if err := h.formQuestions.ReplaceOrder(formValue.ID, request.QuestionIDs); errors.Is(err, formquestion.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "question_not_found")
	} else if err != nil {
		return internalError(c)
	}

	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.form.question.reordered",
		"form",
		formValue.ID,
		selectedCircle.ID,
		buildActivitySummary("staff がフォーム設問の順序を更新しました", formValue.Name),
	)

	return c.NoContent(http.StatusNoContent)
}

func (h *staffFormHandlers) mapStaffFormSummary(formValue backendform.Form) staffFormSummaryResponse {
	return staffFormSummaryResponse{
		ID:                  formValue.ID,
		Name:                formValue.Name,
		OpenAt:              formValue.OpenAt,
		CloseAt:             formValue.CloseAt,
		IsPublic:            formValue.IsPublic,
		IsOpen:              formValue.IsOpen,
		MaxAnswers:          formValue.MaxAnswers,
		IsParticipationForm: h.isParticipationForm(formValue.ID),
	}
}

func mapStaffFormQuestions(questions []formquestion.Question) []staffFormQuestion {
	response := make([]staffFormQuestion, 0, len(questions))
	for _, question := range questions {
		response = append(response, mapStaffFormQuestion(question))
	}
	return response
}

func staffFormRowsExtended(forms []backendform.Form) [][]string {
	rows := make([][]string, 0, len(forms))
	for _, currentForm := range forms {
		rows = append(rows, []string{
			currentForm.ID,
			currentForm.Name,
			visibilityLabel(currentForm.IsPublic),
			formStatus(currentForm.IsOpen),
			currentForm.OpenAt,
			currentForm.CloseAt,
			fmt.Sprintf("%d", currentForm.MaxAnswers),
			strings.Join(currentForm.AnswerableTags, ","),
			singleLine(currentForm.ConfirmationMessage),
		})
	}
	return rows
}

func (h *staffFormHandlers) filterEditableStaffForms(forms []backendform.Form) []backendform.Form {
	filtered := make([]backendform.Form, 0, len(forms))
	for _, currentForm := range forms {
		if h.isParticipationForm(currentForm.ID) {
			continue
		}
		filtered = append(filtered, currentForm)
	}

	return filtered
}

func (h *staffFormHandlers) findStaffFormForManagement(selectedCircleID, formID string, allowParticipation bool) (backendform.Form, bool) {
	if formValue, found := h.forms.FindByCircleForStaff(selectedCircleID, formID); found {
		return formValue, true
	}
	if !allowParticipation {
		return backendform.Form{}, false
	}

	formValue, found := h.forms.FindByIDForStaff(formID)
	if !found || !h.isParticipationForm(formValue.ID) {
		return backendform.Form{}, false
	}

	return formValue, true
}

func questionIDsByPriority(questions []formquestion.Question, err error) ([]string, error) {
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(questions))
	for _, question := range questions {
		ids = append(ids, question.ID)
	}
	return ids, nil
}

func mapStaffFormQuestion(question formquestion.Question) staffFormQuestion {
	return staffFormQuestion{
		ID:           question.ID,
		Name:         question.Name,
		Description:  question.Description,
		Type:         question.Type,
		IsRequired:   question.IsRequired,
		NumberMin:    question.NumberMin,
		NumberMax:    question.NumberMax,
		AllowedTypes: question.AllowedTypes,
		Options:      slices.Clone(question.Options),
		Priority:     question.Priority,
		CreatedAt:    question.CreatedAt,
		UpdatedAt:    question.UpdatedAt,
	}
}

func parseRFC3339Field(value string) (time.Time, bool) {
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return time.Time{}, false
	}

	return parsed, true
}

func bindAndValidateStaffForm(c echo.Context) (mutateStaffFormRequest, map[string][]string, bool) {
	var request mutateStaffFormRequest
	if err := c.Bind(&request); err != nil {
		return mutateStaffFormRequest{}, map[string][]string{
			"request": {"invalid_request"},
		}, false
	}

	request.Name = strings.TrimSpace(request.Name)
	request.Description = strings.TrimSpace(request.Description)
	request.OpenAt = strings.TrimSpace(request.OpenAt)
	request.CloseAt = strings.TrimSpace(request.CloseAt)
	request.ConfirmationMessage = strings.TrimSpace(request.ConfirmationMessage)
	request.AnswerableTags = normalizeTags(request.AnswerableTags)

	errors := map[string][]string{}
	if request.Name == "" {
		errors["name"] = []string{"フォーム名を入力してください"}
	}
	if request.MaxAnswers < 1 {
		errors["maxAnswers"] = []string{"回答可能数は 1 以上にしてください"}
	}
	openAt, openOK := parseRFC3339Field(request.OpenAt)
	if !openOK {
		errors["openAt"] = []string{"開始日時は RFC3339 形式で入力してください"}
	}
	closeAt, closeOK := parseRFC3339Field(request.CloseAt)
	if !closeOK {
		errors["closeAt"] = []string{"締切日時は RFC3339 形式で入力してください"}
	}
	if openOK && closeOK && !openAt.Before(closeAt) {
		errors["closeAt"] = []string{"締切日時は開始日時より後にしてください"}
	}

	return request, errors, len(errors) == 0
}

func normalizeTags(tags []string) []string {
	normalized := make([]string, 0, len(tags))
	for _, tag := range tags {
		trimmed := strings.TrimSpace(tag)
		if trimmed == "" {
			continue
		}
		normalized = append(normalized, trimmed)
	}
	return normalized
}

func validateStaffFormQuestionRequest(request updateStaffFormQuestionRequest) map[string][]string {
	errors := map[string][]string{}
	if !slices.Contains(formquestion.AllowedTypes, request.Type) {
		errors["type"] = []string{"設問タイプが不正です"}
	}
	if request.Type != "heading" && request.Name == "" {
		errors["name"] = []string{"設問名を入力してください"}
	}
	if request.Type == "number" && request.NumberMin != nil && request.NumberMax != nil && *request.NumberMin > *request.NumberMax {
		errors["numberMax"] = []string{"最大値は最小値以上にしてください"}
	}
	if (request.Type == "radio" || request.Type == "select" || request.Type == "checkbox") && len(request.Options) == 0 {
		errors["options"] = []string{"選択肢を 1 つ以上指定してください"}
	}
	if request.Type != "upload" {
		request.AllowedTypes = ""
	}

	return errors
}

func normalizeQuestionOptions(options []string) []string {
	normalized := make([]string, 0, len(options))
	for _, option := range options {
		trimmed := strings.TrimSpace(option)
		if trimmed == "" {
			continue
		}
		normalized = append(normalized, trimmed)
	}
	return normalized
}
