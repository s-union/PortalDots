package controllers

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/s-union/PortalDots/backend/internal/domain/answer"
	"github.com/s-union/PortalDots/backend/internal/domain/staffpermission"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/shared/emailqueue"
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

		if err := h.email.EmailSender.Enqueue(ctx, emailqueue.EmailJob{
			JobId:    "form-answer-" + uuidv7.MustString(),
			Template: "markdown-notice",
			Priority: emailqueue.PriorityNormal,
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

	if formValue.CreatedByUserID != "" || len(formValue.StaffNotificationUserIDs) > 0 {
		staffRecipients := h.staffFormAnswerMailRecipients(formValue)
		if len(staffRecipients) > 0 {
			subject := fmt.Sprintf("【スタッフ用控え】申請「%s」を承りました", formValue.Name)
			body := answerValue.Body
			if formValue.ConfirmationMessage != "" {
				body = strings.TrimSpace(body + "\n\n" + formValue.ConfirmationMessage)
			}

			if err := h.email.EmailSender.Enqueue(ctx, emailqueue.EmailJob{
				JobId:    "form-answer-staff-copy-" + uuidv7.MustString(),
				Template: "markdown-notice",
				Priority: emailqueue.PriorityNormal,
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

// staffFormAnswerMailRecipients returns current addresses for the form's
// configured staff-copy recipients, falling back to the form creator when none
// are configured. Every user is re-checked for current formAnswers.read access
// at send time; form ownership is historical, so it must not grant a
// notification entitlement after staff access is removed.
func (h *workspaceHandlers) staffFormAnswerMailRecipients(formValue formDetailResponse) []string {
	userIDs := formValue.StaffNotificationUserIDs
	if len(userIDs) == 0 {
		if formValue.CreatedByUserID == "" {
			return nil
		}
		userIDs = []string{formValue.CreatedByUserID}
	}

	recipients := make([]string, 0, len(userIDs))
	for _, userID := range userIDs {
		if userID == "" {
			continue
		}
		userValue, err := h.users.Find(userID)
		if err != nil {
			continue
		}
		recipients = append(recipients, currentFormAnswerMailRecipients(userValue)...)
	}

	return normalizeRecipients(recipients)
}

// currentFormAnswerMailRecipients returns addresses for users who can still
// read form answers. Form ownership is historical, so it must not grant a
// notification entitlement after staff access is removed.
func currentFormAnswerMailRecipients(userValue useradmin.User) []string {
	if !hasCurrentFormAnswerAccess(userValue) {
		return nil
	}
	return normalizeRecipients(useradmin.MailRecipients(userValue))
}

func hasCurrentFormAnswerAccess(userValue useradmin.User) bool {
	check := staffCapabilityChecks["formAnswers.read"]
	return staffpermission.HasAny(userValue.Roles, check.roles...) ||
		staffpermission.HasAny(userValue.Permissions, check.permissions...)
}

func (h *workspaceHandlers) workspaceFormAnswerMailRecipients(targetCircleID string) []string {
	users, err := h.users.ListByCircleIDs([]string{targetCircleID})
	if err != nil {
		return nil
	}
	return normalizeRecipients(useradmin.MailRecipients(users...))
}
