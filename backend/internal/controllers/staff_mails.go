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
	Priority   string   `json:"priority"`
	Subject    string   `json:"subject"`
	Body       string   `json:"body"`
	Recipients []string `json:"recipients"`
	CreatedAt  string   `json:"createdAt"`
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

	entries, err := h.mailHistory.List(c.Request().Context())
	if err != nil {
		return internalError(c)
	}

	response := make([]staffMailResponse, 0, len(entries))
	for _, entry := range entries {
		response = append(response, staffMailResponse{
			JobId:      entry.JobID,
			Template:   entry.Template,
			Priority:   string(entry.Priority),
			Subject:    entry.Subject,
			Body:       entry.Body,
			Recipients: entry.Recipients,
			CreatedAt:  entry.CreatedAt,
		})
	}

	return c.JSON(http.StatusOK, response)
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

	_, err := h.circles.Find(c.Request().Context(), request.CircleID)
	if err != nil {
		return validationError(c, map[string][]string{
			"circleId": {"企画を選択してください"},
		})
	}

	jobID := fmt.Sprintf("staff-%d", time.Now().UnixNano())
	if err := h.email.EmailSender.Enqueue(c.Request().Context(), cloudflareemail.EmailJob{
		JobId:    jobID,
		Template: "markdown-notice",
		Priority: cloudflareemail.PriorityNormal,
		From:     h.email.From,
		To:       recipients,
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
		Priority:   string(cloudflareemail.PriorityNormal),
		Subject:    request.Subject,
		Body:       request.Body,
		Recipients: recipients,
		CreatedAt:  time.Now().UTC().Format(time.RFC3339),
	})
}
