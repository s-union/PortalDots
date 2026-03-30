package controllers

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/s-union/PortalDots/backend/internal/domain/pendingregistration"
	"github.com/s-union/PortalDots/backend/internal/domain/registrationmail"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
)

var errInvalidRegistrationToken = errors.New("invalid registration token")

func buildAuthVerificationStatus(userValue useradmin.User, univemail string) authVerificationStatusResponse {
	items := []authVerificationStatusItem{
		{
			Type:     "email",
			Label:    "連絡先メールアドレス",
			Address:  userValue.ContactEmail,
			Verified: userValue.IsEmailVerified,
		},
		{
			Type:     "univemail",
			Label:    "大学メールアドレス",
			Address:  univemail,
			Verified: userValue.IsUnivemailVerified,
		},
	}

	completed := true
	for _, item := range items {
		if item.Type != "univemail" {
			continue
		}
		if item.Address == "" || !item.Verified {
			completed = false
		}
	}

	return authVerificationStatusResponse{
		UserID:      userValue.ID,
		DisplayName: userValue.DisplayName,
		Completed:   completed,
		Items:       items,
	}
}

func findVerificationItem(items []authVerificationStatusItem, verificationType string) (authVerificationStatusItem, bool) {
	for _, item := range items {
		if item.Type == verificationType {
			return item, true
		}
	}
	return authVerificationStatusItem{}, false
}

func normalizeVerificationType(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "email":
		return "email"
	case "univemail":
		return "univemail"
	default:
		return ""
	}
}

func splitFullName(value string) (string, string, string, bool) {
	parts := strings.Fields(strings.ReplaceAll(value, "\u3000", " "))
	if len(parts) < 2 {
		return "", "", "", false
	}

	lastName := parts[0]
	firstName := strings.Join(parts[1:], " ")
	return lastName, firstName, lastName + " " + firstName, true
}

func deriveUnivemail(userValue useradmin.User, domainPart string) string {
	domain := strings.ToLower(strings.TrimSpace(domainPart))
	for _, loginID := range userValue.LoginIDs {
		normalized := strings.ToLower(strings.TrimSpace(loginID))
		if domain != "" && strings.HasSuffix(normalized, "@"+domain) {
			return normalized
		}
	}
	return ""
}

func normalizeRegistrationLocalPart(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	normalized = strings.TrimPrefix(normalized, "@")
	if strings.Contains(normalized, "@") {
		return ""
	}
	return normalized
}

func deriveRegistrationUnivemail(localPart, domainPart string) string {
	normalizedLocalPart := normalizeRegistrationLocalPart(localPart)
	normalizedDomain := strings.ToLower(strings.TrimSpace(domainPart))
	if normalizedLocalPart == "" || normalizedDomain == "" {
		return ""
	}
	return normalizedLocalPart + "@" + normalizedDomain
}

func buildRegistrationVerifyURL(appURL, pendingRegistrationID, token string) string {
	base := strings.TrimRight(strings.TrimSpace(appURL), "/")
	return fmt.Sprintf("%s/email/verify/univemail/%s?token=%s", base, pendingRegistrationID, url.QueryEscape(token))
}

func generateRegistrationToken() (string, error) {
	var raw [24]byte
	if _, err := rand.Read(raw[:]); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw[:]), nil
}

func hashRegistrationToken(token string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(token)))
	return fmt.Sprintf("%x", sum[:])
}

func pendingRegistrationTokenMatches(pendingValue pendingregistration.PendingRegistration, token string, now time.Time) bool {
	if !now.Before(pendingValue.ExpiresAt) {
		return false
	}
	return subtle.ConstantTimeCompare(
		[]byte(strings.TrimSpace(pendingValue.TokenHash)),
		[]byte(hashRegistrationToken(token)),
	) == 1
}

func (h *authHandlers) loadAndValidatePendingRegistration(pendingRegistrationID, token string) (pendingregistration.PendingRegistration, error) {
	normalizedID := strings.TrimSpace(pendingRegistrationID)
	normalizedToken := strings.TrimSpace(token)
	if normalizedID == "" || normalizedToken == "" {
		return pendingregistration.PendingRegistration{}, errInvalidRegistrationToken
	}

	pendingValue, err := h.pendingRegistrations.Find(normalizedID)
	if err != nil {
		if errors.Is(err, pendingregistration.ErrNotFound) {
			return pendingregistration.PendingRegistration{}, errInvalidRegistrationToken
		}
		return pendingregistration.PendingRegistration{}, err
	}

	if !pendingRegistrationTokenMatches(pendingValue, normalizedToken, time.Now().UTC()) {
		return pendingregistration.PendingRegistration{}, errInvalidRegistrationToken
	}

	return pendingValue, nil
}

func registrationMailMessage(appName, to, verifyURL string) registrationmail.Message {
	return registrationmail.Message{
		AppName:   appName,
		To:        to,
		VerifyURL: verifyURL,
	}
}

func generateVerificationCode() (string, error) {
	var raw [4]byte
	if _, err := rand.Read(raw[:]); err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", binary.BigEndian.Uint32(raw[:])%1000000), nil
}
