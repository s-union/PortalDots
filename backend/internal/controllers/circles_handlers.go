package controllers

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
)

func (h *workspaceHandlers) listCircles(c echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}

	circles, err := h.circles.ListSelectable(currentSession.User)
	if err != nil {
		return internalError(c)
	}

	response := make([]selectableCircleResponse, 0, len(circles))
	for _, selectable := range circles {
		var submittedAt *string
		if selectable.SubmittedAt != nil {
			value := selectable.SubmittedAt.Format(time.RFC3339)
			submittedAt = &value
		}

		response = append(response, selectableCircleResponse{
			ID:                    selectable.ID,
			Name:                  selectable.Name,
			GroupName:             selectable.GroupName,
			ParticipationTypeName: selectable.ParticipationTypeName,
			SubmittedAt:           submittedAt,
			Status:                selectable.Status,
		})
	}

	return c.JSON(http.StatusOK, response)
}

func (h *workspaceHandlers) listParticipationTypes(c echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}

	items, err := h.participationTypes.List()
	if err != nil {
		return internalError(c)
	}

	slicesSortParticipationTypes(items)

	response := make([]participationTypeResponse, 0, len(items))
	for _, item := range items {
		formValue, found := h.forms.FindByIDForStaff(item.FormID)
		if !found || !isPublicParticipationForm(formValue) {
			continue
		}

		response = append(response, mapParticipationType(item, formValue))
	}

	return c.JSON(http.StatusOK, response)
}

func (h *workspaceHandlers) getParticipationTypeRegistrationForm(c echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}

	managedUser, err := h.users.Find(currentSession.User.ID)
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}
	if err != nil {
		return internalError(c)
	}

	pt, formValue, questions, err := h.resolveParticipationRegistrationForm(c.Param("typeID"))
	if errors.Is(err, participationtype.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "participation_type_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	groupName, groupNameYomi, canChangeGroupName := h.defaultGroupForUser(managedUser)
	return c.JSON(http.StatusOK, circleDetailResponse{
		ID:                    "",
		Name:                  "",
		NameYomi:              "",
		GroupName:             groupName,
		GroupNameYomi:         groupNameYomi,
		ParticipationTypeID:   pt.ID,
		ParticipationTypeName: pt.Name,
		FormID:                formValue.ID,
		Notes:                 "",
		LeaderDisplayName:     managedUser.DisplayName,
		CanChangeGroupName:    canChangeGroupName,
		IsLeader:              true,
		LastUpdatedAt:         "",
		UsersCountMin:         pt.UsersCountMin,
		UsersCountMax:         pt.UsersCountMax,
		MemberCount:           1,
		CanSubmit:             pt.UsersCountMin <= 1 && (pt.UsersCountMax == 0 || pt.UsersCountMax >= 1),
		FormDescription:       formValue.Description,
		ConfirmationMessage:   formValue.ConfirmationMessage,
		Questions:             mapStaffFormQuestions(questions),
		Answer:                nil,
		InvitationToken:       "",
		SubmittedAt:           nil,
	})
}

func (h *workspaceHandlers) setCurrentCircle(c echo.Context) error {
	sessionID, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}

	var request setCurrentCircleRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	request.CircleID = strings.TrimSpace(request.CircleID)
	if request.CircleID == "" {
		return validationError(c, map[string][]string{
			"circleId": {"企画を選択してください"},
		})
	}

	selectedCircle, err := h.circles.FindSelectable(currentSession.User, request.CircleID)
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	h.sessions.Update(sessionID, func(next *session.Session) {
		next.CurrentCircleID = selectedCircle.ID
	})

	return c.NoContent(http.StatusNoContent)
}

