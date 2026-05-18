package controllers

import (
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/shared/cloudflareemail"
)

type staffCircleResponse struct {
	ID                    string   `json:"id"`
	Name                  string   `json:"name"`
	NameYomi              string   `json:"nameYomi"`
	GroupName             string   `json:"groupName"`
	GroupNameYomi         string   `json:"groupNameYomi"`
	ParticipationTypeID   string   `json:"participationTypeId"`
	ParticipationTypeName string   `json:"participationTypeName"`
	Tags                  []string `json:"tags"`
	Notes                 string   `json:"notes"`
	SubmittedAt           *string  `json:"submittedAt"`
	Status                string   `json:"status"`
	StatusReason          string   `json:"statusReason"`
	StatusSetAt           *string  `json:"statusSetAt"`
	StatusSetByID         *string  `json:"statusSetById"`
	Places                []string `json:"places"`
}

type staffCircleMailRecipientResponse struct {
	ID          string   `json:"id"`
	DisplayName string   `json:"displayName"`
	LoginIDs    []string `json:"loginIds"`
	IsLeader    bool     `json:"isLeader"`
}

type staffCircleMemberResponse struct {
	UserID      string   `json:"userId"`
	DisplayName string   `json:"displayName"`
	LoginIDs    []string `json:"loginIds"`
	IsLeader    bool     `json:"isLeader"`
}

type staffCircleMailFormResponse struct {
	Circle     staffCircleResponse                `json:"circle"`
	Recipients []staffCircleMailRecipientResponse `json:"recipients"`
}

type mutateStaffCircleRequest struct {
	Name                string   `json:"name"`
	NameYomi            string   `json:"nameYomi"`
	GroupName           string   `json:"groupName"`
	GroupNameYomi       string   `json:"groupNameYomi"`
	ParticipationTypeID string   `json:"participationTypeId"`
	Notes               string   `json:"notes"`
	Status              string   `json:"status"`
	StatusReason        string   `json:"statusReason"`
	PlaceIDs            []string `json:"placeIds"`
}

type sendStaffCircleMailRequest struct {
	Recipient string `json:"recipient"`
	Subject   string `json:"subject"`
	Body      string `json:"body"`
	CcToStaff bool   `json:"ccToStaff"`
}

type staffCircleMailRecipient struct {
	User     useradmin.User
	IsLeader bool
}

type addStaffCircleMemberRequest struct {
	LoginID string `json:"loginId"`
}

func (h *staffCircleHandlers) listStaffCircles(c echo.Context) error {
	_, _, status, ok := h.requireCircleRead(c)
	if !ok {
		return statusError(c, status)
	}
	filterQueries, filterMode, err := parseStaffListFilters(c.QueryParam("queries"), c.QueryParam("mode"), staffCircleFilterableFields)
	if err != nil {
		return validationError(c, map[string][]string{"queries": {"絞り込み条件が正しくありません"}})
	}

	circles, err := h.circles.ListForStaff(c.Request().Context())
	if err != nil {
		return internalError(c)
	}

	pagination := readPagination(c)
	response := make([]staffCircleResponse, 0, len(circles))
	for _, currentCircle := range circles {
		item := mapStaffCircle(currentCircle)
		if !matchesStaffCircleSearch(item, c.QueryParam("query")) || !matchesStaffListFilters(staffCircleFilterResolver(item), filterQueries, filterMode) {
			continue
		}
		response = append(response, item)
	}

	return c.JSON(http.StatusOK, paginateItems(response, pagination))
}

func (h *staffCircleHandlers) listAllStaffCircles(c echo.Context) error {
	_, _, status, ok := h.requireCircleRead(c)
	if !ok {
		return statusError(c, status)
	}
	filterQueries, filterMode, err := parseStaffListFilters(c.QueryParam("queries"), c.QueryParam("mode"), staffCircleFilterableFields)
	if err != nil {
		return validationError(c, map[string][]string{"queries": {"絞り込み条件が正しくありません"}})
	}

	circles, err := h.circles.ListForStaff(c.Request().Context())
	if err != nil {
		return internalError(c)
	}

	response := make([]staffCircleResponse, 0, len(circles))
	for _, currentCircle := range circles {
		item := mapStaffCircle(currentCircle)
		if !matchesStaffCircleSearch(item, c.QueryParam("query")) || !matchesStaffListFilters(staffCircleFilterResolver(item), filterQueries, filterMode) {
			continue
		}
		response = append(response, item)
	}

	return c.JSON(http.StatusOK, response)
}

