package controllers

import (
	"context"
	"fmt"
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
	recipients := h.workspaceFormAnswerMailRecipients(createdByUserID, answerValue.CircleID)
	if len(recipients) == 0 {
		return
	}

	subject := fmt.Sprintf("申請「%s」を承りました", formValue.Name)
	body := answerValue.Body
	if formValue.ConfirmationMessage != "" {
		body = strings.TrimSpace(body + "\n\n" + formValue.ConfirmationMessage)
	}

	_ = h.emailSender.Enqueue(ctx, cloudflareemail.EmailJob{
		JobId:    "form-answer-" + uuidv7.MustString(),
		Template: "markdown-notice",
		Priority: cloudflareemail.PriorityNormal,
		From:     h.from,
		To:       recipients,
		Subject:  subject,
		Body:     body,
		Variables: map[string]string{
			"subject":      subject,
			"body":         body,
			"appName":      h.appName,
			"appURL":       h.appURL,
			"adminName":    h.adminName,
			"contactEmail": h.contactEmail,
			"preview":      subject,
		},
	})
}

func (h *workspaceHandlers) workspaceFormAnswerMailRecipients(createdByUserID, targetCircleID string) []string {
	users, err := h.users.ListByCircleIDs([]string{targetCircleID})
	if err != nil {
		return nil
	}
	recipients := collectUsersEmailRecipients(users)

	creator, err := h.users.Find(createdByUserID)
	if err == nil {
		recipients = append(recipients, collectUserEmailRecipients(creator)...)
	}

	return normalizeRecipients(recipients)
}
