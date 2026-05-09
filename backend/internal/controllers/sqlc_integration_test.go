package controllers

import (
	"context"
	"encoding/json"
	"net/http"
	"slices"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/models"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/platform/database"
	"github.com/s-union/PortalDots/backend/internal/testutil/dbtest"
)

const testCircleBID = "0195ec00-0022-7000-8000-000000000001"

func TestSQLCStaffEndpointsSmoke(t *testing.T) {
	cfg := testStaffConfig()
	server := newSQLCIntegrationServer(t, cfg)
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	authorizeStaff(t, server, cookies)

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/circles", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var circles models.PaginatedResponse[staffCircleResponse]
	if err := json.Unmarshal(recorder.Body.Bytes(), &circles); err != nil {
		t.Fatalf("unmarshal sqlc staff circles response: %v", err)
	}
	if len(circles.Items) != 2 || circles.Total != 2 {
		t.Fatalf("expected 2 staff circles, got %#v", circles)
	}
	if circles.Items[1].ID != testCircleBID || len(circles.Items[1].Places) != 2 {
		t.Fatalf("expected circle B to include seeded place names, got %#v", circles.Items[1])
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var forms []staffFormSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &forms); err != nil {
		t.Fatalf("unmarshal sqlc staff forms response: %v", err)
	}
	if len(forms) != 4 {
		t.Fatalf("expected 4 managed staff forms, got %#v", forms)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/documents", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var documents []staffDocumentSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &documents); err != nil {
		t.Fatalf("unmarshal sqlc staff documents response: %v", err)
	}
	if len(documents) != 3 {
		t.Fatalf("expected 3 managed staff documents, got %#v", documents)
	}
}

func TestSQLCStaffFormsSupportGlobalForms(t *testing.T) {
	cfg := testStaffConfig()
	cfg.Users = append(cfg.Users, config.User{
		ID:              "0195ec00-0093-7000-8000-000000000001",
		LoginIDs:        []string{"demo@example.com"},
		DisplayName:     "Demo User",
		Password:        "password",
		Roles:           []string{"participant"},
		CircleIDs:       []string{"0195ec00-0021-7000-8000-000000000001", testCircleBID},
		LeaderCircleIDs: []string{"0195ec00-0021-7000-8000-000000000001", testCircleBID},
		IsVerified:      true,
	})
	server := newSQLCIntegrationServer(t, cfg)
	staffCookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, staffCookies)
	authorizeStaff(t, server, staffCookies)

	now := testNowUTC()
	openAt := formatRFC3339(now, -24*time.Hour)
	closeAt := formatRFC3339(now, 24*time.Hour)

	recorder := doJSONRequest(t, server, staffCookies, http.MethodPost, "/v1/staff/forms", map[string]any{
		"name":                "SQLC全体フォーム",
		"description":         "SQLC 経由の全体向けフォームです。",
		"openAt":              openAt,
		"closeAt":             closeAt,
		"maxAnswers":          1,
		"answerableTags":      []string{},
		"confirmationMessage": "SQLC 全体フォームへの回答ありがとうございました。",
		"isPublic":            true,
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var created staffFormSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal created sqlc global form: %v", err)
	}
	if created.ID == "" || created.Circle.ID != "" {
		t.Fatalf("expected sqlc global form without circle, got %#v", created)
	}

	recorder = doJSONRequest(t, server, staffCookies, http.MethodGet, "/v1/staff/forms/"+created.ID, nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var detail staffFormDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal sqlc global form detail: %v", err)
	}
	if detail.ID != created.ID || detail.Circle.ID != "" || detail.Name != "SQLC全体フォーム" {
		t.Fatalf("unexpected sqlc global form detail: %#v", detail)
	}

	participantCookies := map[string]*http.Cookie{}
	recorder = doJSONRequest(t, server, participantCookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "demo@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	selectCircle(t, server, participantCookies, testCircleBID)

	recorder = doJSONRequest(t, server, participantCookies, http.MethodGet, "/v1/forms", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}

	var forms []formSummaryResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &forms); err != nil {
		t.Fatalf("unmarshal sqlc workspace forms: %v", err)
	}
	if !slices.ContainsFunc(forms, func(form formSummaryResponse) bool {
		return form.ID == created.ID && form.Name == "SQLC全体フォーム"
	}) {
		t.Fatalf("expected sqlc global form in workspace list, got %#v", forms)
	}
}

func newSQLCIntegrationServer(t *testing.T, cfg config.Config) *echo.Echo {
	t.Helper()

	cfg.DatabaseURL = dbtest.RequireDatabaseURL(t)
	cfg.MigrationsDir = dbtest.MigrationsDir(t)

	lockPool := dbtest.OpenLockedPool(t, cfg.DatabaseURL)
	dbtest.ResetPublicSchema(t, lockPool)

	dependencies, err := database.BuildDependencies(context.Background(), cfg)
	if err != nil {
		t.Fatalf("build sqlc dependencies: %v", err)
	}
	t.Cleanup(dependencies.Close)

	return NewServerWithDependencies(
		cfg,
		dependencies.Activities,
		dependencies.Answers,
		dependencies.Authenticator,
		dependencies.Booths,
		dependencies.Circles,
		dependencies.ContactCategories,
		dependencies.Documents,
		dependencies.Forms,
		dependencies.FormQuestions,
		dependencies.MailHistory,
		dependencies.Pages,
		dependencies.PendingRegistrations,
		dependencies.ParticipationTypes,
		dependencies.Portal,
		dependencies.Places,
		dependencies.Sessions,
		dependencies.Tags,
		dependencies.Users,
	)
}
