package httpapi

import (
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
)

type staffCircleResponse struct {
	ID                    string `json:"id"`
	Name                  string `json:"name"`
	GroupName             string `json:"groupName"`
	ParticipationTypeID   string `json:"participationTypeId"`
	ParticipationTypeName string `json:"participationTypeName"`
}

type staffCircleMailRecipientResponse struct {
	ID          string   `json:"id"`
	DisplayName string   `json:"displayName"`
	LoginIDs    []string `json:"loginIds"`
}

type staffCircleMailFormResponse struct {
	Circle     staffCircleResponse                `json:"circle"`
	Recipients []staffCircleMailRecipientResponse `json:"recipients"`
}

type mutateStaffCircleRequest struct {
	Name                string `json:"name"`
	GroupName           string `json:"groupName"`
	ParticipationTypeID string `json:"participationTypeId"`
}

type sendStaffCircleMailRequest struct {
	Recipient string `json:"recipient"`
	Subject   string `json:"subject"`
	Body      string `json:"body"`
}

func (h *staffCircleHandlers) listStaffCircles(c echo.Context) error {
	_, _, status, ok := h.requireCircleRead(c)
	if !ok {
		return statusError(c, status)
	}

	circles, err := h.circles.ListForStaff()
	if err != nil {
		return internalError(c)
	}

	pagination := readPagination(c)
	response := make([]staffCircleResponse, 0, len(circles))
	for _, currentCircle := range circles {
		response = append(response, mapStaffCircle(currentCircle))
	}

	return c.JSON(http.StatusOK, paginateItems(response, pagination))
}

func (h *staffCircleHandlers) listAllStaffCircles(c echo.Context) error {
	_, _, status, ok := h.requireCircleRead(c)
	if !ok {
		return statusError(c, status)
	}

	circles, err := h.circles.ListForStaff()
	if err != nil {
		return internalError(c)
	}

	response := make([]staffCircleResponse, 0, len(circles))
	for _, currentCircle := range circles {
		response = append(response, mapStaffCircle(currentCircle))
	}

	return c.JSON(http.StatusOK, response)
}

func (h *staffCircleHandlers) downloadStaffCirclesCSV(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canExportCircles)
	if !ok {
		return statusError(c, status)
	}

	circles, err := h.circles.ListForStaff()
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	rows := [][]string{{"id", "name", "group_name", "participation_type_id", "participation_type_name"}}
	for _, currentCircle := range circles {
		rows = append(rows, []string{
			currentCircle.ID,
			currentCircle.Name,
			currentCircle.GroupName,
			currentCircle.ParticipationTypeID,
			currentCircle.ParticipationTypeName,
		})
	}

	csvBytes, err := writeCSV(rows)
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	filename := "staff-circles.csv"
	c.Response().Header().Set(echo.HeaderContentType, "text/csv; charset=utf-8")
	c.Response().Header().Set(echo.HeaderContentDisposition, fmt.Sprintf("attachment; filename=%q", filename))
	return c.Blob(http.StatusOK, "text/csv; charset=utf-8", csvBytes)
}

func (h *staffCircleHandlers) getStaffCircle(c echo.Context) error {
	_, _, status, ok := h.requireCircleRead(c)
	if !ok {
		return statusError(c, status)
	}

	circleValue, err := h.circles.Find(c.Param("circleID"))
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	return c.JSON(http.StatusOK, mapStaffCircle(circleValue))
}

func (h *staffCircleHandlers) createStaffCircle(c echo.Context) error {
	_, currentSession, status, ok := h.requireCircleEdit(c)
	if !ok {
		return statusError(c, status)
	}

	request, validationErrors, valid := bindAndValidateStaffCircle(c)
	if !valid {
		return validationError(c, validationErrors)
	}

	participationType, err := h.participationTypes.Find(request.ParticipationTypeID)
	if errors.Is(err, participationtype.ErrNotFound) {
		return validationError(c, map[string][]string{
			"participationTypeId": {"参加種別を選択してください"},
		})
	}
	if err != nil {
		return internalError(c)
	}

	created, err := h.circles.Create(
		request.Name,
		request.GroupName,
		participationType.ID,
		participationType.Name,
		participationType.Tags,
	)
	if err != nil {
		return internalError(c)
	}
	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.circle.created",
		"circle",
		created.ID,
		created.ID,
		buildActivitySummary("staff が企画を作成しました", created.Name),
	)

	return c.JSON(http.StatusCreated, mapStaffCircle(created))
}

func (h *staffCircleHandlers) updateStaffCircle(c echo.Context) error {
	_, currentSession, status, ok := h.requireCircleEdit(c)
	if !ok {
		return statusError(c, status)
	}

	request, validationErrors, valid := bindAndValidateStaffCircle(c)
	if !valid {
		return validationError(c, validationErrors)
	}

	participationType, err := h.participationTypes.Find(request.ParticipationTypeID)
	if errors.Is(err, participationtype.ErrNotFound) {
		return validationError(c, map[string][]string{
			"participationTypeId": {"参加種別を選択してください"},
		})
	}
	if err != nil {
		return internalError(c)
	}

	updated, err := h.circles.Update(
		c.Param("circleID"),
		request.Name,
		request.GroupName,
		participationType.ID,
		participationType.Name,
		participationType.Tags,
	)
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.circle.updated",
		"circle",
		updated.ID,
		updated.ID,
		buildActivitySummary("staff が企画を更新しました", updated.Name),
	)

	return c.JSON(http.StatusOK, mapStaffCircle(updated))
}

