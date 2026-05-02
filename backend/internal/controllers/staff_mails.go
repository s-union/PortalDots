package controllers

import (
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/mailqueue"
	"github.com/s-union/PortalDots/backend/internal/shared/cloudflareemail"
)

type staffMailResponse struct {
	Circle      staffManagedCircleResponse `json:"circle"`
	ID          string                     `json:"id"`
	Subject     string                     `json:"subject"`
	Body        string                     `json:"body"`
	Recipients  []string                   `json:"recipients"`
	Status      string                     `json:"status"`
	CreatedAt   string                     `json:"createdAt"`
	DeliveredAt string                     `json:"deliveredAt"`
}

type enqueueStaffMailRequest struct {
	CircleID   string   `json:"circleId"`
	Subject    string   `json:"subject"`
	Body       string   `json:"body"`
	Recipients []string `json:"recipients"`
}

func (h *staffAdminHandlers) listStaffMails(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canUseMailQueue)
	if !ok {
		return statusError(c, status)
	}

	_, circlesByID, err := listStaffManagedCircles(h.circles)
	if err != nil {
		return internalError(c)
	}
	jobs := h.mails.ListAll()
	response := make([]staffMailResponse, 0, len(jobs))
	for _, job := range jobs {
		circleValue := staffManagedCircleResponse{}
		if job.CircleID != "" {
			if mappedCircle, ok := circlesByID[job.CircleID]; ok {
				circleValue = mappedCircle
			}
		}
		response = append(response, mapStaffMail(job, circleValue))
	}

	return c.JSON(http.StatusOK, response)
}

func (h *staffAdminHandlers) deleteStaffMails(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canUseMailQueue)
	if !ok {
		return statusError(c, status)
	}

	_ = h.mails.DeleteAll()
	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.mail.deleted_all",
		"mail_job",
		"",
		"",
		"staff がメールキューを全件キャンセルしました",
	)

	return c.NoContent(http.StatusNoContent)
}

func (h *staffAdminHandlers) enqueueStaffMail(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canUseMailQueue)
	if !ok {
		return statusError(c, status)
	}

	var request enqueueStaffMailRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	request.CircleID = strings.TrimSpace(request.CircleID)
	request.Subject = strings.TrimSpace(request.Subject)
	request.Body = strings.TrimSpace(request.Body)
	recipients := normalizeRecipients(request.Recipients)

	errors := map[string][]string{}
	if request.CircleID == "" {
		errors["circleId"] = []string{"企画を選択してください"}
	}
	if request.Subject == "" {
		errors["subject"] = []string{"件名を入力してください"}
	}
	if request.Body == "" {
		errors["body"] = []string{"本文を入力してください"}
	}
	if len(request.Subject) > 200 {
		errors["subject"] = []string{"件名は200文字以内で入力してください"}
	}
	if len(request.Body) > 20000 {
		errors["body"] = []string{"本文は20000文字以内で入力してください"}
	}
	if len(recipients) == 0 {
		errors["recipients"] = []string{"宛先メールアドレスを 1 件以上入力してください"}
	}
	if len(errors) > 0 {
		return validationError(c, errors)
	}

	currentCircle, err := h.circles.Find(request.CircleID)
	if err != nil {
		return validationError(c, map[string][]string{
			"circleId": {"企画を選択してください"},
		})
	}

	if h.emailProducer != nil {
		jobID := fmt.Sprintf("staff-%d", time.Now().UnixNano())
		if err := h.emailProducer.Enqueue(c.Request().Context(), cloudflareemail.EmailJob{
			JobId:    jobID,
			Template: "markdown-notice",
			Priority: cloudflareemail.PriorityNormal,
			From:     h.from,
			To:       recipients,
			Subject:  request.Subject,
			Variables: map[string]string{
				"appName":      h.appName,
				"appURL":       h.appURL,
				"subject":      request.Subject,
				"body":         request.Body,
				"adminName":    h.adminName,
				"contactEmail": h.contactEmail,
				"preview":      request.Subject,
			},
		}); err != nil {
			return internalError(c)
		}
		job, err := h.mails.Enqueue(c.Request().Context(), request.CircleID, currentSession.User.ID, request.Subject, request.Body, recipients)
		if err != nil {
			return internalError(c)
		}
		logQueuedMail("staff_mail_queue", job.ID, job.CircleID, currentSession.User.ID, job.Subject, job.Body, job.Recipients, h.allowDangerously)
		recordActivity(
			c.Request().Context(),
			h.activities,
			currentSession.User.ID,
			"staff.mail.queued",
			"mail_job",
			job.ID,
			job.CircleID,
			buildActivitySummary("staff がメールをキューに追加しました", job.Subject),
		)
		return c.JSON(http.StatusCreated, mapStaffMail(job, mapStaffManagedCircle(currentCircle)))
	}

	job, err := h.mails.Enqueue(c.Request().Context(), request.CircleID, currentSession.User.ID, request.Subject, request.Body, recipients)
	if err != nil {
		return internalError(c)
	}
	logQueuedMail("staff_mail_queue", job.ID, job.CircleID, currentSession.User.ID, job.Subject, job.Body, job.Recipients, h.allowDangerously)
	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.mail.queued",
		"mail_job",
		job.ID,
		job.CircleID,
		buildActivitySummary("staff がメールをキューに追加しました", job.Subject),
	)
	return c.JSON(http.StatusCreated, mapStaffMail(job, mapStaffManagedCircle(currentCircle)))
}

func mapStaffMail(job mailqueue.Job, circleValue staffManagedCircleResponse) staffMailResponse {
	return staffMailResponse{
		Circle:      circleValue,
		ID:          job.ID,
		Subject:     job.Subject,
		Body:        job.Body,
		Recipients:  slices.Clone(job.Recipients),
		Status:      job.Status,
		CreatedAt:   job.CreatedAt,
		DeliveredAt: job.DeliveredAt,
	}
}
