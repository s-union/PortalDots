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

	circles, err := h.circles.ListSelectable(c.Request().Context(), currentSession.User)
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

	items, err := h.participationTypes.List(c.Request().Context())
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

	pt, formValue, questions, err := h.resolveParticipationRegistrationForm(c.Request().Context(), c.Param("typeID"))
	if errors.Is(err, participationtype.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "participation_type_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	groupName, groupNameYomi, canChangeGroupName := h.defaultGroupForUser(c.Request().Context(), managedUser)
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

	selectedCircle, err := h.circles.FindSelectable(c.Request().Context(), currentSession.User, request.CircleID)
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	h.sessions.Update(c.Request().Context(), sessionID, func(next *session.Session) {
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
	} else if !isValidYomi(req.NameYomi) {
		validationErrors["nameYomi"] = []string{"ひらがなで入力してください"}
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

	pt, formValue, questions, err := h.resolveParticipationRegistrationForm(c.Request().Context(), req.ParticipationTypeID)
	if errors.Is(err, participationtype.ErrNotFound) {
		return validationError(c, map[string][]string{"participationTypeId": {"参加種別が存在しません"}})
	}
	if err != nil {
		return internalError(c)
	}

	groupName, groupNameYomi, canChangeGroupName := h.defaultGroupForUser(c.Request().Context(), managedUser)
	if canChangeGroupName {
		req.GroupName = strings.TrimSpace(req.GroupName)
		req.GroupNameYomi = strings.TrimSpace(req.GroupNameYomi)
		if req.GroupName == "" {
			validationErrors["groupName"] = []string{"団体名を入力してください"}
		}
		if req.GroupNameYomi == "" {
			validationErrors["groupNameYomi"] = []string{"団体名(よみ)を入力してください"}
		} else if !isValidYomi(req.GroupNameYomi) {
			validationErrors["groupNameYomi"] = []string{"ひらがなで入力してください"}
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

	created, err := h.circles.CreateForUser(c.Request().Context(), currentSession.User, circle.CreateCircleParams{
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
		h.answers.Upsert(c.Request().Context(), formValue.ID, created.ID, buildAnswerSummary(questions, normalizedDetails, nil), normalizedDetails)
	}
	if !canChangeGroupName && len(managedUser.LeaderCircleIDs) > 0 {
		if err := h.copyExistingMembersToCircle(c.Request().Context(), currentSession.User, managedUser.LeaderCircleIDs[0], created.ID); err != nil {
			return internalError(c)
		}
	}

	h.sessions.Update(c.Request().Context(), sessionID, func(next *session.Session) {
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

	circleValue, err := h.circles.GetUserCircle(c.Request().Context(), currentSession.User, currentSession.CurrentCircleID)
	if errors.Is(err, circle.ErrNotFound) || errors.Is(err, circle.ErrForbidden) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	if circleValue.SubmittedAt != nil && circleValue.SubmittedAt.Before(time.Now()) {
		if currentSession.ReauthorizedAt.IsZero() || time.Since(currentSession.ReauthorizedAt) > 2*time.Hour {
			return errorJSON(c, http.StatusForbidden, "reauth_required")
		}
	}

	return h.respondWithCircleRegistration(c, currentSession.User, circleValue)
}

type authCurrentCircleRequest struct {
	Password string `json:"password"`
}

func (h *workspaceHandlers) authCurrentCircle(c echo.Context) error {
	sessionID, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}
	if currentSession.CurrentCircleID == "" {
		return errorJSON(c, http.StatusNotFound, "no_current_circle")
	}

	var request authCurrentCircleRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	managedUser, err := h.users.Find(currentSession.User.ID)
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}
	if err != nil {
		return internalError(c)
	}

	authenticated := false
	for _, loginID := range managedUser.LoginIDs {
		if _, ok := h.authenticator.Authenticate(c.Request().Context(), loginID, request.Password); ok {
			authenticated = true
			break
		}
	}
	if !authenticated {
		return errorJSON(c, http.StatusForbidden, "invalid_password")
	}

	if _, err := h.circles.GetUserCircle(c.Request().Context(), currentSession.User, currentSession.CurrentCircleID); errors.Is(err, circle.ErrNotFound) || errors.Is(err, circle.ErrForbidden) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	} else if err != nil {
		return internalError(c)
	}

	h.sessions.Update(c.Request().Context(), sessionID, func(next *session.Session) {
		next.ReauthorizedAt = time.Now()
	})

	return c.NoContent(http.StatusNoContent)
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
	circleValue, err := h.circles.GetUserCircle(c.Request().Context(), currentSession.User, currentSession.CurrentCircleID)
	if errors.Is(err, circle.ErrNotFound) || errors.Is(err, circle.ErrForbidden) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	_, pt, formValue, questions, members, leaderDisplayName, isLeader, err := h.loadCurrentCircleRegistration(c.Request().Context(), currentSession.User, currentSession.CurrentCircleID)
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

	existingUploads := h.answers.ListUploads(c.Request().Context(), formValue.ID, currentSession.CurrentCircleID)
	normalizedDetails, detailErrors := normalizeAnswerDetails(req.Details, questions, existingUploads)
	for key, messages := range detailErrors {
		validationErrors[key] = messages
	}
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	updated, err := h.circles.UpdateForUser(c.Request().Context(), currentSession.User, currentSession.CurrentCircleID, circle.UpdateCircleParams{
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
		h.answers.Upsert(c.Request().Context(), formValue.ID, updated.ID, buildAnswerSummary(questions, normalizedDetails, existingUploads), normalizedDetails)
	}

	return c.JSON(http.StatusOK, h.buildCircleRegistrationResponse(c.Request().Context(), updated, pt, formValue, questions, members, leaderDisplayName, isLeader))
}

func (h *workspaceHandlers) deleteCurrentCircle(c echo.Context) error {
	sessionID, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}
	if currentSession.CurrentCircleID == "" {
		return errorJSON(c, http.StatusNotFound, "no_current_circle")
	}

	if err := h.circles.DeleteForUser(c.Request().Context(), currentSession.User, currentSession.CurrentCircleID); errors.Is(err, circle.ErrForbidden) {
		return errorJSON(c, http.StatusForbidden, "forbidden")
	} else if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	} else if err != nil {
		return internalError(c)
	}

	h.sessions.Update(c.Request().Context(), sessionID, func(next *session.Session) {
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

	circleValue, pt, formValue, questions, members, _, isLeader, err := h.loadCurrentCircleRegistration(c.Request().Context(), currentSession.User, currentSession.CurrentCircleID)
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
		currentAnswer, found := h.answers.Get(c.Request().Context(), formValue.ID, currentSession.CurrentCircleID)
		if !found {
			return validationError(c, map[string][]string{
				"answer": {"企画参加登録の設問に回答してください"},
			})
		}
		uploads := h.answers.ListUploads(c.Request().Context(), formValue.ID, currentSession.CurrentCircleID)
		normalizedAnswerDetails, detailErrors := normalizeAnswerDetails(answerDetailsToAny(currentAnswer.Details), questions, uploads)
		if len(detailErrors) > 0 {
			return validationError(c, detailErrors)
		}
		answerSummary = buildAnswerSummary(questions, normalizedAnswerDetails, uploads)
	}

	submitted, err := h.circles.Submit(c.Request().Context(), currentSession.User, currentSession.CurrentCircleID)
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

	// 参加種別のタグを企画に同期（syncWithoutDetaching）
	mergedTags := make([]string, len(submitted.Tags))
	copy(mergedTags, submitted.Tags)
	existingTagMap := map[string]bool{}
	for _, t := range mergedTags {
		existingTagMap[t] = true
	}
	for _, t := range pt.Tags {
		if !existingTagMap[t] {
			mergedTags = append(mergedTags, t)
		}
	}
	if len(mergedTags) > len(submitted.Tags) {
		_, err = h.circles.UpdateTags(c.Request().Context(), submitted.ID, mergedTags)
		if err != nil {
			return internalError(c)
		}
	}

	subject := fmt.Sprintf("【参加登録】「%s」の参加登録を提出しました", submitted.Name)
	body := buildCircleSubmittedMailBody(submitted, members, formValue.ConfirmationMessage, answerSummary)
	if _, _, err := enqueueCircleNotificationMail(
		c.Request().Context(),
		h.email.EmailSender,
		h.users,
		members,
		submitted.ID,
		currentSession.User.ID,
		"circle_submission",
		h.allowDangerously,
		subject,
		body,
		h.email.From,
		h.email.AppName,
		h.email.AppURL,
		h.email.AdminName,
		h.email.ContactEmail,
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

	members, err := h.circles.ListMembers(c.Request().Context(), currentCircle.ID)
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

type addCurrentCircleMemberRequest struct {
	UserID string `json:"userId"`
}

func (h *workspaceHandlers) addCurrentCircleMember(c echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}
	if currentSession.CurrentCircleID == "" {
		return errorJSON(c, http.StatusNotFound, "no_current_circle")
	}

	var request addCurrentCircleMemberRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}
	request.UserID = strings.TrimSpace(request.UserID)
	if request.UserID == "" {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	targetUser, err := h.users.Find(request.UserID)
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "user_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	if err := h.circles.AddMember(c.Request().Context(), currentSession.User, currentSession.CurrentCircleID, targetUser.ID, targetUser.DisplayName, targetUser.IsVerified); errors.Is(err, circle.ErrForbidden) {
		return errorJSON(c, http.StatusForbidden, "forbidden")
	} else if errors.Is(err, circle.ErrInviteeUnverified) {
		return errorJSON(c, http.StatusConflict, "invitee_unverified")
	} else if errors.Is(err, circle.ErrAlreadyMember) {
		return errorJSON(c, http.StatusConflict, "already_member")
	} else if err != nil {
		return internalError(c)
	}

	return c.NoContent(http.StatusNoContent)
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

	if err := h.circles.RemoveMember(c.Request().Context(), currentSession.User, currentSession.CurrentCircleID, targetUserID); errors.Is(err, circle.ErrForbidden) {
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

	updated, err := h.circles.RegenerateInvitationToken(c.Request().Context(), currentSession.User, currentSession.CurrentCircleID)
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

func (h *workspaceHandlers) getCircleByInvitationToken(c echo.Context) error {
	token := c.Param("token")
	if token == "" {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	joinTarget, err := h.circles.FindByInvitationToken(c.Request().Context(), token)
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "invalid_token")
	}
	if err != nil {
		return internalError(c)
	}
	if joinTarget.SubmittedAt != nil {
		return errorJSON(c, http.StatusNotFound, "invalid_token")
	}
	pt, formValue, _, err := h.resolveParticipationRegistrationForm(c.Request().Context(), joinTarget.ParticipationTypeID)
	if errors.Is(err, participationtype.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "invalid_token")
	}
	if err != nil {
		return internalError(c)
	}
	if !isPublicParticipationForm(formValue) || pt.ID == "" {
		return errorJSON(c, http.StatusNotFound, "invalid_token")
	}

	return c.JSON(http.StatusOK, mapCircleDetail(joinTarget))
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

	joinTarget, err := h.circles.FindByInvitationToken(c.Request().Context(), token)
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "invalid_token")
	}
	if err != nil {
		return internalError(c)
	}
	pt, formValue, _, err := h.resolveParticipationRegistrationForm(c.Request().Context(), joinTarget.ParticipationTypeID)
	if errors.Is(err, participationtype.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "invalid_token")
	}
	if err != nil {
		return internalError(c)
	}
	if !isPublicParticipationForm(formValue) || pt.ID == "" {
		return errorJSON(c, http.StatusNotFound, "invalid_token")
	}

	joined, err := h.circles.JoinByToken(c.Request().Context(), currentSession.User, token)
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "invalid_token")
	}
	if errors.Is(err, circle.ErrAlreadyMember) {
		return errorJSON(c, http.StatusConflict, "already_member")
	}
	if err != nil {
		return internalError(c)
	}

	h.sessions.Update(c.Request().Context(), sessionID, func(next *session.Session) {
		next.CurrentCircleID = joined.ID
	})

	return c.JSON(http.StatusOK, mapCircleDetail(joined))
}
