package useradmin

import (
	"strings"

	"github.com/s-union/PortalDots/backend/internal/shared/mailrecipients"
)

// PrimaryMailRecipient returns the email address mail for the user should be sent to.
func PrimaryMailRecipient(userValue User) string {
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

// MailRecipients returns the deduplicated primary email addresses of the given users.
func MailRecipients(users ...User) []string {
	recipients := make([]string, 0, len(users))
	for _, userValue := range users {
		recipients = append(recipients, PrimaryMailRecipient(userValue))
	}

	return mailrecipients.Normalize(recipients)
}
