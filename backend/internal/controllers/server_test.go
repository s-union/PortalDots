package controllers

import (
	"archive/zip"
	"bytes"
	"encoding/csv"
	"encoding/json"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/models"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/shared/externalid"
)

const strictStaffVerifyCode = "654321"

func TestLoginAndBootstrap(t *testing.T) {
	t.Parallel()

	server := NewServer(independentUserConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "independent@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/session/bootstrap", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response sessionBootstrapResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal bootstrap response: %v", err)
	}

	if response.User == nil {
		t.Fatal("expected authenticated user")
	}
	if response.User.ID != "0195ec00-0099-7000-8000-000000000001" {
		t.Fatalf("expected user id 0195ec00-0099-7000-8000-000000000001, got %s", response.User.ID)
	}
	if response.User.DisplayName != "Independent User" {
		t.Fatalf("expected display name Independent User, got %s", response.User.DisplayName)
	}
	if !response.User.CanDeleteAccount {
		t.Fatal("expected bootstrap to allow account deletion for demo user")
	}
	if !response.User.CanCreateCircleRegistration {
		t.Fatal("expected bootstrap to allow creating circle registrations for demo user")
	}
	if len(response.Roles) != 1 || response.Roles[0] != "participant" {
		t.Fatalf("expected participant role, got %#v", response.Roles)
	}
	if response.CSRFToken == "" {
		t.Fatal("expected csrf token to be populated")
	}
	if cookie := cookies["test_session"]; cookie == nil || cookie.MaxAge != 0 {
		t.Fatalf("expected session cookie without remember-me persistence, got %#v", cookie)
	}
}

func TestLoginRememberSetsPersistentCookie(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]any{
		"loginId":  "demo@example.com",
		"password": "password",
		"remember": true,
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	if cookie := cookies["test_session"]; cookie == nil || cookie.MaxAge <= 0 {
		t.Fatalf("expected persistent session cookie when remember is set, got %#v", cookie)
	}
}

func TestContactCategoriesAndSubmitContact(t *testing.T) {
	t.Parallel()

	cfg := demoCircleConfig()
	cfg.ContactCategories = []config.ContactCategory{
		{ID: "0195ec00-0081-7000-8000-000000000001", Name: "総合窓口", Email: "general@example.com"},
	}
	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	selectCircle(t, server, cookies, "0195ec00-0021-7000-8000-000000000001")

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/contact-categories", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var categories []participantContactCategoryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &categories); err != nil {
		t.Fatalf("unmarshal contact categories: %v", err)
	}
	if len(categories) == 0 {
		t.Fatal("expected contact categories")
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/contact", map[string]string{
		"categoryId": categories[0].ID,
		"subject":    "搬入時間について",
		"body":       "当日の搬入可能時刻を確認したいです。",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var response submitContactResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal contact response: %v", err)
	}
	if response.ID == "" || response.CategoryID != categories[0].ID || response.Status != "queued" {
		t.Fatalf("unexpected contact response: %#v", response)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/contact", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var history []submitContactResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &history); err != nil {
		t.Fatalf("unmarshal contact history: %v", err)
	}
	if len(history) != 1 || history[0].CategoryID != categories[0].ID || history[0].Subject != "搬入時間について" {
		t.Fatalf("unexpected contact history: %#v", history)
	}
}

func TestSubmitContactQueuesConfirmationAndStaffCopy(t *testing.T) {
	t.Parallel()

	cfg := testStaffConfig()
	cfg.ContactCategories = []config.ContactCategory{
		{ID: "0195ec00-0081-7000-8000-000000000001", Name: "総合窓口", Email: "general@example.com"},
	}
	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0022-7000-8000-000000000001@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/contact", map[string]string{
		"categoryId": "0195ec00-0081-7000-8000-000000000001",
		"subject":    "搬入時間について",
		"body":       "当日の搬入可能時刻を確認したいです。",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var mails []staffMailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &mails); err != nil {
		t.Fatalf("unmarshal staff mails: %v", err)
	}
	if len(mails) != 2 {
		t.Fatalf("expected 2 queued contact mails, got %#v", mails)
	}

	hasConfirmation := false
	hasStaffCopy := false
	for _, mail := range mails {
		if mail.Subject == "お問い合わせを承りました" {
			hasConfirmation = true
		}
		if mail.Subject == "搬入時間について" && slices.Equal(mail.Recipients, []string{"general@example.com"}) {
			hasStaffCopy = true
		}
	}
	if !hasConfirmation || !hasStaffCopy {
		t.Fatalf("expected confirmation and staff copy mails, got %#v", mails)
	}
}

func TestUpdateProfileReflectsInBootstrap(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/session/profile", map[string]string{
		"displayName": "Updated Demo User",
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var updated updatedProfileResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &updated); err != nil {
		t.Fatalf("unmarshal updated profile: %v", err)
	}
	if updated.DisplayName != "Updated Demo User" {
		t.Fatalf("unexpected updated profile: %#v", updated)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/session/bootstrap", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var bootstrap sessionBootstrapResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &bootstrap); err != nil {
		t.Fatalf("unmarshal bootstrap after profile update: %v", err)
	}
	if bootstrap.User == nil || bootstrap.User.DisplayName != "Updated Demo User" {
		t.Fatalf("expected updated display name in bootstrap, got %#v", bootstrap.User)
	}
}

func TestUpdateProfileResetsChangedContactEmailVerificationAndSendsVerifyURL(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}
	var logs bytes.Buffer
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&logs, nil)))
	t.Cleanup(func() {
		slog.SetDefault(previousLogger)
	})

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}
	csrf := map[string]string{"X-CSRF-Token": fetchCSRFToken(t, server, cookies)}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/session/profile", map[string]string{
		"displayName":     "Demo User",
		"name":            "デモ 太郎",
		"nameYomi":        "でも たろう",
		"contactEmail":    "changed-contact@example.com",
		"phoneNumber":     "090-1234-5678",
		"currentPassword": "password",
	}, csrf)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/auth/verification", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var status authVerificationStatusResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &status); err != nil {
		t.Fatalf("unmarshal verification status response: %v", err)
	}
	emailItem, found := findVerificationItem(status.Items, "email")
	if !found || emailItem.Verified || emailItem.Address != "changed-contact@example.com" {
		t.Fatalf("expected updated unverified contact email item, got %#v", status.Items)
	}
	if status.Completed {
		t.Fatalf("expected verification to remain incomplete without a university email, got %#v", status)
	}
	if !strings.Contains(logs.String(), "kind=participant_verify_url") || !strings.Contains(logs.String(), "recipient=changed-contact@example.com") {
		t.Fatalf("expected participant verification url log after profile update, got logs=%s", logs.String())
	}
}

func TestUpdatePasswordAllowsLoginWithNewPassword(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/session/password", map[string]string{
		"currentPassword": "password",
		"newPassword":     "new-password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/logout", nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "new-password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}
}

func TestUpdatePasswordAllowsLoginWithoutNotificationRecipient(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	cfg.AuthUser.LoginIDs = []string{"24a0000"}

	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "24a0000",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/session/password", map[string]string{
		"currentPassword": "password",
		"newPassword":     "new-password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/logout", nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "24a0000",
		"password": "new-password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}
}

func TestUpdatePasswordQueuesNotificationMail(t *testing.T) {
	t.Parallel()

	cfg := testStrictStaffConfig()
	for index := range cfg.Users {
		if cfg.Users[index].ID != "0195ec00-0058-7000-8000-000000000001" {
			continue
		}
		cfg.Users[index].ContactEmail = "circle-b-contact@example.com"
	}

	server := NewServer(cfg)
	participantCookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, participantCookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0022-7000-8000-000000000001@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}
	participantCSRF := map[string]string{"X-CSRF-Token": fetchCSRFToken(t, server, participantCookies)}

	recorder = doJSONRequest(t, server, participantCookies, http.MethodPut, "/v1/session/password", map[string]string{
		"currentPassword": "password",
		"newPassword":     "new-password",
	}, participantCSRF)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	staffCookies := map[string]*http.Cookie{}
	loginAsStaff(t, server, staffCookies)
	authorizeStaff(t, server, staffCookies)
	staffCSRF := map[string]string{"X-CSRF-Token": fetchCSRFToken(t, server, staffCookies)}

	recorder = doJSONRequest(t, server, staffCookies, http.MethodPost, "/v1/staff/verify/confirm", map[string]string{
		"verifyCode": strictStaffVerifyCode,
	}, staffCSRF)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, staffCookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var queuedMails []staffMailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &queuedMails); err != nil {
		t.Fatalf("unmarshal staff mails: %v", err)
	}

	found := false
	for _, queued := range queuedMails {
		if queued.Subject != "パスワードが変更されました" {
			continue
		}
		if !slices.Contains(queued.Recipients, "0195ec00-0022-7000-8000-000000000001@example.com") {
			continue
		}
		if !strings.Contains(queued.Body, "パスワードが変更されました") {
			continue
		}
		found = true
		break
	}
	if !found {
		t.Fatalf("expected queued password changed mail, got %#v", queuedMails)
	}
}

func TestPasswordResetFlow(t *testing.T) {
	t.Parallel()

	cfg := testStrictStaffConfig()
	for index := range cfg.Users {
		if cfg.Users[index].ID != "0195ec00-0058-7000-8000-000000000001" {
			continue
		}
		cfg.Users[index].ContactEmail = "circle-b-contact@example.com"
		cfg.Users[index].IsEmailVerified = true
	}
	server := NewServer(cfg)

	recorder := doJSONRequest(t, server, map[string]*http.Cookie{}, http.MethodPost, "/v1/auth/password/reset/start", map[string]string{
		"loginId": "0195ec00-0022-7000-8000-000000000001@example.com",
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	staffCookies := map[string]*http.Cookie{}
	loginAsStaff(t, server, staffCookies)
	authorizeStaff(t, server, staffCookies)
	staffCSRF := map[string]string{"X-CSRF-Token": fetchCSRFToken(t, server, staffCookies)}

	recorder = doJSONRequest(t, server, staffCookies, http.MethodPost, "/v1/staff/verify/confirm", map[string]string{
		"verifyCode": strictStaffVerifyCode,
	}, staffCSRF)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, staffCookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var queuedMails []staffMailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &queuedMails); err != nil {
		t.Fatalf("unmarshal staff mails: %v", err)
	}

	resetURL := ""
	for _, queued := range queuedMails {
		if queued.Subject != "パスワードの再設定" {
			continue
		}
		if !slices.Contains(queued.Recipients, "circle-b-contact@example.com") {
			continue
		}
		matchedURL := regexp.MustCompile(`https://[^\s]+/password/reset/[^\s]+`).FindString(queued.Body)
		if matchedURL == "" {
			continue
		}
		resetURL = matchedURL
		break
	}
	if resetURL == "" {
		t.Fatalf("expected queued password reset mail with reset url, got %#v", queuedMails)
	}

	parsedURL, err := url.Parse(resetURL)
	if err != nil {
		t.Fatalf("parse reset url: %v", err)
	}
	token := parsedURL.Query().Get("token")
	if token == "" {
		t.Fatalf("expected token query in reset url: %s", resetURL)
	}
	pathParts := strings.Split(strings.Trim(parsedURL.Path, "/"), "/")
	if len(pathParts) < 3 {
		t.Fatalf("unexpected reset url path: %s", parsedURL.Path)
	}
	encodedUserID := pathParts[len(pathParts)-1]

	recorder = doJSONRequest(t, server, map[string]*http.Cookie{}, http.MethodPost, "/v1/auth/password/reset/verify", map[string]string{
		"userId": encodedUserID,
		"token":  token,
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var verifyResponse passwordResetVerifyResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &verifyResponse); err != nil {
		t.Fatalf("unmarshal verify response: %v", err)
	}
	if !verifyResponse.Valid {
		t.Fatalf("expected valid reset token response, got %#v", verifyResponse)
	}

	recorder = doJSONRequest(t, server, map[string]*http.Cookie{}, http.MethodPost, "/v1/auth/password/reset/complete", map[string]string{
		"userId":               encodedUserID,
		"token":                token,
		"password":             "reset-password1",
		"passwordConfirmation": "reset-password1",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	participantCookies := map[string]*http.Cookie{}
	recorder = doJSONRequest(t, server, participantCookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0022-7000-8000-000000000001@example.com",
		"password": "reset-password1",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, staffCookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &queuedMails); err != nil {
		t.Fatalf("unmarshal staff mails after reset complete: %v", err)
	}

	foundPasswordChangedMail := false
	for _, queued := range queuedMails {
		if queued.Subject != "パスワードが変更されました" {
			continue
		}
		if slices.Contains(queued.Recipients, "circle-b-contact@example.com") {
			foundPasswordChangedMail = true
			break
		}
	}
	if !foundPasswordChangedMail {
		t.Fatalf("expected queued password changed mail after reset complete, got %#v", queuedMails)
	}
}

func TestPasswordResetStartMatchesLoginIDCaseInsensitive(t *testing.T) {
	t.Parallel()

	cfg := testStrictStaffConfig()
	cfg.Users = append(cfg.Users, config.User{
		ID:           "0195ec00-00b3-7000-8000-000000000001",
		LoginIDs:     []string{"MiXeDLoginID"},
		DisplayName:  "Mixed Login User",
		Password:     "password",
		Roles:        []string{"participant"},
		ContactEmail: "mixed-login@example.com",
		IsVerified:   true,
	})
	server := NewServer(cfg)

	recorder := doJSONRequest(t, server, map[string]*http.Cookie{}, http.MethodPost, "/v1/auth/password/reset/start", map[string]string{
		"loginId": "mixedloginid",
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	staffCookies := map[string]*http.Cookie{}
	loginAsStaff(t, server, staffCookies)
	authorizeStaff(t, server, staffCookies)
	staffCSRF := map[string]string{"X-CSRF-Token": fetchCSRFToken(t, server, staffCookies)}

	recorder = doJSONRequest(t, server, staffCookies, http.MethodPost, "/v1/staff/verify/confirm", map[string]string{
		"verifyCode": strictStaffVerifyCode,
	}, staffCSRF)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, staffCookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var queuedMails []staffMailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &queuedMails); err != nil {
		t.Fatalf("unmarshal staff mails: %v", err)
	}

	found := false
	for _, queued := range queuedMails {
		if queued.Subject != "パスワードの再設定" {
			continue
		}
		if slices.Contains(queued.Recipients, "mixed-login@example.com") {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected queued password reset mail for mixed-case login ID, got %#v", queuedMails)
	}
}

func TestPasswordResetStartDoesNotFuzzyMatchLoginID(t *testing.T) {
	t.Parallel()

	cfg := testStrictStaffConfig()
	cfg.Users = append(cfg.Users, config.User{
		ID:           "0195ec00-00b4-7000-8000-000000000001",
		LoginIDs:     []string{"MiXeDLoginID"},
		DisplayName:  "Mixed Login User",
		Password:     "password",
		Roles:        []string{"participant"},
		ContactEmail: "mixed-login@example.com",
		IsVerified:   true,
	})
	server := NewServer(cfg)

	recorder := doJSONRequest(t, server, map[string]*http.Cookie{}, http.MethodPost, "/v1/auth/password/reset/start", map[string]string{
		"loginId": "mixed",
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response messageResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal password reset start response: %v", err)
	}
	if response.Message != "再設定URLを送信しました。メールをご確認ください。" {
		t.Fatalf("expected generic success message, got %q", response.Message)
	}

	staffCookies := map[string]*http.Cookie{}
	loginAsStaff(t, server, staffCookies)
	authorizeStaff(t, server, staffCookies)
	staffCSRF := map[string]string{"X-CSRF-Token": fetchCSRFToken(t, server, staffCookies)}

	recorder = doJSONRequest(t, server, staffCookies, http.MethodPost, "/v1/staff/verify/confirm", map[string]string{
		"verifyCode": strictStaffVerifyCode,
	}, staffCSRF)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, staffCookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var queuedMails []staffMailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &queuedMails); err != nil {
		t.Fatalf("unmarshal staff mails: %v", err)
	}

	for _, queued := range queuedMails {
		if queued.Subject != "パスワードの再設定" {
			continue
		}
		if slices.Contains(queued.Recipients, "mixed-login@example.com") {
			t.Fatalf("expected no queued password reset mail for fuzzy login ID, got %#v", queuedMails)
		}
	}
}

func TestDeleteOwnAccountClearsSession(t *testing.T) {
	t.Parallel()

	server := NewServer(independentUserConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "independent@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/session/account", nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	if _, ok := cookies["test_session"]; ok {
		t.Fatalf("expected session cookie to be removed, got %#v", cookies)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/session/bootstrap", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var bootstrap sessionBootstrapResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &bootstrap); err != nil {
		t.Fatalf("unmarshal bootstrap after account delete: %v", err)
	}
	if bootstrap.User != nil {
		t.Fatalf("expected anonymous bootstrap after account delete, got %#v", bootstrap.User)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "independent@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}
}

func TestDeleteOwnAccountRejectsCircleMembers(t *testing.T) {
	t.Parallel()

	server := NewServer(circleMemberConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0022-7000-8000-000000000001@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/session/account", nil)
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal delete account validation response: %v", err)
	}
	if len(response.Errors["user"]) == 0 {
		t.Fatalf("expected user validation error, got %#v", response.Errors)
	}
}

func TestDeleteOwnAccountRejectsStaffUsers(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "staff@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/session/bootstrap", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var bootstrap sessionBootstrapResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &bootstrap); err != nil {
		t.Fatalf("unmarshal bootstrap for staff user: %v", err)
	}
	if bootstrap.User == nil {
		t.Fatal("expected authenticated staff user")
	}
	if bootstrap.User.CanDeleteAccount {
		t.Fatal("expected staff bootstrap to disallow account deletion")
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/session/account", nil)
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal delete account validation response: %v", err)
	}
	if len(response.Errors["user"]) == 0 {
		t.Fatalf("expected user validation error, got %#v", response.Errors)
	}
}

func TestLoginValidation(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "",
		"password": "",
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal validation error response: %v", err)
	}

	if len(response.Errors["loginId"]) == 0 {
		t.Fatal("expected loginId validation error")
	}
	if len(response.Errors["password"]) == 0 {
		t.Fatal("expected password validation error")
	}
}

func TestLogoutClearsSession(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "24a0000",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/logout", map[string]string{})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/session/bootstrap", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response sessionBootstrapResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal bootstrap response: %v", err)
	}

	if response.User != nil {
		t.Fatalf("expected unauthenticated response, got %#v", response.User)
	}
	if response.CSRFToken != "" {
		t.Fatalf("expected empty csrf token after logout, got %s", response.CSRFToken)
	}
}

func TestRegisterCreatesUserAndSession(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/register", map[string]string{
		"studentId":            "24z9999",
		"univemailLocalPart":   "24z9999",
		"univemailDomainPart":  "example.ac.jp",
		"name":                 "登録 太郎",
		"nameYomi":             "とうろく たろう",
		"contactEmail":         "register-user@example.com",
		"phoneNumber":          "090-1234-5678",
		"password":             "password123",
		"passwordConfirmation": "password123",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}
	if _, ok := cookies["test_session"]; !ok {
		t.Fatalf("expected session cookie to be set, got %#v", cookies)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/session/bootstrap", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var bootstrap sessionBootstrapResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &bootstrap); err != nil {
		t.Fatalf("unmarshal bootstrap response: %v", err)
	}
	if bootstrap.User == nil {
		t.Fatal("expected authenticated user after registration")
	}
	if bootstrap.User.DisplayName != "登録 太郎" {
		t.Fatalf("expected registered user display name, got %#v", bootstrap.User)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/auth/verification", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	var verification authVerificationStatusResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &verification); err != nil {
		t.Fatalf("unmarshal auth verification response: %v", err)
	}
	if verification.Completed {
		t.Fatalf("expected verification to start incomplete, got %#v", verification)
	}
}

func TestRegisterValidationAndConflict(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	invalid := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/register", map[string]string{
		"studentId":            "",
		"univemailLocalPart":   "",
		"univemailDomainPart":  "invalid.example.com",
		"name":                 "単一名",
		"nameYomi":             "たんめい",
		"contactEmail":         "invalid-email",
		"phoneNumber":          "",
		"password":             "short",
		"passwordConfirmation": "mismatch",
	})
	if invalid.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, invalid.Code, invalid.Body.String())
	}

	var invalidResponse models.ValidationErrorResponse
	if err := json.Unmarshal(invalid.Body.Bytes(), &invalidResponse); err != nil {
		t.Fatalf("unmarshal validation response: %v", err)
	}
	for _, key := range []string{
		"studentId",
		"univemailLocalPart",
		"univemailDomainPart",
		"name",
		"nameYomi",
		"contactEmail",
		"phoneNumber",
		"password",
		"passwordConfirmation",
	} {
		if len(invalidResponse.Errors[key]) == 0 {
			t.Fatalf("expected validation error for %s, got %#v", key, invalidResponse.Errors)
		}
	}

	duplicateStudentID := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/register", map[string]string{
		"studentId":            "24a0000",
		"univemailLocalPart":   "demo",
		"univemailDomainPart":  "example.ac.jp",
		"name":                 "重複 太郎",
		"nameYomi":             "ちょうふく たろう",
		"contactEmail":         "duplicate-student@example.com",
		"phoneNumber":          "090-0000-0000",
		"password":             "password123",
		"passwordConfirmation": "password123",
	})
	if duplicateStudentID.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, duplicateStudentID.Code, duplicateStudentID.Body.String())
	}

	var duplicateStudentResponse models.ValidationErrorResponse
	if err := json.Unmarshal(duplicateStudentID.Body.Bytes(), &duplicateStudentResponse); err != nil {
		t.Fatalf("unmarshal conflict validation response: %v", err)
	}
	if len(duplicateStudentResponse.Errors["studentId"]) == 0 {
		t.Fatalf("expected studentId conflict error, got %#v", duplicateStudentResponse.Errors)
	}

	recorder := doJSONRequest(t, server, map[string]*http.Cookie{}, http.MethodPost, "/v1/auth/register", map[string]string{
		"studentId":            "24z1001",
		"univemailLocalPart":   "24z1001",
		"univemailDomainPart":  "example.ac.jp",
		"name":                 "先行 登録",
		"nameYomi":             "せんこう とうろく",
		"contactEmail":         "duplicate-contact@example.com",
		"phoneNumber":          "090-1111-1111",
		"password":             "password123",
		"passwordConfirmation": "password123",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	duplicateContact := doJSONRequest(t, server, map[string]*http.Cookie{}, http.MethodPost, "/v1/auth/register", map[string]string{
		"studentId":            "24z1002",
		"univemailLocalPart":   "24z1002",
		"univemailDomainPart":  "example.ac.jp",
		"name":                 "後続 登録",
		"nameYomi":             "こうぞく とうろく",
		"contactEmail":         "duplicate-contact@example.com",
		"phoneNumber":          "090-2222-2222",
		"password":             "password123",
		"passwordConfirmation": "password123",
	})
	if duplicateContact.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, duplicateContact.Code, duplicateContact.Body.String())
	}

	var duplicateContactResponse models.ValidationErrorResponse
	if err := json.Unmarshal(duplicateContact.Body.Bytes(), &duplicateContactResponse); err != nil {
		t.Fatalf("unmarshal contact conflict validation response: %v", err)
	}
	if len(duplicateContactResponse.Errors["contactEmail"]) == 0 {
		t.Fatalf("expected contactEmail conflict error, got %#v", duplicateContactResponse.Errors)
	}
}

