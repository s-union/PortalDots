package controllers

import (
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	backendform "github.com/s-union/PortalDots/backend/internal/domain/form"
	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
)

type selectableCircleResponse struct {
	ID                    string `json:"id"`
	Name                  string `json:"name"`
	GroupName             string `json:"groupName"`
	ParticipationTypeName string `json:"participationTypeName"`
}

type setCurrentCircleRequest struct {
	CircleID string `json:"circleId"`
}

type circleDetailResponse struct {
	ID                    string              `json:"id"`
	Name                  string              `json:"name"`
	NameYomi              string              `json:"nameYomi"`
	GroupName             string              `json:"groupName"`
	GroupNameYomi         string              `json:"groupNameYomi"`
	ParticipationTypeID   string              `json:"participationTypeId"`
	ParticipationTypeName string              `json:"participationTypeName"`
	FormID                string              `json:"formId"`
	Notes                 string              `json:"notes"`
	LeaderDisplayName     string              `json:"leaderDisplayName"`
	CanChangeGroupName    bool                `json:"canChangeGroupName"`
	IsLeader              bool                `json:"isLeader"`
	LastUpdatedAt         string              `json:"lastUpdatedAt"`
	UsersCountMin         int32               `json:"usersCountMin"`
	UsersCountMax         int32               `json:"usersCountMax"`
	MemberCount           int                 `json:"memberCount"`
	CanSubmit             bool                `json:"canSubmit"`
	FormDescription       string              `json:"formDescription"`
	ConfirmationMessage   string              `json:"confirmationMessage"`
	Questions             []staffFormQuestion `json:"questions"`
	Answer                *formAnswerResponse `json:"answer"`
	InvitationToken       string              `json:"invitationToken"`
	SubmittedAt           *string             `json:"submittedAt"`
}

type circleMemberResponse struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
	IsLeader    bool   `json:"isLeader"`
}

type addCurrentCircleMemberRequest struct {
	LoginID string `json:"loginId"`
}

type createCircleRequest struct {
	Name                string         `json:"name"`
	NameYomi            string         `json:"nameYomi"`
	GroupName           string         `json:"groupName"`
	GroupNameYomi       string         `json:"groupNameYomi"`
	ParticipationTypeID string         `json:"participationTypeId"`
	Notes               string         `json:"notes"`
	Details             map[string]any `json:"details"`
}

type updateCircleRequest struct {
	Name          string         `json:"name"`
	NameYomi      string         `json:"nameYomi"`
	GroupName     string         `json:"groupName"`
	GroupNameYomi string         `json:"groupNameYomi"`
	Notes         string         `json:"notes"`
	Details       map[string]any `json:"details"`
}

type submitCurrentCircleRequest struct {
	LastUpdatedAt string `json:"lastUpdatedAt"`
}

