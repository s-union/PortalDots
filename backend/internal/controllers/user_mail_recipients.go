package controllers

import (
	"strings"

	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
)

func primaryUserEmailRecipient(userValue useradmin.User) string {
	if contactEmail := strings.TrimSpace(userValue.ContactEmail); contactEmail != "" && userValue.IsEmailVerified {
		return contactEmail
	}

	for _, loginID := range userValue.LoginIDs {
		trimmed := strings.TrimSpace(loginID)
		if trimmed != "" && strings.Contains(trimmed, "@") {
			return trimmed
		}
	}

	// Fallback for legacy users that only have contactEmail.
	return strings.TrimSpace(userValue.ContactEmail)
}

func collectUserEmailRecipients(userValue useradmin.User) []string {
	if recipient := primaryUserEmailRecipient(userValue); recipient != "" {
		return normalizeRecipients([]string{recipient})
	}

	return nil
}

func collectUsersEmailRecipients(users []useradmin.User) []string {
	recipients := make([]string, 0, len(users))
	for _, userValue := range users {
		recipients = append(recipients, collectUserEmailRecipients(userValue)...)
	}

	return normalizeRecipients(recipients)
}

func collectStaffCircleMailRecipientEmails(recipients []staffCircleMailRecipient) []string {
	emails := make([]string, 0, len(recipients))
	for _, recipient := range recipients {
		emails = append(emails, collectUserEmailRecipients(recipient.User)...)
	}

	return normalizeRecipients(emails)
}
