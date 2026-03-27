package controllers

import (
	"crypto/rand"
	"encoding/binary"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"golang.org/x/crypto/bcrypt"
)

const participantVerifyTTL = 5 * time.Minute

type registerRequest struct {
	StudentID            string `json:"studentId"`
	UnivemailLocalPart   string `json:"univemailLocalPart"`
	UnivemailDomainPart  string `json:"univemailDomainPart"`
	Name                 string `json:"name"`
	NameYomi             string `json:"nameYomi"`
	ContactEmail         string `json:"contactEmail"`
	PhoneNumber          string `json:"phoneNumber"`
	Password             string `json:"password"`
	PasswordConfirmation string `json:"passwordConfirmation"`
}

type authVerificationStatusResponse struct {
	UserID      string                       `json:"userId"`
	DisplayName string                       `json:"displayName"`
	Completed   bool                         `json:"completed"`
	Items       []authVerificationStatusItem `json:"items"`
}

type authVerificationStatusItem struct {
	Type     string `json:"type"`
	Label    string `json:"label"`
	Address  string `json:"address"`
	Verified bool   `json:"verified"`
}

type authVerificationRequest struct {
	Type string `json:"type"`
}

type participantVerifyCode struct {
	Code      string
	ExpiresAt time.Time
}

type participantVerifyCodeStore struct {
	mu    sync.RWMutex
	codes map[string]map[string]participantVerifyCode
}

func newParticipantVerifyCodeStore() *participantVerifyCodeStore {
	return &participantVerifyCodeStore{
		codes: map[string]map[string]participantVerifyCode{},
	}
}

func (s *participantVerifyCodeStore) Put(sessionID, verificationType, code string, expiresAt time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.codes[sessionID]; !ok {
		s.codes[sessionID] = map[string]participantVerifyCode{}
	}
	s.codes[sessionID][verificationType] = participantVerifyCode{
		Code:      code,
		ExpiresAt: expiresAt,
	}
}

func (s *participantVerifyCodeStore) Match(sessionID, verificationType, code string, now time.Time) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	byType, ok := s.codes[sessionID]
	if !ok {
		return false
	}
	current, ok := byType[verificationType]
	if !ok {
		return false
	}

	return current.Code == code && now.Before(current.ExpiresAt)
}

func (s *participantVerifyCodeStore) Clear(sessionID, verificationType string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	byType, ok := s.codes[sessionID]
	if !ok {
		return
	}
	delete(byType, verificationType)
	if len(byType) == 0 {
		delete(s.codes, sessionID)
	}
}