func TestAuthVerificationFlow(t *testing.T) {
	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}
	var logs bytes.Buffer
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&logs, nil)))
	t.Cleanup(func() {
		slog.SetDefault(previousLogger)
	})
	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/register", map[string]string{
		"studentId":            "24v2001",
		"univemailLocalPart":   "24v2001",
		"univemailDomainPart":  "example.ac.jp",
		"name":                 "認証 太郎",
		"nameYomi":             "にんしょう たろう",
		"contactEmail":         "auth-flow@example.com",
		"phoneNumber":          "090-3333-3333",
		"password":             "password123",
		"passwordConfirmation": "password123",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}
	csrf := map[string]string{"X-CSRF-Token": fetchCSRFToken(t, server, cookies)}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/auth/verification", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	var status authVerificationStatusResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &status); err != nil {
		t.Fatalf("unmarshal verification status response: %v", err)
	}
	userID := status.UserID

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/verification/request", map[string]string{
		"type": "email",
	}, csrf)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var requestResponse messageResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &requestResponse); err != nil {
		t.Fatalf("unmarshal verification request response: %v", err)
	}
	if requestResponse.Message != "認証URLを送信しました。" {
		t.Fatalf("unexpected verification request response: %#v", requestResponse)
	}
	emailVerifyToken := extractLoggedVerifyToken(t, logs.String(), "participant_verify_url", "auth-flow@example.com")

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/verification/verify", map[string]string{
		"type":   "email",
		"userId": userID,
		"token":  emailVerifyToken,
	}, csrf)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/auth/verification", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &status); err != nil {
		t.Fatalf("unmarshal verification status response: %v", err)
	}

	emailItem, found := findVerificationItem(status.Items, "email")
	if !found || !emailItem.Verified {
		t.Fatalf("expected email to be verified, got %#v", status.Items)
	}
	if status.Completed {
		t.Fatalf("expected verification to remain incomplete until university email is verified, got %#v", status)
	}

	logs.Reset()

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/verification/request", map[string]string{
		"type": "univemail",
	}, csrf)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var secondRequest messageResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &secondRequest); err != nil {
		t.Fatalf("unmarshal univemail verification request response: %v", err)
	}
	if secondRequest.Message != "認証URLを送信しました。" {
		t.Fatalf("unexpected univemail verification request response: %#v", secondRequest)
	}
	univemailVerifyToken := extractLoggedVerifyToken(t, logs.String(), "participant_verify_url", "24v2001@example.ac.jp")

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/verification/verify", map[string]string{
		"type":   "univemail",
		"userId": userID,
		"token":  univemailVerifyToken,
	}, csrf)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/auth/verification", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &status); err != nil {
		t.Fatalf("unmarshal completed verification status response: %v", err)
	}
	if !status.Completed {
		t.Fatalf("expected completed verification status, got %#v", status)
	}
}

func TestAuthVerificationRejectsInvalidInputAndWrongToken(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}
	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/register", map[string]string{
		"studentId":            "24v3001",
		"univemailLocalPart":   "24v3001",
		"univemailDomainPart":  "example.ac.jp",
		"name":                 "誤入力 太郎",
		"nameYomi":             "ごにゅうりょく たろう",
		"contactEmail":         "auth-errors@example.com",
		"phoneNumber":          "090-4444-4444",
		"password":             "password123",
		"passwordConfirmation": "password123",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}
	csrf := map[string]string{"X-CSRF-Token": fetchCSRFToken(t, server, cookies)}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/verification/request", map[string]string{
		"type": "",
	}, csrf)
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var invalidRequest models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &invalidRequest); err != nil {
		t.Fatalf("unmarshal request validation response: %v", err)
	}
	if len(invalidRequest.Errors["type"]) == 0 {
		t.Fatalf("expected type validation error, got %#v", invalidRequest.Errors)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/verification/request", map[string]string{
		"type": "email",
	}, csrf)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/auth/verification", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var status authVerificationStatusResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &status); err != nil {
		t.Fatalf("unmarshal verification status response: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/verification/verify", map[string]string{
		"type":   "email",
		"userId": status.UserID,
		"token":  "invalid-token",
	}, csrf)
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var wrongToken models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &wrongToken); err != nil {
		t.Fatalf("unmarshal confirm validation response: %v", err)
	}
	if len(wrongToken.Errors["token"]) == 0 {
		t.Fatalf("expected token validation error, got %#v", wrongToken.Errors)
	}
}

func TestStartRegistrationQueuesVerificationMailWhenSecure(t *testing.T) {
	server := NewServer(testStrictStaffConfig())
	var logs bytes.Buffer
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&logs, nil)))
	t.Cleanup(func() {
		slog.SetDefault(previousLogger)
	})

	staffCookies := map[string]*http.Cookie{}
	loginAsStaff(t, server, staffCookies)
	staffCSRF := map[string]string{"X-CSRF-Token": fetchCSRFToken(t, server, staffCookies)}

	recorder := doJSONRequest(t, server, staffCookies, http.MethodPost, "/v1/auth/register/start", map[string]string{
		"univemailLocalPart": "secure-registration",
	}, staffCSRF)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	authorizeStaff(t, server, staffCookies)
	staffCSRF = map[string]string{"X-CSRF-Token": fetchCSRFToken(t, server, staffCookies)}

	recorder = doJSONRequest(t, server, staffCookies, http.MethodPost, "/v1/staff/verify/confirm", map[string]string{
		"verifyCode": strictStaffVerifyCode,
	}, staffCSRF)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, staffCookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var queuedMails []staffMailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &queuedMails); err != nil {
		t.Fatalf("unmarshal staff mails: %v", err)
	}

	found := false
	for _, queued := range queuedMails {
		if queued.Subject != "【重要】メール認証のお願い" {
			continue
		}
		if !slices.Contains(queued.Recipients, "secure-registration@example.ac.jp") {
			continue
		}
		if !strings.Contains(queued.Body, "/email/verify/univemail/") {
			continue
		}
		found = true
		break
	}
	if !found {
		t.Fatalf("expected queued registration verify mail, got %#v", queuedMails)
	}
	if !strings.Contains(logs.String(), "kind=queued_mail source=registration_verify") {
		t.Fatalf("expected queued mail log in secure mode, got logs=%s", logs.String())
	}
	if !strings.Contains(logs.String(), "subject=[redacted]") || !strings.Contains(logs.String(), "body=[redacted]") || !strings.Contains(logs.String(), "recipientsCount=1") {
		t.Fatalf("expected redacted queued mail log in secure mode, got logs=%s", logs.String())
	}
	if strings.Contains(logs.String(), "secure-registration@example.ac.jp") || strings.Contains(logs.String(), "【重要】メール認証のお願い") || strings.Contains(logs.String(), "/email/verify/univemail/") {
		t.Fatalf("expected secure mode logs to avoid raw queued mail payloads, got logs=%s", logs.String())
	}
}

func TestStartRegistrationLogsVerifyURLWhenInsecure(t *testing.T) {
	server := NewServer(testConfig())
	var logs bytes.Buffer
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&logs, nil)))
	t.Cleanup(func() {
		slog.SetDefault(previousLogger)
	})

	recorder := doJSONRequest(t, server, map[string]*http.Cookie{}, http.MethodPost, "/v1/auth/register/start", map[string]string{
		"univemailLocalPart": "mock-registration",
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response messageResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal start registration response: %v", err)
	}
	if response.Message != "大学メールアドレスに認証URLを送信しました。" {
		t.Fatalf("expected mock delivery mode, got %#v", response)
	}
	if !strings.Contains(logs.String(), "recipient=mock-registration@example.ac.jp") ||
		!strings.Contains(logs.String(), "/email/verify/univemail/") {
		t.Fatalf("expected verify URL to be logged, got logs=%s", logs.String())
	}
}

func TestCompleteRegistrationAutoSendsContactVerificationWhenNeeded(t *testing.T) {
	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}
	var logs bytes.Buffer
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&logs, nil)))
	t.Cleanup(func() {
		slog.SetDefault(previousLogger)
	})

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/register/start", map[string]string{
		"univemailLocalPart": "24v4001",
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	verifyURLMatch := regexp.MustCompile(`verifyURL=([^\s]+)`).FindStringSubmatch(logs.String())
	if len(verifyURLMatch) != 2 {
		t.Fatalf("expected verify URL to be logged, got logs=%s", logs.String())
	}
	verifyURLRaw, err := strconv.Unquote(verifyURLMatch[1])
	if err != nil {
		verifyURLRaw = verifyURLMatch[1]
	}
	verifyURL, err := url.Parse(verifyURLRaw)
	if err != nil {
		t.Fatalf("parse verify url: %v", err)
	}
	pathParts := strings.Split(strings.Trim(verifyURL.Path, "/"), "/")
	if len(pathParts) == 0 {
		t.Fatalf("expected verify url path to contain pending registration id, got %q", verifyURL.Path)
	}
	pendingRegistrationID := pathParts[len(pathParts)-1]
	token := verifyURL.Query().Get("token")
	if token == "" {
		t.Fatalf("expected verify url token, got %q", verifyURL.String())
	}

	recorder = doRawJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/register/verify", map[string]string{
		"pendingRegistrationId": pendingRegistrationID,
		"token":                 token,
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doRawJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/register/complete", map[string]string{
		"pendingRegistrationId": pendingRegistrationID,
		"token":                 token,
		"name":                  "新規 登録",
		"nameYomi":              "しんき とうろく",
		"contactEmail":          "followup@example.com",
		"phoneNumber":           "090-5555-5555",
		"password":              "password123",
		"passwordConfirmation":  "password123",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/auth/verification", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var status authVerificationStatusResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &status); err != nil {
		t.Fatalf("unmarshal verification status response: %v", err)
	}
	if !status.Completed {
		t.Fatalf("expected university email verification to be sufficient for completion, got %#v", status)
	}

	emailItem, found := findVerificationItem(status.Items, "email")
	if !found || emailItem.Verified || emailItem.Address != "followup@example.com" {
		t.Fatalf("expected unverified contact email item, got %#v", status.Items)
	}
	univemailItem, found := findVerificationItem(status.Items, "univemail")
	if !found || !univemailItem.Verified {
		t.Fatalf("expected verified university email item, got %#v", status.Items)
	}
	if !strings.Contains(logs.String(), "kind=participant_verify_url") || !strings.Contains(logs.String(), "recipient=followup@example.com") {
		t.Fatalf("expected auto-sent participant verification url log, got logs=%s", logs.String())
	}
}

func TestAuthVerificationRequestQueuesMailWhenSecure(t *testing.T) {
	t.Parallel()

	cfg := testStrictStaffConfig()
	for index := range cfg.Users {
		if cfg.Users[index].ID != "0195ec00-0058-7000-8000-000000000001" {
			continue
		}
		cfg.Users[index].ContactEmail = "circle-b-contact@example.com"
		cfg.Users[index].IsEmailVerified = false
		cfg.Users[index].IsUnivemailVerified = false
	}
	server := NewServer(cfg)

	participantCookies := map[string]*http.Cookie{}
	recorder := doJSONRequest(t, server, participantCookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0022-7000-8000-000000000001@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}
	participantCSRF := map[string]string{"X-CSRF-Token": fetchCSRFToken(t, server, participantCookies)}

	recorder = doJSONRequest(t, server, participantCookies, http.MethodPost, "/v1/auth/verification/request", map[string]string{
		"type": "email",
	}, participantCSRF)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	staffCookies := map[string]*http.Cookie{}
	loginAsStaff(t, server, staffCookies)
	authorizeStaff(t, server, staffCookies)
	staffCSRF := map[string]string{"X-CSRF-Token": fetchCSRFToken(t, server, staffCookies)}

	recorder = doJSONRequest(t, server, staffCookies, http.MethodPost, "/v1/staff/verify/confirm", map[string]string{
		"verifyCode": strictStaffVerifyCode,
	}, staffCSRF)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, staffCookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var queuedMails []staffMailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &queuedMails); err != nil {
		t.Fatalf("unmarshal staff mails: %v", err)
	}

	found := false
	for _, queued := range queuedMails {
		if queued.Subject != "メール認証のお願い" {
			continue
		}
		if !slices.Contains(queued.Recipients, "circle-b-contact@example.com") {
			continue
		}
		if !strings.Contains(queued.Body, "/email/verify/account/email/") {
			continue
		}
		found = true
		break
	}
	if !found {
		t.Fatalf("expected queued verification url mail, got %#v", queuedMails)
	}
}

func TestListCirclesRequiresAuthentication(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/circles", nil)
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnauthorized, recorder.Code, recorder.Body.String())
	}
}

func TestListCirclesReturnsOnlySelectableMemberships(t *testing.T) {
	t.Parallel()

	server := NewServer(circleMemberConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0022-7000-8000-000000000001@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/circles", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response []selectableCircleResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal circles response: %v", err)
	}
	if len(response) != 1 || response[0].ID != "0195ec00-0022-7000-8000-000000000001" {
		t.Fatalf("expected only member circle to be selectable, got %#v", response)
	}
}

func TestListParticipationTypesRequiresAuthentication(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/participation-types", nil)
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnauthorized, recorder.Code, recorder.Body.String())
	}
}

func TestCreateCircleReturnsCreated(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/circles", map[string]any{
		"name":                "新規企画",
		"nameYomi":            "しんききかく",
		"groupName":           "新規団体",
		"groupNameYomi":       "しんきだんたい",
		"participationTypeId": "0195ec00-0001-7000-8000-000000000001",
		"notes":               "",
		"details":             map[string]any{},
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/circles", map[string]any{
		"name":                "よみなし企画",
		"nameYomi":            "",
		"groupName":           "新規団体",
		"groupNameYomi":       "しんきだんたい",
		"participationTypeId": "0195ec00-0001-7000-8000-000000000001",
		"notes":               "",
		"details":             map[string]any{},
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal validation response: %v", err)
	}
	if len(response.Errors["nameYomi"]) == 0 {
		t.Fatalf("expected nameYomi validation error, got %#v", response.Errors)
	}
}

func TestCreateCircleReturnsForbiddenForMemberOnlyUser(t *testing.T) {
	t.Parallel()

	server := NewServer(memberOnlyConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "member-only@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/circles", map[string]any{
		"name":                "新規企画",
		"nameYomi":            "しんききかく",
		"groupName":           "新規団体",
		"groupNameYomi":       "しんきだんたい",
		"participationTypeId": "0195ec00-0001-7000-8000-000000000001",
		"notes":               "",
		"details":             map[string]any{},
	})
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusForbidden, recorder.Code, recorder.Body.String())
	}
}

func TestBootstrapReturnsCanCreateCircleRegistrationFalseForMemberOnlyUser(t *testing.T) {
	t.Parallel()

	server := NewServer(memberOnlyConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "member-only@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/session/bootstrap", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response sessionBootstrapResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal bootstrap response: %v", err)
	}
	if response.User == nil {
		t.Fatal("expected authenticated user")
	}
	if response.User.CanCreateCircleRegistration {
		t.Fatal("expected member-only user to be blocked from creating a new circle")
	}
}

func TestListParticipationTypesReturnsOnlyOpenPublicItems(t *testing.T) {
	t.Parallel()

	now := testNowUTC()
	openWindowStart := formatRFC3339(now, -24*time.Hour)
	openWindowEnd := formatRFC3339(now, 24*time.Hour)
	closedWindowStart := formatRFC3339(now, -72*time.Hour)
	closedWindowEnd := formatRFC3339(now, -48*time.Hour)

	cfg := testConfig()
	cfg.ParticipationTypes = append(cfg.ParticipationTypes,
		config.ParticipationType{
			ID:            "0195ec00-0003-7000-8000-000000000001",
			Name:          "非公開企画",
			Description:   "非公開フォームに紐づく参加種別",
			UsersCountMin: 1,
			UsersCountMax: 2,
			Tags:          []string{"限定"},
			FormID:        "0195ec00-0016-7000-8000-000000000001",
		},
		config.ParticipationType{
			ID:            "0195ec00-0004-7000-8000-000000000001",
			Name:          "締切済み企画",
			Description:   "締切済みフォームに紐づく参加種別",
			UsersCountMin: 1,
			UsersCountMax: 3,
			Tags:          []string{"締切"},
			FormID:        "0195ec00-0017-7000-8000-000000000001",
		},
	)
	cfg.Forms = append(cfg.Forms,
		config.Form{
			ID:                  "0195ec00-0016-7000-8000-000000000001",
			CircleID:            "",
			Name:                "企画参加登録",
			Description:         "非公開の参加登録フォームです。",
			IsPublic:            false,
			IsOpen:              true,
			OpenAt:              openWindowStart,
			CloseAt:             openWindowEnd,
			CreatedAt:           openWindowStart,
			UpdatedAt:           openWindowStart,
			MaxAnswers:          1,
			AnswerableTags:      []string{},
			ConfirmationMessage: "",
		},
		config.Form{
			ID:                  "0195ec00-0017-7000-8000-000000000001",
			CircleID:            "",
			Name:                "企画参加登録",
			Description:         "締切済みの参加登録フォームです。",
			IsPublic:            true,
			IsOpen:              false,
			OpenAt:              closedWindowStart,
			CloseAt:             closedWindowEnd,
			CreatedAt:           closedWindowStart,
			UpdatedAt:           closedWindowStart,
			MaxAnswers:          1,
			AnswerableTags:      []string{},
			ConfirmationMessage: "",
		},
	)

	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/participation-types", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response []participationTypeResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal participation types response: %v", err)
	}

	if len(response) != 2 {
		t.Fatalf("expected 2 public open participation types, got %#v", response)
	}
	if response[0].ID != "0195ec00-0002-7000-8000-000000000001" || response[1].ID != "0195ec00-0001-7000-8000-000000000001" {
		t.Fatalf("expected sorted public participation types, got %#v", response)
	}
	if !response[0].Form.IsPublic || !response[0].Form.IsOpen {
		t.Fatalf("expected public open form metadata, got %#v", response[0].Form)
	}
}

