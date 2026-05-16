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

func logQueuedMail(
	source,
	jobID,
	circleID,
	createdByUserID,
	subject,
	body string,
	recipients []string,
	allowDangerously bool,
) {
	attrs := []any{
		"kind", "queued_mail",
		"source", source,
		"jobID", jobID,
		"circleID", circleID,
		"createdByUserID", createdByUserID,
	}
	if allowDangerously {
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