func (h *authHandlers) register(c echo.Context) error {
	var request registerRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	request.StudentID = strings.TrimSpace(request.StudentID)
	request.UnivemailLocalPart = strings.TrimSpace(request.UnivemailLocalPart)
	request.UnivemailDomainPart = strings.TrimSpace(request.UnivemailDomainPart)
	request.Name = strings.TrimSpace(request.Name)
	request.NameYomi = strings.TrimSpace(request.NameYomi)
	request.ContactEmail = strings.TrimSpace(strings.ToLower(request.ContactEmail))
	request.PhoneNumber = strings.TrimSpace(request.PhoneNumber)

	lastName, firstName, normalizedName, ok := splitFullName(request.Name)
	if !ok {
		lastName = ""
		firstName = ""
	}
	lastNameReading, firstNameReading, _, yomiOK := splitFullName(request.NameYomi)
	univemail := strings.ToLower(strings.TrimSpace(request.UnivemailLocalPart + "@" + request.UnivemailDomainPart))

	validationErrors := map[string][]string{}
	if request.StudentID == "" {
		validationErrors["studentId"] = []string{"学籍番号を入力してください"}
	}
	if request.UnivemailLocalPart == "" {
		validationErrors["univemailLocalPart"] = []string{"大学メールアドレスを入力してください"}
	}
	if request.UnivemailDomainPart == "" {
		validationErrors["univemailDomainPart"] = []string{"大学メールアドレスを入力してください"}
	} else if request.UnivemailDomainPart != h.portalUnivemailDomainPart {
		validationErrors["univemailDomainPart"] = []string{"大学メールアドレスのドメインが正しくありません"}
	}
	if !strings.Contains(univemail, "@") {
		validationErrors["univemailLocalPart"] = []string{"大学メールアドレスを入力してください"}
	}
	if !ok {
		validationErrors["name"] = []string{"姓と名の間にはスペースを入れてください"}
	}
	if !yomiOK {
		validationErrors["nameYomi"] = []string{"姓と名の間にはスペースを入れてください"}
	}
	if request.ContactEmail == "" || !strings.Contains(request.ContactEmail, "@") {
		validationErrors["contactEmail"] = []string{"連絡先メールアドレスを正しく入力してください"}
	}
	if request.PhoneNumber == "" {
		validationErrors["phoneNumber"] = []string{"連絡先電話番号を入力してください"}
	}
	if len(request.Password) < 8 {
		validationErrors["password"] = []string{"パスワードは8文字以上で入力してください"}
	}
	if request.Password != request.PasswordConfirmation {
		validationErrors["passwordConfirmation"] = []string{"確認用パスワードが一致しません"}
	}
	if _, err := h.users.FindByLoginID(request.StudentID); err == nil {
		validationErrors["studentId"] = []string{"入力された学籍番号はすでに登録されています"}
	}
	if _, err := h.users.FindByLoginID(univemail); err == nil {
		validationErrors["univemailLocalPart"] = []string{"入力された大学メールアドレスはすでに登録されています"}
	}
	if _, err := h.users.FindByContactEmail(request.ContactEmail); err == nil {
		validationErrors["contactEmail"] = []string{"入力されたメールアドレスはすでに登録されています"}
	}
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(request.Password), bcrypt.DefaultCost)
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "failed_to_hash_password")
	}

	createdUser, err := h.users.Create(useradmin.CreateParams{
		LastName:            lastName,
		LastNameReading:     lastNameReading,
		FirstName:           firstName,
		FirstNameReading:    firstNameReading,
		DisplayName:         normalizedName,
		LoginIDs:            []string{request.StudentID, univemail},
		ContactEmail:        request.ContactEmail,
		PhoneNumber:         request.PhoneNumber,
		PasswordHash:        string(passwordHash),
		Roles:               []string{"participant"},
		Permissions:         []string{},
		IsVerified:          false,
		IsEmailVerified:     false,
		IsUnivemailVerified: false,
	})
	if errors.Is(err, useradmin.ErrConflict) {
		return validationError(c, map[string][]string{
			"studentId": {"入力内容がすでに登録されています"},
		})
	}
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "failed_to_create_user")
	}

	if h.registrationAuth != nil {
		h.registrationAuth.RegisterUser(auth.RegisterParams{
			ID:           createdUser.ID,
			DisplayName:  createdUser.DisplayName,
			LoginIDs:     createdUser.LoginIDs,
			ContactEmail: createdUser.ContactEmail,
			Password:     request.Password,
			Roles:        createdUser.Roles,
			Permissions:  createdUser.Permissions,
		})
	}

	return h.loginRegisteredUser(c, createdUser)
}

func (h *authHandlers) getAuthVerification(c echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}

	managedUser, err := h.users.Find(currentSession.User.ID)
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "failed_to_load_user")
	}

	return c.JSON(http.StatusOK, buildAuthVerificationStatus(managedUser, deriveUnivemail(managedUser, h.portalUnivemailDomainPart)))
}

