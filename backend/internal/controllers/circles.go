package controllers

import (
	"errors"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	backendform "github.com/s-union/PortalDots/backend/internal/domain/form"
	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
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
	ID                    string  `json:"id"`
	Name                  string  `json:"name"`
	NameYomi              string  `json:"nameYomi"`
	GroupName             string  `json:"groupName"`
	GroupNameYomi         string  `json:"groupNameYomi"`
	ParticipationTypeID   string  `json:"participationTypeId"`
	ParticipationTypeName string  `json:"participationTypeName"`
	Notes                 string  `json:"notes"`
	InvitationToken       string  `json:"invitationToken"`
	SubmittedAt           *string `json:"submittedAt"`
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
	Name                string `json:"name"`
	NameYomi            string `json:"nameYomi"`
	GroupName           string `json:"groupName"`
	GroupNameYomi       string `json:"groupNameYomi"`
	ParticipationTypeID string `json:"participationTypeId"`
	Notes               string `json:"notes"`
}

type updateCircleRequest struct {
	Name          string `json:"name"`
	NameYomi      string `json:"nameYomi"`
	GroupName     string `json:"groupName"`
	GroupNameYomi string `json:"groupNameYomi"`
	Notes         string `json:"notes"`
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
		InvitationToken:       c.InvitationToken,
		SubmittedAt:           submittedAt,
	}
}

func (h *workspaceHandlers) listCircles(c echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}

	var (
		circles []circle.Circle
		err     error
	)
	if hasStaffAccess(currentSession.User.Roles, currentSession.User.Permissions) {
		circles, err = h.circles.ListForStaff()
	} else {
		circles, err = h.circles.ListSelectable(currentSession.User)
	}
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
	if req.GroupName == "" {
		validationErrors["groupName"] = []string{"団体名を入力してください"}
	}
	if req.ParticipationTypeID == "" {
		validationErrors["participationTypeId"] = []string{"参加種別を選択してください"}
	}
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	pt, err := h.participationTypes.Find(req.ParticipationTypeID)
	if err != nil {
		return validationError(c, map[string][]string{"participationTypeId": {"参加種別が存在しません"}})
	}

	created, err := h.circles.CreateForUser(currentSession.User, circle.CreateCircleParams{
		Name:                  req.Name,
		NameYomi:              req.NameYomi,
		GroupName:             req.GroupName,
		GroupNameYomi:         req.GroupNameYomi,
		ParticipationTypeID:   pt.ID,
		ParticipationTypeName: pt.Name,
		Notes:                 req.Notes,
	})
	if err != nil {
		return internalError(c)
	}

	h.sessions.Update(sessionID, func(next *session.Session) {
		next.CurrentCircleID = created.ID
	})

	return c.JSON(http.StatusCreated, mapCircleDetail(created))
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

	return c.JSON(http.StatusOK, mapCircleDetail(circleValue))
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
	req.GroupName = strings.TrimSpace(req.GroupName)
	req.GroupNameYomi = strings.TrimSpace(req.GroupNameYomi)

	validationErrors := map[string][]string{}
	if req.Name == "" {
		validationErrors["name"] = []string{"企画名を入力してください"}
	}
	if req.GroupName == "" {
		validationErrors["groupName"] = []string{"団体名を入力してください"}
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

	return c.JSON(http.StatusOK, mapCircleDetail(updated))
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

	submitted, err := h.circles.Submit(currentSession.User, currentSession.CurrentCircleID)
	if errors.Is(err, circle.ErrForbidden) {
		return errorJSON(c, http.StatusForbidden, "forbidden")
	}
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	return c.JSON(http.StatusOK, mapCircleDetail(submitted))
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
