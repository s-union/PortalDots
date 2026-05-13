package controllers

import (
	"net/http"

	"github.com/s-union/PortalDots/backend/internal/domain/answer"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	backendform "github.com/s-union/PortalDots/backend/internal/domain/form"
	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
	"github.com/s-union/PortalDots/backend/internal/domain/session"

	"github.com/labstack/echo/v4"
)

type staffAnswerCircleResponse struct {
	ID                    string `json:"id"`
	Name                  string `json:"name"`
	GroupName             string `json:"groupName"`
	ParticipationTypeName string `json:"participationTypeName"`
}

type staffManagedFormAnswerSummaryResponse struct {
	ID          string                    `json:"id"`
	Circle      staffAnswerCircleResponse `json:"circle"`
	Body        string                    `json:"body"`
	CreatedAt   string                    `json:"createdAt"`
	UpdatedAt   string                    `json:"updatedAt"`
	UploadCount int                       `json:"uploadCount"`
	Details     map[string][]string       `json:"details"`
}

type staffFormAnswersIndexResponse struct {
	Form               staffFormDetailResponse                 `json:"form"`
	Answers            []staffManagedFormAnswerSummaryResponse `json:"answers"`
	Circles            []staffAnswerCircleResponse             `json:"circles"`
	NotAnsweredCircles []staffAnswerCircleResponse             `json:"notAnsweredCircles"`
}

type staffManagedFormAnswerDetailResponse struct {
	Form           staffFormDetailResponse                 `json:"form"`
	Circle         staffAnswerCircleResponse               `json:"circle"`
	Answer         staffFormAnswerResponse                 `json:"answer"`
	SiblingAnswers []staffManagedFormAnswerSummaryResponse `json:"siblingAnswers"`
}

type createStaffFormAnswerResponse struct {
	Answer staffManagedFormAnswerSummaryResponse `json:"answer"`
}

type mutateStaffFormAnswerRequest struct {
	CircleID string         `json:"circleId"`
	Body     string         `json:"body"`
	Details  map[string]any `json:"details"`
}

type existingStaffFormAnswerResponse struct {
	Message          string `json:"message"`
	ExistingAnswerID string `json:"existingAnswerId"`
}

func (h *staffFormHandlers) staffFormContext(c echo.Context, allowed func(*auth.User) bool) (string, session.Session, backendform.Form, circle.Circle, []formquestion.Question, int, bool) {
	sessionID, currentSession, status, ok := h.requireStaffCapability(c, allowed)
	if !ok {
		return "", session.Session{}, backendform.Form{}, circle.Circle{}, nil, status, false
	}

	formValue, currentCircle, found := h.findManagedStaffForm(c.Param("formID"), false)
	if !found {
		return "", session.Session{}, backendform.Form{}, circle.Circle{}, nil, http.StatusNotFound, false
	}
	if h.isParticipationForm(formValue.ID) {
		return "", session.Session{}, backendform.Form{}, circle.Circle{}, nil, http.StatusBadRequest, false
	}

	questions, err := h.formQuestions.List(formValue.ID)
	if err != nil {
		return "", session.Session{}, backendform.Form{}, circle.Circle{}, nil, http.StatusInternalServerError, false
	}

	return sessionID, currentSession, formValue, currentCircle, questions, http.StatusOK, true
}

func (h *staffFormHandlers) buildStaffFormDetailResponse(
	formValue backendform.Form,
	circleValue staffManagedCircleResponse,
	questions []staffFormQuestion,
	answerResponse *staffFormAnswerResponse,
) staffFormDetailResponse {
	return staffFormDetailResponse{
		Circle:              circleValue,
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
		IsParticipationForm: h.isParticipationForm(formValue.ID),
		Questions:           questions,
		Answer:              answerResponse,
	}
}

func buildStaffFormAnswerResponse(answerValue answer.Answer, uploads []answer.Upload) staffFormAnswerResponse {
	return staffFormAnswerResponse{
		ID:        answerValue.ID,
		Body:      answerValue.Body,
		CreatedAt: answerValue.CreatedAt,
		UpdatedAt: answerValue.UpdatedAt,
		Details:   cloneAnswerDetails(answerValue.Details),
		Uploads:   mapFormAnswerUploads(uploads),
	}
}

func mapStaffManagedFormAnswerSummary(
	answerValue answer.Answer,
	circleValue staffAnswerCircleResponse,
	uploads []answer.Upload,
) staffManagedFormAnswerSummaryResponse {
	return staffManagedFormAnswerSummaryResponse{
		ID:          answerValue.ID,
		Circle:      circleValue,
		Body:        answerValue.Body,
		CreatedAt:   answerValue.CreatedAt,
		UpdatedAt:   answerValue.UpdatedAt,
		UploadCount: len(uploads),
		Details:     cloneAnswerDetails(answerValue.Details),
	}
}

func mapStaffAnswerCircle(circleValue circle.Circle) staffAnswerCircleResponse {
	return staffAnswerCircleResponse{
		ID:                    circleValue.ID,
		Name:                  circleValue.Name,
		GroupName:             circleValue.GroupName,
		ParticipationTypeName: circleValue.ParticipationTypeName,
	}
}

func (h *staffFormHandlers) isParticipationForm(formID string) bool {
	_, err := h.participationTypes.FindByFormID(formID)
	return err == nil
}
