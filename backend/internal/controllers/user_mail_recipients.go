package controllers

import (
	"strings"

	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
)

func collectUserEmailRecipients(userValue useradmin.User) []string {
	recipients := make([]string, 0, len(userValue.LoginIDs)+1)
	for _, loginID := range userValue.LoginIDs {
		if strings.Contains(loginID, "@") {
			recipients = append(recipients, loginID)
		}
	}
	if contactEmail := strings.TrimSpace(userValue.ContactEmail); contactEmail != "" {
		recipients = append(recipients, contactEmail)
	}

	return normalizeRecipients(recipients)
}
