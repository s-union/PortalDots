package controllers

import (
	"context"
	"net/http"

	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	backendform "github.com/s-union/PortalDots/backend/internal/domain/form"
	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
)

func isPublicParticipationForm(formValue backendform.Form) bool {
	return formValue.IsPublic && formValue.IsOpen
}

func (h *workspaceHandlers) respondWithCircleRegistration(c *echo.Context, user *auth.User, circleValue circle.Circle) error {
	return h.respondWithCircleRegistrationStatus(c, user, circleValue, http.StatusOK)
}

func (h *workspaceHandlers) respondWithCircleRegistrationStatus(c *echo.Context, user *auth.User, circleValue circle.Circle, status int) error {
	_, pt, formValue, questions, members, leaderDisplayName, isLeader, err := h.loadCurrentCircleRegistration(c.Request().Context(), user, circleValue.ID)
	if err != nil {
		return internalError(c)
	}

	return c.JSON(status, h.buildCircleRegistrationResponse(c.Request().Context(), circleValue, pt, formValue, questions, members, leaderDisplayName, isLeader))
}

func (h *workspaceHandlers) buildCircleRegistrationResponse(
	ctx context.Context,
	circleValue circle.Circle,
	pt participationtype.ParticipationType,
	formValue backendform.Form,
	questions []formquestion.Question,
	members []circle.CircleMember,
	leaderDisplayName string,
	isLeader bool,
) circleDetailResponse {
	response := mapCircleDetail(circleValue)
	response.LeaderDisplayName = leaderDisplayName
	response.IsLeader = isLeader
	response.FormID = formValue.ID
	response.UsersCountMin = pt.UsersCountMin
	response.UsersCountMax = pt.UsersCountMax
	response.MemberCount = len(members)
	response.CanSubmit = h.canSubmitCircle(pt, members)
	response.FormDescription = formValue.Description
	response.ConfirmationMessage = formValue.ConfirmationMessage
	response.FormCloseAt = formValue.CloseAt
	response.Questions = mapStaffFormQuestions(questions)
	if currentAnswer, found := h.answers.Get(ctx, formValue.ID, circleValue.ID); found {
		response.Answer = buildFormAnswerResponse(currentAnswer, h.answers.ListUploads(ctx, formValue.ID, circleValue.ID))
	}
	return response
}

func (h *workspaceHandlers) resolveParticipationRegistrationForm(ctx context.Context, typeID string) (participationtype.ParticipationType, backendform.Form, []formquestion.Question, error) {
	pt, err := h.participationTypes.Find(ctx, typeID)
	if err != nil {
		return participationtype.ParticipationType{}, backendform.Form{}, nil, err
	}
	formValue, found := h.forms.FindByIDForStaff(pt.FormID)
	if !found || !isPublicParticipationForm(formValue) {
		return participationtype.ParticipationType{}, backendform.Form{}, nil, participationtype.ErrNotFound
	}
	questions, err := h.formQuestions.List(ctx, formValue.ID)
	if err != nil {
		return participationtype.ParticipationType{}, backendform.Form{}, nil, err
	}
	return pt, formValue, questions, nil
}

func (h *workspaceHandlers) loadCurrentCircleRegistration(ctx context.Context, user *auth.User, circleID string) (circle.Circle, participationtype.ParticipationType, backendform.Form, []formquestion.Question, []circle.CircleMember, string, bool, error) {
	circleValue, err := h.circles.GetUserCircle(ctx, user, circleID)
	if err != nil {
		return circle.Circle{}, participationtype.ParticipationType{}, backendform.Form{}, nil, nil, "", false, err
	}
	pt, formValue, questions, err := h.resolveParticipationRegistrationForm(ctx, circleValue.ParticipationTypeID)
	if err != nil {
		return circle.Circle{}, participationtype.ParticipationType{}, backendform.Form{}, nil, nil, "", false, err
	}
	members, err := h.circles.ListMembers(ctx, circleID)
	if err != nil {
		return circle.Circle{}, participationtype.ParticipationType{}, backendform.Form{}, nil, nil, "", false, err
	}
	leaderDisplayName, isLeader := leaderSummary(members, user.ID)
	return circleValue, pt, formValue, questions, members, leaderDisplayName, isLeader, nil
}
