package controllers

import (
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"slices"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/answer"
	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
)

type formAnswerEnvelopeResponse struct {
	Answer *formAnswerResponse `json:"answer"`
}

type formAnswersResponse struct {
	Answers []formAnswerResponse `json:"answers"`
}

type formAnswerResponse struct {
	ID        string                     `json:"id"`
	Body      string                     `json:"body"`
	UpdatedAt string                     `json:"updatedAt"`
	Details   map[string][]string        `json:"details"`
	Uploads   []formAnswerUploadResponse `json:"uploads"`
}

type upsertFormAnswerRequest struct {
	Body    string         `json:"body"`
	Details map[string]any `json:"details"`
}

type formAnswerUploadResponse struct {
	ID         string `json:"id"`
	QuestionID string `json:"questionId"`
	Filename   string `json:"filename"`
	MimeType   string `json:"mimeType"`
	SizeBytes  int64  `json:"sizeBytes"`
	CreatedAt  string `json:"createdAt"`
}

const maxAnswerUploadBytes = 5 * 1024 * 1024

func (h *workspaceHandlers) getFormAnswer(c echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	answerValue, found := h.answers.Get(currentForm.ID, currentSession.CurrentCircleID)
	if !found {
		return c.JSON(http.StatusOK, formAnswerEnvelopeResponse{
			Answer: nil,
		})
	}

	return c.JSON(http.StatusOK, formAnswerEnvelopeResponse{
		Answer: buildFormAnswerResponse(answerValue, h.answers.ListUploads(currentForm.ID, currentSession.CurrentCircleID)),
	})
}

func (h *workspaceHandlers) listFormAnswers(c echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	answers := h.answers.ListByFormAndCircle(currentForm.ID, currentSession.CurrentCircleID)
	response := make([]formAnswerResponse, 0, len(answers))
	for _, answerValue := range answers {
		mapped := buildFormAnswerResponse(answerValue, h.answers.ListUploadsByAnswer(answerValue.ID))
		if mapped == nil {
			continue
		}
		response = append(response, *mapped)
	}

	return c.JSON(http.StatusOK, formAnswersResponse{
		Answers: response,
	})
}