func mapCircleDetail(c circle.Circle) circleDetailResponse {
	var submittedAt *string
	if c.SubmittedAt != nil {
		s := c.SubmittedAt.Format(time.RFC3339)
		submittedAt = &s
	}
	return circleDetailResponse{
		ID:                    c.ID,
		Name:                  c.Name,
		NameYomi:              c.NameYomi,
		GroupName:             c.GroupName,
		GroupNameYomi:         c.GroupNameYomi,
		ParticipationTypeID:   c.ParticipationTypeID,
		ParticipationTypeName: c.ParticipationTypeName,
		Notes:                 c.Notes,
		CanChangeGroupName:    c.CanChangeGroupName,
		LastUpdatedAt:         c.UpdatedAt.Format(time.RFC3339),
		Questions:             []staffFormQuestion{},
		InvitationToken:       c.InvitationToken,
		SubmittedAt:           submittedAt,
	}
}

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
		response = append(response, selectableCircleResponse{
			ID:                    selectable.ID,
			Name:                  selectable.Name,
			GroupName:             selectable.GroupName,
			ParticipationTypeName: selectable.ParticipationTypeName,
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

	slices.SortFunc(items, func(left, right participationtype.ParticipationType) int {
		return strings.Compare(left.Name, right.Name)
	})

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
	if len(questions) > 0 {
		currentAnswer, found := h.answers.Get(formValue.ID, currentSession.CurrentCircleID)
		if !found {
			return validationError(c, map[string][]string{
				"answer": {"企画参加登録の設問に回答してください"},
			})
		}
		if _, detailErrors := normalizeAnswerDetails(answerDetailsToAny(currentAnswer.Details), questions, h.answers.ListUploads(formValue.ID, currentSession.CurrentCircleID)); len(detailErrors) > 0 {
			return validationError(c, detailErrors)
		}
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

	return h.respondWithCircleRegistration(c, currentSession.User, submitted)
}

func (h *workspaceHandlers) listCurrentCircleMembers(c echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}
	if currentSession.CurrentCircleID == "" {
		return errorJSON(c, http.StatusNotFound, "no_current_circle")
	}

	members, err := h.circles.ListMembers(currentSession.CurrentCircleID)
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

	var req addCurrentCircleMemberRequest
	if err := c.Bind(&req); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	req.LoginID = strings.TrimSpace(req.LoginID)
	if req.LoginID == "" {
		return validationError(c, map[string][]string{
			"loginId": {"学籍番号または連絡先メールアドレスを入力してください"},
		})
	}

	targetUser, err := h.users.FindByLoginID(req.LoginID)
	if errors.Is(err, useradmin.ErrNotFound) {
		targetUser, err = h.users.FindByContactEmail(req.LoginID)
	}
	if err != nil {
		return validationError(c, map[string][]string{
			"loginId": {"この学籍番号または連絡先メールアドレスは登録されていません"},
		})
	}

	err = h.circles.AddMember(currentSession.User, currentSession.CurrentCircleID, targetUser.ID, targetUser.DisplayName, targetUser.IsVerified)
	if errors.Is(err, circle.ErrForbidden) {
		return errorJSON(c, http.StatusForbidden, "forbidden")
	}
	if errors.Is(err, circle.ErrAlreadyMember) {
		return validationError(c, map[string][]string{
			"loginId": {"このユーザーは既にメンバーです"},
		})
	}
	if errors.Is(err, circle.ErrInviteeUnverified) {
		return validationError(c, map[string][]string{
			"loginId": {"このユーザーはメール認証が完了していません"},
		})
	}
	if err != nil {
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
	if joinTarget.SubmittedAt != nil {
		return errorJSON(c, http.StatusNotFound, "invalid_token")
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

func isPublicParticipationForm(formValue backendform.Form) bool {
	return formValue.IsPublic && formValue.IsOpen
}

func (h *workspaceHandlers) respondWithCircleRegistration(c echo.Context, user *auth.User, circleValue circle.Circle) error {
	return h.respondWithCircleRegistrationStatus(c, user, circleValue, http.StatusOK)
}

func (h *workspaceHandlers) respondWithCircleRegistrationStatus(c echo.Context, user *auth.User, circleValue circle.Circle, status int) error {
	_, pt, formValue, questions, members, leaderDisplayName, isLeader, err := h.loadCurrentCircleRegistration(user, circleValue.ID)
	if err != nil {
		return internalError(c)
	}

	return c.JSON(status, h.buildCircleRegistrationResponse(circleValue, pt, formValue, questions, members, leaderDisplayName, isLeader))
}

func (h *workspaceHandlers) buildCircleRegistrationResponse(
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
	response.Questions = mapStaffFormQuestions(questions)
	if currentAnswer, found := h.answers.Get(formValue.ID, circleValue.ID); found {
		response.Answer = buildFormAnswerResponse(currentAnswer, h.answers.ListUploads(formValue.ID, circleValue.ID))
	}
	return response
}

func (h *workspaceHandlers) resolveParticipationRegistrationForm(typeID string) (participationtype.ParticipationType, backendform.Form, []formquestion.Question, error) {
	pt, err := h.participationTypes.Find(typeID)
	if err != nil {
		return participationtype.ParticipationType{}, backendform.Form{}, nil, err
	}
	formValue, found := h.forms.FindByIDForStaff(pt.FormID)
	if !found || !isPublicParticipationForm(formValue) {
		return participationtype.ParticipationType{}, backendform.Form{}, nil, participationtype.ErrNotFound
	}
	questions, err := h.formQuestions.List(formValue.ID)
	if err != nil {
		return participationtype.ParticipationType{}, backendform.Form{}, nil, err
	}
	return pt, formValue, questions, nil
}

func (h *workspaceHandlers) loadCurrentCircleRegistration(user *auth.User, circleID string) (circle.Circle, participationtype.ParticipationType, backendform.Form, []formquestion.Question, []circle.CircleMember, string, bool, error) {
	circleValue, err := h.circles.GetUserCircle(user, circleID)
	if err != nil {
		return circle.Circle{}, participationtype.ParticipationType{}, backendform.Form{}, nil, nil, "", false, err
	}
	pt, formValue, questions, err := h.resolveParticipationRegistrationForm(circleValue.ParticipationTypeID)
	if err != nil {
		return circle.Circle{}, participationtype.ParticipationType{}, backendform.Form{}, nil, nil, "", false, err
	}
	members, err := h.circles.ListMembers(circleID)
	if err != nil {
		return circle.Circle{}, participationtype.ParticipationType{}, backendform.Form{}, nil, nil, "", false, err
	}
	leaderDisplayName, isLeader := leaderSummary(members, user.ID)
	return circleValue, pt, formValue, questions, members, leaderDisplayName, isLeader, nil
}

func leaderSummary(members []circle.CircleMember, currentUserID string) (string, bool) {
	leaderDisplayName := ""
	isLeader := false
	for _, member := range members {
		if !member.IsLeader {
			continue
		}
		if leaderDisplayName == "" {
			leaderDisplayName = member.DisplayName
		}
		if member.UserID == currentUserID {
			isLeader = true
			leaderDisplayName = member.DisplayName
		}
	}
	return leaderDisplayName, isLeader
}

func (h *workspaceHandlers) defaultGroupForUser(userValue useradmin.User) (string, string, bool) {
	if len(userValue.LeaderCircleIDs) == 0 {
		return "", "", true
	}
	existingCircle, err := h.circles.Find(userValue.LeaderCircleIDs[0])
	if err != nil {
		return "", "", true
	}
	return existingCircle.GroupName, existingCircle.GroupNameYomi, false
}

func (h *workspaceHandlers) copyExistingMembersToCircle(requester *auth.User, sourceCircleID, destinationCircleID string) {
	members, err := h.circles.ListMembers(sourceCircleID)
	if err != nil {
		return
	}
	for _, member := range members {
		if member.IsLeader {
			continue
		}
		_ = h.circles.AddMember(requester, destinationCircleID, member.UserID, member.DisplayName, true)
	}
}

func (h *workspaceHandlers) validateCircleMemberCount(pt participationtype.ParticipationType, members []circle.CircleMember) map[string][]string {
	memberCount := int32(len(members))
	if memberCount < pt.UsersCountMin {
		return map[string][]string{
			"members": {fmt.Sprintf("参加登録に必要な人数が不足しています。あと%d人必要です", pt.UsersCountMin-memberCount)},
		}
	}
	if pt.UsersCountMax > 0 && memberCount > pt.UsersCountMax {
		return map[string][]string{
			"members": {fmt.Sprintf("参加登録の最大人数を超えています。%d人減らしてください", memberCount-pt.UsersCountMax)},
		}
	}
	return map[string][]string{}
}

func (h *workspaceHandlers) canSubmitCircle(pt participationtype.ParticipationType, members []circle.CircleMember) bool {
	return len(h.validateCircleMemberCount(pt, members)) == 0
}

func answerDetailsToAny(details map[string][]string) map[string]any {
	if len(details) == 0 {
		return map[string]any{}
	}
	converted := make(map[string]any, len(details))
	for questionID, values := range details {
		cloned := append([]string{}, values...)
		converted[questionID] = cloned
	}
	return converted
}

func questionsWithoutRequiredUploads(questions []formquestion.Question) []formquestion.Question {
	filtered := make([]formquestion.Question, 0, len(questions))
	for _, question := range questions {
		if question.Type == "upload" {
			question.IsRequired = false
		}
		filtered = append(filtered, question)
	}
	return filtered
}