var staffCircleFilterableFields = map[string]staffListFilterFieldType{
	"id":                    staffListFilterFieldTypeString,
	"name":                  staffListFilterFieldTypeString,
	"nameYomi":              staffListFilterFieldTypeString,
	"groupName":             staffListFilterFieldTypeString,
	"groupNameYomi":         staffListFilterFieldTypeString,
	"participationTypeName": staffListFilterFieldTypeString,
	"notes":                 staffListFilterFieldTypeString,
	"submittedAt":           staffListFilterFieldTypeString,
	"status":                staffListFilterFieldTypeString,
	"places":                staffListFilterFieldTypeString,
}

func matchesStaffCircleSearch(item staffCircleResponse, query string) bool {
	return matchesStaffListSearch([]string{
		item.ID,
		item.Name,
		item.NameYomi,
		item.GroupName,
		item.GroupNameYomi,
		item.ParticipationTypeName,
		item.Notes,
		staffCircleStatusLabel(item.Status),
		strings.Join(item.Places, " "),
	}, query)
}

func staffCircleFilterResolver(item staffCircleResponse) func(string) (string, bool) {
	return func(key string) (string, bool) {
		switch key {
		case "id":
			return item.ID, true
		case "name":
			return item.Name, true
		case "nameYomi":
			return item.NameYomi, true
		case "groupName":
			return item.GroupName, true
		case "groupNameYomi":
			return item.GroupNameYomi, true
		case "participationTypeName":
			return item.ParticipationTypeName, true
		case "notes":
			return item.Notes, true
		case "submittedAt":
			if item.SubmittedAt == nil {
				return "", true
			}
			return *item.SubmittedAt, true
		case "status":
			return staffCircleStatusLabel(item.Status), true
		case "places":
			return strings.Join(item.Places, " "), true
		default:
			return "", false
		}
	}
}

func staffCircleStatusLabel(status string) string {
	switch status {
	case "approved":
		return "受理"
	case "rejected":
		return "不受理"
	default:
		return "審査中"
	}
}

func (h *staffCircleHandlers) listManagedStaffCircles(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canListManagedCircles)
	if !ok {
		return statusError(c, status)
	}

	_, responseByID, err := listStaffManagedCircles(h.circles)
	if err != nil {
		return internalError(c)
	}

	response := make([]staffManagedCircleResponse, 0, len(responseByID))
	for _, currentCircle := range responseByID {
		response = append(response, currentCircle)
	}
	slices.SortFunc(response, func(left, right staffManagedCircleResponse) int {
		return strings.Compare(left.ID, right.ID)
	})

	return c.JSON(http.StatusOK, response)
}

func (h *staffCircleHandlers) downloadStaffCirclesCSV(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canExportCircles)
	if !ok {
		return statusError(c, status)
	}

	circles, err := h.circles.ListForStaff(c.Request().Context())
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	rows := [][]string{{"id", "name", "name_yomi", "group_name", "group_name_yomi", "participation_type_id", "participation_type_name", "tags", "notes", "submitted_at", "status", "status_reason", "places"}}
	for _, currentCircle := range circles {
		submittedAt := ""
		if currentCircle.SubmittedAt != nil {
			submittedAt = currentCircle.SubmittedAt.UTC().Format("2006-01-02T15:04:05Z07:00")
		}
		rows = append(rows, []string{
			currentCircle.ID,
			currentCircle.Name,
			currentCircle.NameYomi,
			currentCircle.GroupName,
			currentCircle.GroupNameYomi,
			currentCircle.ParticipationTypeID,
			currentCircle.ParticipationTypeName,
			strings.Join(currentCircle.Tags, " "),
			currentCircle.Notes,
			submittedAt,
			currentCircle.Status,
			currentCircle.StatusReason,
			strings.Join(currentCircle.Places, " "),
		})
	}

	csvBytes, err := writeCSV(rows)
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	filename := "staff-circles.csv"
	return csvResponse(c, filename, csvBytes)
}

