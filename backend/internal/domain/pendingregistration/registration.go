package pendingregistration

import (
	"errors"
	"net/mail"
	"regexp"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidRegistrationToken = errors.New("invalid registration token")

var validYomiRegexp = regexp.MustCompile(`^[ぁ-んァ-ヶー]+$`)

var validPhoneNumberRegexp = regexp.MustCompile(`^[\d\-()+]+$`)

func NormalizeLocalPart(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	normalized = strings.TrimPrefix(normalized, "@")
	if strings.Contains(normalized, "@") {
		return ""
	}
	return normalized
}

func DeriveUnivemail(localPart, domainPart string) string {
	normalizedLocalPart := NormalizeLocalPart(localPart)
	normalizedDomain := strings.ToLower(strings.TrimSpace(domainPart))
	if normalizedLocalPart == "" || normalizedDomain == "" {
		return ""
	}
	return normalizedLocalPart + "@" + normalizedDomain
}

type RegistrationProfile struct {
	Name                 string
	NameYomi             string
	LastName             string
	LastNameReading      string
	FirstName            string
	FirstNameReading     string
	DisplayName          string
	ContactEmail         string
	PhoneNumber          string
	Password             string
	PasswordConfirmation string
}

type RegistrationValidationResult struct {
	Name                 []string
	NameYomi             []string
	ContactEmail         []string
	PhoneNumber          []string
	Password             []string
	PasswordConfirmation []string
}

func ValidateRegistrationProfile(profile RegistrationProfile) RegistrationValidationResult {
	result := RegistrationValidationResult{}

	if profile.LastName == "" || profile.FirstName == "" {
		result.Name = []string{"姓と名の間にはスペースを入れてください"}
	}
	if profile.LastNameReading == "" || profile.FirstNameReading == "" {
		result.NameYomi = []string{"姓と名の間にはスペースを入れてください"}
	} else if !isValidYomi(profile.LastNameReading) || !isValidYomi(profile.FirstNameReading) {
		result.NameYomi = []string{"ひらがなで入力してください"}
	}
	if profile.ContactEmail != "" && !isValidEmail(profile.ContactEmail) {
		result.ContactEmail = []string{"連絡先メールアドレスを正しく入力してください"}
	}
	if profile.PhoneNumber == "" {
		result.PhoneNumber = []string{"連絡先電話番号を入力してください"}
	} else if !isValidPhoneNumber(profile.PhoneNumber) {
		result.PhoneNumber = []string{"電話番号の形式が正しくありません（例: 090-1234-5678）"}
	}
	if len(profile.Password) < 8 {
		result.Password = []string{"パスワードは8文字以上で入力してください"}
	} else if !passwordHasLetterAndDigit(profile.Password) {
		result.Password = []string{"パスワードには英字と数字の両方を含めてください"}
	}
	if profile.Password != profile.PasswordConfirmation {
		result.PasswordConfirmation = []string{"確認用パスワードが一致しません"}
	}

	return result
}

func SplitFullName(value string) (string, string, string, bool) {
	parts := strings.Fields(strings.ReplaceAll(value, "\u3000", " "))
	if len(parts) < 2 {
		return "", "", "", false
	}

	lastName := parts[0]
	firstName := strings.Join(parts[1:], " ")
	return lastName, firstName, lastName + " " + firstName, true
}

func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func isValidYomi(s string) bool {
	return len(s) > 0 && validYomiRegexp.MatchString(s)
}

func isValidEmail(s string) bool {
	addr, err := mail.ParseAddress(s)
	if err != nil {
		return false
	}
	return addr.Address == s
}

func isValidPhoneNumber(s string) bool {
	return len(s) > 0 && validPhoneNumberRegexp.MatchString(s)
}

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
