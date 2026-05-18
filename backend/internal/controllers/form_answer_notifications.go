package controllers

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/s-union/PortalDots/backend/internal/domain/answer"
	"github.com/s-union/PortalDots/backend/internal/shared/cloudflareemail"
	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

func (h *workspaceHandlers) enqueueWorkspaceFormAnswerMail(
	ctx context.Context,
	createdByUserID string,
	formValue formDetailResponse,
	answerValue answer.Answer,
) {
	memberRecipients := h.workspaceFormAnswerMailRecipients(answerValue.CircleID)
	if len(memberRecipients) > 0 {
		subject := fmt.Sprintf("申請「%s」を承りました", formValue.Name)
		body := answerValue.Body
		if formValue.ConfirmationMessage != "" {
			body = strings.TrimSpace(body + "\n\n" + formValue.ConfirmationMessage)
		}

		if err := h.email.EmailSender.Enqueue(ctx, cloudflareemail.EmailJob{
			JobId:    "form-answer-" + uuidv7.MustString(),
			Template: "markdown-notice",
			Priority: cloudflareemail.PriorityNormal,
			From:     h.email.From,
			To:       memberRecipients,
			Subject:  subject,
			Body:     body,
			Variables: map[string]string{
				"subject":      subject,
				"body":         body,
				"appName":      h.email.AppName,
				"appURL":       h.email.AppURL,
				"adminName":    h.email.AdminName,
				"contactEmail": h.email.ContactEmail,
				"preview":      subject,
			},
		}); err != nil {
			slog.WarnContext(ctx, "failed to enqueue form answer notification email", "error", err)
		}
	}

	if formValue.CreatedByUserID != "" {
		creator, err := h.users.Find(formValue.CreatedByUserID)
		if err == nil {
			staffRecipients := normalizeRecipients(collectUserEmailRecipients(creator))
			if len(staffRecipients) > 0 {
				subject := fmt.Sprintf("【スタッフ用控え】申請「%s」を承りました", formValue.Name)
				body := answerValue.Body
				if formValue.ConfirmationMessage != "" {
					body = strings.TrimSpace(body + "\n\n" + formValue.ConfirmationMessage)
				}

				if err := h.email.EmailSender.Enqueue(ctx, cloudflareemail.EmailJob{
					JobId:    "form-answer-staff-copy-" + uuidv7.MustString(),
					Template: "markdown-notice",
					Priority: cloudflareemail.PriorityNormal,
					From:     h.email.From,
					To:       staffRecipients,
					Subject:  subject,
					Body:     body,
					Variables: map[string]string{
						"subject":      subject,
						"body":         body,
						"appName":      h.email.AppName,
						"appURL":       h.email.AppURL,
						"adminName":    h.email.AdminName,
						"contactEmail": h.email.ContactEmail,
						"preview":      subject,
					},
				}); err != nil {
					slog.WarnContext(ctx, "failed to enqueue form answer staff copy email", "error", err)
				}
			}
		}
	}
}

func (h *workspaceHandlers) workspaceFormAnswerMailRecipients(targetCircleID string) []string {
	users, err := h.users.ListByCircleIDs([]string{targetCircleID})
	if err != nil {
		return nil
	}
	return normalizeRecipients(collectUsersEmailRecipients(users))
}
