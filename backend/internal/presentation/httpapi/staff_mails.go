package httpapi

import (
	"net/http"
	"slices"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/mailqueue"
)

type staffMailResponse struct {
	ID          string   `json:"id"`
	Subject     string   `json:"subject"`
	Body        string   `json:"body"`
	Recipients  []string `json:"recipients"`
	Status      string   `json:"status"`
	CreatedAt   string   `json:"createdAt"`
	DeliveredAt string   `json:"deliveredAt"`
}

type enqueueStaffMailRequest struct {
	Subject    string   `json:"subject"`
	Body       string   `json:"body"`
	Recipients []string `json:"recipients"`
}

func (h *staffAdminHandlers) listStaffMails(c echo.Context) error {
	sessionID, currentSession, status, ok := h.requireStaffCapability(c, canUseMailQueue)
	if !ok {
		return c.JSON(status, map[string]string{"message": statusMessage(status)})
	}

	selectedCircle, err := resolveCurrentCircle(sessionID, currentSession, h.circles, h.sessions)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"message": "internal_error",
		})
	}
	if selectedCircle == nil {
		return c.JSON(http.StatusConflict, map[string]string{
			"message": "current_circle_required",
		})
	}

	jobs := h.mails.ListByCircle(selectedCircle.ID)
	response := make([]staffMailResponse, 0, len(jobs))
	for _, job := range jobs {
		response = append(response, mapStaffMail(job))
	}

	return c.JSON(http.StatusOK, response)
}

func (h *staffAdminHandlers) enqueueStaffMail(c echo.Context) error {
	sessionID, currentSession, status, ok := h.requireStaffCapability(c, canUseMailQueue)
	if !ok {
		return c.JSON(status, map[string]string{"message": statusMessage(status)})
	}

	selectedCircle, err := resolveCurrentCircle(sessionID, currentSession, h.circles, h.sessions)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"message": "internal_error",
		})
	}
	if selectedCircle == nil {
		return c.JSON(http.StatusConflict, map[string]string{
			"message": "current_circle_required",
		})
	}

	var request enqueueStaffMailRequest
	if err := c.Bind(&request); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"message": "invalid_request",
		})
	}

	request.Subject = strings.TrimSpace(request.Subject)
	request.Body = strings.TrimSpace(request.Body)
	recipients := normalizeRecipients(request.Recipients)

	errors := map[string][]string{}
	if request.Subject == "" {
		errors["subject"] = []string{"件名を入力してください"}
	}
	if request.Body == "" {
		errors["body"] = []string{"本文を入力してください"}
	}
	if len(recipients) == 0 {
		errors["recipients"] = []string{"宛先メールアドレスを 1 件以上入力してください"}
	}
	if len(errors) > 0 {
		return c.JSON(http.StatusUnprocessableEntity, validationErrorResponse{
			Message: "validation_error",
			Errors:  errors,
		})
	}

	job := h.mails.Enqueue(selectedCircle.ID, currentSession.User.ID, request.Subject, request.Body, recipients)
	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.mail.queued",
		"mail_job",
		job.ID,
		selectedCircle.ID,
		buildActivitySummary("staff がメールをキューに追加しました", job.Subject),
	)
	return c.JSON(http.StatusCreated, mapStaffMail(job))
}

func mapStaffMail(job mailqueue.Job) staffMailResponse {
	return staffMailResponse{
		ID:          job.ID,
		Subject:     job.Subject,
		Body:        job.Body,
		Recipients:  slices.Clone(job.Recipients),
		Status:      job.Status,
		CreatedAt:   job.CreatedAt,
		DeliveredAt: job.DeliveredAt,
	}
}

func normalizeRecipients(recipients []string) []string {
	normalized := make([]string, 0, len(recipients))
	seen := map[string]struct{}{}
	for _, recipient := range recipients {
		trimmed := strings.TrimSpace(recipient)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		normalized = append(normalized, trimmed)
	}

	return slices.Clone(normalized)
}