func (h *staffCircleHandlers) getStaffCircle(c echo.Context) error {
	_, _, status, ok := h.requireCircleRead(c)
	if !ok {
		return statusError(c, status)
	}

	circleValue, err := h.circles.Find(c.Request().Context(), c.Param("circleID"))
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

	participationType, err := h.participationTypes.Find(c.Request().Context(), request.ParticipationTypeID)
	if errors.Is(err, participationtype.ErrNotFound) {
		return validationError(c, map[string][]string{
			"participationTypeId": {"参加種別を選択してください"},
		})
	}
	if err != nil {
		return internalError(c)
	}

	created, err := h.circles.Create(
		c.Request().Context(),
		request.Name,
		request.NameYomi,
		request.GroupName,
		request.GroupNameYomi,
		participationType.ID,
		participationType.Name,
		request.Notes,
		participationType.Tags,
		request.Status,
		request.StatusReason,
		currentSession.User.ID,
		request.PlaceIDs,
	)
	if err != nil {
		return internalError(c)
	}
	if request.Status == "approved" {
		if err := h.circles.SubmitByStaff(c.Request().Context(), created.ID); err != nil {
			return internalError(c)
		}
	}
	recordActivity(
		c.Request().Context(),
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
	circleID := c.Param("circleID")

	request, validationErrors, valid := bindAndValidateStaffCircle(c)
	if !valid {
		return validationError(c, validationErrors)
	}

	participationType, err := h.participationTypes.Find(c.Request().Context(), request.ParticipationTypeID)
	if errors.Is(err, participationtype.ErrNotFound) {
		return validationError(c, map[string][]string{
			"participationTypeId": {"参加種別を選択してください"},
		})
	}
	if err != nil {
		return internalError(c)
	}

	beforeUpdate, err := h.circles.Find(c.Request().Context(), circleID)
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	updated, err := h.circles.Update(
		c.Request().Context(),
		circleID,
		request.Name,
		request.NameYomi,
		request.GroupName,
		request.GroupNameYomi,
		participationType.ID,
		participationType.Name,
		request.Notes,
		participationType.Tags,
		request.Status,
		request.StatusReason,
		currentSession.User.ID,
		request.PlaceIDs,
	)
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.circle.updated",
		"circle",
		updated.ID,
		updated.ID,
		buildActivitySummary("staff が企画を更新しました", updated.Name),
	)
	if beforeUpdate.Status != updated.Status {
		members, err := h.circles.ListMembers(c.Request().Context(), updated.ID)
		if err != nil {
			return internalError(c)
		}
		var (
			subject string
			body    string
		)
		switch updated.Status {
		case "approved":
			subject = fmt.Sprintf("【受理】「%s」の参加登録が受理されました", updated.Name)
			body = buildCircleApprovedMailBody(updated, members)
		case "rejected":
			subject = fmt.Sprintf("【不受理】「%s」の参加登録は受理されませんでした", updated.Name)
			body = buildCircleRejectedMailBody(updated, members, updated.StatusReason)
		}
		if subject != "" {
			jobID, queued, err := enqueueCircleNotificationMail(
				c.Request().Context(),
				h.email.EmailSender,
				h.users,
				members,
				updated.ID,
				currentSession.User.ID,
				"circle_status",
				h.allowDangerously,
				subject,
				body,
				h.email.From,
				h.email.AppName,
				h.email.AppURL,
				h.email.AdminName,
				h.email.ContactEmail,
			)
			if err != nil {
				return internalError(c)
			}
			if queued {
				recordActivity(
					c.Request().Context(),
					h.activities,
					currentSession.User.ID,
					"staff.mail.queued",
					"mail_job",
					jobID,
					updated.ID,
					buildActivitySummary("staff が企画参加登録の通知メールをキューに追加しました", subject),
				)
			}
		}
	}

	return c.JSON(http.StatusOK, mapStaffCircle(updated))
}

func (h *staffCircleHandlers) deleteStaffCircle(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canDeleteCircles)
	if !ok {
		return statusError(c, status)
	}

	circleID := c.Param("circleID")
	currentCircle, err := h.circles.Find(c.Request().Context(), circleID)
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	if err := h.circles.Delete(c.Request().Context(), circleID); errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	} else if err != nil {
		return internalError(c)
	}

	if err := h.booths.DeleteByCircle(c.Request().Context(), circleID); err != nil {
		return internalError(c)
	}
	recordActivity(
		c.Request().Context(),
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

func (h *staffCircleHandlers) listStaffCircleMembers(c echo.Context) error {
	_, _, status, ok := h.requireCircleEdit(c)
	if !ok {
		return statusError(c, status)
	}

	response, err := h.loadStaffCircleMembers(c.Param("circleID"))
	if errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	return c.JSON(http.StatusOK, response)
}

func (h *staffCircleHandlers) addStaffCircleMember(c echo.Context) error {
	_, currentSession, status, ok := h.requireCircleEdit(c)
	if !ok {
		return statusError(c, status)
	}

	circleID := c.Param("circleID")
	if _, err := h.circles.Find(c.Request().Context(), circleID); errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	} else if err != nil {
		return internalError(c)
	}

	var request addStaffCircleMemberRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	request.LoginID = strings.TrimSpace(request.LoginID)
	if request.LoginID == "" {
		return validationError(c, map[string][]string{
			"loginId": {"学籍番号または連絡先メールアドレスを入力してください"},
		})
	}

	targetUser, err := h.users.FindByLoginID(request.LoginID)
	if err != nil && !errors.Is(err, useradmin.ErrNotFound) {
		return internalError(c)
	}
	if errors.Is(err, useradmin.ErrNotFound) {
		targetUser, err = h.users.FindByContactEmail(request.LoginID)
		if err != nil && !errors.Is(err, useradmin.ErrNotFound) {
			return internalError(c)
		}
	}
	if errors.Is(err, useradmin.ErrNotFound) {
		return validationError(c, map[string][]string{
			"loginId": {"この学籍番号または連絡先メールアドレスは登録されていません"},
		})
	}

	if err := h.circles.AddMemberAsStaff(c.Request().Context(), circleID, targetUser.ID, targetUser.DisplayName); errors.Is(err, circle.ErrAlreadyMember) {
		return validationError(c, map[string][]string{
			"loginId": {"このユーザーは既に所属しています"},
		})
	} else if err != nil {
		return internalError(c)
	}

	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.circle.member_added",
		"circle",
		circleID,
		circleID,
		buildActivitySummary("staff が企画所属者を追加しました", targetUser.DisplayName),
	)

	return c.NoContent(http.StatusCreated)
}