func (h *authHandlers) requestAuthVerification(c echo.Context) error {
	sessionID, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}

	var request authVerificationRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}
	request.Type = normalizeVerificationType(request.Type)
	if request.Type == "" {
		return validationError(c, map[string][]string{
			"type": {"認証種別を選択してください"},
		})
	}

	managedUser, err := h.users.Find(currentSession.User.ID)
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "failed_to_load_user")
	}

	status := buildAuthVerificationStatus(managedUser, deriveUnivemail(managedUser, h.portalUnivemailDomainPart))
	item, found := findVerificationItem(status.Items, request.Type)
	if !found || item.Address == "" {
		return validationError(c, map[string][]string{
			"type": {"認証対象のメールアドレスを確認できません"},
		})
	}
	if item.Verified {
		return c.JSON(http.StatusOK, staffVerifyRequestResponse{
			DeliveryMode: "mock",
			Message:      "すでに認証済みです。",
			VerifyCode:   "",
		})
	}

	code := generateVerificationCode()
	h.verifyCodes.Put(sessionID, request.Type, code, time.Now().UTC().Add(participantVerifyTTL))

	return c.JSON(http.StatusOK, staffVerifyRequestResponse{
		DeliveryMode: "mock",
		Message:      "モック中: メールは送信していません。画面に表示された認証コードを入力してください。",
		VerifyCode:   code,
	})
}

func (h *authHandlers) confirmAuthVerification(c echo.Context) error {
	sessionID, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}

	var request struct {
		Type       string `json:"type"`
		VerifyCode string `json:"verifyCode"`
	}
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	request.Type = normalizeVerificationType(request.Type)
	request.VerifyCode = strings.TrimSpace(request.VerifyCode)
	if request.Type == "" {
		return validationError(c, map[string][]string{
			"type": {"認証種別を選択してください"},
		})
	}
	if request.VerifyCode == "" {
		return validationError(c, map[string][]string{
			"verifyCode": {"認証コードを入力してください"},
		})
	}
	if !h.verifyCodes.Match(sessionID, request.Type, request.VerifyCode, time.Now().UTC()) {
		return validationError(c, map[string][]string{
			"verifyCode": {"認証コードが間違っているか、期限切れです。再度お試しください。"},
		})
	}

	managedUser, err := h.users.Find(currentSession.User.ID)
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusUnauthorized, "unauthenticated")
	}
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "failed_to_load_user")
	}

	univemail := deriveUnivemail(managedUser, h.portalUnivemailDomainPart)
	emailMatches := strings.EqualFold(strings.TrimSpace(managedUser.ContactEmail), strings.TrimSpace(univemail))

	switch request.Type {
	case "email":
		if _, err := h.users.UpdateEmailVerified(managedUser.ID, true); err != nil {
			return errorJSON(c, http.StatusInternalServerError, "failed_to_update_user")
		}
		if emailMatches {
			if _, err := h.users.UpdateUnivemailVerified(managedUser.ID, true); err != nil {
				return errorJSON(c, http.StatusInternalServerError, "failed_to_update_user")
			}
		}
	case "univemail":
		if _, err := h.users.UpdateUnivemailVerified(managedUser.ID, true); err != nil {
			return errorJSON(c, http.StatusInternalServerError, "failed_to_update_user")
		}
		if emailMatches {
			if _, err := h.users.UpdateEmailVerified(managedUser.ID, true); err != nil {
				return errorJSON(c, http.StatusInternalServerError, "failed_to_update_user")
			}
		}
	default:
		return validationError(c, map[string][]string{
			"type": {"認証種別を選択してください"},
		})
	}

	h.verifyCodes.Clear(sessionID, request.Type)
	return c.NoContent(http.StatusNoContent)
}

func (h *authHandlers) loginRegisteredUser(c echo.Context, managedUser useradmin.User) error {
	sessionUser := &auth.User{
		ID:          managedUser.ID,
		DisplayName: managedUser.DisplayName,
		Roles:       slices.Clone(managedUser.Roles),
		Permissions: slices.Clone(managedUser.Permissions),
	}

	sessionID, _, err := h.sessions.Create(sessionUser)
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "failed_to_create_session")
	}

	c.SetCookie(&http.Cookie{
		Name:     h.sessionCookieName,
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   h.sessionCookieSecure,
	})

	return c.NoContent(http.StatusNoContent)
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

	completed := true
	for _, item := range items {
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

func generateVerificationCode() string {
	var raw [4]byte
	if _, err := rand.Read(raw[:]); err == nil {
		return fmt.Sprintf("%06d", binary.BigEndian.Uint32(raw[:])%1000000)
	}
	return fmt.Sprintf("%06d", time.Now().UnixNano()%1000000)
}