func TestGetPublicHomeReturnsGuestContent(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/public/home", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response publicHomeResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal public home response: %v", err)
	}

	if response.AppName != "PortalDots" || response.PortalContactEmail != "contact@example.com" {
		t.Fatalf("unexpected portal settings: %#v", response)
	}
	if len(response.LoginMethods) != 3 {
		t.Fatalf("expected 3 login methods, got %#v", response.LoginMethods)
	}
	if len(response.PinnedPages) != 1 || response.PinnedPages[0].ID != "0195ec00-0032-7000-8000-000000000001" {
		t.Fatalf("expected pinned public page in default fixtures, got %#v", response.PinnedPages)
	}
	if len(response.ParticipationTypes) != 2 {
		t.Fatalf("expected 2 public participation types, got %#v", response.ParticipationTypes)
	}
	if len(response.Pages) != 0 {
		t.Fatalf("expected guest home to hide limited notices, got %#v", response.Pages)
	}
	if len(response.Documents) != 2 || response.Documents[0].ID != "0195ec00-0042-7000-8000-000000000001" {
		t.Fatalf("expected public documents sorted desc, got %#v", response.Documents)
	}
	if response.Documents[0].DownloadURL != "/v1/public/documents/0195ec00-0042-7000-8000-000000000001" {
		t.Fatalf("unexpected public download url: %#v", response.Documents[0])
	}
}

func TestGetPublicHomeReturnsCurrentCircleLimitedContent(t *testing.T) {
	t.Parallel()

	cfg := demoCircleConfig()
	cfg.Pages = append(cfg.Pages, config.Page{
		ID:           "0195ec00-0036-7000-8000-000000000001",
		Title:        "展示向け固定連絡",
		Body:         "展示企画だけに見せる固定表示です。",
		Notes:        "",
		IsPinned:     true,
		IsPublic:     true,
		ViewableTags: []string{"展示"},
		DocumentIDs:  []string{},
		CreatedAt:    "2026-03-05T09:00:00Z",
		UpdatedAt:    "2026-03-05T09:00:00Z",
	})
	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/public/home", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response publicHomeResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal public home response: %v", err)
	}

	if len(response.PinnedPages) != 2 {
		t.Fatalf("expected guest pinned page plus limited pinned page, got %#v", response.PinnedPages)
	}
	if response.PinnedPages[0].ID != "0195ec00-0036-7000-8000-000000000001" || !response.PinnedPages[0].IsLimited {
		t.Fatalf("expected limited pinned page first, got %#v", response.PinnedPages)
	}
	if len(response.Pages) != 1 {
		t.Fatalf("expected one visible limited page for selected circle, got %#v", response.Pages)
	}
	if response.Pages[0].ID != "0195ec00-0034-7000-8000-000000000001" || !response.Pages[0].IsLimited {
		t.Fatalf("expected limited page to appear on authenticated home, got %#v", response.Pages[0])
	}
}

func TestListPublicPagesReturnsGuestPageCollection(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/public/pages", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response models.PaginatedResponse[pageSummaryResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal public pages response: %v", err)
	}

	if len(response.Items) != 0 || response.Total != 0 {
		t.Fatalf("expected guest public pages to be empty, got %#v", response)
	}
	if response.Page != 1 || response.PageSize != 10 {
		t.Fatalf("unexpected public pages pagination: %#v", response)
	}
}

func TestGetPublicPageReturnsGuestPageDetail(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/public/pages/0195ec00-0031-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNotFound, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/public/pages/0195ec00-0032-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNotFound, recorder.Code, recorder.Body.String())
	}
}

func TestListPublicDocumentsReturnsGuestDocumentCollection(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/public/documents", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response []publicHomeDocumentResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal public documents response: %v", err)
	}

	if len(response) != 2 || response[0].ID != "0195ec00-0042-7000-8000-000000000001" {
		t.Fatalf("expected public documents sorted desc, got %#v", response)
	}
}

func TestGetPublicDocumentDownloadsGuestFile(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/public/documents/0195ec00-0041-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if recorder.Body.String() != "Aブロックの搬入は 9:00 から 9:30 です。" {
		t.Fatalf("unexpected public document body: %s", recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/public/documents/0195ec00-0043-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNotFound, recorder.Code, recorder.Body.String())
	}
}

func TestSetCurrentCircleUpdatesBootstrap(t *testing.T) {
	t.Parallel()

	server := NewServer(demoCircleConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0022-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/session/bootstrap", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response sessionBootstrapResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal bootstrap response: %v", err)
	}
	if response.CurrentCircle == nil {
		t.Fatal("expected current circle to be set")
	}
	if response.CurrentCircle.ID != "0195ec00-0022-7000-8000-000000000001" {
		t.Fatalf("expected selected circle 0195ec00-0022-7000-8000-000000000001, got %s", response.CurrentCircle.ID)
	}
	if !response.User.CanCreateCircleRegistration {
		t.Fatal("expected selected demo user to still be allowed to create a new circle")
	}
}

func TestSetCurrentCircleRejectsUnselectableCircle(t *testing.T) {
	t.Parallel()

	server := NewServer(circleMemberConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0022-7000-8000-000000000001@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0021-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNotFound, recorder.Code, recorder.Body.String())
	}
}

func TestAddCurrentCircleMemberReturnsForbidden(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	cfg.AuthUser = circleMemberConfig().AuthUser
	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0022-7000-8000-000000000001@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/circles/current/members", map[string]string{
		"loginId": "demo@example.com",
	})
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusForbidden, recorder.Code, recorder.Body.String())
	}
}

func TestAddCurrentCircleMemberRejectsUnknownLoginID(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	cfg.AuthUser = config.AuthUser{
		ID:          "0195ec00-0057-7000-8000-000000000001",
		LoginIDs:    []string{"0195ec00-0021-7000-8000-000000000001@example.com"},
		DisplayName: "Circle A Member",
		Password:    "password",
		Roles:       []string{"participant"},
	}
	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0021-7000-8000-000000000001@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0021-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/circles/current/members", map[string]string{
		"loginId": "missing-user",
	})
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusForbidden, recorder.Code, recorder.Body.String())
	}
}

func TestAddCurrentCircleMemberAcceptsContactEmail(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	cfg.Users = append(cfg.Users, config.User{
		ID:           "0195ec00-0091-7000-8000-000000000001",
		LoginIDs:     []string{"24c0001"},
		DisplayName:  "Contact Email Member",
		ContactEmail: "contact-add@example.com",
		Password:     "password",
		Roles:        []string{"participant"},
		IsVerified:   true,
	})
	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0021-7000-8000-000000000001@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	selectCircle(t, server, cookies, "0195ec00-0021-7000-8000-000000000001")

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/circles/current/members", map[string]string{
		"loginId": "contact-add@example.com",
	})
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusForbidden, recorder.Code, recorder.Body.String())
	}
}

func TestAddCurrentCircleMemberRejectsUnverifiedUser(t *testing.T) {
	t.Parallel()

	server := NewServer(circleMemberConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0022-7000-8000-000000000001@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0022-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/circles/current/members", map[string]string{
		"loginId": "0195ec00-0022-7000-8000-000000000001-unverified@example.com",
	})
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusForbidden, recorder.Code, recorder.Body.String())
	}
}

func TestRegenerateInvitationTokenAfterSubmitReturnsOK(t *testing.T) {
	t.Parallel()

	server := NewServer(circleMemberConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0022-7000-8000-000000000001@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/circles/current/detail", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail circleDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal detail response: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/circles/current/submit", map[string]string{
		"lastUpdatedAt": detail.LastUpdatedAt,
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/circles/current/invitation-token/regenerate", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
}

func TestSubmitCurrentCircleQueuesNotificationMail(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0022-7000-8000-000000000001@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/circles/current/detail", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail circleDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal detail response: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/circles/current/submit", map[string]string{
		"lastUpdatedAt": detail.LastUpdatedAt,
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var queuedMails []staffMailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &queuedMails); err != nil {
		t.Fatalf("unmarshal staff mails: %v", err)
	}
	if len(queuedMails) != 1 {
		t.Fatalf("expected one queued mail, got %#v", queuedMails)
	}
	if queuedMails[0].Subject != "【参加登録】「デモ企画B」の参加登録を提出しました" {
		t.Fatalf("unexpected queued mail subject: %#v", queuedMails[0])
	}
}

func TestJoinCircleByTokenAfterSubmitReturnsOK(t *testing.T) {
	t.Parallel()

	server := NewServer(circleMemberConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0021-7000-8000-000000000001@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/circles/join/0195ec00-0022-7000-8000-000000000001-invite-token", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/circles/join/0195ec00-0022-7000-8000-000000000001-invite-token", nil)
	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusConflict, recorder.Code, recorder.Body.String())
	}
}

func TestListPagesReturnsPublicPagesAcrossCircles(t *testing.T) {
	t.Parallel()

	cfg := demoCircleConfig()
	cfg.Pages = append(cfg.Pages, config.Page{
		ID:           "0195ec00-0033-7000-8000-000000000001",
		Title:        "展示向け共通連絡",
		Body:         "展示企画全体への連絡です。",
		Notes:        "",
		IsPinned:     false,
		IsPublic:     true,
		ViewableTags: []string{"展示"},
		DocumentIDs:  []string{},
		CreatedAt:    "2026-03-06T09:00:00Z",
		UpdatedAt:    "2026-03-06T09:00:00Z",
	})
	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0022-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/pages", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response models.PaginatedResponse[pageSummaryResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal pages response: %v", err)
	}

	if len(response.Items) != 2 {
		t.Fatalf("expected 2 visible pages for selected circle tags, got %#v", response)
	}
	if response.Items[0].ID != "0195ec00-0033-7000-8000-000000000001" || response.Items[1].ID != "0195ec00-0034-7000-8000-000000000001" {
		t.Fatalf("expected public pages sorted desc, got %#v", response)
	}
	if !response.Items[0].IsLimited || !response.Items[0].IsUnread {
		t.Fatalf("expected limited unread page metadata, got %#v", response.Items[0])
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/pages?query=レイアウト", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal searched pages response: %v", err)
	}
	if len(response.Items) != 1 || response.Items[0].ID != "0195ec00-0034-7000-8000-000000000001" {
		t.Fatalf("unexpected search result: %#v", response)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/pages?query=存在しない語", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal empty search response: %v", err)
	}
	if len(response.Items) != 0 || response.Total != 0 {
		t.Fatalf("expected no search result, got %#v", response)
	}
}

func TestListPagesUsesParticipationTypeTagsWhenCircleTagsAreEmpty(t *testing.T) {
	t.Parallel()

	cfg := demoCircleConfig()
	for index := range cfg.Circles {
		if cfg.Circles[index].ID == "0195ec00-0022-7000-8000-000000000001" {
			cfg.Circles[index].Tags = []string{}
		}
	}

	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/pages", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response models.PaginatedResponse[pageSummaryResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal pages response: %v", err)
	}

	if len(response.Items) != 1 {
		t.Fatalf("expected 1 visible page from participation type tags, got %#v", response)
	}
	if response.Items[0].ID != "0195ec00-0034-7000-8000-000000000001" {
		t.Fatalf("unexpected page visibility from participation type tags: %#v", response)
	}
}

func TestGetPageReturnsPublicPageAcrossCircles(t *testing.T) {
	t.Parallel()

	server := NewServer(demoCircleConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0021-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/pages/0195ec00-0031-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail pageDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal page detail: %v", err)
	}
	if detail.Title != "搬入時間のお知らせ" {
		t.Fatalf("unexpected title: %s", detail.Title)
	}
	if detail.IsLimited != true {
		t.Fatalf("expected limited detail metadata, got %#v", detail)
	}
	if len(detail.Documents) != 1 || detail.Documents[0].ID != "0195ec00-0041-7000-8000-000000000001" {
		t.Fatalf("unexpected page documents: %#v", detail.Documents)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/pages/0195ec00-0032-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNotFound, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/pages/0195ec00-0034-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNotFound, recorder.Code, recorder.Body.String())
	}
}

func TestGetPageAllowsVisiblePageAcrossCirclesByTags(t *testing.T) {
	t.Parallel()

	cfg := demoCircleConfig()
	cfg.Pages = append(cfg.Pages, config.Page{
		ID:           "0195ec00-0033-7000-8000-000000000001",
		Title:        "展示向け共通連絡",
		Body:         "展示企画全体への連絡です。",
		Notes:        "",
		IsPinned:     false,
		IsPublic:     true,
		ViewableTags: []string{"展示"},
		DocumentIDs:  []string{"0195ec00-0041-7000-8000-000000000001"},
		CreatedAt:    "2026-03-06T09:00:00Z",
		UpdatedAt:    "2026-03-06T09:00:00Z",
	})
	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0022-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/pages/0195ec00-0033-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail pageDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal page detail: %v", err)
	}
	if detail.ID != "0195ec00-0033-7000-8000-000000000001" || detail.Title != "展示向け共通連絡" {
		t.Fatalf("unexpected cross-circle page detail: %#v", detail)
	}
	if len(detail.Documents) != 1 || detail.Documents[0].ID != "0195ec00-0041-7000-8000-000000000001" {
		t.Fatalf("unexpected cross-circle page documents: %#v", detail.Documents)
	}
}

func TestListDocumentsReturnsPublicAcrossCircles(t *testing.T) {
	t.Parallel()

	server := NewServer(demoCircleConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0022-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/documents", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response models.PaginatedResponse[documentSummaryResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal documents response: %v", err)
	}

	if len(response.Items) != 2 {
		t.Fatalf("expected 2 visible public documents, got %d", len(response.Items))
	}
	if response.Page != 1 || response.PageSize != 10 || response.Total != 2 {
		t.Fatalf("unexpected documents pagination: %#v", response)
	}
	if response.Items[0].ID != "0195ec00-0042-7000-8000-000000000001" {
		t.Fatalf("expected first document to be latest public doc, got %s", response.Items[0].ID)
	}
	if response.Items[1].ID != "0195ec00-0041-7000-8000-000000000001" {
		t.Fatalf("expected second document to include cross-circle doc, got %s", response.Items[1].ID)
	}
	if !response.Items[0].IsImportant || response.Items[0].Extension != "TXT" || response.Items[0].SizeBytes == 0 {
		t.Fatalf("unexpected document summary metadata: %#v", response.Items[0])
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/documents?page=9&pageSize=1", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal paginated documents response: %v", err)
	}
	if response.Page != 2 || len(response.Items) != 1 || response.Items[0].ID != "0195ec00-0041-7000-8000-000000000001" {
		t.Fatalf("expected documents pagination to clamp to last page, got %#v", response)
	}
}

func TestDocumentsEndpointsRequireAuthAndCurrentCircle(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/documents", nil)
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnauthorized, recorder.Code, recorder.Body.String())
	}
	var unauth map[string]string
	if err := json.Unmarshal(recorder.Body.Bytes(), &unauth); err != nil {
		t.Fatalf("unmarshal unauthenticated response: %v", err)
	}
	if unauth["message"] != "unauthenticated" {
		t.Fatalf("unexpected unauthenticated message: %#v", unauth)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/documents", nil)
	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusConflict, recorder.Code, recorder.Body.String())
	}
	var conflict map[string]string
	if err := json.Unmarshal(recorder.Body.Bytes(), &conflict); err != nil {
		t.Fatalf("unmarshal current-circle-required response: %v", err)
	}
	if conflict["message"] != "current_circle_required" {
		t.Fatalf("unexpected current-circle-required message: %#v", conflict)
	}
}

func TestDownloadDocumentFileRequiresVisiblePublicDocument(t *testing.T) {
	t.Parallel()

	server := NewServer(demoCircleConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0021-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/documents", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detailPage models.PaginatedResponse[documentSummaryResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &detailPage); err != nil {
		t.Fatalf("unmarshal document list for download url: %v", err)
	}
	if len(detailPage.Items) != 2 || detailPage.Items[1].DownloadURL != "/v1/documents/0195ec00-0041-7000-8000-000000000001" {
		t.Fatalf("unexpected document list metadata: %#v", detailPage)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/documents/0195ec00-0041-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if recorder.Body.String() != "Aブロックの搬入は 9:00 から 9:30 です。" {
		t.Fatalf("unexpected file content: %s", recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/documents/0195ec00-0043-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNotFound, recorder.Code, recorder.Body.String())
	}
}

func TestStaffDocumentUploadAndDownloadUseCurrentCircle(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "staff@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0022-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	authorizeStaff(t, server, cookies)

	recorder = doMultipartRequest(
		t,
		server,
		cookies,
		http.MethodPost,
		"/v1/staff/documents",
		"file",
		"0195ec00-0022-7000-8000-000000000001-guide.pdf",
		[]byte("%PDF-1.4 demo"),
		"application/pdf",
		map[string]string{
			"circleId":    "0195ec00-0022-7000-8000-000000000001",
			"name":        "設営ガイド",
			"description": "当日の設営手順です。",
			"notes":       "責任者に共有してください。",
			"isPublic":    "true",
			"isImportant": "true",
		},
	)
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var created staffDocumentSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal staff document: %v", err)
	}
	if created.Name != "設営ガイド" || created.Description != "当日の設営手順です。" || !created.IsImportant {
		t.Fatalf("unexpected created document: %#v", created)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/documents/"+created.ID+"/edit", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail staffDocumentDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal staff document detail: %v", err)
	}
	if detail.Notes != "責任者に共有してください。" {
		t.Fatalf("unexpected staff document detail: %#v", detail)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/documents", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var staffDocuments []staffDocumentSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &staffDocuments); err != nil {
		t.Fatalf("unmarshal staff documents: %v", err)
	}
	if len(staffDocuments) != 4 {
		t.Fatalf("expected 4 managed staff documents, got %#v", staffDocuments)
	}

	recorder = doMultipartRequest(
		t,
		server,
		cookies,
		http.MethodPut,
		"/v1/staff/documents/"+created.ID,
		"file",
		"0195ec00-0022-7000-8000-000000000001-guide-v2.pdf",
		[]byte("%PDF-1.4 revised"),
		"application/pdf",
		map[string]string{
			"name":        "設営ガイド改訂版",
			"description": "更新版の設営手順です。",
			"notes":       "最新版のみ配布してください。",
			"isPublic":    "false",
			"isImportant": "false",
		},
	)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var updated staffDocumentSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &updated); err != nil {
		t.Fatalf("unmarshal updated staff document: %v", err)
	}
	if updated.Name != "設営ガイド改訂版" || updated.IsPublic || updated.IsImportant {
		t.Fatalf("unexpected updated document: %#v", updated)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, created.DownloadURL, nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if !bytes.Equal(recorder.Body.Bytes(), []byte("%PDF-1.4 revised")) {
		t.Fatalf("unexpected uploaded content: %q", recorder.Body.Bytes())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/documents/export", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "設営ガイド改訂版") || !strings.Contains(recorder.Body.String(), "size_bytes") {
		t.Fatalf("unexpected document export: %s", recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/documents", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var publicDocuments models.PaginatedResponse[documentSummaryResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &publicDocuments); err != nil {
		t.Fatalf("unmarshal public documents: %v", err)
	}
	if len(publicDocuments.Items) != 2 {
		t.Fatalf("expected uploaded public document to be visible, got %#v", publicDocuments)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/documents/"+created.ID, nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/documents/"+created.ID, nil)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNotFound, recorder.Code, recorder.Body.String())
	}
}

