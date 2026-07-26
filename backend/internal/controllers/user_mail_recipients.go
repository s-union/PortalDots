package controllers

import (
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
)

func collectStaffCircleMailRecipientEmails(recipients []staffCircleMailRecipient) []string {
	emails := make([]string, 0, len(recipients))
	for _, recipient := range recipients {
		emails = append(emails, useradmin.MailRecipients(recipient.User)...)
	}

	return normalizeRecipients(emails)
}
