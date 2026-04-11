package controllers

import (
	"log/slog"
	"slices"

	"github.com/s-union/PortalDots/backend/internal/shared/mailrecipients"
)

type messageResponse struct {
	Message string `json:"message"`
}

func logMockRegistrationVerifyURL(univemail, verifyURL string) {
	slog.Info("mock registration verification prepared",
		"kind", "registration_verify_url",
		"recipient", univemail,
		"verifyURL", verifyURL,
	)
}

func logMockPasswordResetURL(recipient, resetURL string) {
	slog.Info("mock password reset prepared",
		"kind", "password_reset_url",
		"recipient", recipient,
		"resetURL", resetURL,
	)
}

func logMockVerificationCode(kind, recipient, code string) {
	slog.Info("mock verification prepared",
		"kind", kind,
		"recipient", recipient,
		"verifyCode", code,
	)
}

func logQueuedMail(source, jobID, circleID, createdByUserID, subject, body string, recipients []string) {
	slog.Info("mock queued mail prepared",
		"kind", "queued_mail",
		"source", source,
		"jobID", jobID,
		"circleID", circleID,
		"createdByUserID", createdByUserID,
		"subject", subject,
		"body", body,
		"recipients", slices.Clone(recipients),
	)
}

func normalizeRecipients(recipients []string) []string {
	return mailrecipients.Normalize(recipients)
}