func TestStaffMasterDataCRUD(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "staff@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0022-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	authorizeStaff(t, server, cookies)

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/tags", map[string]string{"name": "新規タグ"})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var createdTag staffTagResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &createdTag); err != nil {
		t.Fatalf("unmarshal created tag: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/tags/"+createdTag.ID, map[string]string{"name": "更新タグ"})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/tags", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/places", map[string]any{
		"name":  "講堂",
		"type":  3,
		"notes": "特殊場所",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var createdPlace staffPlaceResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &createdPlace); err != nil {
		t.Fatalf("unmarshal created place: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/places/"+createdPlace.ID, map[string]any{
		"name":  "更新講堂",
		"type":  1,
		"notes": "更新済み",
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/contact-categories", map[string]string{
		"name":  "新規窓口",
		"email": "desk@example.com",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var createdCategory staffContactCategoryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &createdCategory); err != nil {
		t.Fatalf("unmarshal created category: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/contact-categories/"+createdCategory.ID, map[string]string{
		"name":  "更新窓口",
		"email": "updated@example.com",
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var queuedMails []staffMailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &queuedMails); err != nil {
		t.Fatalf("unmarshal staff mails: %v", err)
	}
	hasCreatedCategoryMail := false
	hasUpdatedCategoryMail := false
	for _, queued := range queuedMails {
		if queued.Subject != "お問い合わせ先に設定されました" {
			continue
		}
		if slices.Equal(queued.Recipients, []string{"desk@example.com"}) {
			hasCreatedCategoryMail = true
		}
		if slices.Equal(queued.Recipients, []string{"updated@example.com"}) {
			hasUpdatedCategoryMail = true
		}
	}
	if !hasCreatedCategoryMail || !hasUpdatedCategoryMail {
		t.Fatalf("expected queued category assignment mails for create/update, got %#v", queuedMails)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/tags/"+createdTag.ID, nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/places/"+createdPlace.ID, nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/places/export", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/contact-categories/"+createdCategory.ID, nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}
}

func TestListFormsUsesCurrentCircleTagsAndClosedVisibility(t *testing.T) {
	t.Parallel()

	server := NewServer(demoCircleConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0022-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/forms", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response []formSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal forms response: %v", err)
	}

	if len(response) != 2 {
		t.Fatalf("expected 2 accessible forms for 0195ec00-0022-7000-8000-000000000001, got %d", len(response))
	}
	if response[0].ID != "0195ec00-0010-7000-8000-000000000001" {
		t.Fatalf("expected closed form to be first, got %s", response[0].ID)
	}
	if response[1].ID != "0195ec00-0014-7000-8000-000000000001" {
		t.Fatalf("unexpected visible forms order: %#v", response)
	}
	if !slices.Equal(response[1].AnswerableTags, []string{"展示"}) {
		t.Fatalf("expected answerable tags to be returned, got %#v", response[1].AnswerableTags)
	}
	if response[1].ConfirmationMessage != "展示チェックフォームへの回答を受け付けました。" {
		t.Fatalf("unexpected confirmation message: %#v", response[1])
	}
}

func TestListFormsUsesParticipationTypeTagsWhenCircleTagsAreEmpty(t *testing.T) {
	t.Parallel()

	cfg := demoCircleConfig()
	for index := range cfg.Circles {
		if cfg.Circles[index].ID == "0195ec00-0022-7000-8000-000000000001" {
			cfg.Circles[index].Tags = []string{}
		}
	}

	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/forms", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response []formSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal forms response: %v", err)
	}

	if len(response) != 2 {
		t.Fatalf("expected 2 accessible forms from participation type tags, got %#v", response)
	}
	if !slices.Equal(response[1].AnswerableTags, []string{"展示"}) {
		t.Fatalf("expected limited form to remain visible, got %#v", response[1])
	}
}

func TestGetFormScopesToCurrentCircle(t *testing.T) {
	t.Parallel()

	server := NewServer(demoCircleConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0021-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/forms/0195ec00-0013-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail formDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal form detail: %v", err)
	}
	if detail.Name != "搬入確認フォーム" {
		t.Fatalf("unexpected form name: %s", detail.Name)
	}
	if len(detail.AnswerableTags) != 0 || detail.ConfirmationMessage != "搬入確認フォームへの回答ありがとうございました。" {
		t.Fatalf("unexpected form detail metadata: %#v", detail)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/forms/0195ec00-0010-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNotFound, recorder.Code, recorder.Body.String())
	}
}

func TestListAndGetFormsIncludeGlobalAccessibleForm(t *testing.T) {
	t.Parallel()

	cfg := demoCircleConfig()
	cfg.Forms = append(cfg.Forms, config.Form{
		ID:                  "0195ec00-0016-7000-8000-000000000001",
		CircleID:            "",
		Name:                "全体向け搬入申請",
		Description:         "全企画向けの搬入申請です。",
		IsPublic:            true,
		IsOpen:              true,
		OpenAt:              "2026-03-05T00:00:00Z",
		CloseAt:             "2026-04-30T23:59:59Z",
		CreatedAt:           "2026-03-05T00:00:00Z",
		UpdatedAt:           "2026-03-05T00:00:00Z",
		MaxAnswers:          1,
		AnswerableTags:      []string{},
		ConfirmationMessage: "全体向け搬入申請への回答ありがとうございました。",
	})

	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/forms", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response []formSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal forms response: %v", err)
	}
	if len(response) != 3 {
		t.Fatalf("expected 3 accessible forms including global form, got %#v", response)
	}
	if !slices.ContainsFunc(response, func(form formSummaryResponse) bool {
		return form.ID == "0195ec00-0016-7000-8000-000000000001" && form.Name == "全体向け搬入申請"
	}) {
		t.Fatalf("expected global form to be listed, got %#v", response)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/forms/0195ec00-0016-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail formDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal global form detail: %v", err)
	}
	if detail.Name != "全体向け搬入申請" || detail.ConfirmationMessage != "全体向け搬入申請への回答ありがとうございました。" {
		t.Fatalf("unexpected global form detail: %#v", detail)
	}
}

func TestClosedFormAnswerMutationsRemainBlocked(t *testing.T) {
	t.Parallel()

	server := NewServer(demoCircleConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0021-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/forms/0195ec00-0010-7000-8000-000000000001/answer", map[string]string{
		"body": "締切後の更新",
	})
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNotFound, recorder.Code, recorder.Body.String())
	}
}

func TestFormAnswerMutationsBlockedWhenCircleNotApproved(t *testing.T) {
	t.Parallel()

	cfg := demoCircleConfig()
	for index := range cfg.Circles {
		if cfg.Circles[index].ID == "0195ec00-0022-7000-8000-000000000001" {
			cfg.Circles[index].Status = "pending"
		}
	}

	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0022-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/forms/0195ec00-0014-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail formDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal form detail: %v", err)
	}
	if detail.CurrentCircleStatus != "pending" {
		t.Fatalf("expected pending circle status, got %#v", detail)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/forms/0195ec00-0014-7000-8000-000000000001/answers", nil)
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var validation models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &validation); err != nil {
		t.Fatalf("unmarshal create validation response: %v", err)
	}
	if len(validation.Errors["circle"]) == 0 {
		t.Fatalf("expected circle validation error, got %#v", validation.Errors)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/forms/0195ec00-0014-7000-8000-000000000001/answer", map[string]string{
		"body": "展示位置は正面入口側を希望します。",
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	if err := json.Unmarshal(recorder.Body.Bytes(), &validation); err != nil {
		t.Fatalf("unmarshal update validation response: %v", err)
	}
	if len(validation.Errors["circle"]) == 0 {
		t.Fatalf("expected circle validation error on update, got %#v", validation.Errors)
	}

	recorder = doMultipartRequest(
		t,
		server,
		cookies,
		http.MethodPost,
		"/v1/forms/0195ec00-0014-7000-8000-000000000001/answer/uploads",
		"file",
		"layout.txt",
		[]byte("layout content"),
		"text/plain",
		nil,
	)
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	if err := json.Unmarshal(recorder.Body.Bytes(), &validation); err != nil {
		t.Fatalf("unmarshal upload validation response: %v", err)
	}
	if len(validation.Errors["circle"]) == 0 {
		t.Fatalf("expected circle validation error on upload, got %#v", validation.Errors)
	}
}

func TestGetAndUpsertFormAnswerUsesCurrentCircle(t *testing.T) {
	t.Parallel()

	server := NewServer(demoCircleConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0022-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/forms/0195ec00-0014-7000-8000-000000000001/answer", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var emptyResponse formAnswerEnvelopeResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &emptyResponse); err != nil {
		t.Fatalf("unmarshal empty answer response: %v", err)
	}
	if emptyResponse.Answer != nil {
		t.Fatalf("expected no answer, got %#v", emptyResponse.Answer)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/forms/0195ec00-0014-7000-8000-000000000001/answer", map[string]string{
		"body": "展示位置は正面入口側を希望します。",
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var savedResponse formAnswerEnvelopeResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &savedResponse); err != nil {
		t.Fatalf("unmarshal saved answer response: %v", err)
	}
	if savedResponse.Answer == nil || savedResponse.Answer.Body != "展示位置は正面入口側を希望します。" {
		t.Fatalf("unexpected saved answer: %#v", savedResponse.Answer)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/forms/0195ec00-0014-7000-8000-000000000001/answer", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var fetchedResponse formAnswerEnvelopeResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &fetchedResponse); err != nil {
		t.Fatalf("unmarshal fetched answer response: %v", err)
	}
	if fetchedResponse.Answer == nil || fetchedResponse.Answer.ID == "" {
		t.Fatalf("expected persisted answer, got %#v", fetchedResponse.Answer)
	}
}

func TestUpsertFormAnswerQueuesNotificationMail(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	participantCookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, participantCookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0022-7000-8000-000000000001@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	selectCircle(t, server, participantCookies, "0195ec00-0022-7000-8000-000000000001")

	recorder = doJSONRequest(t, server, participantCookies, http.MethodPut, "/v1/forms/0195ec00-0014-7000-8000-000000000001/answer", map[string]string{
		"body": "展示位置は正面入口側を希望します。",
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	staffCookies := map[string]*http.Cookie{}
	loginAsStaff(t, server, staffCookies)
	authorizeStaff(t, server, staffCookies)

	recorder = doJSONRequest(t, server, staffCookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var queuedMails []staffMailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &queuedMails); err != nil {
		t.Fatalf("unmarshal staff mails: %v", err)
	}

	found := false
	for _, queued := range queuedMails {
		if !strings.Contains(queued.Subject, "を承りました") {
			continue
		}
		if !strings.Contains(queued.Body, "展示位置は正面入口側を希望します。") {
			continue
		}
		if !slices.Contains(queued.Recipients, "0195ec00-0022-7000-8000-000000000001@example.com") {
			continue
		}
		found = true
		break
	}
	if !found {
		t.Fatalf("expected queued form answer notification mail, got %#v", queuedMails)
	}
}

func TestUploadAndDownloadFormAnswerFile(t *testing.T) {
	t.Parallel()

	server := NewServer(demoCircleConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0022-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doMultipartRequest(t, server, cookies, http.MethodPost, "/v1/forms/0195ec00-0014-7000-8000-000000000001/answer/uploads", "file", "layout.txt", []byte("layout content"), "text/plain", nil)
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var upload formAnswerUploadResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &upload); err != nil {
		t.Fatalf("unmarshal upload response: %v", err)
	}
	if upload.ID == "" || upload.Filename != "layout.txt" {
		t.Fatalf("unexpected upload response: %#v", upload)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/forms/0195ec00-0014-7000-8000-000000000001/answer", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var answerEnvelope formAnswerEnvelopeResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &answerEnvelope); err != nil {
		t.Fatalf("unmarshal answer envelope: %v", err)
	}
	if answerEnvelope.Answer == nil || len(answerEnvelope.Answer.Uploads) != 1 {
		t.Fatalf("expected upload to be attached, got %#v", answerEnvelope.Answer)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/forms/0195ec00-0014-7000-8000-000000000001/answer/uploads/"+upload.ID+"/file", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if recorder.Body.String() != "layout content" {
		t.Fatalf("unexpected downloaded content: %q", recorder.Body.String())
	}
}

func TestUpsertFormAnswerRejectsBlankBody(t *testing.T) {
	t.Parallel()

	server := NewServer(demoCircleConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0022-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/forms/0195ec00-0014-7000-8000-000000000001/answer", map[string]string{
		"body": "   ",
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal validation response: %v", err)
	}
	if len(response.Errors["body"]) == 0 {
		t.Fatalf("expected body validation error, got %#v", response.Errors)
	}
}

func TestStaffVerificationFlow(t *testing.T) {
	t.Parallel()

	server := NewServer(testStrictStaffConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "staff@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	csrfToken := fetchCSRFToken(t, server, cookies)

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/status", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var initialStatus staffStatusResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &initialStatus); err != nil {
		t.Fatalf("unmarshal staff status: %v", err)
	}
	if !initialStatus.Allowed || initialStatus.Authorized {
		t.Fatalf("unexpected initial staff status: %#v", initialStatus)
	}

	csrf := map[string]string{"X-CSRF-Token": csrfToken}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/verify/request", map[string]string{}, csrf)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var requestResponse staffVerifyRequestResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &requestResponse); err != nil {
		t.Fatalf("unmarshal staff verify request response: %v", err)
	}
	if requestResponse.Message != "認証コードを送信しました。" {
		t.Fatalf("unexpected staff verify request response: %#v", requestResponse)
	}
	if requestResponse.VerifyCode != "" {
		t.Fatalf("expected verifyCode to be hidden in strict mode, got %#v", requestResponse)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/verify/confirm", map[string]string{
		"verifyCode": strictStaffVerifyCode,
	}, csrf)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/status", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var verifiedStatus staffStatusResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &verifiedStatus); err != nil {
		t.Fatalf("unmarshal verified staff status: %v", err)
	}
	if !verifiedStatus.Allowed || !verifiedStatus.Authorized {
		t.Fatalf("unexpected verified staff status: %#v", verifiedStatus)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var queuedMails []staffMailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &queuedMails); err != nil {
		t.Fatalf("unmarshal staff mails: %v", err)
	}
	found := false
	for _, queued := range queuedMails {
		if queued.Subject != "スタッフ認証 (認証コード : "+strictStaffVerifyCode+")" {
			continue
		}
		if !slices.Contains(queued.Recipients, "staff@example.com") {
			continue
		}
		found = true
		break
	}
	if !found {
		t.Fatalf("expected queued staff verify mail, got %#v", queuedMails)
	}
}

func TestStaffVerificationRequestReturnsCodeInInsecureMode(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "staff@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	csrf := map[string]string{"X-CSRF-Token": fetchCSRFToken(t, server, cookies)}
	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/verify/request", map[string]string{}, csrf)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response staffVerifyRequestResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal staff verify request response: %v", err)
	}
	if response.Message != "認証コードを送信しました。" {
		t.Fatalf("unexpected staff verify request response: %#v", response)
	}
	if strings.TrimSpace(response.VerifyCode) == "" {
		t.Fatalf("expected verifyCode in insecure mode response, got %#v", response)
	}
}

func TestStaffVerificationRejectsWrongCode(t *testing.T) {
	t.Parallel()

	server := NewServer(testStrictStaffConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "staff@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	csrf := map[string]string{"X-CSRF-Token": fetchCSRFToken(t, server, cookies)}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/verify/request", map[string]string{}, csrf)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/verify/confirm", map[string]string{
		"verifyCode": "999999",
	}, csrf)
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal validation response: %v", err)
	}
	if len(response.Errors["verifyCode"]) == 0 {
		t.Fatalf("expected verifyCode validation error, got %#v", response.Errors)
	}
}

func TestStaffPagesListAndCreateUseCurrentCircle(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "staff@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0022-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	authorizeStaff(t, server, cookies)

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/pages", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var pages []staffPageSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &pages); err != nil {
		t.Fatalf("unmarshal staff pages response: %v", err)
	}
	if len(pages) != 4 {
		t.Fatalf("expected 4 managed staff pages, got %#v", pages)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/pages", map[string]any{
		"title":        "スタッフ向け新着",
		"body":         "設営順の詳細を更新しました。",
		"notes":        "展示担当に周知済みです。",
		"isPinned":     true,
		"isPublic":     true,
		"viewableTags": []string{"展示"},
		"documentIds":  []string{"0195ec00-0042-7000-8000-000000000001"},
		"sendEmails":   true,
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var created staffPageSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal created staff page: %v", err)
	}
	if created.ID == "" || created.Title != "スタッフ向け新着" || !created.IsPublic || !created.IsPinned {
		t.Fatalf("unexpected created staff page: %#v", created)
	}
	if created.CreatedAt == "" || created.UpdatedAt == "" {
		t.Fatalf("expected timestamps to be populated, got %#v", created)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/pages/"+created.ID, nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail staffPageDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal staff page detail: %v", err)
	}
	if detail.Notes != "展示担当に周知済みです。" || len(detail.ViewableTags) != 1 || len(detail.DocumentIDs) != 1 {
		t.Fatalf("unexpected staff page detail: %#v", detail)
	}
	if detail.CreatedAt == "" || detail.UpdatedAt == "" {
		t.Fatalf("expected detail timestamps to be populated, got %#v", detail)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/pages?query=スタッフ向け", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	if err := json.Unmarshal(recorder.Body.Bytes(), &pages); err != nil {
		t.Fatalf("unmarshal searched staff pages response: %v", err)
	}
	if len(pages) != 1 || pages[0].Title != "スタッフ向け新着" {
		t.Fatalf("unexpected searched staff pages: %#v", pages)
	}
}

func TestStaffPageCreateAllowsDocumentsFromDifferentCircle(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/pages", map[string]any{
		"title":        "スタッフ向け新着",
		"body":         "設営順の詳細を更新しました。",
		"notes":        "展示担当に周知済みです。",
		"isPinned":     true,
		"isPublic":     true,
		"viewableTags": []string{"展示"},
		"documentIds":  []string{"0195ec00-0041-7000-8000-000000000001"},
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var response staffPageSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal created response: %v", err)
	}
	if len(response.DocumentIDs) != 1 || response.DocumentIDs[0] != "0195ec00-0041-7000-8000-000000000001" {
		t.Fatalf("expected cross-circle document to be accepted, got %#v", response)
	}
}

func TestStaffPageUpdateAllowsPreservingLegacyDocumentsFromDifferentCircle(t *testing.T) {
	t.Parallel()

	cfg := testStaffConfig()
	for index := range cfg.Pages {
		if cfg.Pages[index].ID != "0195ec00-0035-7000-8000-000000000001" {
			continue
		}
		cfg.Pages[index].DocumentIDs = []string{"0195ec00-0043-7000-8000-000000000001", "0195ec00-0041-7000-8000-000000000001"}
	}

	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/pages/0195ec00-0035-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail staffPageDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal staff page detail: %v", err)
	}
	if !slices.Equal(detail.DocumentIDs, []string{"0195ec00-0043-7000-8000-000000000001", "0195ec00-0041-7000-8000-000000000001"}) {
		t.Fatalf("expected legacy document ids to be returned, got %#v", detail.DocumentIDs)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/pages/0195ec00-0035-7000-8000-000000000001", map[string]any{
		"title":        "既存資料付きお知らせを更新",
		"body":         "本文だけ更新します。",
		"notes":        "legacy documents preserved",
		"isPinned":     false,
		"isPublic":     false,
		"viewableTags": []string{},
		"documentIds":  detail.DocumentIDs,
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var summary staffPageSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &summary); err != nil {
		t.Fatalf("unmarshal updated staff page: %v", err)
	}
	if summary.Title != "既存資料付きお知らせを更新" {
		t.Fatalf("unexpected updated page summary: %#v", summary)
	}
}

func TestStaffPageDetailUpdatePinDeleteAndExport(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/pages/0195ec00-0035-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail staffPageDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal staff page detail: %v", err)
	}
	if detail.ID != "0195ec00-0035-7000-8000-000000000001" || detail.Title != "非公開メモ" || detail.IsPublic {
		t.Fatalf("unexpected staff page detail: %#v", detail)
	}
	originalUpdatedAt := detail.UpdatedAt

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/pages/0195ec00-0035-7000-8000-000000000001", map[string]any{
		"title":        "更新済みのお知らせ",
		"body":         "公開向けの本文に更新しました。",
		"notes":        "更新後メモ",
		"isPinned":     true,
		"isPublic":     true,
		"viewableTags": []string{"展示"},
		"documentIds":  []string{"0195ec00-0042-7000-8000-000000000001"},
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var summary staffPageSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &summary); err != nil {
		t.Fatalf("unmarshal updated staff page: %v", err)
	}
	if summary.Title != "更新済みのお知らせ" || !summary.IsPinned || !summary.IsPublic {
		t.Fatalf("unexpected updated staff page: %#v", summary)
	}
	if summary.UpdatedAt == originalUpdatedAt {
		t.Fatalf("expected content update to refresh updatedAt, got %#v", summary)
	}
	updatedAtAfterEdit := summary.UpdatedAt

	recorder = doJSONRequest(t, server, cookies, http.MethodPatch, "/v1/staff/pages/0195ec00-0035-7000-8000-000000000001/pin", map[string]any{
		"isPinned": false,
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	if err := json.Unmarshal(recorder.Body.Bytes(), &summary); err != nil {
		t.Fatalf("unmarshal patched staff page: %v", err)
	}
	if summary.IsPinned {
		t.Fatalf("expected pin to be removed, got %#v", summary)
	}
	if summary.UpdatedAt != updatedAtAfterEdit {
		t.Fatalf("expected pin toggle not to refresh updatedAt, got %#v", summary)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/pages/export.csv", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if got := recorder.Header().Get("Content-Type"); got != "text/csv; charset=utf-8" {
		t.Fatalf("unexpected content type: %s", got)
	}

	rows, err := csv.NewReader(bytes.NewReader(recorder.Body.Bytes())).ReadAll()
	if err != nil {
		t.Fatalf("read pages export csv: %v", err)
	}
	if len(rows) != 5 {
		t.Fatalf("expected 5 csv rows, got %#v", rows)
	}
	if strings.TrimPrefix(rows[0][0], "\ufeff") != "お知らせID" || rows[0][1] != "タイトル" || rows[0][7] != "作成日時" || rows[0][8] != "更新日時" {
		t.Fatalf("unexpected csv header: %#v", rows[0])
	}
	if rows[1][3] == "" {
		t.Fatalf("unexpected csv rows: %#v", rows)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/pages/0195ec00-0035-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/pages/0195ec00-0035-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNotFound, recorder.Code, recorder.Body.String())
	}
}

func TestStaffPagesRequireVerification(t *testing.T) {
	t.Parallel()

	server := NewServer(testStrictStaffConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "staff@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/pages", nil)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusForbidden, recorder.Code, recorder.Body.String())
	}
}

func TestStaffRoutesBypassVerificationInInsecureDefaults(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/status", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var statusResponse staffStatusResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &statusResponse); err != nil {
		t.Fatalf("unmarshal staff status: %v", err)
	}
	if !statusResponse.Allowed || !statusResponse.Authorized {
		t.Fatalf("expected staff status to be authorized in insecure defaults, got %#v", statusResponse)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/users", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
}