func (h *workspaceHandlers) createCircle(c echo.Context) error {
	sessionID, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}

	var req createCircleRequest
	if err := c.Bind(&req); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	req.Name = strings.TrimSpace(req.Name)
	req.NameYomi = strings.TrimSpace(req.NameYomi)
	req.GroupName = strings.TrimSpace(req.GroupName)
	req.GroupNameYomi = strings.TrimSpace(req.GroupNameYomi)
	req.ParticipationTypeID = strings.TrimSpace(req.ParticipationTypeID)

	validationErrors := map[string][]string{}
	if req.Name == "" {
		validationErrors["name"] = []string{"企画名を入力してください"}
	}
	if req.NameYomi == "" {
		validationErrors["nameYomi"] = []string{"企画名(よみ)を入力してください"}
	}
	if req.ParticipationTypeID == "" {
		validationErrors["participationTypeId"] = []string{"参加種別を選択してください"}
	}
	managedUser, err := h.users.Find(currentSession.User.ID)
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}
	if err != nil {
		return internalError(c)
	}
	if !canCreateCircleRegistration(managedUser) {
		return errorJSON(c, http.StatusForbidden, "forbidden")
	}

	pt, formValue, questions, err := h.resolveParticipationRegistrationForm(req.ParticipationTypeID)
	if errors.Is(err, participationtype.ErrNotFound) {
		return validationError(c, map[string][]string{"participationTypeId": {"参加種別が存在しません"}})
	}
	if err != nil {
		return internalError(c)
	}

	groupName, groupNameYomi, canChangeGroupName := h.defaultGroupForUser(managedUser)
	if canChangeGroupName {
		req.GroupName = strings.TrimSpace(req.GroupName)
		req.GroupNameYomi = strings.TrimSpace(req.GroupNameYomi)
		if req.GroupName == "" {
			validationErrors["groupName"] = []string{"団体名を入力してください"}
		}
		if req.GroupNameYomi == "" {
			validationErrors["groupNameYomi"] = []string{"団体名(よみ)を入力してください"}
		}
	} else {
		req.GroupName = groupName
		req.GroupNameYomi = groupNameYomi
	}
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	normalizedDetails, detailErrors := normalizeAnswerDetails(req.Details, questionsWithoutRequiredUploads(questions), nil)
	if len(detailErrors) > 0 {
		return validationError(c, detailErrors)
	}

	created, err := h.circles.CreateForUser(currentSession.User, circle.CreateCircleParams{
		Name:                  req.Name,
		NameYomi:              req.NameYomi,
		GroupName:             req.GroupName,
		GroupNameYomi:         req.GroupNameYomi,
		ParticipationTypeID:   pt.ID,
		ParticipationTypeName: pt.Name,
		Notes:                 req.Notes,
		CanChangeGroupName:    canChangeGroupName,
	})
	if err != nil {
		return internalError(c)
	}

	if len(questions) > 0 {
		h.answers.Upsert(formValue.ID, created.ID, buildAnswerSummary(questions, normalizedDetails, nil), normalizedDetails)
	}
	if !canChangeGroupName && len(managedUser.LeaderCircleIDs) > 0 {
		h.copyExistingMembersToCircle(currentSession.User, managedUser.LeaderCircleIDs[0], created.ID)
	}

	h.sessions.Update(sessionID, func(next *session.Session) {
		next.CurrentCircleID = created.ID
	})

	return h.respondWithCircleRegistrationStatus(c, currentSession.User, created, http.StatusCreated)
}

func (h *workspaceHandlers) getCurrentCircleDetail(c echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}
	if currentSession.CurrentCircleID == "" {
		return errorJSON(c, http.StatusNotFound, "no_current_circle")
	}

	circleValue, err := h.circles.GetUserCircle(currentSession.User, currentSession.CurrentCircleID)
	if errors.Is(err, circle.ErrNotFound) || errors.Is(err, circle.ErrForbidden) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	return h.respondWithCircleRegistration(c, currentSession.User, circleValue)
}

