package controllers

import (
	"errors"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/pendingregistration"
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

type startRegistrationRequest struct {
	UnivemailLocalPart string `json:"univemailLocalPart"`
}

type startRegistrationResponse struct {
	DeliveryMode string `json:"deliveryMode"`
	Message      string `json:"message"`
	VerifyURL    string `json:"verifyUrl,omitempty"`
}

type verifyRegistrationRequest struct {
	PendingRegistrationID string `json:"pendingRegistrationId"`
	Token                 string `json:"token"`
}

type verifyRegistrationResponse struct {
	PendingRegistrationID string `json:"pendingRegistrationId"`
	Univemail             string `json:"univemail"`
	StudentID             string `json:"studentId"`
	Verified              bool   `json:"verified"`
}

type completeRegistrationRequest struct {
	PendingRegistrationID string `json:"pendingRegistrationId"`
	Token                 string `json:"token"`
	Name                  string `json:"name"`
	NameYomi              string `json:"nameYomi"`
	ContactEmail          string `json:"contactEmail"`
	PhoneNumber           string `json:"phoneNumber"`
	Password              string `json:"password"`
	PasswordConfirmation  string `json:"passwordConfirmation"`
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

func (h *authHandlers) startRegistration(c echo.Context) error {
	var request startRegistrationRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	request.UnivemailLocalPart = normalizeRegistrationLocalPart(request.UnivemailLocalPart)
	studentID := request.UnivemailLocalPart
	univemail := deriveRegistrationUnivemail(request.UnivemailLocalPart, h.portalUnivemailDomainPart)

	validationErrors := map[string][]string{}
	if request.UnivemailLocalPart == "" {
		validationErrors["univemailLocalPart"] = []string{"大学メールアドレスを入力してください"}
	}
	if strings.TrimSpace(h.portalUnivemailDomainPart) == "" {
		validationErrors["univemailLocalPart"] = append(validationErrors["univemailLocalPart"], "大学メールアドレスのドメインが未設定です")
	}
	if _, err := h.users.FindByLoginID(studentID); err == nil {
		validationErrors["univemailLocalPart"] = append(validationErrors["univemailLocalPart"], "この大学メールアドレスはすでに登録されています")
	}
	if _, err := h.users.FindByLoginID(univemail); err == nil {
		validationErrors["univemailLocalPart"] = append(validationErrors["univemailLocalPart"], "この大学メールアドレスはすでに登録されています")
	}
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	token, err := generateRegistrationToken()
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "failed_to_generate_registration_token")
	}
	tokenHash := hashRegistrationToken(token)
	pendingValue, err := h.pendingRegistrations.Save(
		univemail,
		studentID,
		tokenHash,
		time.Now().UTC().Add(h.registrationVerifyTTL),
	)
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "failed_to_prepare_registration")
	}

	verifyURL := buildRegistrationVerifyURL(h.appURL, pendingValue.ID, token)
	delivery, err := h.registrationMailSender.SendVerificationMail(registrationMailMessage(h.appName, univemail, verifyURL))
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "failed_to_send_registration_mail")
	}

	response := startRegistrationResponse{
		DeliveryMode: delivery.DeliveryMode,
		Message:      "大学メールアドレスに認証URLを送信しました。",
	}
	if delivery.DeliveryMode == "mock" {
		response.VerifyURL = delivery.VerifyURL
		response.Message = "モック中: メールは送信していません。認証URLを開いて登録を続けてください。"
	}

	return c.JSON(http.StatusOK, response)
}