func TestStaffFormsListCreateAndDetailUseCurrentCircle(t *testing.T) {
	t.Parallel()

	now := testNowUTC()
	futureOpenAt := formatRFC3339(now, 24*time.Hour)
	futureCloseAt := formatRFC3339(now, 48*time.Hour)

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPut, "/v1/forms/0195ec00-0014-7000-8000-000000000001/answer", map[string]string{
		"body": "展示位置は正面入口側を希望します。",
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var forms []staffFormSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &forms); err != nil {
		t.Fatalf("unmarshal staff forms response: %v", err)
	}
	if len(forms) != 4 {
		t.Fatalf("expected 4 editable managed staff forms, got %#v", forms)
	}
	if forms[0].MaxAnswers < 1 {
		t.Fatalf("expected max answers to be populated, got %#v", forms[0])
	}
	if slices.ContainsFunc(forms, func(form staffFormSummaryResponse) bool {
		return form.ID == "0195ec00-0012-7000-8000-000000000001"
	}) {
		t.Fatalf("expected participation form to stay out of staff forms index, got %#v", forms)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail staffFormDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal staff form detail: %v", err)
	}
	if detail.Answer != nil {
		t.Fatalf("expected staff form detail answer to be omitted, got %#v", detail)
	}
	if detail.MaxAnswers != 2 || len(detail.AnswerableTags) != 1 || detail.ConfirmationMessage == "" {
		t.Fatalf("expected extended staff form fields, got %#v", detail)
	}
	if len(detail.Questions) != 0 {
		t.Fatalf("expected no questions initially, got %#v", detail.Questions)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms", map[string]any{
		"circleId":            "0195ec00-0022-7000-8000-000000000001",
		"name":                "追加ヒアリング",
		"openAt":              futureOpenAt,
		"closeAt":             futureCloseAt,
		"maxAnswers":          3,
		"answerableTags":      []string{"展示", "必須"},
		"confirmationMessage": "回答ありがとうございました。",
		"isPublic":            true,
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var created staffFormSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal created staff form: %v", err)
	}
	if created.ID == "" || created.Name != "追加ヒアリング" || created.MaxAnswers != 3 || created.IsOpen {
		t.Fatalf("unexpected created staff form: %#v", created)
	}
}

func TestStaffFormsCreateAndDetailSupportGlobalForms(t *testing.T) {
	t.Parallel()

	now := testNowUTC()
	futureOpenAt := formatRFC3339(now, 24*time.Hour)
	futureCloseAt := formatRFC3339(now, 48*time.Hour)

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms", map[string]any{
		"name":                "全体申請フォーム",
		"description":         "全企画向けの確認フォームです。",
		"openAt":              futureOpenAt,
		"closeAt":             futureCloseAt,
		"maxAnswers":          2,
		"answerableTags":      []string{},
		"confirmationMessage": "全体申請フォームへの回答ありがとうございました。",
		"isPublic":            true,
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var created staffFormSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal created global staff form: %v", err)
	}
	if created.ID == "" || created.Circle.ID != "" || created.Circle.Name != "" {
		t.Fatalf("expected global staff form without circle, got %#v", created)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var forms []staffFormSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &forms); err != nil {
		t.Fatalf("unmarshal staff forms response: %v", err)
	}
	if !slices.ContainsFunc(forms, func(form staffFormSummaryResponse) bool {
		return form.ID == created.ID && form.Circle.ID == "" && form.Name == "全体申請フォーム"
	}) {
		t.Fatalf("expected global staff form in index, got %#v", forms)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/"+created.ID, nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail staffFormDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal global staff form detail: %v", err)
	}
	if detail.ID != created.ID || detail.Circle.ID != "" || detail.Name != "全体申請フォーム" {
		t.Fatalf("unexpected global staff form detail: %#v", detail)
	}
}

func TestStaffFormUpdateAndUploadDownload(t *testing.T) {
	t.Parallel()

	now := testNowUTC()
	openAt := formatRFC3339(now, -24*time.Hour)
	closeAt := formatRFC3339(now, 24*time.Hour)

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doMultipartRequest(t, server, cookies, http.MethodPost, "/v1/forms/0195ec00-0014-7000-8000-000000000001/answer/uploads", "file", "layout.txt", []byte("layout content"), "text/plain", nil)
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var upload formAnswerUploadResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &upload); err != nil {
		t.Fatalf("unmarshal upload response: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001", map[string]any{
		"name":                "更新後フォーム",
		"description":         "更新後の説明です。",
		"openAt":              openAt,
		"closeAt":             closeAt,
		"maxAnswers":          4,
		"answerableTags":      []string{"展示", "新規"},
		"confirmationMessage": "更新完了です。",
		"isPublic":            false,
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var updated staffFormSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &updated); err != nil {
		t.Fatalf("unmarshal updated staff form: %v", err)
	}
	if updated.Name != "更新後フォーム" || updated.IsPublic || updated.MaxAnswers != 4 {
		t.Fatalf("unexpected updated staff form: %#v", updated)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail staffFormDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal updated staff form detail: %v", err)
	}
	if detail.Name != "更新後フォーム" || detail.Answer != nil {
		t.Fatalf("unexpected updated staff form detail: %#v", detail)
	}
	if detail.MaxAnswers != 4 || len(detail.AnswerableTags) != 2 || detail.ConfirmationMessage != "更新完了です。" {
		t.Fatalf("unexpected extended updated staff form detail: %#v", detail)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/uploads/"+upload.ID+"/file", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if recorder.Body.String() != "layout content" {
		t.Fatalf("unexpected downloaded content: %q", recorder.Body.String())
	}
}

func TestStaffFormQuestionEditorCRUD(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/questions", map[string]string{
		"type": "text",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var created staffFormQuestion
	if err := json.Unmarshal(recorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal created question: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/questions/"+created.ID, map[string]any{
		"name":         "責任者名",
		"description":  "当日の責任者を入力してください",
		"type":         "text",
		"isRequired":   true,
		"numberMin":    nil,
		"numberMax":    nil,
		"allowedTypes": "",
		"options":      []string{},
		"priority":     1,
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/questions", map[string]string{
		"type": "radio",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var second staffFormQuestion
	if err := json.Unmarshal(recorder.Body.Bytes(), &second); err != nil {
		t.Fatalf("unmarshal second question: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/questions/"+second.ID, map[string]any{
		"name":         "参加日",
		"description":  "参加希望日を選択してください",
		"type":         "radio",
		"isRequired":   true,
		"numberMin":    nil,
		"numberMax":    nil,
		"allowedTypes": "",
		"options":      []string{"1日目", "2日目"},
		"priority":     2,
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/questions/order", map[string]any{
		"questionIds": []string{second.ID, created.ID},
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail staffFormDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal detail: %v", err)
	}
	if len(detail.Questions) != 2 {
		t.Fatalf("expected 2 questions, got %#v", detail.Questions)
	}
	if detail.Questions[0].ID != second.ID || detail.Questions[0].Priority != 1 {
		t.Fatalf("expected reordered question first, got %#v", detail.Questions)
	}
	if len(detail.Questions[0].Options) != 2 {
		t.Fatalf("expected options to be saved, got %#v", detail.Questions[0])
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/questions/"+created.ID, nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}
}

func TestStaffFormAnswersManagement(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/questions", map[string]string{
		"type": "text",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var textQuestion staffFormQuestion
	if err := json.Unmarshal(recorder.Body.Bytes(), &textQuestion); err != nil {
		t.Fatalf("unmarshal created text question: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/questions/"+textQuestion.ID, map[string]any{
		"name":         "責任者名",
		"description":  "代表者名を入力してください",
		"type":         "text",
		"isRequired":   true,
		"numberMin":    nil,
		"numberMax":    nil,
		"allowedTypes": "",
		"options":      []string{},
		"priority":     1,
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/questions", map[string]string{
		"type": "upload",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var uploadQuestion staffFormQuestion
	if err := json.Unmarshal(recorder.Body.Bytes(), &uploadQuestion); err != nil {
		t.Fatalf("unmarshal created upload question: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/questions/"+uploadQuestion.ID, map[string]any{
		"name":         "レイアウト図",
		"description":  "PDF を添付してください",
		"type":         "upload",
		"isRequired":   false,
		"numberMin":    nil,
		"numberMax":    nil,
		"allowedTypes": "pdf",
		"options":      []string{},
		"priority":     2,
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/answers", map[string]any{
		"circleId": "0195ec00-0021-7000-8000-000000000001",
		"details": map[string]any{
			textQuestion.ID: "企画A責任者",
		},
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var created createStaffFormAnswerResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal created answer: %v", err)
	}
	if created.Answer.ID == "" || created.Answer.Circle.ID != "0195ec00-0021-7000-8000-000000000001" {
		t.Fatalf("unexpected created answer: %#v", created)
	}
	if created.Answer.CreatedAt == "" {
		t.Fatalf("expected createdAt to be populated, got %#v", created)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/answers", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var index staffFormAnswersIndexResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &index); err != nil {
		t.Fatalf("unmarshal answers index: %v", err)
	}
	if len(index.Answers) != 1 || len(index.NotAnsweredCircles) != 1 || index.NotAnsweredCircles[0].ID != "0195ec00-0022-7000-8000-000000000001" {
		t.Fatalf("unexpected answers index: %#v", index)
	}

	recorder = doMultipartRequest(
		t,
		server,
		cookies,
		http.MethodPost,
		"/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/answers/"+created.Answer.ID+"/uploads",
		"file",
		"layout.exe",
		[]byte("not allowed"),
		"application/octet-stream",
		map[string]string{
			"questionId": uploadQuestion.ID,
		},
	)
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var uploadValidation models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &uploadValidation); err != nil {
		t.Fatalf("unmarshal upload validation response: %v", err)
	}
	if len(uploadValidation.Errors["file"]) == 0 {
		t.Fatalf("expected file validation error, got %#v", uploadValidation.Errors)
	}

	recorder = doMultipartRequest(
		t,
		server,
		cookies,
		http.MethodPost,
		"/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/answers/"+created.Answer.ID+"/uploads",
		"file",
		"layout.pdf",
		[]byte("%PDF-1.4 staff-layout"),
		"application/pdf",
		map[string]string{
			"questionId": uploadQuestion.ID,
		},
	)
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/answers/"+created.Answer.ID+"/edit", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail staffManagedFormAnswerDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal answer detail: %v", err)
	}
	if detail.Answer.Details[textQuestion.ID][0] != "企画A責任者" || len(detail.Answer.Uploads) != 1 {
		t.Fatalf("unexpected answer detail: %#v", detail)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/answers/"+created.Answer.ID+"/uploads/"+uploadQuestion.ID+"/file", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if recorder.Body.String() != "%PDF-1.4 staff-layout" {
		t.Fatalf("unexpected uploaded content: %q", recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/answers/export", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if got := recorder.Header().Get("Content-Type"); got != "text/csv; charset=utf-8" {
		t.Fatalf("unexpected content type: %s", got)
	}
	if !strings.Contains(recorder.Body.String(), "責任者名") || !strings.Contains(recorder.Body.String(), "企画A責任者") {
		t.Fatalf("unexpected csv content: %s", recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/answers/uploads.zip", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if got := recorder.Header().Get("Content-Type"); got != "application/zip" {
		t.Fatalf("unexpected zip content type: %s", got)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/answers/"+created.Answer.ID, nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/answers/not_answered", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var notAnswered []staffAnswerCircleResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &notAnswered); err != nil {
		t.Fatalf("unmarshal not answered circles: %v", err)
	}
	if len(notAnswered) != 2 {
		t.Fatalf("expected both circles to be not answered after delete, got %#v", notAnswered)
	}
}

func TestStaffFormsValidation(t *testing.T) {
	t.Parallel()

	now := testNowUTC()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms", map[string]any{
		"name":                " ",
		"description":         " ",
		"openAt":              "not-a-date",
		"closeAt":             formatRFC3339(now, 24*time.Hour),
		"maxAnswers":          1,
		"answerableTags":      []string{"展示"},
		"confirmationMessage": "ok",
		"isPublic":            true,
		"isOpen":              true,
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal validation response: %v", err)
	}
	if len(response.Errors["name"]) == 0 || len(response.Errors["openAt"]) == 0 {
		t.Fatalf("expected validation errors, got %#v", response.Errors)
	}
}

func TestStaffFormsPreviewCopyExportAndDelete(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/questions", map[string]string{
		"type": "text",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}
	var createdQuestion staffFormQuestion
	if err := json.Unmarshal(recorder.Body.Bytes(), &createdQuestion); err != nil {
		t.Fatalf("unmarshal created question: %v", err)
	}
	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/questions/"+createdQuestion.ID, map[string]any{
		"name":         "責任者名",
		"description":  "入力してください",
		"type":         "text",
		"isRequired":   true,
		"numberMin":    nil,
		"numberMax":    nil,
		"allowedTypes": "",
		"options":      []string{},
		"priority":     1,
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/preview", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	var preview formDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &preview); err != nil {
		t.Fatalf("unmarshal preview: %v", err)
	}
	if preview.ID != "0195ec00-0014-7000-8000-000000000001" || len(preview.Questions) != 1 {
		t.Fatalf("unexpected preview response: %#v", preview)
	}
	if !slices.Equal(preview.AnswerableTags, []string{"展示"}) {
		t.Fatalf("unexpected preview tags: %#v", preview.AnswerableTags)
	}
	if preview.ConfirmationMessage != "展示チェックフォームへの回答を受け付けました。" {
		t.Fatalf("unexpected preview response: %#v", preview)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/copy", map[string]any{})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}
	var copied staffFormSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &copied); err != nil {
		t.Fatalf("unmarshal copied form: %v", err)
	}
	if copied.ID == "" || !strings.Contains(copied.Name, "コピー") {
		t.Fatalf("unexpected copied form: %#v", copied)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/"+copied.ID, nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	var copiedDetail staffFormDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &copiedDetail); err != nil {
		t.Fatalf("unmarshal copied detail: %v", err)
	}
	if len(copiedDetail.Questions) != 1 || copiedDetail.Questions[0].Name != "責任者名" {
		t.Fatalf("expected copied questions, got %#v", copiedDetail)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/export", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if got := recorder.Header().Get("Content-Type"); got != "text/csv; charset=utf-8" {
		t.Fatalf("unexpected content type: %s", got)
	}
	if !strings.Contains(recorder.Body.String(), "フォームID") || !strings.Contains(recorder.Body.String(), externalid.MustEncodeUUIDString(copied.ID)) {
		t.Fatalf("unexpected forms export: %s", recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/forms/"+copied.ID, nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/"+copied.ID, nil)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNotFound, recorder.Code, recorder.Body.String())
	}
}

func TestParticipationFormUsesParticipationTypeSettingsRoute(t *testing.T) {
	t.Parallel()

	now := testNowUTC()
	openAt := formatRFC3339(now, -24*time.Hour)
	closeAt := formatRFC3339(now, 24*time.Hour)

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/0195ec00-0012-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail staffFormDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal participation form detail: %v", err)
	}
	if !detail.IsParticipationForm || detail.Name != "企画参加登録" {
		t.Fatalf("unexpected participation form detail: %#v", detail)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/0195ec00-0012-7000-8000-000000000001/preview", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var preview formDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &preview); err != nil {
		t.Fatalf("unmarshal participation form preview: %v", err)
	}
	if preview.ID != "0195ec00-0012-7000-8000-000000000001" {
		t.Fatalf("unexpected participation form preview: %#v", preview)
	}
	if len(preview.AnswerableTags) != 0 {
		t.Fatalf("expected participation preview tags to be empty, got %#v", preview.AnswerableTags)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/forms/0195ec00-0012-7000-8000-000000000001", map[string]any{
		"name":                "変更不可",
		"description":         "変更不可",
		"openAt":              openAt,
		"closeAt":             closeAt,
		"maxAnswers":          4,
		"answerableTags":      []string{"展示", "新規"},
		"confirmationMessage": "更新完了です。",
		"isPublic":            false,
	})
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusBadRequest, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms/0195ec00-0012-7000-8000-000000000001/questions", map[string]string{
		"type": "text",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var created staffFormQuestion
	if err := json.Unmarshal(recorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal participation question: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/forms/0195ec00-0012-7000-8000-000000000001/questions/"+created.ID, map[string]any{
		"name":         "追加設問",
		"description":  "補足事項を入力してください",
		"type":         "text",
		"isRequired":   false,
		"numberMin":    nil,
		"numberMax":    nil,
		"allowedTypes": "",
		"options":      []string{},
		"priority":     1,
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/forms/0195ec00-0012-7000-8000-000000000001/questions/"+created.ID, nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/0195ec00-0012-7000-8000-000000000001/answers", nil)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNotFound, recorder.Code, recorder.Body.String())
	}
}

func TestStaffCirclesListCreateDetailAndUpdate(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var circles models.PaginatedResponse[staffCircleResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &circles); err != nil {
		t.Fatalf("unmarshal staff circles response: %v", err)
	}
	if len(circles.Items) != 2 || circles.Total != 2 {
		t.Fatalf("expected 2 circles, got %#v", circles)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/circles", map[string]any{
		"name":                "追加企画",
		"nameYomi":            "ついかきかく",
		"groupName":           "Cブロック",
		"groupNameYomi":       "しーぶろっく",
		"participationTypeId": "0195ec00-0002-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var created staffCircleResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal created circle: %v", err)
	}
	if created.ID == "" || created.Name != "追加企画" {
		t.Fatalf("unexpected created circle: %#v", created)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles/"+created.ID, nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/circles/"+created.ID, map[string]any{
		"name":                "更新後の追加企画",
		"nameYomi":            "こうしんごのついかきかく",
		"groupName":           "更新後Cブロック",
		"groupNameYomi":       "こうしんごしーぶろっく",
		"participationTypeId": "0195ec00-0001-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var updated staffCircleResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &updated); err != nil {
		t.Fatalf("unmarshal updated circle: %v", err)
	}
	if updated.Name != "更新後の追加企画" || updated.ParticipationTypeName != "模擬店" {
		t.Fatalf("unexpected updated circle: %#v", updated)
	}
}

func TestStaffCircleStatusUpdateQueuesNotificationMail(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/circles/0195ec00-0022-7000-8000-000000000001", map[string]any{
		"name":                "デモ企画B",
		"nameYomi":            "でもきかくびー",
		"groupName":           "Bブロック",
		"groupNameYomi":       "びーぶろっく",
		"participationTypeId": "0195ec00-0002-7000-8000-000000000001",
		"status":              "rejected",
		"statusReason":        "書類に不足があります",
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var queuedMails []staffMailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &queuedMails); err != nil {
		t.Fatalf("unmarshal staff mails: %v", err)
	}
	if len(queuedMails) != 1 {
		t.Fatalf("expected one queued mail, got %#v", queuedMails)
	}
	if !strings.HasPrefix(queuedMails[0].Subject, "【不受理】") {
		t.Fatalf("unexpected queued mail subject: %#v", queuedMails[0])
	}
	if !strings.Contains(queuedMails[0].Body, "書類に不足があります") {
		t.Fatalf("expected status reason in body, got %#v", queuedMails[0])
	}
}

func TestStaffCirclesHTTPBoundaryUsesExternalIDs(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	circleID := "0195ec00-0021-7000-8000-000000000001"
	participationTypeID := "0195ec00-0002-7000-8000-000000000001"
	externalCircleID := externalid.MustEncodeUUIDString(circleID)
	externalParticipationTypeID := externalid.MustEncodeUUIDString(participationTypeID)

	recorder := doRawJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/circles/"+externalCircleID, map[string]any{
		"name":                "外部ID更新企画",
		"nameYomi":            "がいぶあいでぃこうしんきかく",
		"groupName":           "外部IDブロック",
		"groupNameYomi":       "がいぶあいでぃぶろっく",
		"participationTypeId": externalParticipationTypeID,
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var updated staffCircleResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &updated); err != nil {
		t.Fatalf("unmarshal updated circle: %v", err)
	}
	if updated.ID != externalCircleID || updated.ParticipationTypeID != externalParticipationTypeID {
		t.Fatalf("expected external ids at HTTP boundary, got %#v", updated)
	}
}

func TestStaffCirclesRejectsRawUUIDAtHTTPBoundary(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doRawJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles/0195ec00-0021-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusBadRequest, recorder.Code, recorder.Body.String())
	}
	if recorder.Body.String() != "{\"message\":\"invalid_request\"}\n" {
		t.Fatalf("unexpected error body: %s", recorder.Body.String())
	}
}

func TestStaffCirclesRequireCircleAdminRole(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	cfg.AuthUser = config.AuthUser{
		ID:          "0195ec00-0092-7000-8000-000000000001",
		LoginIDs:    []string{"forms@example.com"},
		DisplayName: "Forms User",
		Password:    "password",
		Roles:       []string{"forms_manager"},
	}

	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "forms@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	authorizeStaff(t, server, cookies)

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles", nil)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusForbidden, recorder.Code, recorder.Body.String())
	}
}

