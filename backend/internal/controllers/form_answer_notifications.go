package controllers

import (
	"context"
	"fmt"
	"strings"

	"github.com/s-union/PortalDots/backend/internal/domain/answer"
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

	job, err := h.mails.Enqueue(ctx, answerValue.CircleID, createdByUserID, subject, body, recipients)
	if err != nil {
		return
	}
	logQueuedMail("workspace_form_answer", job.ID, answerValue.CircleID, createdByUserID, job.Subject, job.Body, job.Recipients, h.allowDangerously)
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
