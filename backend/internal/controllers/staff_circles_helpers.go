package controllers

import (
	"slices"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
)

func (h *staffCircleHandlers) requireCircleRead(c echo.Context) (string, session.Session, int, bool) {
	return h.requireStaffCapability(c, canReadCircles)
}

func (h *staffCircleHandlers) requireCircleEdit(c echo.Context) (string, session.Session, int, bool) {
	return h.requireStaffCapability(c, canEditCircles)
}

func (h *staffCircleHandlers) requireParticipationTypeRead(c echo.Context) (string, session.Session, int, bool) {
	return h.requireStaffCapability(c, canReadParticipationTypes)
}

func (h *staffCircleHandlers) requireParticipationTypeAdmin(c echo.Context) (string, session.Session, int, bool) {
	return h.requireStaffCapability(c, canManageParticipationTypes)
}

func bindAndValidateStaffCircle(c echo.Context) (mutateStaffCircleRequest, map[string][]string, bool) {
	var request mutateStaffCircleRequest
	if err := c.Bind(&request); err != nil {
		return mutateStaffCircleRequest{}, map[string][]string{
			"request": {"invalid_request"},
		}, false
	}

	request.Name = strings.TrimSpace(request.Name)
	request.NameYomi = strings.TrimSpace(request.NameYomi)
	request.GroupName = strings.TrimSpace(request.GroupName)
	request.GroupNameYomi = strings.TrimSpace(request.GroupNameYomi)
	request.ParticipationTypeID = strings.TrimSpace(request.ParticipationTypeID)
	request.Notes = strings.TrimSpace(request.Notes)
	request.Status = strings.TrimSpace(request.Status)
	request.StatusReason = strings.TrimSpace(request.StatusReason)
	if request.Status == "" {
		request.Status = "pending"
	}
	if request.PlaceIDs == nil {
		request.PlaceIDs = []string{}
	}

	errs := map[string][]string{}
	if request.Name == "" {
		errs["name"] = []string{"企画名を入力してください"}
	}
	if request.NameYomi == "" {
		errs["nameYomi"] = []string{"企画名(よみ)を入力してください"}
	}
	if request.GroupName == "" {
		errs["groupName"] = []string{"企画グループ名を入力してください"}
	}
	if request.GroupNameYomi == "" {
		errs["groupNameYomi"] = []string{"企画グループ名(よみ)を入力してください"}
	}
	if request.ParticipationTypeID == "" {
		errs["participationTypeId"] = []string{"参加種別を選択してください"}
	}
	validStatuses := map[string]bool{"pending": true, "approved": true, "rejected": true}
	if !validStatuses[request.Status] {
		errs["status"] = []string{"登録受理状況は pending, approved, rejected のいずれかを選択してください"}
	}

	return request, errs, len(errs) == 0
}

func (h *staffCircleHandlers) loadStaffCircleMembers(circleID string) ([]staffCircleMemberResponse, error) {
	if _, err := h.circles.Find(circleID); err != nil {
		return nil, err
	}

	members, err := h.circles.ListMembers(circleID)
	if err != nil {
		return nil, err
	}
	if len(members) == 0 {
		return []staffCircleMemberResponse{}, nil
	}

	response := make([]staffCircleMemberResponse, 0, len(members))
	for _, member := range members {
		loginIDs := []string{}
		userValue, err := h.users.Find(member.UserID)
		if err == nil {
			loginIDs = slices.Clone(userValue.LoginIDs)
		}
		response = append(response, staffCircleMemberResponse{
			UserID:      member.UserID,
			DisplayName: member.DisplayName,
			LoginIDs:    loginIDs,
			IsLeader:    member.IsLeader,
		})
	}

	return response, nil
}

func (h *staffCircleHandlers) loadStaffCircleMailRecipients(circleID string, leadersOnly bool) (circle.Circle, []staffCircleMailRecipient, error) {
	circleValue, err := h.circles.Find(circleID)
	if err != nil {
		return circle.Circle{}, nil, err
	}

	members, err := h.circles.ListMembers(circleID)
	if err != nil {
		return circleValue, nil, err
	}

	recipients := make([]staffCircleMailRecipient, 0, len(members))
	for _, member := range members {
		if leadersOnly && !member.IsLeader {
			continue
		}
		userValue, findErr := h.users.Find(member.UserID)
		if findErr != nil {
			continue
		}
		recipients = append(recipients, staffCircleMailRecipient{
			User:     userValue,
			IsLeader: member.IsLeader,
		})
	}

	return circleValue, recipients, nil
}
