//go:build ignore

package server

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

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
		dependencies.Mails,
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
