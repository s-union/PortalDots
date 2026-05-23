package controllers

import (
	"io"
	"net/http"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
)

func (h *workspaceHandlers) getFormAnswer(c *echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	answerValue, found := h.answers.Get(c.Request().Context(), currentForm.ID, currentSession.CurrentCircleID)
	if !found {
		return c.JSON(http.StatusOK, formAnswerEnvelopeResponse{
			Answer: nil,
		})
	}

	return c.JSON(http.StatusOK, formAnswerEnvelopeResponse{
		Answer: buildFormAnswerResponse(answerValue, h.answers.ListUploads(c.Request().Context(), currentForm.ID, currentSession.CurrentCircleID)),
	})
}

func (h *workspaceHandlers) listFormAnswers(c *echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	answers := h.answers.ListByFormAndCircle(c.Request().Context(), currentForm.ID, currentSession.CurrentCircleID)
	response := make([]formAnswerResponse, 0, len(answers))
	for _, answerValue := range answers {
		mapped := buildFormAnswerResponse(answerValue, h.answers.ListUploadsByAnswer(c.Request().Context(), answerValue.ID))
		if mapped == nil {
			continue
		}
		response = append(response, *mapped)
	}

	return c.JSON(http.StatusOK, formAnswersResponse{
		Answers: response,
	})
}