func (h *workspaceHandlers) updateCurrentCircle(c echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}
	if currentSession.CurrentCircleID == "" {
		return errorJSON(c, http.StatusNotFound, "no_current_circle")
	}

	var req updateCircleRequest
	if err := c.Bind(&req); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	req.Name = strings.TrimSpace(req.Name)
	req.NameYomi = strings.TrimSpace(req.NameYomi)
	circleValue, err := h.circles.GetUserCircle(currentSession.User, currentSession.CurrentCircleID)
	if errors.Is(err, circle.ErrNotFound) || errors.Is(err, circle.ErrForbidden) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	_, pt, formValue, questions, members, leaderDisplayName, isLeader, err := h.loadCurrentCircleRegistration(currentSession.User, currentSession.CurrentCircleID)
	if err != nil {
		return internalError(c)
	}
	if !isLeader {
		return errorJSON(c, http.StatusForbidden, "forbidden")
	}

	req.GroupName = strings.TrimSpace(req.GroupName)
	req.GroupNameYomi = strings.TrimSpace(req.GroupNameYomi)

	validationErrors := map[string][]string{}
	if strings.TrimSpace(req.Name) == "" {
		validationErrors["name"] = []string{"企画名を入力してください"}
	}
	if req.NameYomi == "" {
		validationErrors["nameYomi"] = []string{"企画名(よみ)を入力してください"}
	}
	if circleValue.CanChangeGroupName {
		if req.GroupName == "" {
			validationErrors["groupName"] = []string{"団体名を入力してください"}
		}
		if req.GroupNameYomi == "" {
			validationErrors["groupNameYomi"] = []string{"団体名(よみ)を入力してください"}
		}
	} else {
		req.GroupName = circleValue.GroupName
		req.GroupNameYomi = circleValue.GroupNameYomi
	}

	existingUploads := h.answers.ListUploads(formValue.ID, currentSession.CurrentCircleID)
	normalizedDetails, detailErrors := normalizeAnswerDetails(req.Details, questions, existingUploads)
	for key, messages := range detailErrors {
		validationErrors[key] = messages
	}
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	updated, err := h.circles.UpdateForUser(currentSession.User, currentSession.CurrentCircleID, circle.UpdateCircleParams{
		Name:          req.Name,
		NameYomi:      req.NameYomi,
		GroupName:     req.GroupName,
		GroupNameYomi: req.GroupNameYomi,
		Notes:         req.Notes,
	})
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if errors.Is(err, circle.ErrForbidden) {
		return errorJSON(c, http.StatusForbidden, "forbidden")
	}
	if err != nil {
		return internalError(c)
	}

	if len(questions) > 0 {
		h.answers.Upsert(formValue.ID, updated.ID, buildAnswerSummary(questions, normalizedDetails, existingUploads), normalizedDetails)
	}

	return c.JSON(http.StatusOK, h.buildCircleRegistrationResponse(updated, pt, formValue, questions, members, leaderDisplayName, isLeader))
}

func (h *workspaceHandlers) deleteCurrentCircle(c echo.Context) error {
	sessionID, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}
	if currentSession.CurrentCircleID == "" {
		return errorJSON(c, http.StatusNotFound, "no_current_circle")
	}

	if err := h.circles.DeleteForUser(currentSession.User, currentSession.CurrentCircleID); errors.Is(err, circle.ErrForbidden) {
		return errorJSON(c, http.StatusForbidden, "forbidden")
	} else if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	} else if err != nil {
		return internalError(c)
	}

	h.sessions.Update(sessionID, func(next *session.Session) {
		next.CurrentCircleID = ""
	})

	return c.NoContent(http.StatusNoContent)
}

func (h *workspaceHandlers) submitCurrentCircle(c echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}
	if currentSession.CurrentCircleID == "" {
		return errorJSON(c, http.StatusNotFound, "no_current_circle")
	}

	var req submitCurrentCircleRequest
	if err := c.Bind(&req); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}
	req.LastUpdatedAt = strings.TrimSpace(req.LastUpdatedAt)
	if req.LastUpdatedAt == "" {
		return validationError(c, map[string][]string{
			"lastUpdatedAt": {"最終更新日時が不足しています"},
		})
	}

	circleValue, pt, formValue, questions, members, _, isLeader, err := h.loadCurrentCircleRegistration(currentSession.User, currentSession.CurrentCircleID)
	if errors.Is(err, circle.ErrNotFound) || errors.Is(err, circle.ErrForbidden) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if err != nil {
		return internalError(c)
	}
	if !isLeader {
		return errorJSON(c, http.StatusForbidden, "forbidden")
	}
	if circleValue.UpdatedAt.Format(time.RFC3339) != req.LastUpdatedAt {
		return validationError(c, map[string][]string{
			"lastUpdatedAt": {"参加登録の内容が更新されたため、もう一度確認画面から提出してください"},
		})
	}
	memberErrors := h.validateCircleMemberCount(pt, members)
	if len(memberErrors) > 0 {
		return validationError(c, memberErrors)
	}
	answerSummary := ""
	if len(questions) > 0 {
		currentAnswer, found := h.answers.Get(formValue.ID, currentSession.CurrentCircleID)
		if !found {
			return validationError(c, map[string][]string{
				"answer": {"企画参加登録の設問に回答してください"},
			})
		}
		uploads := h.answers.ListUploads(formValue.ID, currentSession.CurrentCircleID)
		normalizedAnswerDetails, detailErrors := normalizeAnswerDetails(answerDetailsToAny(currentAnswer.Details), questions, uploads)
		if len(detailErrors) > 0 {
			return validationError(c, detailErrors)
		}
		answerSummary = buildAnswerSummary(questions, normalizedAnswerDetails, uploads)
	}

	submitted, err := h.circles.Submit(currentSession.User, currentSession.CurrentCircleID)
	if errors.Is(err, circle.ErrForbidden) {
		return errorJSON(c, http.StatusForbidden, "forbidden")
	}
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if errors.Is(err, circle.ErrAlreadySubmitted) {
		return errorJSON(c, http.StatusConflict, "already_submitted")
	}
	if err != nil {
		return internalError(c)
	}

	subject := fmt.Sprintf("【参加登録】「%s」の参加登録を提出しました", submitted.Name)
	body := buildCircleSubmittedMailBody(submitted, members, formValue.ConfirmationMessage, answerSummary)
	if _, _, err := enqueueCircleNotificationMail(
		c.Request().Context(),
		h.mails,
		h.users,
		members,
		submitted.ID,
		currentSession.User.ID,
		"circle_submission",
		subject,
		body,
	); err != nil {
		return internalError(c)
	}

	return h.respondWithCircleRegistration(c, currentSession.User, submitted)
}