func (h *authHandlers) verifyRegistration(c echo.Context) error {
	var request verifyRegistrationRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	pendingValue, err := h.loadAndValidatePendingRegistration(request.PendingRegistrationID, request.Token)
	if err != nil {
		if errors.Is(err, errInvalidRegistrationToken) {
			return validationError(c, map[string][]string{
				"token": {"認証URLが無効か期限切れです。もう一度お試しください。"},
			})
		}
		return errorJSON(c, http.StatusInternalServerError, "failed_to_load_registration")
	}

	if !pendingValue.IsVerified() {
		pendingValue, err = h.pendingRegistrations.MarkVerified(pendingValue.ID, time.Now().UTC())
		if err != nil {
			if errors.Is(err, pendingregistration.ErrNotFound) {
				return validationError(c, map[string][]string{
					"token": {"認証URLが無効か期限切れです。もう一度お試しください。"},
				})
			}
			return errorJSON(c, http.StatusInternalServerError, "failed_to_verify_registration")
		}
	}

	return c.JSON(http.StatusOK, verifyRegistrationResponse{
		PendingRegistrationID: pendingValue.ID,
		Univemail:             pendingValue.Univemail,
		StudentID:             pendingValue.StudentID,
		Verified:              true,
	})
}

func (h *authHandlers) completeRegistration(c echo.Context) error {
	var request completeRegistrationRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	pendingValue, err := h.loadAndValidatePendingRegistration(request.PendingRegistrationID, request.Token)
	if err != nil {
		if errors.Is(err, errInvalidRegistrationToken) {
			return validationError(c, map[string][]string{
				"token": {"認証URLが無効か期限切れです。もう一度お試しください。"},
			})
		}
		return errorJSON(c, http.StatusInternalServerError, "failed_to_load_registration")
	}
	if !pendingValue.IsVerified() {
		return validationError(c, map[string][]string{
			"token": {"認証URLを開き直してから登録を完了してください"},
		})
	}

	request.Name = strings.TrimSpace(request.Name)
	request.NameYomi = strings.TrimSpace(request.NameYomi)
	request.ContactEmail = strings.TrimSpace(strings.ToLower(request.ContactEmail))
	request.PhoneNumber = strings.TrimSpace(request.PhoneNumber)

	lastName, firstName, normalizedName, ok := splitFullName(request.Name)
	lastNameReading, firstNameReading, _, yomiOK := splitFullName(request.NameYomi)
	validationErrors := map[string][]string{}
	if !ok {
		validationErrors["name"] = []string{"姓と名の間にはスペースを入れてください"}
	}
	if !yomiOK {
		validationErrors["nameYomi"] = []string{"姓と名の間にはスペースを入れてください"}
	}
	if request.ContactEmail != "" && !strings.Contains(request.ContactEmail, "@") {
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
	if _, err := h.users.FindByLoginID(pendingValue.StudentID); err == nil {
		validationErrors["univemail"] = append(validationErrors["univemail"], "この大学メールアドレスはすでに登録されています")
	}
	if _, err := h.users.FindByLoginID(pendingValue.Univemail); err == nil {
		validationErrors["univemail"] = append(validationErrors["univemail"], "この大学メールアドレスはすでに登録されています")
	}
	if request.ContactEmail != "" {
		if _, err := h.users.FindByContactEmail(request.ContactEmail); err == nil {
			validationErrors["contactEmail"] = []string{"入力されたメールアドレスはすでに登録されています"}
		}
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
		LoginIDs:            []string{pendingValue.StudentID, pendingValue.Univemail},
		ContactEmail:        request.ContactEmail,
		PhoneNumber:         request.PhoneNumber,
		PasswordHash:        string(passwordHash),
		Roles:               []string{"participant"},
		Permissions:         []string{},
		IsVerified:          true,
		IsEmailVerified:     false,
		IsUnivemailVerified: true,
	})
	if errors.Is(err, useradmin.ErrConflict) {
		return validationError(c, map[string][]string{
			"univemail": {"入力内容がすでに登録されています"},
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

	if err := h.pendingRegistrations.Delete(pendingValue.ID); err != nil && !errors.Is(err, pendingregistration.ErrNotFound) {
		return errorJSON(c, http.StatusInternalServerError, "failed_to_finalize_registration")
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

	code, err := generateVerificationCode()
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "failed_to_generate_verify_code")
	}
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