func (h *workspaceHandlers) getFormAnswerByID(c echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	answerValue, found := h.answers.Find(c.Param("answerID"))
	if !found || answerValue.FormID != currentForm.ID || answerValue.CircleID != currentSession.CurrentCircleID {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	return c.JSON(http.StatusOK, formAnswerEnvelopeResponse{
		Answer: buildFormAnswerResponse(answerValue, h.answers.ListUploadsByAnswer(answerValue.ID)),
	})
}

func (h *workspaceHandlers) createFormAnswer(c echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveWritableCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	existingAnswers := h.answers.ListByFormAndCircle(currentForm.ID, currentSession.CurrentCircleID)
	if currentForm.MaxAnswers > 0 && int32(len(existingAnswers)) >= currentForm.MaxAnswers {
		return validationError(c, map[string][]string{
			"answer": {"max_answers_exceeded"},
		})
	}

	created := h.answers.Create(currentForm.ID, currentSession.CurrentCircleID, "", map[string][]string{})
	return c.JSON(http.StatusCreated, formAnswerEnvelopeResponse{
		Answer: buildFormAnswerResponse(created, nil),
	})
}

func (h *workspaceHandlers) upsertFormAnswer(c echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveWritableCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	var request upsertFormAnswerRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	questions, err := h.formQuestions.List(currentForm.ID)
	if err != nil {
		return internalError(c)
	}
	questions = filterWorkspaceFormQuestions(questions)

	existingUploads := h.answers.ListUploads(currentForm.ID, currentSession.CurrentCircleID)
	trimmedBody := strings.TrimSpace(request.Body)
	if len(questions) == 0 {
		if trimmedBody == "" {
			return validationError(c, map[string][]string{
				"body": {"回答を入力してください"},
			})
		}

		answerValue := h.answers.Upsert(currentForm.ID, currentSession.CurrentCircleID, trimmedBody, map[string][]string{})
		return c.JSON(http.StatusOK, formAnswerEnvelopeResponse{
			Answer: buildFormAnswerResponse(answerValue, existingUploads),
		})
	}

	normalizedDetails, validationErrors := normalizeAnswerDetails(request.Details, questions, existingUploads)
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	summaryBody := buildAnswerSummary(questions, normalizedDetails, existingUploads)
	answerValue := h.answers.Upsert(currentForm.ID, currentSession.CurrentCircleID, summaryBody, normalizedDetails)
	return c.JSON(http.StatusOK, formAnswerEnvelopeResponse{
		Answer: buildFormAnswerResponse(answerValue, h.answers.ListUploads(currentForm.ID, currentSession.CurrentCircleID)),
	})
}

func (h *workspaceHandlers) updateFormAnswer(c echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveWritableCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	answerValue, found := h.answers.Find(c.Param("answerID"))
	if !found || answerValue.FormID != currentForm.ID || answerValue.CircleID != currentSession.CurrentCircleID {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	var request upsertFormAnswerRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	questions, err := h.formQuestions.List(currentForm.ID)
	if err != nil {
		return internalError(c)
	}
	questions = filterWorkspaceFormQuestions(questions)

	existingUploads := h.answers.ListUploadsByAnswer(answerValue.ID)
	trimmedBody := strings.TrimSpace(request.Body)
	if len(questions) == 0 {
		if trimmedBody == "" {
			return validationError(c, map[string][]string{
				"body": {"回答を入力してください"},
			})
		}

		updatedAnswer, updated := h.answers.Update(answerValue.ID, trimmedBody, map[string][]string{})
		if !updated {
			return errorJSON(c, http.StatusNotFound, "answer_not_found")
		}

		return c.JSON(http.StatusOK, formAnswerEnvelopeResponse{
			Answer: buildFormAnswerResponse(updatedAnswer, existingUploads),
		})
	}

	normalizedDetails, validationErrors := normalizeAnswerDetails(request.Details, questions, existingUploads)
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	summaryBody := buildAnswerSummary(questions, normalizedDetails, existingUploads)
	updatedAnswer, updated := h.answers.Update(answerValue.ID, summaryBody, normalizedDetails)
	if !updated {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	return c.JSON(http.StatusOK, formAnswerEnvelopeResponse{
		Answer: buildFormAnswerResponse(updatedAnswer, h.answers.ListUploadsByAnswer(answerValue.ID)),
	})
}

func (h *workspaceHandlers) uploadFormAnswerFile(c echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveWritableCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	questions, err := h.formQuestions.List(currentForm.ID)
	if err != nil {
		return internalError(c)
	}
	questions = filterWorkspaceFormQuestions(questions)

	questionID := strings.TrimSpace(c.FormValue("questionId"))
	uploadQuestion := formquestion.Question{}
	if len(questions) > 0 {
		var found bool
		uploadQuestion, found = findUploadQuestion(questions, questionID)
		if !found {
			return validationError(c, map[string][]string{
				"questionId": {"アップロード先の設問が不正です"},
			})
		}
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return validationError(c, map[string][]string{
			"file": {"ファイルを選択してください"},
		})
	}

	filename := strings.TrimSpace(fileHeader.Filename)
	if filename == "" {
		return validationError(c, map[string][]string{
			"file": {"ファイル名が不正です"},
		})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}
	defer file.Close()

	content, err := io.ReadAll(io.LimitReader(file, maxAnswerUploadBytes+1))
	if err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}
	if len(content) == 0 {
		return validationError(c, map[string][]string{
			"file": {"空のファイルはアップロードできません"},
		})
	}
	if len(content) > maxAnswerUploadBytes {
		return validationError(c, map[string][]string{
			"file": {"ファイルサイズは 5MB 以下にしてください"},
		})
	}

	if len(questions) > 0 {
		if uploadValidationMessage := validateUploadExtension(uploadQuestion, filename); uploadValidationMessage != "" {
			return validationError(c, map[string][]string{
				"file": {uploadValidationMessage},
			})
		}
	}

	mimeType := strings.TrimSpace(fileHeader.Header.Get(echo.HeaderContentType))
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	upload, created := h.answers.AddUpload(currentForm.ID, currentSession.CurrentCircleID, questionID, filename, mimeType, content)
	if !created {
		return internalError(c)
	}

	return c.JSON(http.StatusCreated, mapFormAnswerUpload(upload))
}

func (h *workspaceHandlers) uploadFormAnswerFileByID(c echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveWritableCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	answerValue, found := h.answers.Find(c.Param("answerID"))
	if !found || answerValue.FormID != currentForm.ID || answerValue.CircleID != currentSession.CurrentCircleID {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	questions, err := h.formQuestions.List(currentForm.ID)
	if err != nil {
		return internalError(c)
	}
	questions = filterWorkspaceFormQuestions(questions)

	questionID := strings.TrimSpace(c.FormValue("questionId"))
	uploadQuestion := formquestion.Question{}
	if len(questions) > 0 {
		var uploadQuestionFound bool
		uploadQuestion, uploadQuestionFound = findUploadQuestion(questions, questionID)
		if !uploadQuestionFound {
			return validationError(c, map[string][]string{
				"questionId": {"アップロード先の設問が不正です"},
			})
		}
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return validationError(c, map[string][]string{
			"file": {"ファイルを選択してください"},
		})
	}

	filename := strings.TrimSpace(fileHeader.Filename)
	if filename == "" {
		return validationError(c, map[string][]string{
			"file": {"ファイル名が不正です"},
		})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}
	defer file.Close()

	content, err := io.ReadAll(io.LimitReader(file, maxAnswerUploadBytes+1))
	if err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}
	if len(content) == 0 {
		return validationError(c, map[string][]string{
			"file": {"空のファイルはアップロードできません"},
		})
	}
	if len(content) > maxAnswerUploadBytes {
		return validationError(c, map[string][]string{
			"file": {"ファイルサイズは 5MB 以下にしてください"},
		})
	}

	if len(questions) > 0 {
		if uploadValidationMessage := validateUploadExtension(uploadQuestion, filename); uploadValidationMessage != "" {
			return validationError(c, map[string][]string{
				"file": {uploadValidationMessage},
			})
		}
	}

	mimeType := strings.TrimSpace(fileHeader.Header.Get(echo.HeaderContentType))
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	upload, created := h.answers.AddUploadToAnswer(answerValue.ID, questionID, filename, mimeType, content)
	if !created {
		return internalError(c)
	}

	return c.JSON(http.StatusCreated, mapFormAnswerUpload(upload))
}

func (h *workspaceHandlers) downloadFormAnswerFile(c echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	upload, found := h.answers.FindUpload(currentForm.ID, currentSession.CurrentCircleID, c.Param("uploadID"))
	if !found {
		return errorJSON(c, http.StatusNotFound, "upload_not_found")
	}

	c.Response().Header().Set(echo.HeaderContentDisposition, `attachment; filename="`+upload.Filename+`"`)
	return c.Blob(http.StatusOK, upload.MimeType, upload.Content)
}

func (h *workspaceHandlers) downloadFormAnswerFileByID(c echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	answerValue, found := h.answers.Find(c.Param("answerID"))
	if !found || answerValue.FormID != currentForm.ID || answerValue.CircleID != currentSession.CurrentCircleID {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	upload, found := h.answers.FindUploadByAnswerAndQuestion(answerValue.ID, c.Param("questionID"))
	if !found {
		return errorJSON(c, http.StatusNotFound, "upload_not_found")
	}

	c.Response().Header().Set(echo.HeaderContentDisposition, `attachment; filename="`+upload.Filename+`"`)
	return c.Blob(http.StatusOK, upload.MimeType, upload.Content)
}

func (h *workspaceHandlers) resolveCurrentForm(c echo.Context) (formDetailResponse, session.Session, int, bool) {
	currentSession, currentCircle, status, ok := h.currentWorkspaceSessionAndCircle(c)
	if !ok {
		return formDetailResponse{}, session.Session{}, status, false
	}

	currentForm, found := h.findAccessibleWorkspaceForm(c.Param("formID"), currentCircle)
	if !found {
		return formDetailResponse{}, session.Session{}, http.StatusNotFound, false
	}

	questions, err := h.formQuestions.List(currentForm.ID)
	if err != nil {
		return formDetailResponse{}, session.Session{}, http.StatusInternalServerError, false
	}
	questions = filterWorkspaceFormQuestions(questions)

	return h.buildWorkspaceFormDetailResponse(
		currentForm,
		currentSession.CurrentCircleID,
		currentCircle,
		mapStaffFormQuestions(questions),
	), currentSession, http.StatusOK, true
}

func (h *workspaceHandlers) resolveWritableCurrentForm(c echo.Context) (formDetailResponse, session.Session, int, bool) {
	currentForm, currentSession, status, ok := h.resolveCurrentForm(c)
	if !ok {
		return formDetailResponse{}, session.Session{}, status, false
	}
	if !currentForm.IsOpen {
		return formDetailResponse{}, session.Session{}, http.StatusNotFound, false
	}
	if !isWorkspaceCircleApprovedStatus(currentForm.CurrentCircleStatus) {
		return formDetailResponse{}, session.Session{}, http.StatusUnprocessableEntity, false
	}

	return currentForm, currentSession, http.StatusOK, true
}

func workspaceFormStatusError(c echo.Context, status int) error {
	if status == http.StatusUnprocessableEntity {
		return validationError(c, map[string][]string{
			"circle": {workspaceCircleNotApprovedMessage},
		})
	}
	return statusError(c, status)
}

func buildFormAnswerResponse(answerValue answer.Answer, uploads []answer.Upload) *formAnswerResponse {
	return &formAnswerResponse{
		ID:        answerValue.ID,
		Body:      answerValue.Body,
		UpdatedAt: answerValue.UpdatedAt,
		Details:   cloneAnswerDetails(answerValue.Details),
		Uploads:   mapFormAnswerUploads(uploads),
	}
}

func mapFormAnswerUploads(uploads []answer.Upload) []formAnswerUploadResponse {
	response := make([]formAnswerUploadResponse, 0, len(uploads))
	for _, upload := range uploads {
		response = append(response, mapFormAnswerUpload(upload))
	}

	return response
}

func mapFormAnswerUpload(upload answer.Upload) formAnswerUploadResponse {
	return formAnswerUploadResponse{
		ID:         upload.ID,
		QuestionID: upload.QuestionID,
		Filename:   upload.Filename,
		MimeType:   upload.MimeType,
		SizeBytes:  upload.SizeBytes,
		CreatedAt:  upload.CreatedAt,
	}
}

func normalizeAnswerDetails(raw map[string]any, questions []formquestion.Question, uploads []answer.Upload) (map[string][]string, map[string][]string) {
	normalized := map[string][]string{}
	validationErrors := map[string][]string{}
	uploadsByQuestion := groupUploadsByQuestion(uploads)

	for _, question := range questions {
		if question.Type == "heading" {
			continue
		}

		rawValue, hasValue := raw[question.ID]
		values, valueErrors := normalizeAnswerValues(question, rawValue, hasValue)
		if len(valueErrors) > 0 {
			validationErrors["details."+question.ID] = valueErrors
			continue
		}

		if len(values) > 0 {
			normalized[question.ID] = values
		}

		if question.IsRequired && !questionHasAnswer(question, values, uploadsByQuestion[question.ID]) {
			validationErrors["details."+question.ID] = []string{"この設問は必須です"}
		}
	}

	return normalized, validationErrors
}

func normalizeAnswerValues(question formquestion.Question, rawValue any, hasValue bool) ([]string, []string) {
	if question.Type == "upload" {
		return nil, nil
	}
	if !hasValue || rawValue == nil {
		return nil, nil
	}

	switch question.Type {
	case "checkbox":
		values, ok := stringSliceFromAny(rawValue)
		if !ok {
			return nil, []string{"選択肢の形式が不正です"}
		}
		filtered := filterEmptyStrings(values)
		if len(filtered) == 0 {
			return nil, nil
		}
		if len(question.Options) > 0 && !allInOptions(filtered, question.Options) {
			return nil, []string{"選択肢の値が不正です"}
		}
		return filtered, nil
	default:
		value, ok := stringFromAny(rawValue)
		if !ok {
			return nil, []string{"入力形式が不正です"}
		}
		value = strings.TrimSpace(value)
		if value == "" {
			return nil, nil
		}
		if question.Type == "number" {
			parsed, err := strconv.ParseFloat(value, 64)
			if err != nil {
				return nil, []string{"数値を入力してください"}
			}
			if question.NumberMin != nil && parsed < float64(*question.NumberMin) {
				return nil, []string{fmt.Sprintf("%d 以上の値を入力してください", *question.NumberMin)}
			}
			if question.NumberMax != nil && parsed > float64(*question.NumberMax) {
				return nil, []string{fmt.Sprintf("%d 以下の値を入力してください", *question.NumberMax)}
			}
		}
		if slices.Contains([]string{"radio", "select"}, question.Type) && len(question.Options) > 0 && !slices.Contains(question.Options, value) {
			return nil, []string{"選択肢の値が不正です"}
		}
		return []string{value}, nil
	}
}

func questionHasAnswer(question formquestion.Question, values []string, uploads []answer.Upload) bool {
	if question.Type == "upload" {
		return len(uploads) > 0
	}
	return len(values) > 0
}

func groupUploadsByQuestion(uploads []answer.Upload) map[string][]answer.Upload {
	grouped := map[string][]answer.Upload{}
	for _, upload := range uploads {
		grouped[upload.QuestionID] = append(grouped[upload.QuestionID], upload)
	}
	return grouped
}

func findUploadQuestion(questions []formquestion.Question, questionID string) (formquestion.Question, bool) {
	for _, question := range questions {
		if question.ID == questionID && question.Type == "upload" {
			return question, true
		}
	}
	return formquestion.Question{}, false
}

func validateUploadExtension(question formquestion.Question, filename string) string {
	allowedTypes := normalizeAllowedTypes(question.AllowedTypes)
	if len(allowedTypes) == 0 {
		return "この設問ではアップロードを受け付けていません"
	}

	extension := strings.TrimPrefix(strings.ToLower(filepath.Ext(filename)), ".")
	if extension == "" {
		return "許可されていない拡張子です"
	}
	if !slices.Contains(allowedTypes, extension) {
		return "許可されていない拡張子です"
	}
	return ""
}

func normalizeAllowedTypes(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}

	parts := strings.FieldsFunc(value, func(r rune) bool {
		return r == ',' || r == '\n' || r == '\r' || r == ' ' || r == '\t'
	})
	normalized := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimPrefix(strings.ToLower(strings.TrimSpace(part)), ".")
		if part == "" {
			continue
		}
		normalized = append(normalized, part)
	}
	return normalized
}

func buildAnswerSummary(questions []formquestion.Question, details map[string][]string, uploads []answer.Upload) string {
	uploadsByQuestion := groupUploadsByQuestion(uploads)
	lines := make([]string, 0, len(questions))

	for _, question := range questions {
		if question.Type == "heading" {
			continue
		}

		switch question.Type {
		case "upload":
			questionUploads := uploadsByQuestion[question.ID]
			if len(questionUploads) == 0 {
				continue
			}

			filenames := make([]string, 0, len(questionUploads))
			for _, upload := range questionUploads {
				filenames = append(filenames, upload.Filename)
			}
			lines = append(lines, question.Name+": "+strings.Join(filenames, ", "))
		default:
			values := details[question.ID]
			if len(values) == 0 {
				continue
			}
			lines = append(lines, question.Name+": "+strings.Join(values, ", "))
		}
	}

	return strings.Join(lines, "\n")
}

func stringSliceFromAny(value any) ([]string, bool) {
	switch typedValue := value.(type) {
	case []string:
		return typedValue, true
	case []any:
		values := make([]string, 0, len(typedValue))
		for _, item := range typedValue {
			stringValue, ok := stringFromAny(item)
			if !ok {
				return nil, false
			}
			values = append(values, stringValue)
		}
		return values, true
	default:
		stringValue, ok := stringFromAny(value)
		if !ok {
			return nil, false
		}
		return []string{stringValue}, true
	}
}

func stringFromAny(value any) (string, bool) {
	switch typedValue := value.(type) {
	case string:
		return typedValue, true
	case float64:
		return strconv.FormatFloat(typedValue, 'f', -1, 64), true
	case int:
		return strconv.Itoa(typedValue), true
	default:
		return "", false
	}
}

func filterEmptyStrings(values []string) []string {
	filtered := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		filtered = append(filtered, value)
	}
	return filtered
}

func allInOptions(values []string, options []string) bool {
	for _, value := range values {
		if !slices.Contains(options, value) {
			return false
		}
	}
	return true
}

func cloneAnswerDetails(details map[string][]string) map[string][]string {
	if len(details) == 0 {
		return map[string][]string{}
	}

	cloned := make(map[string][]string, len(details))
	for questionID, values := range details {
		cloned[questionID] = append([]string(nil), values...)
	}
	return cloned
}
