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

func logMockVerificationURL(kind, recipient, verifyURL string) {
	slog.Info("mock verification prepared",
		"kind", kind,
		"recipient", recipient,
		"verifyURL", verifyURL,
	)
}

func logQueuedMail(
	source,
	jobID,
	circleID,
	createdByUserID,
	subject,
	body string,
	recipients []string,
	allowInsecureDefaults bool,
) {
	attrs := []any{
		"kind", "queued_mail",
		"source", source,
		"jobID", jobID,
		"circleID", circleID,
		"createdByUserID", createdByUserID,
	}
	if allowInsecureDefaults {
		attrs = append(attrs,
			"subject", subject,
			"body", body,
			"recipients", slices.Clone(recipients),
		)
	} else {
		attrs = append(attrs,
			"subject", "[redacted]",
			"body", "[redacted]",
			"recipientsCount", len(recipients),
		)
	}

	slog.Info("mock queued mail prepared", attrs...)
}

func normalizeRecipients(recipients []string) []string {
	return mailrecipients.Normalize(recipients)
}
