package controllers

import (
	"archive/zip"
	"bytes"
	"encoding/csv"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/models"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

func TestLoginAndBootstrap(t *testing.T) {
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
	if response.User.ID != "demo-user" {
		t.Fatalf("expected user id demo-user, got %s", response.User.ID)
	}
	if response.User.DisplayName != "Demo User" {
		t.Fatalf("expected display name Demo User, got %s", response.User.DisplayName)
	}
	if !response.User.CanDeleteAccount {
		t.Fatal("expected bootstrap to allow account deletion for demo user")
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

	cfg := testConfig()
	cfg.ContactCategories = []config.ContactCategory{
		{ID: "contact-general", Name: "総合窓口", Email: "general@example.com"},
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

	selectCircle(t, server, cookies, "circle-a")

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

func TestDeleteOwnAccountClearsSession(t *testing.T) {
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
		"loginId":  "demo@example.com",
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
		"loginId":  "circle-b@example.com",
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

func TestListCirclesRequiresAuthentication(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/circles", nil)
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnauthorized, recorder.Code, recorder.Body.String())
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
		"participationTypeId": "participation-type-food",
		"notes":               "",
		"details":             map[string]any{},
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
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
			ID:            "participation-type-private",
			Name:          "非公開企画",
			Description:   "非公開フォームに紐づく参加種別",
			UsersCountMin: 1,
			UsersCountMax: 2,
			Tags:          []string{"限定"},
			FormID:        "form-participation-private",
		},
		config.ParticipationType{
			ID:            "participation-type-closed",
			Name:          "締切済み企画",
			Description:   "締切済みフォームに紐づく参加種別",
			UsersCountMin: 1,
			UsersCountMax: 3,
			Tags:          []string{"締切"},
			FormID:        "form-participation-closed",
		},
	)
	cfg.Forms = append(cfg.Forms,
		config.Form{
			ID:                  "form-participation-private",
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
			ID:                  "form-participation-closed",
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
	if response[0].ID != "participation-type-exhibit" || response[1].ID != "participation-type-food" {
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
	if len(response.PinnedPages) != 1 || response.PinnedPages[0].ID != "page-circle-a-pinned" {
		t.Fatalf("expected pinned public page in default fixtures, got %#v", response.PinnedPages)
	}
	if len(response.ParticipationTypes) != 2 {
		t.Fatalf("expected 2 public participation types, got %#v", response.ParticipationTypes)
	}
	if len(response.Pages) != 2 || response.Pages[0].ID != "page-circle-b-1" {
		t.Fatalf("expected public pages sorted desc, got %#v", response.Pages)
	}
	if !response.Pages[0].IsLimited {
		t.Fatalf("expected tagged public page to be marked limited, got %#v", response.Pages[0])
	}
	if len(response.Documents) != 2 || response.Documents[0].ID != "document-circle-b-1" {
		t.Fatalf("expected public documents sorted desc, got %#v", response.Documents)
	}
	if response.Documents[0].DownloadURL != "/v1/public/documents/document-circle-b-1" {
		t.Fatalf("unexpected public download url: %#v", response.Documents[0])
	}
	if strings.Contains(response.Pages[0].Summary, "\n") {
		t.Fatalf("expected flattened page summary, got %q", response.Pages[0].Summary)
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

	var response []publicHomePageResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal public pages response: %v", err)
	}

	if len(response) != 2 {
		t.Fatalf("expected 2 public pages, got %#v", response)
	}
	if response[0].ID != "page-circle-b-1" || response[1].ID != "page-circle-a-1" {
		t.Fatalf("expected sorted public pages, got %#v", response)
	}
}

func TestGetPublicPageReturnsGuestPageDetail(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/public/pages/page-circle-a-1", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response pageDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal public page detail response: %v", err)
	}

	if response.ID != "page-circle-a-1" || response.Title != "搬入時間のお知らせ" {
		t.Fatalf("unexpected public page detail: %#v", response)
	}
	if len(response.Documents) != 1 || response.Documents[0].DownloadURL != "/v1/public/documents/document-circle-a-1" {
		t.Fatalf("expected public page document urls, got %#v", response.Documents)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/public/pages/page-circle-a-pinned", nil)
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

	if len(response) != 2 || response[0].ID != "document-circle-b-1" {
		t.Fatalf("expected public documents sorted desc, got %#v", response)
	}
}

func TestGetPublicDocumentDownloadsGuestFile(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/public/documents/document-circle-a-1", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if recorder.Body.String() != "Aブロックの搬入は 9:00 から 9:30 です。" {
		t.Fatalf("unexpected public document body: %s", recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/public/documents/document-circle-b-private", nil)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNotFound, recorder.Code, recorder.Body.String())
	}
}

func TestSetCurrentCircleUpdatesBootstrap(t *testing.T) {
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

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "circle-b",
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
	if response.CurrentCircle.ID != "circle-b" {
		t.Fatalf("expected selected circle circle-b, got %s", response.CurrentCircle.ID)
	}
}

func TestAddCurrentCircleMemberByLoginID(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	cfg.AuthUser = config.AuthUser{
		ID:          "member-circle-a",
		LoginIDs:    []string{"circle-a@example.com"},
		DisplayName: "Circle A Member",
		Password:    "password",
		Roles:       []string{"participant"},
	}
	cfg.Users = append(cfg.Users, config.User{
		ID:          "demo-user",
		LoginIDs:    []string{"demo@example.com", "24a0000"},
		DisplayName: "Demo User",
		Password:    "password",
		Roles:       []string{"participant"},
		IsVerified:  true,
	})
	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "circle-a@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "circle-a",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/circles/current/members", map[string]string{
		"loginId": "demo@example.com",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/circles/current/members", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var members []circleMemberResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &members); err != nil {
		t.Fatalf("unmarshal circle members response: %v", err)
	}
	if len(members) != 2 {
		t.Fatalf("expected 2 members after direct add, got %#v", members)
	}
	if members[1].UserID != "demo-user" || members[1].DisplayName != "Demo User" || members[1].IsLeader {
		t.Fatalf("unexpected added member: %#v", members[1])
	}
}

func TestAddCurrentCircleMemberRejectsUnknownLoginID(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	cfg.AuthUser = config.AuthUser{
		ID:          "member-circle-a",
		LoginIDs:    []string{"circle-a@example.com"},
		DisplayName: "Circle A Member",
		Password:    "password",
		Roles:       []string{"participant"},
	}
	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "circle-a@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "circle-a",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/circles/current/members", map[string]string{
		"loginId": "missing-user",
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal validation response: %v", err)
	}
	if len(response.Errors["loginId"]) == 0 {
		t.Fatalf("expected loginId validation error, got %#v", response.Errors)
	}
}

func TestAddCurrentCircleMemberAcceptsContactEmail(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	cfg.Users = append(cfg.Users, config.User{
		ID:           "contact-email-member",
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
		"loginId":  "circle-a@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	selectCircle(t, server, cookies, "circle-a")

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/circles/current/members", map[string]string{
		"loginId": "contact-add@example.com",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}
}

func TestAddCurrentCircleMemberRejectsUnverifiedUser(t *testing.T) {
	t.Parallel()

	server := NewServer(circleMemberConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "circle-b@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "circle-b",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/circles/current/members", map[string]string{
		"loginId": "circle-b-unverified@example.com",
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal validation response: %v", err)
	}
	if len(response.Errors["loginId"]) == 0 || response.Errors["loginId"][0] != "このユーザーはメール認証が完了していません" {
		t.Fatalf("unexpected validation error: %#v", response.Errors)
	}
}

func TestRegenerateInvitationTokenAfterSubmitReturnsConflict(t *testing.T) {
	t.Parallel()

	server := NewServer(circleMemberConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "circle-b@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	selectCircle(t, server, cookies, "circle-b")

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
	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusConflict, recorder.Code, recorder.Body.String())
	}
}

func TestListPagesReturnsPublicPagesAcrossCircles(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	cfg.Pages = append(cfg.Pages, config.Page{
		ID:           "page-circle-a-shared",
		CircleID:     "circle-a",
		Title:        "展示向け共通連絡",
		Body:         "展示企画全体への連絡です。",
		Notes:        "",
		IsPinned:     false,
		IsPublic:     true,
		ViewableTags: []string{"展示"},
		DocumentIDs:  []string{},
		PublishedAt:  "2026-03-06T09:00:00Z",
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
		"circleId": "circle-b",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/pages", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response []pageSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal pages response: %v", err)
	}

	if len(response) != 3 {
		t.Fatalf("expected 3 public pages across circles, got %d", len(response))
	}
	if response[0].ID != "page-circle-a-shared" || response[1].ID != "page-circle-b-1" || response[2].ID != "page-circle-a-1" {
		t.Fatalf("expected public pages sorted desc, got %#v", response)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/pages?query=レイアウト", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal searched pages response: %v", err)
	}
	if len(response) != 1 || response[0].ID != "page-circle-b-1" {
		t.Fatalf("unexpected search result: %#v", response)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/pages?query=存在しない語", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal empty search response: %v", err)
	}
	if len(response) != 0 {
		t.Fatalf("expected no search result, got %#v", response)
	}
}

func TestGetPageReturnsPublicPageAcrossCircles(t *testing.T) {
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

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "circle-a",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/pages/page-circle-a-1", nil)
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
	if len(detail.Documents) != 1 || detail.Documents[0].ID != "document-circle-a-1" {
		t.Fatalf("unexpected page documents: %#v", detail.Documents)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/pages/page-circle-a-pinned", nil)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNotFound, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/pages/page-circle-b-1", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal cross-circle page detail: %v", err)
	}
	if detail.ID != "page-circle-b-1" || detail.Title != "展示レイアウト更新" {
		t.Fatalf("unexpected cross-circle page detail: %#v", detail)
	}
}

func TestGetPageAllowsVisiblePageAcrossCirclesByTags(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	cfg.Pages = append(cfg.Pages, config.Page{
		ID:           "page-circle-a-shared",
		CircleID:     "circle-a",
		Title:        "展示向け共通連絡",
		Body:         "展示企画全体への連絡です。",
		Notes:        "",
		IsPinned:     false,
		IsPublic:     true,
		ViewableTags: []string{"展示"},
		DocumentIDs:  []string{"document-circle-a-1"},
		PublishedAt:  "2026-03-06T09:00:00Z",
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
		"circleId": "circle-b",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/pages/page-circle-a-shared", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail pageDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal page detail: %v", err)
	}
	if detail.ID != "page-circle-a-shared" || detail.Title != "展示向け共通連絡" {
		t.Fatalf("unexpected cross-circle page detail: %#v", detail)
	}
	if len(detail.Documents) != 1 || detail.Documents[0].ID != "document-circle-a-1" {
		t.Fatalf("unexpected cross-circle page documents: %#v", detail.Documents)
	}
}

func TestListDocumentsReturnsPublicAcrossCircles(t *testing.T) {
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

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "circle-b",
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
	if response.Items[0].ID != "document-circle-b-1" {
		t.Fatalf("expected first document to be latest public doc, got %s", response.Items[0].ID)
	}
	if response.Items[1].ID != "document-circle-a-1" {
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
	if response.Page != 2 || len(response.Items) != 1 || response.Items[0].ID != "document-circle-a-1" {
		t.Fatalf("expected documents pagination to clamp to last page, got %#v", response)
	}
}

func TestDownloadDocumentFileRequiresVisiblePublicDocument(t *testing.T) {
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

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "circle-a",
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
	if len(detailPage.Items) != 2 || detailPage.Items[1].DownloadURL != "/v1/documents/document-circle-a-1" {
		t.Fatalf("unexpected document list metadata: %#v", detailPage)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/documents/document-circle-a-1", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if recorder.Body.String() != "Aブロックの搬入は 9:00 から 9:30 です。" {
		t.Fatalf("unexpected file content: %s", recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/documents/document-circle-b-private", nil)
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
		"circleId": "circle-b",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/verify/request", map[string]string{})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/verify/confirm", map[string]string{
		"verifyCode": "123456",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doMultipartRequest(
		t,
		server,
		cookies,
		http.MethodPost,
		"/v1/staff/documents",
		"file",
		"circle-b-guide.pdf",
		[]byte("%PDF-1.4 demo"),
		"application/pdf",
		map[string]string{
			"circleId":    "circle-b",
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
		"circle-b-guide-v2.pdf",
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
		"circleId": "circle-b",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/verify/request", map[string]string{})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/verify/confirm", map[string]string{
		"verifyCode": "123456",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

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

	server := NewServer(testConfig())
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "circle-b",
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

	if len(response) != 3 {
		t.Fatalf("expected 3 accessible forms for circle-b, got %d", len(response))
	}
	if response[0].ID != "form-circle-b-closed" {
		t.Fatalf("expected closed form to be first, got %s", response[0].ID)
	}
	if response[1].ID != "form-circle-a-1" || response[2].ID != "form-circle-b-1" {
		t.Fatalf("unexpected visible forms order: %#v", response)
	}
	if !slices.Equal(response[2].AnswerableTags, []string{"展示"}) {
		t.Fatalf("expected answerable tags to be returned, got %#v", response[2].AnswerableTags)
	}
	if response[2].ConfirmationMessage != "展示チェックフォームへの回答を受け付けました。" {
		t.Fatalf("unexpected confirmation message: %#v", response[2])
	}
}

func TestGetFormAllowsClosedAccessibleFormInCurrentCircle(t *testing.T) {
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

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "circle-a",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/forms/form-circle-a-1", nil)
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

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/forms/form-circle-b-closed", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal closed form detail: %v", err)
	}
	if detail.ID != "form-circle-b-closed" || detail.IsOpen {
		t.Fatalf("expected closed accessible form detail, got %#v", detail)
	}
}

func TestClosedFormAnswerMutationsRemainBlocked(t *testing.T) {
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

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "circle-a",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/forms/form-circle-b-closed/answer", map[string]string{
		"body": "締切後の更新",
	})
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNotFound, recorder.Code, recorder.Body.String())
	}
}

func TestGetAndUpsertFormAnswerUsesCurrentCircle(t *testing.T) {
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

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "circle-b",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/forms/form-circle-b-1/answer", nil)
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

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/forms/form-circle-b-1/answer", map[string]string{
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

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/forms/form-circle-b-1/answer", nil)
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

func TestUploadAndDownloadFormAnswerFile(t *testing.T) {
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

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "circle-b",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doMultipartRequest(t, server, cookies, http.MethodPost, "/v1/forms/form-circle-b-1/answer/uploads", "file", "layout.txt", []byte("layout content"), "text/plain", nil)
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

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/forms/form-circle-b-1/answer", nil)
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

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/forms/form-circle-b-1/answer/uploads/"+upload.ID+"/file", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if recorder.Body.String() != "layout content" {
		t.Fatalf("unexpected downloaded content: %q", recorder.Body.String())
	}
}

func TestUpsertFormAnswerRejectsBlankBody(t *testing.T) {
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

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "circle-b",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/forms/form-circle-b-1/answer", map[string]string{
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
	if requestResponse.DeliveryMode != "mock" || requestResponse.VerifyCode != "123456" {
		t.Fatalf("unexpected staff verify request response: %#v", requestResponse)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/verify/confirm", map[string]string{
		"verifyCode": "123456",
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
		"circleId": "circle-b",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/verify/request", map[string]string{})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/verify/confirm", map[string]string{
		"verifyCode": "123456",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

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
		"circleId":     "circle-b",
		"title":        "スタッフ向け新着",
		"body":         "設営順の詳細を更新しました。",
		"notes":        "展示担当に周知済みです。",
		"isPinned":     true,
		"isPublic":     true,
		"viewableTags": []string{"展示"},
		"documentIds":  []string{"document-circle-b-1"},
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

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var mails []staffMailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &mails); err != nil {
		t.Fatalf("unmarshal staff mails: %v", err)
	}
	if len(mails) != 1 || mails[0].Subject != "スタッフ向け新着" {
		t.Fatalf("unexpected queued mails: %#v", mails)
	}
	if len(mails[0].Recipients) != 1 || mails[0].Recipients[0] != "circle-b@example.com" {
		t.Fatalf("unexpected mail recipients: %#v", mails[0].Recipients)
	}
	if !strings.Contains(mails[0].Body, "関連する配布資料") {
		t.Fatalf("expected related documents in mail body, got %#v", mails[0])
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

func TestStaffPageCreateRejectsDocumentsFromDifferentCircle(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "circle-b")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/pages", map[string]any{
		"circleId":     "circle-b",
		"title":        "スタッフ向け新着",
		"body":         "設営順の詳細を更新しました。",
		"notes":        "展示担当に周知済みです。",
		"isPinned":     true,
		"isPublic":     true,
		"viewableTags": []string{"展示"},
		"documentIds":  []string{"document-circle-a-1"},
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal validation response: %v", err)
	}
	if len(response.Errors["documentIds"]) == 0 {
		t.Fatalf("expected documentIds validation error, got %#v", response.Errors)
	}
}

func TestStaffPageUpdateAllowsPreservingLegacyDocumentsFromDifferentCircle(t *testing.T) {
	t.Parallel()

	cfg := testStaffConfig()
	for index := range cfg.Pages {
		if cfg.Pages[index].ID != "page-circle-b-private" {
			continue
		}
		cfg.Pages[index].DocumentIDs = []string{"document-circle-b-private", "document-circle-a-1"}
	}

	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "circle-b")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/pages/page-circle-b-private", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail staffPageDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal staff page detail: %v", err)
	}
	if !slices.Equal(detail.DocumentIDs, []string{"document-circle-b-private", "document-circle-a-1"}) {
		t.Fatalf("expected legacy document ids to be returned, got %#v", detail.DocumentIDs)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/pages/page-circle-b-private", map[string]any{
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
	selectCircle(t, server, cookies, "circle-b")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/pages/page-circle-b-private", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail staffPageDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal staff page detail: %v", err)
	}
	if detail.ID != "page-circle-b-private" || detail.Title != "非公開メモ" || detail.IsPublic {
		t.Fatalf("unexpected staff page detail: %#v", detail)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/pages/page-circle-b-private", map[string]any{
		"title":    "更新済みのお知らせ",
		"body":     "公開向けの本文に更新しました。",
		"isPinned": true,
		"isPublic": true,
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

	recorder = doJSONRequest(t, server, cookies, http.MethodPatch, "/v1/staff/pages/page-circle-b-private/pin", map[string]any{
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
	if rows[0][0] != "circle_id" || rows[1][3] == "" {
		t.Fatalf("unexpected csv rows: %#v", rows)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/pages/page-circle-b-private", nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/pages/page-circle-b-private", nil)
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
	selectCircle(t, server, cookies, "circle-b")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPut, "/v1/forms/form-circle-b-1/answer", map[string]string{
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
		return form.ID == "form-participation-exhibit"
	}) {
		t.Fatalf("expected participation form to stay out of staff forms index, got %#v", forms)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/form-circle-b-1", nil)
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
		"circleId":            "circle-b",
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

func TestStaffFormUpdateAndUploadDownload(t *testing.T) {
	t.Parallel()

	now := testNowUTC()
	openAt := formatRFC3339(now, -24*time.Hour)
	closeAt := formatRFC3339(now, 24*time.Hour)

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "circle-b")
	authorizeStaff(t, server, cookies)

	recorder := doMultipartRequest(t, server, cookies, http.MethodPost, "/v1/forms/form-circle-b-1/answer/uploads", "file", "layout.txt", []byte("layout content"), "text/plain", nil)
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var upload formAnswerUploadResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &upload); err != nil {
		t.Fatalf("unmarshal upload response: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/forms/form-circle-b-1", map[string]any{
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

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/form-circle-b-1", nil)
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

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/form-circle-b-1/uploads/"+upload.ID+"/file", nil)
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
	selectCircle(t, server, cookies, "circle-b")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms/form-circle-b-1/questions", map[string]string{
		"type": "text",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var created staffFormQuestion
	if err := json.Unmarshal(recorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal created question: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/forms/form-circle-b-1/questions/"+created.ID, map[string]any{
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

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms/form-circle-b-1/questions", map[string]string{
		"type": "radio",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var second staffFormQuestion
	if err := json.Unmarshal(recorder.Body.Bytes(), &second); err != nil {
		t.Fatalf("unmarshal second question: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/forms/form-circle-b-1/questions/"+second.ID, map[string]any{
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

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/forms/form-circle-b-1/questions/order", map[string]any{
		"questionIds": []string{second.ID, created.ID},
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/form-circle-b-1", nil)
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

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/forms/form-circle-b-1/questions/"+created.ID, nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}
}

func TestStaffFormAnswersManagement(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "circle-b")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms/form-circle-b-1/questions", map[string]string{
		"type": "text",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var textQuestion staffFormQuestion
	if err := json.Unmarshal(recorder.Body.Bytes(), &textQuestion); err != nil {
		t.Fatalf("unmarshal created text question: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/forms/form-circle-b-1/questions/"+textQuestion.ID, map[string]any{
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

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms/form-circle-b-1/questions", map[string]string{
		"type": "upload",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var uploadQuestion staffFormQuestion
	if err := json.Unmarshal(recorder.Body.Bytes(), &uploadQuestion); err != nil {
		t.Fatalf("unmarshal created upload question: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/forms/form-circle-b-1/questions/"+uploadQuestion.ID, map[string]any{
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

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms/form-circle-b-1/answers", map[string]any{
		"circleId": "circle-a",
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
	if created.Answer.ID == "" || created.Answer.Circle.ID != "circle-a" {
		t.Fatalf("unexpected created answer: %#v", created)
	}
	if created.Answer.CreatedAt == "" {
		t.Fatalf("expected createdAt to be populated, got %#v", created)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var mails []staffMailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &mails); err != nil {
		t.Fatalf("unmarshal mails: %v", err)
	}
	if len(mails) != 1 || !strings.Contains(mails[0].Subject, "展示チェックフォーム") {
		t.Fatalf("unexpected mail queue: %#v", mails)
	}
	if !slices.Contains(mails[0].Recipients, "circle-a@example.com") || !slices.Contains(mails[0].Recipients, "staff@example.com") {
		t.Fatalf("unexpected mail recipients: %#v", mails[0].Recipients)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/form-circle-b-1/answers", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var index staffFormAnswersIndexResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &index); err != nil {
		t.Fatalf("unmarshal answers index: %v", err)
	}
	if len(index.Answers) != 1 || len(index.NotAnsweredCircles) != 1 || index.NotAnsweredCircles[0].ID != "circle-b" {
		t.Fatalf("unexpected answers index: %#v", index)
	}

	recorder = doMultipartRequest(
		t,
		server,
		cookies,
		http.MethodPost,
		"/v1/staff/forms/form-circle-b-1/answers/"+created.Answer.ID+"/uploads",
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
		"/v1/staff/forms/form-circle-b-1/answers/"+created.Answer.ID+"/uploads",
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

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/form-circle-b-1/answers/"+created.Answer.ID+"/edit", nil)
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

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/form-circle-b-1/answers/"+created.Answer.ID+"/uploads/"+uploadQuestion.ID+"/file", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if recorder.Body.String() != "%PDF-1.4 staff-layout" {
		t.Fatalf("unexpected uploaded content: %q", recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/form-circle-b-1/answers/export", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if got := recorder.Header().Get("Content-Type"); got != "text/csv; charset=utf-8" {
		t.Fatalf("unexpected content type: %s", got)
	}
	if !strings.Contains(recorder.Body.String(), "責任者名") || !strings.Contains(recorder.Body.String(), "企画A責任者") {
		t.Fatalf("unexpected csv content: %s", recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/form-circle-b-1/answers/uploads.zip", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if got := recorder.Header().Get("Content-Type"); got != "application/zip" {
		t.Fatalf("unexpected zip content type: %s", got)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/forms/form-circle-b-1/answers/"+created.Answer.ID, nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/form-circle-b-1/answers/not_answered", nil)
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
	selectCircle(t, server, cookies, "circle-b")
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
	selectCircle(t, server, cookies, "circle-b")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms/form-circle-b-1/questions", map[string]string{
		"type": "text",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}
	var createdQuestion staffFormQuestion
	if err := json.Unmarshal(recorder.Body.Bytes(), &createdQuestion); err != nil {
		t.Fatalf("unmarshal created question: %v", err)
	}
	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/forms/form-circle-b-1/questions/"+createdQuestion.ID, map[string]any{
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

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/form-circle-b-1/preview", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	var preview formDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &preview); err != nil {
		t.Fatalf("unmarshal preview: %v", err)
	}
	if preview.ID != "form-circle-b-1" || len(preview.Questions) != 1 {
		t.Fatalf("unexpected preview response: %#v", preview)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms/form-circle-b-1/copy", map[string]any{})
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
	if !strings.Contains(recorder.Body.String(), "フォームID") || !strings.Contains(recorder.Body.String(), copied.ID) {
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
	selectCircle(t, server, cookies, "circle-b")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/form-participation-exhibit", nil)
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

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/form-participation-exhibit/preview", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var preview formDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &preview); err != nil {
		t.Fatalf("unmarshal participation form preview: %v", err)
	}
	if preview.ID != "form-participation-exhibit" {
		t.Fatalf("unexpected participation form preview: %#v", preview)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/forms/form-participation-exhibit", map[string]any{
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

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms/form-participation-exhibit/questions", map[string]string{
		"type": "text",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var created staffFormQuestion
	if err := json.Unmarshal(recorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal participation question: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/forms/form-participation-exhibit/questions/"+created.ID, map[string]any{
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

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/forms/form-participation-exhibit/questions/"+created.ID, nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/form-participation-exhibit/answers", nil)
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
		"groupName":           "Cブロック",
		"participationTypeId": "participation-type-exhibit",
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
		"groupName":           "更新後Cブロック",
		"participationTypeId": "participation-type-food",
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

func TestStaffCirclesRequireCircleAdminRole(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	cfg.AuthUser = config.AuthUser{
		ID:          "forms-user",
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
		"groupName":           " ",
		"participationTypeId": " ",
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal circle validation response: %v", err)
	}
	if len(response.Errors["name"]) == 0 || len(response.Errors["groupName"]) == 0 || len(response.Errors["participationTypeId"]) == 0 {
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
	if len(all) != 2 || all[1].ID != "circle-b" {
		t.Fatalf("unexpected all circles response: %#v", all)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles/export", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if got := recorder.Header().Get("Content-Type"); got != "text/csv; charset=utf-8" {
		t.Fatalf("unexpected content type: %s", got)
	}
	if !strings.Contains(recorder.Body.String(), "participation_type_id") || !strings.Contains(recorder.Body.String(), "circle-b") {
		t.Fatalf("unexpected circles export: %s", recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles/circle-b/email", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var form staffCircleMailFormResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &form); err != nil {
		t.Fatalf("unmarshal circle mail form: %v", err)
	}
	if form.Circle.ID != "circle-b" || len(form.Recipients) != 2 || form.Recipients[0].ID != "member-circle-b" || form.Recipients[1].ID != "member-circle-b-unverified" {
		t.Fatalf("unexpected circle mail form: %#v", form)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/circles/circle-b/email", map[string]any{
		"recipient": "leader",
		"subject":   "搬入のご案内",
		"body":      "9:00 に集合してください。",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	selectCircle(t, server, cookies, "circle-b")
	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var jobs []staffMailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &jobs); err != nil {
		t.Fatalf("unmarshal circle mail jobs: %v", err)
	}
	if len(jobs) != 1 || !slices.Equal(jobs[0].Recipients, []string{"circle-b@example.com"}) {
		t.Fatalf("unexpected circle mail jobs: %#v", jobs)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/circles/circle-b", nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles/circle-b", nil)
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
	if len(all) != 1 || all[0].ID != "circle-a" {
		t.Fatalf("unexpected circles after delete: %#v", all)
	}
}

func TestManagedStaffCirclesHideCircleDetailsFromNonCircleReaders(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	cfg.AuthUser = config.AuthUser{
		ID:          "content-user",
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
		ID:          "admin-target",
		LoginIDs:    []string{"admin-target@example.com"},
		DisplayName: "Admin Target",
		Password:    "password",
		Roles:       []string{"admin"},
		IsVerified:  true,
	})
	cfg.AuthUser = config.AuthUser{
		ID:          "user-manager",
		LoginIDs:    []string{"user-manager@example.com"},
		DisplayName: "User Manager",
		Password:    "password",
		Roles:       []string{"user_manager"},
	}

	server := NewServer(cfg)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "user-manager@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	authorizeStaff(t, server, cookies)

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/users/member-circle-a/roles", map[string]any{
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

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/users/admin-target/roles", map[string]any{
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

func TestStaffFormsExportExcludesParticipationForm(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "circle-b")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/export", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if strings.Contains(recorder.Body.String(), "form-participation-exhibit") {
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
	if len(users.Items) != 4 || users.Items[0].ID != "staff-user" {
		t.Fatalf("unexpected staff users response: %#v", users)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/users/staff-user", nil)
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

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/users/staff-user/roles", map[string]any{
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
	if searched.Total != 1 || searched.Items[0].ID != "member-circle-a" {
		t.Fatalf("expected contact email search to match member-circle-a, got %#v", searched)
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
	if sorted.Items[0].ID != "member-circle-a" {
		t.Fatalf("expected member-circle-a to be first by contactEmail desc, got %#v", sorted.Items)
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
	if filtered.Total != 1 || filtered.Items[0].ID != "member-circle-b-unverified" {
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
		ID:          "content-user",
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

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/permissions/content-user", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail staffPermissionDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal staff permission detail: %v", err)
	}
	if detail.User.ID != "content-user" || !slices.Contains(detail.AssignedPermissionNames, "staff.pages.read,edit") {
		t.Fatalf("unexpected permission detail: %#v", detail)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/permissions/content-user", map[string]any{
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
		ID:          "content-user",
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

	recorder := doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/permissions/staff-user", map[string]any{
		"permissions": []string{"staff.permissions.read"},
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/permissions/content-user", map[string]any{
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

func TestStaffUsersPreventSelfLockout(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/users/staff-user/roles", map[string]any{
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
		ID:          "content-user",
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

	recorder := doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/users/staff-user/roles", map[string]any{
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
	if !strings.Contains(recorder.Body.String(), "is_verified") || !strings.Contains(recorder.Body.String(), "member-circle-b-unverified") {
		t.Fatalf("unexpected users export: %s", recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/staff/users/member-circle-b-unverified", map[string]any{
		"displayName": "Updated Circle B Member",
		"loginIds":    []string{"updated-circle-b@example.com", "24b9999"},
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var updated staffUserSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &updated); err != nil {
		t.Fatalf("unmarshal updated staff user: %v", err)
	}
	if updated.DisplayName != "Updated Circle B Member" || !slices.Equal(updated.LoginIDs, []string{"updated-circle-b@example.com", "24b9999"}) || updated.IsVerified {
		t.Fatalf("unexpected updated user: %#v", updated)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPatch, "/v1/staff/users/member-circle-b-unverified/verify", nil)
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

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/users/member-circle-a", nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/users/member-circle-a", nil)
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

	recorder := doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/staff/users/staff-user", nil)
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
	selectCircle(t, server, cookies, "circle-b")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/pages", map[string]any{
		"circleId": "circle-b",
		"title":    "スタッフ向け新着",
		"body":     "設営順の詳細を更新しました。",
		"isPublic": true,
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms", map[string]any{
		"circleId":            "circle-b",
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

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/mails", map[string]any{
		"circleId":   "circle-b",
		"subject":    "搬入のご案内",
		"body":       "9:00 に集合してください。",
		"recipients": []string{"demo@example.com"},
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
	if len(logs.Items) != 3 || logs.Total != 3 {
		t.Fatalf("expected 3 activity logs, got %#v", logs)
	}
	if logs.Items[0].Action != "staff.mail.queued" || logs.Items[1].Action != "staff.form.created" || logs.Items[2].Action != "staff.page.created" {
		t.Fatalf("unexpected activity logs order: %#v", logs)
	}
}

func TestStaffActivityLogsRequireAdminRole(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	cfg.AuthUser = config.AuthUser{
		ID:          "circle-user",
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
		"groupName":           "Cブロック",
		"participationTypeId": "participation-type-exhibit",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/pages", map[string]any{
		"title":    "新着ページ",
		"body":     "本文",
		"isPublic": true,
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/pages", map[string]any{
		"circleId": "circle-b",
		"title":    "新着ページ",
		"body":     "本文",
		"isPublic": true,
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
	selectCircle(t, server, cookies, "circle-b")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPut, "/v1/forms/form-circle-b-1/answer", map[string]string{
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
	if rows[0][0] != "resource_type" || rows[0][1] != "circle_id" || rows[0][2] != "circle_name" {
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
	selectCircle(t, server, cookies, "circle-b")
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
	selectCircle(t, server, cookies, "circle-b")
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
		"portalUnivemailLocalPart":  "user_id",
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
	if updated.AppName != "PortalDots Next" || updated.PortalUnivemailLocalPart != "user_id" || updated.PortalPrimaryColorH != 24 {
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
	selectCircle(t, server, cookies, "circle-b")
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
	selectCircle(t, server, cookies, "circle-b")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/participation-types/participation-type-food/circles?page=1&pageSize=10", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var response models.PaginatedResponse[staffCircleResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal participation type circles: %v", err)
	}
	if response.Total != 1 || len(response.Items) != 1 || response.Items[0].ID != "circle-a" {
		t.Fatalf("unexpected participation type circle response: %#v", response)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/participation-types/participation-type-food/circles/export", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if got := recorder.Header().Get("Content-Disposition"); !strings.Contains(got, "staff-participation-type-participation-type-food-circles.csv") {
		t.Fatalf("unexpected content disposition: %s", got)
	}

	rows, err := csv.NewReader(bytes.NewReader(recorder.Body.Bytes())).ReadAll()
	if err != nil {
		t.Fatalf("read participation type csv: %v", err)
	}
	if len(rows) != 2 {
		t.Fatalf("expected 2 csv rows, got %#v", rows)
	}
	if got, want := rows[0][0], "id"; got != want {
		t.Fatalf("unexpected header first column: got=%q want=%q", got, want)
	}
	if got, want := rows[1][0], "circle-a"; got != want {
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
	selectCircle(t, server, cookies, "circle-b")
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
	selectCircle(t, server, cookies, "circle-b")
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
	if !slices.Equal(rows[0], wantHeader) {
		t.Fatalf("unexpected header: want=%#v got=%#v", wantHeader, rows[0])
	}

	foundTaggedCircle := false
	for _, row := range rows[1:] {
		if len(row) != 7 {
			t.Fatalf("unexpected row width: %#v", row)
		}
		if row[1] == "展示" && row[2] == "circle-b" {
			foundTaggedCircle = true
		}
	}
	if !foundTaggedCircle {
		t.Fatalf("expected tag export to include circle-b row, got %#v", rows)
	}
}

func TestStaffPlacesExportCSV(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "circle-b")
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
	if !slices.Equal(rows[0], wantHeader) {
		t.Fatalf("unexpected header: want=%#v got=%#v", wantHeader, rows[0])
	}
	if rows[1][0] != "place-indoor-1" || rows[1][4] != "circle-a" {
		t.Fatalf("unexpected first export row: %#v", rows[1])
	}
	if rows[2][0] != "" || rows[2][4] != "circle-b" {
		t.Fatalf("unexpected second export row: %#v", rows[2])
	}
	if rows[3][0] != "place-outdoor-1" || rows[3][4] != "circle-b" {
		t.Fatalf("unexpected third export row: %#v", rows[3])
	}
}

func TestStaffMailsListAndEnqueue(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "circle-b")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var jobs []staffMailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &jobs); err != nil {
		t.Fatalf("unmarshal empty mail list: %v", err)
	}
	if len(jobs) != 0 {
		t.Fatalf("expected empty mail list, got %#v", jobs)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/mails", map[string]any{
		"circleId":   "circle-b",
		"subject":    "搬入のご案内",
		"body":       "9:00 に集合してください。",
		"recipients": []string{"demo@example.com", "sub@example.com"},
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var created staffMailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal created mail: %v", err)
	}
	if created.Status != "queued" || len(created.Recipients) != 2 {
		t.Fatalf("unexpected created mail: %#v", created)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/mails", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &jobs); err != nil {
		t.Fatalf("unmarshal mail list: %v", err)
	}
	if len(jobs) != 1 || jobs[0].Subject != "搬入のご案内" {
		t.Fatalf("unexpected mail list: %#v", jobs)
	}
}

func TestStaffMailValidation(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "circle-b")
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/mails", map[string]any{
		"circleId":   "circle-b",
		"subject":    "   ",
		"body":       "   ",
		"recipients": []string{},
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}

	var response models.ValidationErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal validation response: %v", err)
	}
	if len(response.Errors["subject"]) == 0 || len(response.Errors["recipients"]) == 0 {
		t.Fatalf("expected validation errors, got %#v", response.Errors)
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

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/verify/request", map[string]string{})
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/verify/confirm", map[string]string{
		"verifyCode": "123456",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}
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
		AllowInsecureDefaults:     true,
		AppName:                   "PortalDots",
		PortalDescription:         "学園祭参加団体向けポータル",
		AppURL:                    "https://portal.example.com",
		AppForceHTTPS:             true,
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
			ID:          "demo-user",
			LoginIDs:    []string{"demo@example.com", "24a0000"},
			DisplayName: "Demo User",
			Password:    "password",
			Roles:       []string{"participant"},
		},
		Users: []config.User{
			{
				ID:              "member-circle-a",
				LoginIDs:        []string{"circle-a@example.com"},
				DisplayName:     "Circle A Member",
				Password:        "password",
				Roles:           []string{"participant"},
				CircleIDs:       []string{"circle-a"},
				LeaderCircleIDs: []string{"circle-a"},
				IsVerified:      true,
			},
			{
				ID:              "member-circle-b",
				LoginIDs:        []string{"circle-b@example.com"},
				DisplayName:     "Circle B Member",
				Password:        "password",
				Roles:           []string{"participant"},
				CircleIDs:       []string{"circle-b"},
				LeaderCircleIDs: []string{"circle-b"},
				IsVerified:      true,
			},
			{
				ID:          "member-circle-b-unverified",
				LoginIDs:    []string{"circle-b-unverified@example.com"},
				DisplayName: "Circle B Unverified Member",
				Password:    "password",
				Roles:       []string{"participant"},
				CircleIDs:   []string{"circle-b"},
				IsVerified:  false,
			},
		},
		ParticipationTypes: []config.ParticipationType{
			{
				ID:            "participation-type-food",
				Name:          "模擬店",
				Description:   "模擬店向け参加登録",
				UsersCountMin: 1,
				UsersCountMax: 5,
				Tags:          []string{"模擬店"},
				FormID:        "form-participation-food",
			},
			{
				ID:            "participation-type-exhibit",
				Name:          "展示",
				Description:   "展示向け参加登録",
				UsersCountMin: 1,
				UsersCountMax: 5,
				Tags:          []string{"展示"},
				FormID:        "form-participation-exhibit",
			},
		},
		Tags: []config.Tag{
			{ID: "tag-food", Name: "模擬店"},
			{ID: "tag-exhibit", Name: "展示"},
		},
		Circles: []config.Circle{
			{
				ID:                    "circle-a",
				Name:                  "デモ企画A",
				NameYomi:              "でもきかくえー",
				GroupName:             "Aブロック",
				GroupNameYomi:         "えーぶろっく",
				ParticipationTypeID:   "participation-type-food",
				ParticipationTypeName: "模擬店",
				Tags:                  []string{"模擬店"},
			},
			{
				ID:                    "circle-b",
				Name:                  "デモ企画B",
				NameYomi:              "でもきかくびー",
				GroupName:             "Bブロック",
				GroupNameYomi:         "びーぶろっく",
				ParticipationTypeID:   "participation-type-exhibit",
				ParticipationTypeName: "展示",
				Tags:                  []string{"展示"},
			},
		},
		Places: []config.Place{
			{ID: "place-indoor-1", Name: "1号館 101", Type: 1, Notes: "屋内"},
			{ID: "place-outdoor-1", Name: "中庭", Type: 2, Notes: "屋外"},
		},
		Booths: []config.BoothAssignment{
			{PlaceID: "place-indoor-1", CircleID: "circle-a"},
			{PlaceID: "place-indoor-1", CircleID: "circle-b"},
			{PlaceID: "place-outdoor-1", CircleID: "circle-b"},
		},
		Pages: []config.Page{
			{
				ID:           "page-circle-a-1",
				CircleID:     "circle-a",
				Title:        "搬入時間のお知らせ",
				Body:         "Aブロックの搬入は 9:00 から開始します。",
				Notes:        "搬入担当向けの補足です。",
				IsPinned:     false,
				IsPublic:     true,
				ViewableTags: []string{"模擬店"},
				DocumentIDs:  []string{"document-circle-a-1"},
				PublishedAt:  "2026-03-01T09:00:00Z",
			},
			{
				ID:           "page-circle-a-pinned",
				CircleID:     "circle-a",
				Title:        "固定表示の連絡",
				Body:         "このお知らせは一覧には出しません。",
				Notes:        "",
				IsPinned:     true,
				IsPublic:     true,
				ViewableTags: []string{},
				DocumentIDs:  []string{},
				PublishedAt:  "2026-03-02T09:00:00Z",
			},
			{
				ID:           "page-circle-b-1",
				CircleID:     "circle-b",
				Title:        "展示レイアウト更新",
				Body:         "Bブロックの展示レイアウトを更新しました。",
				Notes:        "展示班向けの差し替え指示あり。",
				IsPinned:     false,
				IsPublic:     true,
				ViewableTags: []string{"展示"},
				DocumentIDs:  []string{"document-circle-b-1"},
				PublishedAt:  "2026-03-03T09:00:00Z",
			},
			{
				ID:           "page-circle-b-private",
				CircleID:     "circle-b",
				Title:        "非公開メモ",
				Body:         "このお知らせは公開されません。",
				Notes:        "スタッフだけが確認するメモです。",
				IsPinned:     false,
				IsPublic:     false,
				ViewableTags: []string{},
				DocumentIDs:  []string{"document-circle-b-private"},
				PublishedAt:  "2026-03-04T09:00:00Z",
			},
		},
		Documents: []config.Document{
			{
				ID:          "document-circle-a-1",
				CircleID:    "circle-a",
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
				ID:          "document-circle-b-1",
				CircleID:    "circle-b",
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
				ID:          "document-circle-b-private",
				CircleID:    "circle-b",
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
				ID:                  "form-participation-food",
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
				ID:                  "form-participation-exhibit",
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
				ID:                  "form-circle-a-1",
				CircleID:            "circle-a",
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
				ID:                  "form-circle-b-1",
				CircleID:            "circle-b",
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
				ID:                  "form-circle-b-closed",
				CircleID:            "circle-b",
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
				ID:                  "form-circle-b-private",
				CircleID:            "circle-b",
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
		ID:          "staff-user",
		LoginIDs:    []string{"staff@example.com"},
		DisplayName: "Staff User",
		Password:    "password",
		Roles:       []string{"admin"},
	}

	return cfg
}

func testStrictStaffConfig() config.Config {
	cfg := testStaffConfig()
	cfg.AllowInsecureDefaults = false
	return cfg
}

func circleMemberConfig() config.Config {
	cfg := testConfig()
	cfg.AuthUser = config.AuthUser{
		ID:          "member-circle-b",
		LoginIDs:    []string{"circle-b@example.com"},
		DisplayName: "Circle B Member",
		Password:    "password",
		Roles:       []string{"participant"},
	}

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
	for _, hdrs := range extraHeaders {
		for k, v := range hdrs {
			req.Header.Set(k, v)
		}
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
		if err := writer.WriteField(key, value); err != nil {
			t.Fatalf("write multipart field %s: %v", key, err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}

	req := httptest.NewRequest(method, path, &body)
	req.Header.Set(echo.HeaderContentType, writer.FormDataContentType())
	for _, cookie := range cookies {
		req.AddCookie(cookie)
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