func (h *workspaceHandlers) listCurrentCircleMembers(c echo.Context) error {
	_, currentCircle, status, ok := h.currentWorkspaceSessionAndCircle(c)
	if !ok {
		return statusError(c, status)
	}

	members, err := h.circles.ListMembers(currentCircle.ID)
	if err != nil {
		return internalError(c)
	}

	response := make([]circleMemberResponse, 0, len(members))
	for _, m := range members {
		response = append(response, circleMemberResponse{
			UserID:      m.UserID,
			DisplayName: m.DisplayName,
			IsLeader:    m.IsLeader,
		})
	}

	return c.JSON(http.StatusOK, response)
}

func (h *workspaceHandlers) addCurrentCircleMember(c echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}
	if currentSession.CurrentCircleID == "" {
		return errorJSON(c, http.StatusNotFound, "no_current_circle")
	}

	return errorJSON(c, http.StatusForbidden, "forbidden")
}

func (h *workspaceHandlers) removeCurrentCircleMember(c echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}
	if currentSession.CurrentCircleID == "" {
		return errorJSON(c, http.StatusNotFound, "no_current_circle")
	}

	targetUserID := c.Param("userID")
	if targetUserID == "" {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	if err := h.circles.RemoveMember(currentSession.User, currentSession.CurrentCircleID, targetUserID); errors.Is(err, circle.ErrForbidden) {
		return errorJSON(c, http.StatusForbidden, "forbidden")
	} else if err != nil {
		return internalError(c)
	}

	return c.NoContent(http.StatusNoContent)
}

func (h *workspaceHandlers) regenerateInvitationToken(c echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}
	if currentSession.CurrentCircleID == "" {
		return errorJSON(c, http.StatusNotFound, "no_current_circle")
	}

	updated, err := h.circles.RegenerateInvitationToken(currentSession.User, currentSession.CurrentCircleID)
	if errors.Is(err, circle.ErrForbidden) {
		return errorJSON(c, http.StatusForbidden, "forbidden")
	}
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if errors.Is(err, circle.ErrAlreadySubmitted) {
		return errorJSON(c, http.StatusConflict, "already_submitted")
	}
	if err != nil {
		return internalError(c)
	}

	return c.JSON(http.StatusOK, mapCircleDetail(updated))
}

func (h *workspaceHandlers) joinCircleByToken(c echo.Context) error {
	sessionID, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}

	token := c.Param("token")
	if token == "" {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	joinTarget, err := h.circles.FindByInvitationToken(token)
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "invalid_token")
	}
	if err != nil {
		return internalError(c)
	}
	pt, formValue, _, err := h.resolveParticipationRegistrationForm(joinTarget.ParticipationTypeID)
	if errors.Is(err, participationtype.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "invalid_token")
	}
	if err != nil {
		return internalError(c)
	}
	if !isPublicParticipationForm(formValue) || pt.ID == "" {
		return errorJSON(c, http.StatusNotFound, "invalid_token")
	}

	joined, err := h.circles.JoinByToken(currentSession.User, token)
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "invalid_token")
	}
	if errors.Is(err, circle.ErrAlreadyMember) {
		return errorJSON(c, http.StatusConflict, "already_member")
	}
	if err != nil {
		return internalError(c)
	}

	h.sessions.Update(sessionID, func(next *session.Session) {
		next.CurrentCircleID = joined.ID
	})

	return c.JSON(http.StatusOK, mapCircleDetail(joined))
}
