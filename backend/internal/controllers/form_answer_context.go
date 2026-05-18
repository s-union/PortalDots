package controllers

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/answer"
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

func (h *workspaceHandlers) resolveCurrentForm(c echo.Context) (formDetailResponse, session.Session, int, bool) {
	currentSession, currentCircle, status, ok := h.currentWorkspaceSessionAndCircle(c)
	if !ok {
		return formDetailResponse{}, session.Session{}, status, false
	}

	currentForm, found := h.findAccessibleWorkspaceForm(c.Request().Context(), c.Param("formID"), currentCircle)
	if !found {
		return formDetailResponse{}, session.Session{}, http.StatusNotFound, false
	}

	questions, err := h.formQuestions.List(c.Request().Context(), currentForm.ID)
	if err != nil {
		return formDetailResponse{}, session.Session{}, http.StatusInternalServerError, false
	}
	questions = filterWorkspaceFormQuestions(questions)

	return h.buildWorkspaceFormDetailResponse(c.Request().Context(),
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