func (h *workspaceHandlers) getFormAnswerByID(c *echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	answerValue, found := h.answers.Find(c.Request().Context(), c.Param("answerID"))
	if !found || answerValue.FormID != currentForm.ID || answerValue.CircleID != currentSession.CurrentCircleID {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	return c.JSON(http.StatusOK, formAnswerEnvelopeResponse{
		Answer: buildFormAnswerResponse(answerValue, h.answers.ListUploadsByAnswer(c.Request().Context(), answerValue.ID)),
	})
}

func (h *workspaceHandlers) createFormAnswer(c *echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveWritableCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	existingAnswers := h.answers.ListByFormAndCircle(c.Request().Context(), currentForm.ID, currentSession.CurrentCircleID)
	if currentForm.MaxAnswers > 0 && int32(len(existingAnswers)) >= currentForm.MaxAnswers {
		return validationError(c, map[string][]string{
			"answer": {"max_answers_exceeded"},
		})
	}

	created := h.answers.Create(c.Request().Context(), currentForm.ID, currentSession.CurrentCircleID, "", map[string][]string{})
	return c.JSON(http.StatusCreated, formAnswerEnvelopeResponse{
		Answer: buildFormAnswerResponse(created, nil),
	})
}

func (h *workspaceHandlers) upsertFormAnswer(c *echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveWritableCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	var request upsertFormAnswerRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	questions, err := h.formQuestions.List(c.Request().Context(), currentForm.ID)
	if err != nil {
		return internalError(c)
	}
	questions = filterWorkspaceFormQuestions(questions)

	existingUploads := h.answers.ListUploads(c.Request().Context(), currentForm.ID, currentSession.CurrentCircleID)
	trimmedBody := strings.TrimSpace(request.Body)
	if len(questions) == 0 {
		if trimmedBody == "" {
			return validationError(c, map[string][]string{
				"body": {"回答を入力してください"},
			})
		}

		answerValue := h.answers.Upsert(c.Request().Context(), currentForm.ID, currentSession.CurrentCircleID, trimmedBody, map[string][]string{})
		h.enqueueWorkspaceFormAnswerMail(c.Request().Context(), currentSession.User.ID, currentForm, answerValue)
		return c.JSON(http.StatusOK, formAnswerEnvelopeResponse{
			Answer: buildFormAnswerResponse(answerValue, existingUploads),
		})
	}

	normalizedDetails, validationErrors := normalizeAnswerDetails(request.Details, questions, existingUploads)
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	summaryBody := buildAnswerSummary(questions, normalizedDetails, existingUploads)
	answerValue := h.answers.Upsert(c.Request().Context(), currentForm.ID, currentSession.CurrentCircleID, summaryBody, normalizedDetails)
	h.enqueueWorkspaceFormAnswerMail(c.Request().Context(), currentSession.User.ID, currentForm, answerValue)
	return c.JSON(http.StatusOK, formAnswerEnvelopeResponse{
		Answer: buildFormAnswerResponse(answerValue, h.answers.ListUploads(c.Request().Context(), currentForm.ID, currentSession.CurrentCircleID)),
	})
}

func (h *workspaceHandlers) updateFormAnswer(c *echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveWritableCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	answerValue, found := h.answers.Find(c.Request().Context(), c.Param("answerID"))
	if !found || answerValue.FormID != currentForm.ID || answerValue.CircleID != currentSession.CurrentCircleID {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	var request upsertFormAnswerRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	questions, err := h.formQuestions.List(c.Request().Context(), currentForm.ID)
	if err != nil {
		return internalError(c)
	}
	questions = filterWorkspaceFormQuestions(questions)

	existingUploads := h.answers.ListUploadsByAnswer(c.Request().Context(), answerValue.ID)
	trimmedBody := strings.TrimSpace(request.Body)
	if len(questions) == 0 {
		if trimmedBody == "" {
			return validationError(c, map[string][]string{
				"body": {"回答を入力してください"},
			})
		}

		updatedAnswer, updated := h.answers.Update(c.Request().Context(), answerValue.ID, trimmedBody, map[string][]string{})
		if !updated {
			return errorJSON(c, http.StatusNotFound, "answer_not_found")
		}
		h.enqueueWorkspaceFormAnswerMail(c.Request().Context(), currentSession.User.ID, currentForm, updatedAnswer)

		return c.JSON(http.StatusOK, formAnswerEnvelopeResponse{
			Answer: buildFormAnswerResponse(updatedAnswer, existingUploads),
		})
	}

	normalizedDetails, validationErrors := normalizeAnswerDetails(request.Details, questions, existingUploads)
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	summaryBody := buildAnswerSummary(questions, normalizedDetails, existingUploads)
	updatedAnswer, updated := h.answers.Update(c.Request().Context(), answerValue.ID, summaryBody, normalizedDetails)
	if !updated {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}
	h.enqueueWorkspaceFormAnswerMail(c.Request().Context(), currentSession.User.ID, currentForm, updatedAnswer)

	return c.JSON(http.StatusOK, formAnswerEnvelopeResponse{
		Answer: buildFormAnswerResponse(updatedAnswer, h.answers.ListUploadsByAnswer(c.Request().Context(), answerValue.ID)),
	})
}

func (h *workspaceHandlers) uploadFormAnswerFile(c *echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveWritableCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	questions, err := h.formQuestions.List(c.Request().Context(), currentForm.ID)
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

	mimeType := http.DetectContentType(content)

	upload, created := h.answers.AddUpload(c.Request().Context(), currentForm.ID, currentSession.CurrentCircleID, questionID, filename, mimeType, content)
	if !created {
		return internalError(c)
	}

	return c.JSON(http.StatusCreated, mapFormAnswerUpload(upload))
}

func (h *workspaceHandlers) uploadFormAnswerFileByID(c *echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveWritableCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	answerValue, found := h.answers.Find(c.Request().Context(), c.Param("answerID"))
	if !found || answerValue.FormID != currentForm.ID || answerValue.CircleID != currentSession.CurrentCircleID {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	questions, err := h.formQuestions.List(c.Request().Context(), currentForm.ID)
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

	mimeType := http.DetectContentType(content)

	upload, created := h.answers.AddUploadToAnswer(c.Request().Context(), answerValue.ID, questionID, filename, mimeType, content)
	if !created {
		return internalError(c)
	}

	return c.JSON(http.StatusCreated, mapFormAnswerUpload(upload))
}

func (h *workspaceHandlers) downloadFormAnswerFile(c *echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	upload, found := h.answers.FindUpload(c.Request().Context(), currentForm.ID, currentSession.CurrentCircleID, c.Param("uploadID"))
	if !found {
		return errorJSON(c, http.StatusNotFound, "upload_not_found")
	}

	c.Response().Header().Set(echo.HeaderContentDisposition, attachmentContentDisposition(upload.Filename))
	return c.Blob(http.StatusOK, upload.MimeType, upload.Content)
}

func (h *workspaceHandlers) downloadFormAnswerFileByID(c *echo.Context) error {
	currentForm, currentSession, status, ok := h.resolveCurrentForm(c)
	if !ok {
		return workspaceFormStatusError(c, status)
	}

	answerValue, found := h.answers.Find(c.Request().Context(), c.Param("answerID"))
	if !found || answerValue.FormID != currentForm.ID || answerValue.CircleID != currentSession.CurrentCircleID {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	upload, found := h.answers.FindUploadByAnswerAndQuestion(c.Request().Context(), answerValue.ID, c.Param("questionID"))
	if !found {
		return errorJSON(c, http.StatusNotFound, "upload_not_found")
	}

	c.Response().Header().Set(echo.HeaderContentDisposition, attachmentContentDisposition(upload.Filename))
	return c.Blob(http.StatusOK, upload.MimeType, upload.Content)
}