func (h *staffCircleHandlers) deleteStaffCircle(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canDeleteCircles)
	if !ok {
		return statusError(c, status)
	}

	circleID := c.Param("circleID")
	currentCircle, err := h.circles.Find(circleID)
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	if err := h.circles.Delete(circleID); errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	} else if err != nil {
		return internalError(c)
	}

	if err := h.booths.DeleteByCircle(circleID); err != nil {
		return internalError(c)
	}
	h.mails.DeleteByCircle(circleID)
	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.circle.deleted",
		"circle",
		circleID,
		circleID,
		buildActivitySummary("staff が企画を削除しました", currentCircle.Name),
	)

	return c.NoContent(http.StatusNoContent)
}

func (h *staffCircleHandlers) getStaffCircleMailForm(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canSendCircleEmails)
	if !ok {
		return statusError(c, status)
	}

	circleValue, recipients, err := h.loadStaffCircleMailRecipients(c.Param("circleID"), false)
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	response := make([]staffCircleMailRecipientResponse, 0, len(recipients))
	for _, recipient := range recipients {
		response = append(response, mapStaffCircleMailRecipient(recipient))
	}

	return c.JSON(http.StatusOK, staffCircleMailFormResponse{
		Circle:     mapStaffCircle(circleValue),
		Recipients: response,
	})
}

func (h *staffCircleHandlers) sendStaffCircleMail(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canSendCircleEmails)
	if !ok {
		return statusError(c, status)
	}

	var request sendStaffCircleMailRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	request.Recipient = strings.TrimSpace(request.Recipient)
	request.Subject = strings.TrimSpace(request.Subject)
	request.Body = strings.TrimSpace(request.Body)

	validationErrors := map[string][]string{}
	if request.Recipient != "all" && request.Recipient != "leader" {
		validationErrors["recipient"] = []string{"宛先を選択してください"}
	}
	if request.Subject == "" {
		validationErrors["subject"] = []string{"件名を入力してください"}
	}
	if request.Body == "" {
		validationErrors["body"] = []string{"本文を入力してください"}
	}
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	circleValue, recipients, err := h.loadStaffCircleMailRecipients(c.Param("circleID"), request.Recipient == "leader")
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	recipientEmails := collectRecipientLoginIDs(recipients)
	if len(recipientEmails) == 0 {
		return validationError(c, map[string][]string{
			"recipient": {"宛先が存在しないため送信できませんでした"},
		})
	}

	h.mails.Enqueue(circleValue.ID, currentSession.User.ID, request.Subject, request.Body, recipientEmails)
	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.circle.mail_queued",
		"circle",
		circleValue.ID,
		circleValue.ID,
		buildActivitySummary("staff が企画所属者向けメールをキューに追加しました", circleValue.Name),
	)

	return c.NoContent(http.StatusCreated)
}

func (h *staffCircleHandlers) requireCircleRead(c echo.Context) (string, session.Session, int, bool) {
	return h.requireStaffCapability(c, canReadCircles)
}

func (h *staffCircleHandlers) requireCircleEdit(c echo.Context) (string, session.Session, int, bool) {
	return h.requireStaffCapability(c, canEditCircles)
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
	request.GroupName = strings.TrimSpace(request.GroupName)
	request.ParticipationTypeID = strings.TrimSpace(request.ParticipationTypeID)

	errors := map[string][]string{}
	if request.Name == "" {
		errors["name"] = []string{"企画名を入力してください"}
	}
	if request.GroupName == "" {
		errors["groupName"] = []string{"企画グループ名を入力してください"}
	}
	if request.ParticipationTypeID == "" {
		errors["participationTypeId"] = []string{"参加種別を選択してください"}
	}

	return request, errors, len(errors) == 0
}

func (h *staffCircleHandlers) loadStaffCircleMailRecipients(circleID string, leadersOnly bool) (circle.Circle, []useradmin.User, error) {
	circleValue, err := h.circles.Find(circleID)
	if err != nil {
		return circle.Circle{}, nil, err
	}

	if leadersOnly {
		users, listErr := h.users.ListLeadersByCircleIDs([]string{circleID})
		return circleValue, users, listErr
	}

	users, listErr := h.users.ListByCircleIDs([]string{circleID})
	return circleValue, users, listErr
}

func collectRecipientLoginIDs(users []useradmin.User) []string {
	recipients := make([]string, 0)
	seen := map[string]struct{}{}
	for _, userValue := range users {
		for _, loginID := range userValue.LoginIDs {
			trimmed := strings.TrimSpace(loginID)
			if trimmed == "" || !strings.Contains(trimmed, "@") {
				continue
			}
			if _, ok := seen[trimmed]; ok {
				continue
			}
			seen[trimmed] = struct{}{}
			recipients = append(recipients, trimmed)
		}
	}

	slices.Sort(recipients)
	return recipients
}

func mapStaffCircle(circleValue circle.Circle) staffCircleResponse {
	return staffCircleResponse{
		ID:                    circleValue.ID,
		Name:                  circleValue.Name,
		GroupName:             circleValue.GroupName,
		ParticipationTypeID:   circleValue.ParticipationTypeID,
		ParticipationTypeName: circleValue.ParticipationTypeName,
	}
}

func mapStaffCircleMailRecipient(userValue useradmin.User) staffCircleMailRecipientResponse {
	return staffCircleMailRecipientResponse{
		ID:          userValue.ID,
		DisplayName: userValue.DisplayName,
		LoginIDs:    slices.Clone(userValue.LoginIDs),
	}
}