func TestStaffCirclesValidation(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/circles", map[string]any{
		"name":                " ",
		"nameYomi":            " ",
		"groupName":           " ",
		"groupNameYomi":       " ",
		"participationTypeId": " ",
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal circle validation response: %v", err)
	}
	if len(response.Errors["name"]) == 0 || len(response.Errors["nameYomi"]) == 0 || len(response.Errors["groupName"]) == 0 || len(response.Errors["groupNameYomi"]) == 0 || len(response.Errors["participationTypeId"]) == 0 {
		t.Fatalf("expected validation errors, got %#v", response.Errors)
	}
}

func TestStaffCirclesAllExportMailAndDelete(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles/all", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var all []staffCircleResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &all); err != nil {
		t.Fatalf("unmarshal staff circles all response: %v", err)
	}
	if len(all) != 2 || all[1].ID != "0195ec00-0022-7000-8000-000000000001" {
		t.Fatalf("unexpected all circles response: %#v", all)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles/export", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if got := recorder.Header().Get("Content-Type"); got != "text/csv; charset=utf-8" {
		t.Fatalf("unexpected content type: %s", got)
	}
	if !strings.Contains(recorder.Body.String(), "participation_type_id") || !strings.Contains(recorder.Body.String(), externalid.MustEncodeUUIDString("0195ec00-0022-7000-8000-000000000001")) {
		t.Fatalf("unexpected circles export: %s", recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles/0195ec00-0022-7000-8000-000000000001/email", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var form staffCircleMailFormResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &form); err != nil {
		t.Fatalf("unmarshal circle mail form: %v", err)
	}
	if form.Circle.ID != "0195ec00-0022-7000-8000-000000000001" || len(form.Recipients) != 2 || form.Recipients[0].ID != "0195ec00-0058-7000-8000-000000000001" || form.Recipients[1].ID != "0195ec00-0056-7000-8000-000000000001" {
		t.Fatalf("unexpected circle mail form: %#v", form)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/circles/0195ec00-0022-7000-8000-000000000001/email", map[string]any{
		"recipient": "leader",
		"subject":   "搬入のご案内",
		"body":      "9:00 に集合してください。",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var queuedMails []staffMailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &queuedMails); err != nil {
		t.Fatalf("unmarshal staff mails: %v", err)
	}
	if len(queuedMails) != 1 {
		t.Fatalf("unexpected queued mails response: %#v", queuedMails)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &queuedMails); err != nil {
		t.Fatalf("unmarshal staff mails after delete: %v", err)
	}
	if len(queuedMails) != 0 {
		t.Fatalf("expected no queued mails after delete, got %#v", queuedMails)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/circles/0195ec00-0022-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles/0195ec00-0022-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNotFound, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles/all", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &all); err != nil {
		t.Fatalf("unmarshal circles after delete: %v", err)
	}
	if len(all) != 1 || all[0].ID != "0195ec00-0021-7000-8000-000000000001" {
		t.Fatalf("unexpected circles after delete: %#v", all)
	}
}

func TestStaffCircleMembersListAddAndDelete(t *testing.T) {
	t.Parallel()

	cfg := testStaffConfig()
	cfg.Users = append(cfg.Users, config.User{
		ID:          "0195ec00-0093-7000-8000-000000000001",
		LoginIDs:    []string{"demo@example.com", "24a0000"},
		DisplayName: "Demo User",
		Password:    "password",
		Roles:       []string{"participant"},
		IsVerified:  true,
	})
	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles/0195ec00-0022-7000-8000-000000000001/members", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var members []staffCircleMemberResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &members); err != nil {
		t.Fatalf("unmarshal members response: %v", err)
	}
	if len(members) != 2 || !members[0].IsLeader {
		t.Fatalf("unexpected initial members: %#v", members)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/circles/0195ec00-0022-7000-8000-000000000001/members", map[string]string{
		"loginId": "demo@example.com",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles/0195ec00-0022-7000-8000-000000000001/members", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &members); err != nil {
		t.Fatalf("unmarshal members response after add: %v", err)
	}
	if len(members) != 3 {
		t.Fatalf("expected 3 members after add, got %#v", members)
	}
	addedMemberIndex := slices.IndexFunc(members, func(member staffCircleMemberResponse) bool {
		return member.UserID == "0195ec00-0093-7000-8000-000000000001"
	})
	if addedMemberIndex < 0 || !slices.Equal(members[addedMemberIndex].LoginIDs, []string{"demo@example.com", "24a0000"}) {
		t.Fatalf("unexpected added member response: %#v", members)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles/0195ec00-0022-7000-8000-000000000001/email", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var form staffCircleMailFormResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &form); err != nil {
		t.Fatalf("unmarshal circle mail form after add: %v", err)
	}
	if len(form.Recipients) != 3 {
		t.Fatalf("expected 3 mail recipients after add, got %#v", form.Recipients)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/circles/0195ec00-0022-7000-8000-000000000001/members/0195ec00-0093-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles/0195ec00-0022-7000-8000-000000000001/members", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &members); err != nil {
		t.Fatalf("unmarshal members response after delete: %v", err)
	}
	if len(members) != 2 {
		t.Fatalf("expected 2 members after delete, got %#v", members)
	}
}

func TestStaffCircleMembersValidation(t *testing.T) {
	t.Parallel()

	cfg := testStaffConfig()
	cfg.Users = append(cfg.Users, config.User{
		ID:           "0195ec00-0091-7000-8000-000000000001",
		LoginIDs:     []string{"24c0001"},
		DisplayName:  "Contact Email Member",
		ContactEmail: "contact-add@example.com",
		Password:     "password",
		Roles:        []string{"participant"},
		IsVerified:   true,
	})
	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/circles/0195ec00-0021-7000-8000-000000000001/members", map[string]string{
		"loginId": "contact-add@example.com",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/circles/0195ec00-0021-7000-8000-000000000001/members", map[string]string{
		"loginId": "contact-add@example.com",
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var validationResponse models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &validationResponse); err != nil {
		t.Fatalf("unmarshal duplicate member validation response: %v", err)
	}
	if len(validationResponse.Errors["loginId"]) == 0 {
		t.Fatalf("expected duplicate loginId validation error, got %#v", validationResponse.Errors)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/circles/0195ec00-0021-7000-8000-000000000001/members", map[string]string{
		"loginId": "missing-user",
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	if err := json.Unmarshal(recorder.Body.Bytes(), &validationResponse); err != nil {
		t.Fatalf("unmarshal missing member validation response: %v", err)
	}
	if len(validationResponse.Errors["loginId"]) == 0 {
		t.Fatalf("expected missing loginId validation error, got %#v", validationResponse.Errors)
	}
}

func TestStaffCircleMembersRejectLeaderDeletion(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/circles/0195ec00-0022-7000-8000-000000000001/members/0195ec00-0058-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal validation response: %v", err)
	}
	if len(response.Errors["userId"]) == 0 {
		t.Fatalf("expected userId validation error, got %#v", response.Errors)
	}
}

func TestManagedStaffCirclesHideCircleDetailsFromNonCircleReaders(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	cfg.AuthUser = config.AuthUser{
		ID:          "0195ec00-0094-7000-8000-000000000001",
		LoginIDs:    []string{"content@example.com"},
		DisplayName: "Content User",
		Password:    "password",
		Roles:       []string{"content_manager"},
	}

	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "content@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	authorizeStaff(t, server, cookies)

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles/all", nil)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusForbidden, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles/managed", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var circles []staffManagedCircleResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &circles); err != nil {
		t.Fatalf("unmarshal managed circles response: %v", err)
	}
	if len(circles) != 2 || circles[0].ID == "" || circles[0].Name == "" {
		t.Fatalf("unexpected managed circles response: %#v", circles)
	}
}

func TestStaffUsersNonAdminCannotChangeAdminRole(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	cfg.Users = append(cfg.Users, config.User{
		ID:          "0195ec00-0095-7000-8000-000000000001",
		LoginIDs:    []string{"0195ec00-0095-7000-8000-000000000001@example.com"},
		DisplayName: "Admin Target",
		Password:    "password",
		Roles:       []string{"admin"},
		IsVerified:  true,
	})
	cfg.AuthUser = config.AuthUser{
		ID:          "0195ec00-0096-7000-8000-000000000001",
		LoginIDs:    []string{"0195ec00-0096-7000-8000-000000000001@example.com"},
		DisplayName: "User Manager",
		Password:    "password",
		Roles:       []string{"user_manager"},
	}

	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0096-7000-8000-000000000001@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	authorizeStaff(t, server, cookies)

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/users/0195ec00-0057-7000-8000-000000000001/roles", map[string]any{
		"roles": []string{"participant", "admin"},
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal promote admin validation response: %v", err)
	}
	if len(response.Errors["roles"]) == 0 {
		t.Fatalf("expected roles validation error, got %#v", response.Errors)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/users/0195ec00-0095-7000-8000-000000000001/roles", map[string]any{
		"roles": []string{"user_manager"},
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal demote admin validation response: %v", err)
	}
	if len(response.Errors["roles"]) == 0 {
		t.Fatalf("expected roles validation error, got %#v", response.Errors)
	}
}

func TestStaffUsersNonAdminCannotDeleteAdmin(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	cfg.Users = append(cfg.Users, config.User{
		ID:          "0195ec00-0095-7000-8000-000000000001",
		LoginIDs:    []string{"0195ec00-0095-7000-8000-000000000001@example.com"},
		DisplayName: "Admin Target",
		Password:    "password",
		Roles:       []string{"admin"},
		IsVerified:  true,
	})
	cfg.AuthUser = config.AuthUser{
		ID:          "0195ec00-0096-7000-8000-000000000001",
		LoginIDs:    []string{"0195ec00-0096-7000-8000-000000000001@example.com"},
		DisplayName: "User Manager",
		Password:    "password",
		Roles:       []string{"user_manager"},
	}

	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0096-7000-8000-000000000001@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	authorizeStaff(t, server, cookies)

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/users/0195ec00-0095-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal delete admin validation response: %v", err)
	}
	if len(response.Errors["user"]) == 0 {
		t.Fatalf("expected user validation error, got %#v", response.Errors)
	}
}

func TestStaffFormsExportExcludesParticipationForm(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/export", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if strings.Contains(recorder.Body.String(), "0195ec00-0012-7000-8000-000000000001") {
		t.Fatalf("expected participation form to be excluded from export, got %s", recorder.Body.String())
	}
}

func TestStaffUsersListDetailAndUpdateRoles(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/users", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var users models.PaginatedResponse[staffUserSummaryResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &users); err != nil {
		t.Fatalf("unmarshal staff users response: %v", err)
	}
	if len(users.Items) != 4 || users.Items[0].ID != "0195ec00-0098-7000-8000-000000000001" {
		t.Fatalf("unexpected staff users response: %#v", users)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/users/0195ec00-0098-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail staffUserSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal staff user detail: %v", err)
	}
	if len(detail.Roles) != 1 || detail.Roles[0] != "admin" {
		t.Fatalf("unexpected staff user detail: %#v", detail)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/users/0195ec00-0098-7000-8000-000000000001/roles", map[string]any{
		"roles": []string{"admin", "forms_manager"},
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var updated staffUserSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &updated); err != nil {
		t.Fatalf("unmarshal updated staff user: %v", err)
	}
	if len(updated.Roles) != 2 || updated.Roles[1] != "forms_manager" {
		t.Fatalf("unexpected updated staff user: %#v", updated)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/session/bootstrap", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var bootstrap sessionBootstrapResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &bootstrap); err != nil {
		t.Fatalf("unmarshal bootstrap after role update: %v", err)
	}
	if len(bootstrap.Roles) != 2 || bootstrap.Roles[1] != "forms_manager" {
		t.Fatalf("expected updated roles in session bootstrap, got %#v", bootstrap.Roles)
	}
}

func TestStaffUsersListSupportsSearchSortAndFilters(t *testing.T) {
	t.Parallel()

	cfg := testStaffConfig()
	cfg.Users[0].ContactEmail = "member-a-contact@example.com"
	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/users?query=member-a-contact@example.com", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var searched models.PaginatedResponse[staffUserSummaryResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &searched); err != nil {
		t.Fatalf("unmarshal searched users response: %v", err)
	}
	if searched.Total != 1 || searched.Items[0].ID != "0195ec00-0057-7000-8000-000000000001" {
		t.Fatalf("expected contact email search to match 0195ec00-0057-7000-8000-000000000001, got %#v", searched)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/users?sortKey=contactEmail&sortDirection=desc", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var sorted models.PaginatedResponse[staffUserSummaryResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &sorted); err != nil {
		t.Fatalf("unmarshal sorted users response: %v", err)
	}
	if len(sorted.Items) < 2 {
		t.Fatalf("expected at least two users for sort assertion, got %#v", sorted.Items)
	}
	if sorted.Items[0].ID != "0195ec00-0057-7000-8000-000000000001" {
		t.Fatalf("expected 0195ec00-0057-7000-8000-000000000001 to be first by contactEmail desc, got %#v", sorted.Items)
	}

	filterQueries := `[{"key_name":"isVerified","operator":"=","value":"false"}]`
	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/users?queries="+url.QueryEscape(filterQueries)+"&mode=and", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var filtered models.PaginatedResponse[staffUserSummaryResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &filtered); err != nil {
		t.Fatalf("unmarshal filtered users response: %v", err)
	}
	if filtered.Total != 1 || filtered.Items[0].ID != "0195ec00-0056-7000-8000-000000000001" {
		t.Fatalf("expected isVerified=false filter result, got %#v", filtered)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/users?sortDirection=invalid", nil)
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusBadRequest, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/users?queries="+url.QueryEscape(`[{"key_name":"unknown","operator":"=","value":"x"}]`), nil)
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusBadRequest, recorder.Code, recorder.Body.String())
	}
}

func TestStaffPermissionsListDetailAndUpdate(t *testing.T) {
	t.Parallel()

	cfg := testStaffConfig()
	cfg.Users = append(cfg.Users, config.User{
		ID:          "0195ec00-0094-7000-8000-000000000001",
		LoginIDs:    []string{"content@example.com"},
		DisplayName: "Content User",
		Password:    "password",
		Roles:       []string{"content_manager"},
		Permissions: []string{"staff.pages.read,edit"},
		IsVerified:  true,
	})

	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/permissions", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var list models.PaginatedResponse[staffPermissionUserSummaryResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &list); err != nil {
		t.Fatalf("unmarshal staff permissions list: %v", err)
	}
	if list.Total != 2 {
		t.Fatalf("expected 2 staff permission targets, got %#v", list)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/permissions/0195ec00-0094-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail staffPermissionDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal staff permission detail: %v", err)
	}
	if detail.User.ID != "0195ec00-0094-7000-8000-000000000001" || !slices.Contains(detail.AssignedPermissionNames, "staff.pages.read,edit") {
		t.Fatalf("unexpected permission detail: %#v", detail)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/permissions/0195ec00-0094-7000-8000-000000000001", map[string]any{
		"permissions": []string{"staff.forms.read", "staff.pages.read"},
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal updated staff permission detail: %v", err)
	}
	if !slices.Equal(detail.AssignedPermissionNames, []string{"staff.forms.read", "staff.pages.read"}) {
		t.Fatalf("unexpected updated permission names: %#v", detail.AssignedPermissionNames)
	}
}

func TestStaffPermissionsValidation(t *testing.T) {
	t.Parallel()

	cfg := testStaffConfig()
	cfg.Users = append(cfg.Users, config.User{
		ID:          "0195ec00-0094-7000-8000-000000000001",
		LoginIDs:    []string{"content@example.com"},
		DisplayName: "Content User",
		Password:    "password",
		Roles:       []string{"content_manager"},
		IsVerified:  true,
	})

	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/permissions/0195ec00-0098-7000-8000-000000000001", map[string]any{
		"permissions": []string{"staff.permissions.read"},
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/permissions/0195ec00-0094-7000-8000-000000000001", map[string]any{
		"permissions": []string{"unknown.permission"},
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal staff permission validation response: %v", err)
	}
	if len(response.Errors["permissions"]) == 0 {
		t.Fatalf("expected permissions validation errors, got %#v", response.Errors)
	}
}

func TestStaffPermissionsUpdateInvalidatesTargetUserSession(t *testing.T) {
	t.Parallel()

	cfg := testStaffConfig()
	cfg.Users = append(cfg.Users, config.User{
		ID:          "0195ec00-0094-7000-8000-000000000001",
		LoginIDs:    []string{"content@example.com"},
		DisplayName: "Content User",
		Password:    "password",
		Roles:       []string{"content_manager"},
		Permissions: []string{"staff.pages.read"},
		IsVerified:  true,
	})
	server := NewServer(cfg)

	targetCookies := map[string]*http.Cookie{}
	recorder := doJSONRequest(t, server, targetCookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "content@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}
	authorizeStaff(t, server, targetCookies)
	recorder = doJSONRequest(t, server, targetCookies, http.MethodGet, "/v1/staff/pages", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	adminCookies := map[string]*http.Cookie{}
	loginAsStaff(t, server, adminCookies)
	authorizeStaff(t, server, adminCookies)
	recorder = doJSONRequest(t, server, adminCookies, http.MethodPut, "/v1/staff/permissions/0195ec00-0094-7000-8000-000000000001", map[string]any{
		"permissions": []string{},
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, targetCookies, http.MethodGet, "/v1/staff/pages", nil)
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d after session invalidation, got %d, body=%s", http.StatusUnauthorized, recorder.Code, recorder.Body.String())
	}
}

func TestStaffUsersPreventSelfLockout(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/users/0195ec00-0098-7000-8000-000000000001/roles", map[string]any{
		"roles": []string{"participant", "forms_manager"},
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal self lockout validation response: %v", err)
	}
	if len(response.Errors["roles"]) == 0 {
		t.Fatalf("expected roles validation error, got %#v", response.Errors)
	}
}

func TestStaffUsersRequireUserAdminRole(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	cfg.AuthUser = config.AuthUser{
		ID:          "0195ec00-0094-7000-8000-000000000001",
		LoginIDs:    []string{"content@example.com"},
		DisplayName: "Content User",
		Password:    "password",
		Roles:       []string{"content_manager"},
	}

	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "content@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	authorizeStaff(t, server, cookies)

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/users", nil)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusForbidden, recorder.Code, recorder.Body.String())
	}
}

func TestStaffUsersValidation(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/users/0195ec00-0098-7000-8000-000000000001/roles", map[string]any{
		"roles": []string{" ", "unknown_role"},
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal staff user validation response: %v", err)
	}
	if len(response.Errors["roles"]) == 0 {
		t.Fatalf("expected roles validation error, got %#v", response.Errors)
	}
}

