package controllers

import (
	"net/http"
	"slices"
	"sort"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/mailqueue"
	"github.com/s-union/PortalDots/backend/internal/models"
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
	sort.SliceStable(jobs, func(i, j int) bool {
		if jobs[i].CreatedAt == jobs[j].CreatedAt {
			return jobs[i].ID > jobs[j].ID
		}
		return jobs[i].CreatedAt > jobs[j].CreatedAt
	})
	response := make([]staffMailResponse, 0, len(jobs))
	for _, job := range jobs {
		circleValue := staffManagedCircleResponse{}
		if job.CircleID != "" {
			mappedCircle, ok := circlesByID[job.CircleID]
			if !ok {
				return internalError(c)
			}
			circleValue = mappedCircle
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

	h.mails.DeleteAll()
	recordActivity(
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
	if len(recipients) == 0 {
		errors["recipients"] = []string{"宛先メールアドレスを 1 件以上入力してください"}
	}
	if len(errors) > 0 {
		return c.JSON(http.StatusUnprocessableEntity, models.ValidationErrorResponse{
			Message: "validation_error",
			Errors:  errors,
		})
	}

	currentCircle, err := h.circles.Find(request.CircleID)
	if err != nil {
		return c.JSON(http.StatusUnprocessableEntity, models.ValidationErrorResponse{
			Message: "validation_error",
			Errors: map[string][]string{
				"circleId": {"企画を選択してください"},
			},
		})
	}

	job := h.mails.Enqueue(request.CircleID, currentSession.User.ID, request.Subject, request.Body, recipients)
	recordActivity(
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
