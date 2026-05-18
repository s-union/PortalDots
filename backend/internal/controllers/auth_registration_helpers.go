package controllers

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"net/mail"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/s-union/PortalDots/backend/internal/domain/pendingregistration"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/shared/externalid"
)

var errInvalidRegistrationToken = errors.New("invalid registration token")

var validPhoneNumberRegexp = regexp.MustCompile(`^[\d\-()+]+$`)

// isValidPhoneNumber returns true when s contains only digits, hyphens, parentheses, and plus signs.
func isValidPhoneNumber(s string) bool {
	return len(s) > 0 && validPhoneNumberRegexp.MatchString(s)
}

var validYomiRegexp = regexp.MustCompile(`^[ぁ-んァ-ヶー]+$`)

// isValidYomi returns true when s contains only hiragana, katakana, and chōonpu.
func isValidYomi(s string) bool {
	return len(s) > 0 && validYomiRegexp.MatchString(s)
}

// isValidEmail returns true when s is a syntactically valid email address.
func isValidEmail(s string) bool {
	addr, err := mail.ParseAddress(s)
	if err != nil {
		return false
	}
	return addr.Address == s
}

// passwordHasLetterAndDigit returns true when s contains at least one ASCII letter
// and at least one ASCII digit.
func passwordHasLetterAndDigit(s string) bool {
	hasLetter := false
	hasDigit := false
	for i := 0; i < len(s); i++ {
		b := s[i]
		switch {
		case (b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z'):
			hasLetter = true
		case b >= '0' && b <= '9':
			hasDigit = true
		}
		if hasLetter && hasDigit {
			return true
		}
	}
	return false
}

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

	completed := strings.TrimSpace(univemail) != "" && userValue.IsUnivemailVerified

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

func decodeMaybeExternalID(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	decoded, err := externalid.DecodeToUUIDString(trimmed)
	if err == nil {
		return decoded
	}
	return trimmed
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
	contactEmail := strings.ToLower(strings.TrimSpace(userValue.ContactEmail))
	if contactEmail != "" && domain != "" && strings.HasSuffix(contactEmail, "@"+domain) {
		return contactEmail
	}
	return ""
}

func deriveStudentID(userValue useradmin.User, domainPart string) string {
	domain := strings.ToLower(strings.TrimSpace(domainPart))
	for _, loginID := range userValue.LoginIDs {
		normalized := strings.TrimSpace(loginID)
		lowerNormalized := strings.ToLower(normalized)
		if normalized == "" {
			continue
		}
		if strings.Contains(lowerNormalized, "@") {
			if domain != "" && strings.HasSuffix(lowerNormalized, "@"+domain) {
				continue
			}
			if strings.EqualFold(lowerNormalized, strings.TrimSpace(userValue.ContactEmail)) {
				continue
			}
		}
		return normalized
	}
	return ""
}

func buildRegistrationVerifyURL(appURL, pendingRegistrationID, token string) string {
	base := strings.TrimRight(strings.TrimSpace(appURL), "/")
	return fmt.Sprintf(
		"%s/email/verify/univemail/%s?token=%s",
		base,
		externalid.MaybeEncodeUUIDString(strings.TrimSpace(pendingRegistrationID)),
		url.QueryEscape(token),
	)
}

func buildAuthVerificationVerifyURL(appURL, verificationType, userID, token string) string {
	base := strings.TrimRight(strings.TrimSpace(appURL), "/")
	return fmt.Sprintf(
		"%s/email/verify/account/%s/%s?token=%s",
		base,
		url.PathEscape(strings.TrimSpace(verificationType)),
		externalid.MaybeEncodeUUIDString(strings.TrimSpace(userID)),
		url.QueryEscape(token),
	)
}

func buildPasswordResetURL(appURL, userID, token string) string {
	base := strings.TrimRight(strings.TrimSpace(appURL), "/")
	return fmt.Sprintf(
		"%s/password/reset/%s?token=%s",
		base,
		externalid.MaybeEncodeUUIDString(strings.TrimSpace(userID)),
		url.QueryEscape(token),
	)
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

func (h *authHandlers) loadAndValidatePendingRegistration(ctx context.Context, pendingRegistrationID, token string) (pendingregistration.PendingRegistration, error) {
	normalizedID := strings.TrimSpace(pendingRegistrationID)
	normalizedToken := strings.TrimSpace(token)
	if normalizedID == "" || normalizedToken == "" {
		return pendingregistration.PendingRegistration{}, errInvalidRegistrationToken
	}

	pendingValue, err := h.pendingRegistrations.Find(ctx, normalizedID)
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