func TestStaffUserRolesUpdateInvalidatesTargetUserSession(t *testing.T) {
	t.Parallel()

	cfg := testStaffConfig()
	cfg.Users = append(cfg.Users, config.User{
		ID:          "0195ec00-0094-7000-8000-000000000001",
		LoginIDs:    []string{"content@example.com"},
		DisplayName: "Content User",
		Password:    "password",
		Roles:       []string{"content_manager"},
		Permissions: []string{"staff.pages.read"},
		IsVerified:  true,
	})
	server := NewServer(cfg)

	targetCookies := map[string]*http.Cookie{}
	recorder := doJSONRequest(t, server, targetCookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "content@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}
	authorizeStaff(t, server, targetCookies)
	recorder = doJSONRequest(t, server, targetCookies, http.MethodGet, "/v1/staff/pages", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	adminCookies := map[string]*http.Cookie{}
	loginAsStaff(t, server, adminCookies)
	authorizeStaff(t, server, adminCookies)
	recorder = doJSONRequest(t, server, adminCookies, http.MethodPut, "/v1/staff/users/0195ec00-0094-7000-8000-000000000001/roles", map[string]any{
		"roles": []string{"participant"},
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, targetCookies, http.MethodGet, "/v1/staff/pages", nil)
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d after session invalidation, got %d, body=%s", http.StatusUnauthorized, recorder.Code, recorder.Body.String())
	}
}

func TestStaffUsersUpdateVerifyExportAndDelete(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/users/export", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if got := recorder.Header().Get("Content-Type"); got != "text/csv; charset=utf-8" {
		t.Fatalf("unexpected content type: %s", got)
	}
	if !strings.Contains(recorder.Body.String(), "is_verified") || !strings.Contains(recorder.Body.String(), externalid.MustEncodeUUIDString("0195ec00-0056-7000-8000-000000000001")) {
		t.Fatalf("unexpected users export: %s", recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/users/0195ec00-0056-7000-8000-000000000001", map[string]any{
		"displayName": "Updated Circle B Member",
		"loginIds":    []string{"updated-0195ec00-0022-7000-8000-000000000001@example.com", "24b9999"},
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var updated staffUserSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &updated); err != nil {
		t.Fatalf("unmarshal updated staff user: %v", err)
	}
	if updated.DisplayName != "Updated Circle B Member" || !slices.Equal(updated.LoginIDs, []string{"updated-0195ec00-0022-7000-8000-000000000001@example.com", "24b9999"}) || updated.IsVerified {
		t.Fatalf("unexpected updated user: %#v", updated)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPatch, "/v1/staff/users/0195ec00-0056-7000-8000-000000000001/verify", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var verified staffUserSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &verified); err != nil {
		t.Fatalf("unmarshal verified staff user: %v", err)
	}
	if !verified.IsVerified {
		t.Fatalf("expected user to be verified, got %#v", verified)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/users/0195ec00-0057-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/users/0195ec00-0057-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNotFound, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/users", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var users models.PaginatedResponse[staffUserSummaryResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &users); err != nil {
		t.Fatalf("unmarshal users after delete: %v", err)
	}
	if users.Total != 3 || len(users.Items) != 3 {
		t.Fatalf("unexpected users after delete: %#v", users)
	}
}

func TestStaffUsersPreventSelfDelete(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/users/0195ec00-0098-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal self delete validation response: %v", err)
	}
	if len(response.Errors["user"]) == 0 {
		t.Fatalf("expected user validation error, got %#v", response.Errors)
	}
}

func TestStaffActivityLogsListRecordedMutations(t *testing.T) {
	t.Parallel()

	now := testNowUTC()
	openAt := formatRFC3339(now, 24*time.Hour)
	closeAt := formatRFC3339(now, 48*time.Hour)

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/pages", map[string]any{
		"circleId": "0195ec00-0022-7000-8000-000000000001",
		"title":    "スタッフ向け新着",
		"body":     "設営順の詳細を更新しました。",
		"isPublic": true,
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms", map[string]any{
		"circleId":            "0195ec00-0022-7000-8000-000000000001",
		"name":                "追加ヒアリング",
		"description":         "当日の搬入担当者を確認します。",
		"openAt":              openAt,
		"closeAt":             closeAt,
		"maxAnswers":          2,
		"answerableTags":      []string{"展示"},
		"confirmationMessage": "回答ありがとうございました。",
		"isPublic":            true,
		"isOpen":              true,
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/activity-logs", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var logs models.PaginatedResponse[staffActivityLogResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &logs); err != nil {
		t.Fatalf("unmarshal activity logs: %v", err)
	}
	if len(logs.Items) != 2 || logs.Total != 2 {
		t.Fatalf("expected 2 activity logs, got %#v", logs)
	}
	if logs.Items[0].Action != "staff.form.created" || logs.Items[1].Action != "staff.page.created" {
		t.Fatalf("unexpected activity logs order: %#v", logs)
	}
}

func TestStaffActivityLogsRequireAdminRole(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	cfg.AuthUser = config.AuthUser{
		ID:          "0195ec00-0097-7000-8000-000000000001",
		LoginIDs:    []string{"circle@example.com"},
		DisplayName: "Circle User",
		Password:    "password",
		Roles:       []string{"circle_manager"},
	}

	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "circle@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	authorizeStaff(t, server, cookies)

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/activity-logs", nil)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusForbidden, recorder.Code, recorder.Body.String())
	}
}

func TestStaffListEndpointsSupportPagination(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/circles", map[string]any{
		"name":                "追加企画",
		"nameYomi":            "ついかきかく",
		"groupName":           "Cブロック",
		"groupNameYomi":       "しーぶろっく",
		"participationTypeId": "0195ec00-0002-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/pages", map[string]any{
		"title":    "新着ページ",
		"body":     "本文",
		"isPublic": true,
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/pages", map[string]any{
		"title":        "別の新着ページ",
		"body":         "本文",
		"isPublic":     true,
		"viewableTags": []string{"展示"},
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles?page=2&pageSize=2", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var circles models.PaginatedResponse[staffCircleResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &circles); err != nil {
		t.Fatalf("unmarshal paginated circles response: %v", err)
	}
	if circles.Page != 2 || circles.PageSize != 2 || circles.Total != 3 || len(circles.Items) != 1 {
		t.Fatalf("unexpected paginated circles response: %#v", circles)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/activity-logs?page=1&pageSize=1", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var logs models.PaginatedResponse[staffActivityLogResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &logs); err != nil {
		t.Fatalf("unmarshal paginated logs response: %v", err)
	}
	if logs.Page != 1 || logs.PageSize != 1 || logs.Total == 0 || len(logs.Items) != 1 {
		t.Fatalf("unexpected paginated logs response: %#v", logs)
	}
}

func TestStaffExportsDownloadArtifacts(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPut, "/v1/forms/0195ec00-0014-7000-8000-000000000001/answer", map[string]string{
		"body": "展示位置は正面入口側を希望します。",
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/exports/summary.csv", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if got := recorder.Header().Get("Content-Type"); got != "text/csv; charset=utf-8" {
		t.Fatalf("unexpected content type: %s", got)
	}

	csvReader := csv.NewReader(bytes.NewReader(recorder.Body.Bytes()))
	rows, err := csvReader.ReadAll()
	if err != nil {
		t.Fatalf("read summary csv: %v", err)
	}
	if len(rows) < 5 {
		t.Fatalf("expected summary csv rows, got %#v", rows)
	}
	if strings.TrimPrefix(rows[0][0], "\ufeff") != "resource_type" || rows[0][1] != "circle_id" || rows[0][2] != "circle_name" {
		t.Fatalf("unexpected csv header: %#v", rows[0])
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/exports/bundle.zip", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if got := recorder.Header().Get("Content-Type"); got != "application/zip" {
		t.Fatalf("unexpected zip content type: %s", got)
	}

	zipReader, err := zip.NewReader(bytes.NewReader(recorder.Body.Bytes()), int64(recorder.Body.Len()))
	if err != nil {
		t.Fatalf("open zip: %v", err)
	}
	if len(zipReader.File) != 5 {
		t.Fatalf("expected 5 zip entries, got %d", len(zipReader.File))
	}
	if zipReader.File[0].Name != "pages.csv" || zipReader.File[4].Name != "README.txt" {
		t.Fatalf("unexpected zip entries: %#v", zipReader.File)
	}

	readme, err := zipReader.File[4].Open()
	if err != nil {
		t.Fatalf("open readme: %v", err)
	}
	defer readme.Close()

	readmeBytes, err := io.ReadAll(readme)
	if err != nil {
		t.Fatalf("read readme: %v", err)
	}
	if !bytes.Contains(readmeBytes, []byte("scope=all_managed_circles")) {
		t.Fatalf("unexpected readme: %s", string(readmeBytes))
	}
}

func TestStaffPortalSettingsRequireAdminRole(t *testing.T) {
	t.Parallel()

	cfg := testStaffConfig()
	cfg.AuthUser.Roles = []string{"content_manager"}
	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/portal-settings", nil)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusForbidden, recorder.Code, recorder.Body.String())
	}
}

func TestStaffPortalSettingsGetAndUpdate(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/portal-settings", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var before staffPortalSettingsResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &before); err != nil {
		t.Fatalf("unmarshal portal settings: %v", err)
	}
	if before.AppName != "PortalDots" || before.PortalContactEmail != "contact@example.com" {
		t.Fatalf("unexpected portal settings before update: %#v", before)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/portal-settings", map[string]any{
		"appName":                   "PortalDots Next",
		"portalDescription":         "次世代の学園祭ポータル",
		"appUrl":                    "https://next.example.com",
		"appForceHttps":             false,
		"portalAdminName":           "次世代実行委員会",
		"portalContactEmail":        "next@example.com",
		"portalUnivemailLocalPart":  "student_id",
		"portalUnivemailDomainPart": "next.example.ac.jp",
		"portalStudentIdName":       "学生番号",
		"portalUnivemailName":       "学校メール",
		"portalPrimaryColorH":       24,
		"portalPrimaryColorS":       68,
		"portalPrimaryColorL":       52,
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var updated staffPortalSettingsResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &updated); err != nil {
		t.Fatalf("unmarshal updated portal settings: %v", err)
	}
	if updated.AppName != "PortalDots Next" || updated.PortalUnivemailLocalPart != "student_id" || updated.PortalPrimaryColorH != 24 {
		t.Fatalf("unexpected updated portal settings: %#v", updated)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/activity-logs?page=1&pageSize=20", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var logs models.PaginatedResponse[staffActivityLogResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &logs); err != nil {
		t.Fatalf("unmarshal paginated logs response: %v", err)
	}
	found := false
	for _, item := range logs.Items {
		if item.Action == "staff.portal.updated" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected portal update activity log, got %#v", logs.Items)
	}
}

func TestStaffPortalSettingsValidateInput(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/portal-settings", map[string]any{
		"appName":                   " ",
		"portalDescription":         "",
		"appUrl":                    " ",
		"appForceHttps":             true,
		"portalAdminName":           " ",
		"portalContactEmail":        " ",
		"portalUnivemailLocalPart":  "invalid",
		"portalUnivemailDomainPart": " ",
		"portalStudentIdName":       " ",
		"portalUnivemailName":       " ",
		"portalPrimaryColorH":       400,
		"portalPrimaryColorS":       -1,
		"portalPrimaryColorL":       101,
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal validation response: %v", err)
	}
	if len(response.Errors["appName"]) == 0 || len(response.Errors["portalUnivemailLocalPart"]) == 0 || len(response.Errors["portalPrimaryColorH"]) == 0 {
		t.Fatalf("unexpected validation errors: %#v", response.Errors)
	}
}

func TestStaffParticipationTypeCirclesListAndExport(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/participation-types/0195ec00-0001-7000-8000-000000000001/circles?page=1&pageSize=10", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response models.PaginatedResponse[staffCircleResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal participation type circles: %v", err)
	}
	if response.Total != 1 || len(response.Items) != 1 || response.Items[0].ID != "0195ec00-0021-7000-8000-000000000001" {
		t.Fatalf("unexpected participation type circle response: %#v", response)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/participation-types/0195ec00-0001-7000-8000-000000000001/circles/export", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if got := recorder.Header().Get("Content-Disposition"); !strings.Contains(got, "staff-participation-type-"+externalid.MustEncodeUUIDString("0195ec00-0001-7000-8000-000000000001")+"-circles.csv") {
		t.Fatalf("unexpected content disposition: %s", got)
	}

	rows, err := csv.NewReader(bytes.NewReader(recorder.Body.Bytes())).ReadAll()
	if err != nil {
		t.Fatalf("read participation type csv: %v", err)
	}
	if len(rows) != 2 {
		t.Fatalf("expected 2 csv rows, got %#v", rows)
	}
	if got, want := strings.TrimPrefix(rows[0][0], "\ufeff"), "id"; got != want {
		t.Fatalf("unexpected header first column: got=%q want=%q", got, want)
	}
	if got, want := rows[1][0], externalid.MustEncodeUUIDString("0195ec00-0021-7000-8000-000000000001"); got != want {
		t.Fatalf("unexpected csv row id: got=%q want=%q all=%#v", got, want, rows)
	}
}

func TestStaffParticipationTypesListAllowsCircleReaders(t *testing.T) {
	t.Parallel()

	cfg := testStaffConfig()
	cfg.AuthUser.Roles = nil
	cfg.AuthUser.Permissions = []string{"staff.circles.read"}

	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/participation-types", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response []staffParticipationTypeResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal participation types: %v", err)
	}
	if len(response) == 0 {
		t.Fatalf("expected at least one participation type, got %#v", response)
	}
}

func TestStaffTagsExportCSV(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/tags/export", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if got := recorder.Header().Get("Content-Type"); got != "text/csv; charset=utf-8" {
		t.Fatalf("unexpected content type: %s", got)
	}
	if got := recorder.Header().Get("Content-Disposition"); !strings.Contains(got, "staff-tags.csv") {
		t.Fatalf("unexpected content disposition: %s", got)
	}

	rows, err := csv.NewReader(bytes.NewReader(recorder.Body.Bytes())).ReadAll()
	if err != nil {
		t.Fatalf("read tags csv: %v", err)
	}
	if len(rows) < 2 {
		t.Fatalf("expected exported rows, got %#v", rows)
	}
	wantHeader := []string{
		"tag_id",
		"tag_name",
		"circle_id",
		"circle_name",
		"circle_name_yomi",
		"group_name",
		"group_name_yomi",
	}
	rows[0][0] = strings.TrimPrefix(rows[0][0], "\ufeff")
	if !slices.Equal(rows[0], wantHeader) {
		t.Fatalf("unexpected header: want=%#v got=%#v", wantHeader, rows[0])
	}

	foundTaggedCircle := false
	for _, row := range rows[1:] {
		if len(row) != 7 {
			t.Fatalf("unexpected row width: %#v", row)
		}
		if row[1] == "展示" && row[2] == externalid.MustEncodeUUIDString("0195ec00-0022-7000-8000-000000000001") {
			foundTaggedCircle = true
		}
	}
	if !foundTaggedCircle {
		t.Fatalf("expected tag export to include %s row, got %#v", externalid.MustEncodeUUIDString("0195ec00-0022-7000-8000-000000000001"), rows)
	}
}

func TestStaffPlacesExportCSV(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/places/export", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if got := recorder.Header().Get("Content-Type"); got != "text/csv; charset=utf-8" {
		t.Fatalf("unexpected content type: %s", got)
	}
	if got := recorder.Header().Get("Content-Disposition"); !strings.Contains(got, "staff-places.csv") {
		t.Fatalf("unexpected content disposition: %s", got)
	}

	rows, err := csv.NewReader(bytes.NewReader(recorder.Body.Bytes())).ReadAll()
	if err != nil {
		t.Fatalf("read places csv: %v", err)
	}
	if len(rows) != 4 {
		t.Fatalf("unexpected row count: %#v", rows)
	}
	wantHeader := []string{
		"place_id",
		"place_name",
		"place_type",
		"place_notes",
		"circle_id",
		"circle_name",
		"circle_name_yomi",
		"group_name",
		"group_name_yomi",
	}
	rows[0][0] = strings.TrimPrefix(rows[0][0], "\ufeff")
	if !slices.Equal(rows[0], wantHeader) {
		t.Fatalf("unexpected header: want=%#v got=%#v", wantHeader, rows[0])
	}
	if rows[1][0] != externalid.MustEncodeUUIDString("0195ec00-0071-7000-8000-000000000001") || rows[1][4] != externalid.MustEncodeUUIDString("0195ec00-0021-7000-8000-000000000001") {
		t.Fatalf("unexpected first export row: %#v", rows[1])
	}
	if rows[2][0] != "" || rows[2][4] != externalid.MustEncodeUUIDString("0195ec00-0022-7000-8000-000000000001") {
		t.Fatalf("unexpected second export row: %#v", rows[2])
	}
	if rows[3][0] != externalid.MustEncodeUUIDString("0195ec00-0072-7000-8000-000000000001") || rows[3][4] != externalid.MustEncodeUUIDString("0195ec00-0022-7000-8000-000000000001") {
		t.Fatalf("unexpected third export row: %#v", rows[3])
	}
}

func loginAsStaff(t *testing.T, server *echo.Echo, cookies map[string]*http.Cookie) {
	t.Helper()

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "staff@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}
}

func selectCircle(t *testing.T, server *echo.Echo, cookies map[string]*http.Cookie, circleID string) {
	t.Helper()

	recorder := doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": circleID,
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}
}

func authorizeStaff(t *testing.T, server *echo.Echo, cookies map[string]*http.Cookie) {
	t.Helper()

	csrf := map[string]string{"X-CSRF-Token": fetchCSRFToken(t, server, cookies)}
	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/verify/request", map[string]string{}, csrf)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response staffVerifyRequestResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal staff verify request response: %v", err)
	}
	if strings.TrimSpace(response.Message) == "" {
		t.Fatalf("expected non-empty staff verify response, got %#v", response)
	}
}

func extractLoggedVerifyToken(t *testing.T, logs, kind, recipient string) string {
	t.Helper()

	pattern := regexp.MustCompile(
		`kind=` + regexp.QuoteMeta(kind) + ` recipient=` + regexp.QuoteMeta(recipient) + ` verifyURL=([^\s]+)`,
	)
	matches := pattern.FindStringSubmatch(logs)
	if len(matches) != 2 {
		t.Fatalf("expected verify url log for %s/%s, got logs=%s", kind, recipient, logs)
	}

	verifyURLRaw, err := strconv.Unquote(matches[1])
	if err != nil {
		verifyURLRaw = matches[1]
	}
	verifyURL, err := url.Parse(verifyURLRaw)
	if err != nil {
		t.Fatalf("parse verify url: %v", err)
	}
	token := verifyURL.Query().Get("token")
	if token == "" {
		t.Fatalf("expected verify url token, got %q", verifyURL.String())
	}

	return token
}

func testNowUTC() time.Time {
	return time.Now().UTC().Truncate(time.Second)
}

func formatRFC3339(base time.Time, offset time.Duration) string {
	return base.Add(offset).Format(time.RFC3339)
}