func (h *staffCircleHandlers) deleteStaffCircleMember(c echo.Context) error {
	_, currentSession, status, ok := h.requireCircleEdit(c)
	if !ok {
		return statusError(c, status)
	}

	circleID := c.Param("circleID")
	targetUserID := c.Param("userID")
	if targetUserID == "" {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}
	if _, err := h.circles.Find(c.Request().Context(), circleID); errors.Is(err, circle.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	} else if err != nil {
		return internalError(c)
	}

	targetUser, err := h.users.Find(targetUserID)
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "user_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	if err := h.circles.RemoveMemberAsStaff(c.Request().Context(), circleID, targetUserID); errors.Is(err, circle.ErrForbidden) {
		return validationError(c, map[string][]string{
			"userId": {"責任者はこの画面から削除できません"},
		})
	} else if err != nil {
		return internalError(c)
	}

	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.circle.member_removed",
		"circle",
		circleID,
		circleID,
		buildActivitySummary("staff が企画所属者を削除しました", targetUser.DisplayName),
	)

	return c.NoContent(http.StatusNoContent)
}

func (h *staffCircleHandlers) getStaffCircleMailForm(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canAccessCircleMail)
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
	_, currentSession, status, ok := h.requireStaffCapability(c, canAccessCircleMail)
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
	if len(request.Subject) > 200 {
		validationErrors["subject"] = []string{"件名は200文字以内で入力してください"}
	}
	if len(request.Body) > 20000 {
		validationErrors["body"] = []string{"本文は20000文字以内で入力してください"}
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

	recipientEmails := collectStaffCircleMailRecipientEmails(recipients)
	if len(recipientEmails) == 0 {
		return validationError(c, map[string][]string{
			"recipient": {"宛先が存在しないため送信できませんでした"},
		})
	}

	jobID := fmt.Sprintf("circle-%d", time.Now().UnixNano())
	if err := h.email.EmailSender.Enqueue(c.Request().Context(), cloudflareemail.EmailJob{
		JobId:    jobID,
		Template: "markdown-notice",
		Priority: cloudflareemail.PriorityNormal,
		From:     h.email.From,
		To:       recipientEmails,
		Subject:  request.Subject,
		Body:     request.Body,
		Variables: map[string]string{
			"appName":      h.email.AppName,
			"appURL":       h.email.AppURL,
			"subject":      request.Subject,
			"body":         request.Body,
			"adminName":    h.email.AdminName,
			"contactEmail": h.email.ContactEmail,
			"preview":      request.Subject,
		},
	}); err != nil {
		return internalError(c)
	}
	logQueuedMail("staff_circle", jobID, circleValue.ID, currentSession.User.ID, request.Subject, request.Body, recipientEmails, h.allowDangerously)

	if request.CcToStaff {
		staffRecipients := normalizeRecipients([]string{h.email.ContactEmail})
		if len(staffRecipients) > 0 {
			staffCopyJobID := fmt.Sprintf("circle-staff-copy-%d", time.Now().UnixNano())
			if err := h.email.EmailSender.Enqueue(c.Request().Context(), cloudflareemail.EmailJob{
				JobId:    staffCopyJobID,
				Template: "markdown-notice",
				Priority: cloudflareemail.PriorityNormal,
				From:     h.email.From,
				To:       staffRecipients,
				Subject:  "[スタッフ控え] " + request.Subject,
				Body:     request.Body,
				Variables: map[string]string{
					"appName":      h.email.AppName,
					"appURL":       h.email.AppURL,
					"subject":      "[スタッフ控え] " + request.Subject,
					"body":         request.Body,
					"adminName":    h.email.AdminName,
					"contactEmail": h.email.ContactEmail,
					"preview":      request.Subject,
				},
			}); err != nil {
				return internalError(c)
			}
			logQueuedMail("staff_circle_copy", staffCopyJobID, circleValue.ID, currentSession.User.ID, request.Subject, request.Body, staffRecipients, h.allowDangerously)
		}
	}
	recordActivity(
		c.Request().Context(),
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
