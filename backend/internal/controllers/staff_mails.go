package controllers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/shared/cloudflareemail"
)

type staffMailResponse struct {
	JobId      string   `json:"jobId"`
	Template   string   `json:"template"`
	Subject    string   `json:"subject"`
	Body       string   `json:"body"`
	Recipients []string `json:"recipients"`
	SentAt     string   `json:"sentAt"`
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

	if h.emailProducer != nil {
		deliveries, err := h.emailProducer.ListDeliveries(c.Request().Context())
		if err != nil {
			return internalError(c)
		}
		response := make([]staffMailResponse, 0, len(deliveries))
		for _, d := range deliveries {
			response = append(response, staffMailResponse{
				JobId:      d.JobId,
				Template:   d.Template,
				Subject:    d.Subject,
				Body:       d.Body,
				Recipients: d.Recipients,
				SentAt:     d.SentAt,
			})
		}
		return c.JSON(http.StatusOK, response)
	}

	// Fallback to local queue for environments without producer
	jobs := h.mails.ListAll()
	response := make([]staffMailResponse, 0, len(jobs))
	for _, job := range jobs {
		response = append(response, staffMailResponse{
			JobId:      job.ID,
			Template:   "",
			Subject:    job.Subject,
			Body:       job.Body,
			Recipients: job.Recipients,
			SentAt:     job.CreatedAt,
		})
	}
	return c.JSON(http.StatusOK, response)
}

func (h *staffAdminHandlers) deleteStaffMails(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canUseMailQueue)
	if !ok {
		return statusError(c, status)
	}

	if h.emailProducer != nil {
		if err := h.emailProducer.ClearDeliveries(c.Request().Context()); err != nil {
			return internalError(c)
		}
	} else {
		_ = h.mails.DeleteAll()
	}

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

	_, err := h.circles.Find(request.CircleID)
	if err != nil {
		return validationError(c, map[string][]string{
			"circleId": {"企画を選択してください"},
		})
	}

	if h.emailProducer == nil {
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
		return c.JSON(http.StatusCreated, staffMailResponse{
			JobId:      job.ID,
			Template:   "",
			Subject:    job.Subject,
			Body:       job.Body,
			Recipients: job.Recipients,
			SentAt:     job.CreatedAt,
		})
	}

	jobID := fmt.Sprintf("staff-%d", time.Now().UnixNano())
	if err := h.emailProducer.Enqueue(c.Request().Context(), cloudflareemail.EmailJob{
		JobId:    jobID,
		Template: "markdown-notice",
		Priority: cloudflareemail.PriorityNormal,
		From:     h.from,
		To:       recipients,
		Subject:  request.Subject,
		Body:     request.Body,
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

	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.mail.queued",
		"mail_job",
		jobID,
		request.CircleID,
		buildActivitySummary("staff がメールをキューに追加しました", request.Subject),
	)

	return c.JSON(http.StatusCreated, staffMailResponse{
		JobId:      jobID,
		Template:   "markdown-notice",
		Subject:    request.Subject,
		Body:       request.Body,
		Recipients: recipients,
		SentAt:     time.Now().UTC().Format(time.RFC3339),
	})
}