func testConfig() config.Config {
	now := testNowUTC()
	openWindowStart := formatRFC3339(now, -30*24*time.Hour)
	openWindowEnd := formatRFC3339(now, 30*24*time.Hour)
	closedWindowStart := formatRFC3339(now, -90*24*time.Hour)
	closedWindowEnd := formatRFC3339(now, -60*24*time.Hour)

	return config.Config{
		SessionCookieName:         "test_session",
		SessionTTL:                12 * time.Hour,
		StaffVerifyCode:           "123456",
		AllowDangerously:          true,
		AppName:                   "PortalDots",
		PortalDescription:         "学園祭参加団体向けポータル",
		AppURL:                    "https://portal.example.com",
		AppForceHTTPS:             true,
		RegistrationVerifyTTL:     time.Hour,
		PortalAdminName:           "PortalDots 実行委員会",
		PortalContactEmail:        "contact@example.com",
		PortalUnivemailLocalPart:  "student_id",
		PortalUnivemailDomainPart: "example.ac.jp",
		PortalStudentIDName:       "学籍番号",
		PortalUnivemailName:       "大学メールアドレス",
		PortalPrimaryColorH:       190,
		PortalPrimaryColorS:       80,
		PortalPrimaryColorL:       45,
		AuthUser: config.AuthUser{
			ID:          "0195ec00-0093-7000-8000-000000000001",
			LoginIDs:    []string{"demo@example.com", "24a0000"},
			DisplayName: "Demo User",
			Password:    "password",
			Roles:       []string{"participant"},
		},
		Users: []config.User{
			{
				ID:              "0195ec00-0057-7000-8000-000000000001",
				LoginIDs:        []string{"0195ec00-0021-7000-8000-000000000001@example.com"},
				DisplayName:     "Circle A Member",
				Password:        "password",
				Roles:           []string{"participant"},
				CircleIDs:       []string{"0195ec00-0021-7000-8000-000000000001"},
				LeaderCircleIDs: []string{"0195ec00-0021-7000-8000-000000000001"},
				IsVerified:      true,
			},
			{
				ID:              "0195ec00-0058-7000-8000-000000000001",
				LoginIDs:        []string{"0195ec00-0022-7000-8000-000000000001@example.com"},
				DisplayName:     "Circle B Member",
				Password:        "password",
				Roles:           []string{"participant"},
				CircleIDs:       []string{"0195ec00-0022-7000-8000-000000000001"},
				LeaderCircleIDs: []string{"0195ec00-0022-7000-8000-000000000001"},
				IsVerified:      true,
			},
			{
				ID:          "0195ec00-0056-7000-8000-000000000001",
				LoginIDs:    []string{"0195ec00-0022-7000-8000-000000000001-unverified@example.com"},
				DisplayName: "Circle B Unverified Member",
				Password:    "password",
				Roles:       []string{"participant"},
				CircleIDs:   []string{"0195ec00-0022-7000-8000-000000000001"},
				IsVerified:  false,
			},
		},
		ParticipationTypes: []config.ParticipationType{
			{
				ID:            "0195ec00-0001-7000-8000-000000000001",
				Name:          "模擬店",
				Description:   "模擬店向け参加登録",
				UsersCountMin: 1,
				UsersCountMax: 5,
				Tags:          []string{"模擬店"},
				FormID:        "0195ec00-0011-7000-8000-000000000001",
			},
			{
				ID:            "0195ec00-0002-7000-8000-000000000001",
				Name:          "展示",
				Description:   "展示向け参加登録",
				UsersCountMin: 1,
				UsersCountMax: 5,
				Tags:          []string{"展示"},
				FormID:        "0195ec00-0012-7000-8000-000000000001",
			},
		},
		Tags: []config.Tag{
			{ID: "0195ec00-0063-7000-8000-000000000001", Name: "模擬店"},
			{ID: "0195ec00-0062-7000-8000-000000000001", Name: "展示"},
		},
		Circles: []config.Circle{
			{
				ID:                    "0195ec00-0021-7000-8000-000000000001",
				Name:                  "デモ企画A",
				NameYomi:              "でもきかくえー",
				GroupName:             "Aブロック",
				GroupNameYomi:         "えーぶろっく",
				ParticipationTypeID:   "0195ec00-0001-7000-8000-000000000001",
				ParticipationTypeName: "模擬店",
				Tags:                  []string{"模擬店"},
				Status:                "approved",
			},
			{
				ID:                    "0195ec00-0022-7000-8000-000000000001",
				Name:                  "デモ企画B",
				NameYomi:              "でもきかくびー",
				GroupName:             "Bブロック",
				GroupNameYomi:         "びーぶろっく",
				ParticipationTypeID:   "0195ec00-0002-7000-8000-000000000001",
				ParticipationTypeName: "展示",
				Tags:                  []string{"展示"},
				Status:                "approved",
			},
		},
		Places: []config.Place{
			{ID: "0195ec00-0071-7000-8000-000000000001", Name: "1号館 101", Type: 1, Notes: "屋内"},
			{ID: "0195ec00-0072-7000-8000-000000000001", Name: "中庭", Type: 2, Notes: "屋外"},
		},
		Booths: []config.BoothAssignment{
			{PlaceID: "0195ec00-0071-7000-8000-000000000001", CircleID: "0195ec00-0021-7000-8000-000000000001"},
			{PlaceID: "0195ec00-0071-7000-8000-000000000001", CircleID: "0195ec00-0022-7000-8000-000000000001"},
			{PlaceID: "0195ec00-0072-7000-8000-000000000001", CircleID: "0195ec00-0022-7000-8000-000000000001"},
		},
		Pages: []config.Page{
			{
				ID:           "0195ec00-0031-7000-8000-000000000001",
				Title:        "搬入時間のお知らせ",
				Body:         "Aブロックの搬入は 9:00 から開始します。",
				Notes:        "搬入担当向けの補足です。",
				IsPinned:     false,
				IsPublic:     true,
				ViewableTags: []string{"模擬店"},
				DocumentIDs:  []string{"0195ec00-0041-7000-8000-000000000001"},
				CreatedAt:    "2026-03-01T09:00:00Z",
				UpdatedAt:    "2026-03-01T09:00:00Z",
			},
			{
				ID:           "0195ec00-0032-7000-8000-000000000001",
				Title:        "固定表示の連絡",
				Body:         "このお知らせは一覧には出しません。",
				Notes:        "",
				IsPinned:     true,
				IsPublic:     true,
				ViewableTags: []string{},
				DocumentIDs:  []string{},
				CreatedAt:    "2026-03-02T09:00:00Z",
				UpdatedAt:    "2026-03-02T09:00:00Z",
			},
			{
				ID:           "0195ec00-0034-7000-8000-000000000001",
				Title:        "展示レイアウト更新",
				Body:         "Bブロックの展示レイアウトを更新しました。",
				Notes:        "展示班向けの差し替え指示あり。",
				IsPinned:     false,
				IsPublic:     true,
				ViewableTags: []string{"展示"},
				DocumentIDs:  []string{"0195ec00-0042-7000-8000-000000000001"},
				CreatedAt:    "2026-03-03T09:00:00Z",
				UpdatedAt:    "2026-03-03T09:00:00Z",
			},
			{
				ID:           "0195ec00-0035-7000-8000-000000000001",
				Title:        "非公開メモ",
				Body:         "このお知らせは公開されません。",
				Notes:        "スタッフだけが確認するメモです。",
				IsPinned:     false,
				IsPublic:     false,
				ViewableTags: []string{},
				DocumentIDs:  []string{"0195ec00-0043-7000-8000-000000000001"},
				CreatedAt:    "2026-03-04T09:00:00Z",
				UpdatedAt:    "2026-03-04T09:00:00Z",
			},
		},
		Documents: []config.Document{
			{
				ID:          "0195ec00-0041-7000-8000-000000000001",
				CircleID:    "0195ec00-0021-7000-8000-000000000001",
				Name:        "搬入手順書",
				Description: "Aブロック向けの搬入手順です。",
				Notes:       "搬入班で最終確認してください。",
				IsPublic:    true,
				IsImportant: true,
				Filename:    "a-loading-guide.txt",
				MimeType:    "text/plain; charset=utf-8",
				Content:     "Aブロックの搬入は 9:00 から 9:30 です。",
				CreatedAt:   "2026-03-01T09:00:00Z",
				UpdatedAt:   "2026-03-02T09:00:00Z",
			},
			{
				ID:          "0195ec00-0042-7000-8000-000000000001",
				CircleID:    "0195ec00-0022-7000-8000-000000000001",
				Name:        "展示ガイド",
				Description: "Bブロック向けの展示ガイドです。",
				Notes:       "展示班の責任者に共有済みです。",
				IsPublic:    true,
				IsImportant: true,
				Filename:    "b-exhibition-guide.txt",
				MimeType:    "text/plain; charset=utf-8",
				Content:     "Bブロックは 10:00 までに設営してください。",
				CreatedAt:   "2026-03-03T09:00:00Z",
				UpdatedAt:   "2026-03-05T09:00:00Z",
			},
			{
				ID:          "0195ec00-0043-7000-8000-000000000001",
				CircleID:    "0195ec00-0022-7000-8000-000000000001",
				Name:        "内部メモ",
				Description: "この資料は公開しません。",
				Notes:       "スタッフ内だけで参照します。",
				IsPublic:    false,
				IsImportant: false,
				Filename:    "private-note.txt",
				MimeType:    "text/plain; charset=utf-8",
				Content:     "private",
				CreatedAt:   "2026-03-04T09:00:00Z",
				UpdatedAt:   "2026-03-04T09:00:00Z",
			},
		},
		Forms: []config.Form{
			{
				ID:                  "0195ec00-0011-7000-8000-000000000001",
				CircleID:            "",
				Name:                "企画参加登録",
				Description:         "模擬店向けの参加登録フォームです。",
				IsPublic:            true,
				IsOpen:              true,
				OpenAt:              openWindowStart,
				CloseAt:             openWindowEnd,
				CreatedAt:           openWindowStart,
				UpdatedAt:           openWindowStart,
				MaxAnswers:          1,
				AnswerableTags:      []string{},
				ConfirmationMessage: "参加登録を受け付けました。",
			},
			{
				ID:                  "0195ec00-0012-7000-8000-000000000001",
				CircleID:            "",
				Name:                "企画参加登録",
				Description:         "展示向けの参加登録フォームです。",
				IsPublic:            true,
				IsOpen:              true,
				OpenAt:              openWindowStart,
				CloseAt:             openWindowEnd,
				CreatedAt:           openWindowStart,
				UpdatedAt:           openWindowStart,
				MaxAnswers:          1,
				AnswerableTags:      []string{},
				ConfirmationMessage: "参加登録を受け付けました。",
			},
			{
				ID:                  "0195ec00-0013-7000-8000-000000000001",
				CircleID:            "0195ec00-0021-7000-8000-000000000001",
				Name:                "搬入確認フォーム",
				Description:         "搬入予定時刻と責任者情報を提出してください。",
				IsPublic:            true,
				IsOpen:              true,
				OpenAt:              openWindowStart,
				CloseAt:             openWindowEnd,
				CreatedAt:           openWindowStart,
				UpdatedAt:           openWindowStart,
				MaxAnswers:          1,
				AnswerableTags:      []string{},
				ConfirmationMessage: "搬入確認フォームへの回答ありがとうございました。",
			},
			{
				ID:                  "0195ec00-0014-7000-8000-000000000001",
				CircleID:            "0195ec00-0022-7000-8000-000000000001",
				Name:                "展示チェックフォーム",
				Description:         "展示レイアウトと機材使用申請を提出してください。",
				IsPublic:            true,
				IsOpen:              true,
				OpenAt:              openWindowStart,
				CloseAt:             openWindowEnd,
				CreatedAt:           openWindowStart,
				UpdatedAt:           openWindowStart,
				MaxAnswers:          2,
				AnswerableTags:      []string{"展示"},
				ConfirmationMessage: "展示チェックフォームへの回答を受け付けました。",
			},
			{
				ID:                  "0195ec00-0010-7000-8000-000000000001",
				CircleID:            "0195ec00-0022-7000-8000-000000000001",
				Name:                "締切済みフォーム",
				Description:         "このフォームは締切済みです。",
				IsPublic:            true,
				IsOpen:              false,
				OpenAt:              closedWindowStart,
				CloseAt:             closedWindowEnd,
				CreatedAt:           closedWindowStart,
				UpdatedAt:           closedWindowStart,
				MaxAnswers:          1,
				AnswerableTags:      []string{},
				ConfirmationMessage: "",
			},
			{
				ID:                  "0195ec00-0015-7000-8000-000000000001",
				CircleID:            "0195ec00-0022-7000-8000-000000000001",
				Name:                "非公開フォーム",
				Description:         "このフォームは公開されません。",
				IsPublic:            false,
				IsOpen:              true,
				OpenAt:              openWindowStart,
				CloseAt:             openWindowEnd,
				CreatedAt:           openWindowStart,
				UpdatedAt:           openWindowStart,
				MaxAnswers:          1,
				AnswerableTags:      []string{},
				ConfirmationMessage: "",
			},
		},
	}
}

func testStaffConfig() config.Config {
	cfg := testConfig()
	cfg.AuthUser = config.AuthUser{
		ID:          "0195ec00-0098-7000-8000-000000000001",
		LoginIDs:    []string{"staff@example.com"},
		DisplayName: "Staff User",
		Password:    "password",
		Roles:       []string{"admin"},
	}

	return cfg
}

func testStrictStaffConfig() config.Config {
	cfg := testStaffConfig()
	cfg.AllowDangerously = false
	cfg.StaffVerifyCode = strictStaffVerifyCode
	return cfg
}

func circleMemberConfig() config.Config {
	cfg := testConfig()
	cfg.AuthUser = config.AuthUser{
		ID:          "0195ec00-0058-7000-8000-000000000001",
		LoginIDs:    []string{"0195ec00-0022-7000-8000-000000000001@example.com"},
		DisplayName: "Circle B Member",
		Password:    "password",
		Roles:       []string{"participant"},
	}

	return cfg
}

func independentUserConfig() config.Config {
	cfg := testConfig()
	cfg.AuthUser = config.AuthUser{
		ID:          "0195ec00-0099-7000-8000-000000000001",
		LoginIDs:    []string{"independent@example.com"},
		DisplayName: "Independent User",
		Password:    "password",
		Roles:       []string{"participant"},
	}

	return cfg
}

func demoCircleConfig() config.Config {
	cfg := testConfig()
	cfg.Users = append(cfg.Users, config.User{
		ID:              "0195ec00-0093-7000-8000-000000000001",
		LoginIDs:        []string{"demo@example.com"},
		DisplayName:     "Demo User",
		Password:        "password",
		Roles:           []string{"participant"},
		CircleIDs:       []string{"0195ec00-0021-7000-8000-000000000001", "0195ec00-0022-7000-8000-000000000001"},
		LeaderCircleIDs: []string{"0195ec00-0021-7000-8000-000000000001", "0195ec00-0022-7000-8000-000000000001"},
		IsVerified:      true,
	})

	return cfg
}

func memberOnlyConfig() config.Config {
	cfg := testConfig()
	cfg.AuthUser = config.AuthUser{
		ID:          "0195ec00-0060-7000-8000-000000000001",
		LoginIDs:    []string{"member-only@example.com"},
		DisplayName: "Member Only User",
		Password:    "password",
		Roles:       []string{"participant"},
	}
	cfg.Users = append(cfg.Users, config.User{
		ID:          "0195ec00-0060-7000-8000-000000000001",
		LoginIDs:    []string{"member-only@example.com"},
		DisplayName: "Member Only User",
		Password:    "password",
		Roles:       []string{"participant"},
		CircleIDs:   []string{"0195ec00-0021-7000-8000-000000000001"},
		IsVerified:  true,
	})
	return cfg
}

func doJSONRequest(
	t *testing.T,
	server *echo.Echo,
	cookies map[string]*http.Cookie,
	method string,
	path string,
	payload any,
	extraHeaders ...map[string]string,
) *httptest.ResponseRecorder {
	t.Helper()

	requestPayload := encodeExternalIDTestPayload(payload)
	var body []byte
	if requestPayload != nil {
		raw, err := json.Marshal(requestPayload)
		if err != nil {
			t.Fatalf("marshal payload: %v", err)
		}
		body = raw
	}

	req := httptest.NewRequest(method, encodeExternalIDTestPath(path), bytes.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	for _, cookie := range cookies {
		req.AddCookie(cookie)
	}
	hasCSRFHeader := false
	for _, hdrs := range extraHeaders {
		for k, v := range hdrs {
			if strings.EqualFold(k, "X-CSRF-Token") {
				hasCSRFHeader = true
			}
			req.Header.Set(k, v)
		}
	}
	if !hasCSRFHeader && len(cookies) > 0 && requiresCSRFHeader(method) {
		req.Header.Set("X-CSRF-Token", fetchCSRFToken(t, server, cookies))
	}

	recorder := httptest.NewRecorder()
	server.ServeHTTP(recorder, req)
	normalizeExternalIDTestResponse(recorder)

	for _, cookie := range recorder.Result().Cookies() {
		if cookie.MaxAge < 0 || cookie.Value == "" {
			delete(cookies, cookie.Name)
			continue
		}
		cookies[cookie.Name] = cookie
	}

	return recorder
}

func requiresCSRFHeader(method string) bool {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	default:
		return false
	}
}

func doRawJSONRequest(
	t *testing.T,
	server *echo.Echo,
	cookies map[string]*http.Cookie,
	method string,
	path string,
	payload any,
	extraHeaders ...map[string]string,
) *httptest.ResponseRecorder {
	t.Helper()

	var body []byte
	if payload != nil {
		raw, err := json.Marshal(payload)
		if err != nil {
			t.Fatalf("marshal payload: %v", err)
		}
		body = raw
	}

	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	for _, cookie := range cookies {
		req.AddCookie(cookie)
	}
	hasCSRFHeader := false
	for _, hdrs := range extraHeaders {
		for k, v := range hdrs {
			if strings.EqualFold(k, "X-CSRF-Token") {
				hasCSRFHeader = true
			}
			req.Header.Set(k, v)
		}
	}
	if !hasCSRFHeader && len(cookies) > 0 && requiresCSRFHeader(method) {
		req.Header.Set("X-CSRF-Token", fetchCSRFToken(t, server, cookies))
	}

	recorder := httptest.NewRecorder()
	server.ServeHTTP(recorder, req)
	for _, cookie := range recorder.Result().Cookies() {
		if cookie.MaxAge < 0 || cookie.Value == "" {
			delete(cookies, cookie.Name)
			continue
		}
		cookies[cookie.Name] = cookie
	}

	return recorder
}

func fetchCSRFToken(t *testing.T, server *echo.Echo, cookies map[string]*http.Cookie) string {
	t.Helper()
	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/session/bootstrap", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected bootstrap status %d, got %d", http.StatusOK, recorder.Code)
	}
	var response sessionBootstrapResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal bootstrap response: %v", err)
	}
	if response.CSRFToken == "" {
		t.Fatal("expected non-empty csrf token from bootstrap")
	}
	return response.CSRFToken
}

func doMultipartRequest(
	t *testing.T,
	server *echo.Echo,
	cookies map[string]*http.Cookie,
	method string,
	path string,
	fieldName string,
	filename string,
	content []byte,
	contentType string,
	fields map[string]string,
) *httptest.ResponseRecorder {
	t.Helper()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile(fieldName, filename)
	if err != nil {
		t.Fatalf("create multipart file: %v", err)
	}
	if _, err := part.Write(content); err != nil {
		t.Fatalf("write multipart file: %v", err)
	}
	if contentType != "" {
		if err := writer.WriteField("contentType", contentType); err != nil {
			t.Fatalf("write multipart field: %v", err)
		}
	}
	for key, value := range fields {
		if err := writer.WriteField(key, encodeExternalIDTestFormValue(key, value)); err != nil {
			t.Fatalf("write multipart field %s: %v", key, err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}

	req := httptest.NewRequest(method, path, &body)
	req.URL.Path = encodeExternalIDTestPath(req.URL.Path)
	req.Header.Set(echo.HeaderContentType, writer.FormDataContentType())
	for _, cookie := range cookies {
		req.AddCookie(cookie)
	}
	if len(cookies) > 0 && requiresCSRFHeader(method) {
		req.Header.Set("X-CSRF-Token", fetchCSRFToken(t, server, cookies))
	}

	recorder := httptest.NewRecorder()
	server.ServeHTTP(recorder, req)
	normalizeExternalIDTestResponse(recorder)

	for _, cookie := range recorder.Result().Cookies() {
		if cookie.MaxAge < 0 || cookie.Value == "" {
			delete(cookies, cookie.Name)
			continue
		}
		cookies[cookie.Name] = cookie
	}

	return recorder
}

var testExternalIDJSONKeys = map[string]struct{}{
	"actorUserId":           {},
	"categoryId":            {},
	"circleId":              {},
	"documentId":            {},
	"existingAnswerId":      {},
	"formId":                {},
	"id":                    {},
	"pageId":                {},
	"participationTypeId":   {},
	"pendingRegistrationId": {},
	"placeId":               {},
	"questionId":            {},
	"statusSetById":         {},
	"targetId":              {},
	"typeId":                {},
	"uploadId":              {},
	"userId":                {},
}

var testExternalIDJSONArrayKeys = map[string]struct{}{
	"documentIds": {},
	"placeIds":    {},
	"questionIds": {},
}

var testExternalIDMapParents = map[string]struct{}{
	"details": {},
	"errors":  {},
}

func encodeExternalIDTestPath(path string) string {
	return externalid.RewriteURLPathUUIDs(path)
}

func encodeExternalIDTestPayload(payload any) any {
	if payload == nil {
		return nil
	}

	raw, err := json.Marshal(payload)
	if err != nil {
		return payload
	}

	var normalized any
	if err := json.Unmarshal(raw, &normalized); err != nil {
		return payload
	}
	return transformExternalIDTestValue("", normalized, true)
}

func normalizeExternalIDTestResponse(recorder *httptest.ResponseRecorder) {
	if !strings.HasPrefix(recorder.Header().Get(echo.HeaderContentType), echo.MIMEApplicationJSON) {
		return
	}

	var payload any
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		return
	}

	normalized := transformExternalIDTestValue("", payload, false)
	body, err := json.Marshal(normalized)
	if err != nil {
		return
	}
	recorder.Body.Reset()
	recorder.Body.Write(body)
	recorder.Header().Set(echo.HeaderContentLength, strconv.Itoa(len(body)))
}

func transformExternalIDTestValue(parentKey string, value any, encode bool) any {
	switch typed := value.(type) {
	case map[string]any:
		if _, ok := testExternalIDMapParents[parentKey]; ok {
			next := make(map[string]any, len(typed))
			for key, nested := range typed {
				mappedKey := mapExternalIDTestString(key, encode)
				next[mappedKey] = transformExternalIDTestValue("", nested, encode)
			}
			return next
		}

		next := make(map[string]any, len(typed))
		for key, nested := range typed {
			next[key] = transformExternalIDTestValue(key, nested, encode)
		}
		return next
	case []string:
		if _, ok := testExternalIDJSONArrayKeys[parentKey]; ok {
			next := make([]string, len(typed))
			for index, item := range typed {
				next[index] = mapExternalIDTestString(item, encode)
			}
			return next
		}
		return typed
	case []any:
		if _, ok := testExternalIDJSONArrayKeys[parentKey]; ok {
			next := make([]any, len(typed))
			for index, item := range typed {
				if text, ok := item.(string); ok {
					next[index] = mapExternalIDTestString(text, encode)
					continue
				}
				next[index] = item
			}
			return next
		}
		next := make([]any, len(typed))
		for index, nested := range typed {
			next[index] = transformExternalIDTestValue("", nested, encode)
		}
		return next
	case string:
		if _, ok := testExternalIDJSONKeys[parentKey]; ok {
			return mapExternalIDTestString(typed, encode)
		}
		if parentKey == "downloadUrl" {
			if encode {
				return externalid.RewriteURLPathUUIDs(typed)
			}
			return normalizeExternalIDTestPathValue(typed)
		}
		return typed
	default:
		return value
	}
}

func mapExternalIDTestString(value string, encode bool) string {
	if strings.TrimSpace(value) == "" {
		return value
	}
	if encode {
		return externalid.MaybeEncodeUUIDString(value)
	}
	decoded, err := externalid.DecodeToUUIDString(value)
	if err != nil {
		return value
	}
	return decoded
}

func normalizeExternalIDTestPathValue(value string) string {
	if value == "" {
		return value
	}

	parts := strings.Split(value, "/")
	for index, part := range parts {
		decoded, err := externalid.DecodeToUUIDString(part)
		if err == nil {
			parts[index] = decoded
		}
	}
	return strings.Join(parts, "/")
}

func encodeExternalIDTestFormValue(key, value string) string {
	if _, ok := testExternalIDJSONKeys[key]; ok {
		return mapExternalIDTestString(value, true)
	}
	return value
}
