package controllers

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/domain/activitylog"
	"github.com/s-union/PortalDots/backend/internal/domain/answer"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/booth"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/contact"
	"github.com/s-union/PortalDots/backend/internal/domain/contactcategory"
	"github.com/s-union/PortalDots/backend/internal/domain/document"
	"github.com/s-union/PortalDots/backend/internal/domain/form"
	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
	"github.com/s-union/PortalDots/backend/internal/domain/mailhistory"
	"github.com/s-union/PortalDots/backend/internal/domain/page"
	"github.com/s-union/PortalDots/backend/internal/domain/pagemail"
	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
	"github.com/s-union/PortalDots/backend/internal/domain/pendingregistration"
	"github.com/s-union/PortalDots/backend/internal/domain/place"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/domain/tag"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/platform/email"
)

// circleMutationSpyCatalog wraps the static catalog used in tests and records
// whether UpdateForUser/DeleteForUser were ever invoked with a nil user, which
// happens if a caller mistakenly continues past a failed session refresh.
type circleMutationSpyCatalog struct {
	*circle.StaticCatalog
	updateCalledWithNilUser bool
	deleteCalledWithNilUser bool
}

func (s *circleMutationSpyCatalog) UpdateForUser(ctx context.Context, user *auth.User, circleID string, params circle.UpdateCircleParams) (circle.Circle, error) {
	if user == nil {
		s.updateCalledWithNilUser = true
	}
	return s.StaticCatalog.UpdateForUser(ctx, user, circleID, params)
}

func (s *circleMutationSpyCatalog) DeleteForUser(ctx context.Context, user *auth.User, circleID string) error {
	if user == nil {
		s.deleteCalledWithNilUser = true
	}
	return s.StaticCatalog.DeleteForUser(ctx, user, circleID)
}

// newServerWithCircleCatalog builds a server identical to NewServer but with a
// caller-supplied circle.Catalog, so tests can observe how the catalog is
// invoked.
func newServerWithCircleCatalog(cfg config.Config, circles circle.Catalog) *echo.Echo {
	authenticator, err := auth.NewStaticAuthenticator(cfg.AuthUser, cfg.Users)
	if err != nil {
		panic("failed to create static authenticator: " + err.Error())
	}
	mailHistory := mailhistory.NewMemoryRepository()
	return NewServerWithDependencies(
		cfg,
		email.NewSender(cfg, mailHistory),
		activitylog.NewMemoryRepository(),
		answer.NewMemoryRepository(),
		authenticator,
		booth.NewMemoryRepository(cfg.Booths),
		circles,
		contact.NewMemoryRepository(),
		contactcategory.NewMemoryRepository(cfg.ContactCategories),
		document.NewStaticRepository(cfg.Documents),
		form.NewStaticRepository(cfg.Forms),
		formquestion.NewMemoryRepository(),
		mailHistory,
		page.NewStaticRepository(cfg.Pages),
		pendingregistration.NewMemoryRepository(),
		participationtype.NewMemoryRepository(cfg.ParticipationTypes),
		place.NewMemoryRepository(cfg.Places),
		pagemail.NewMemoryRepository(),
		session.NewMemoryStore(cfg.SessionTTL),
		tag.NewMemoryRepository(cfg.Tags),
		useradmin.NewStaticRepository(cfg.AuthUser, cfg.Users),
	)
}

// TestCircleMutationsNeverProceedAfterFailedSessionRefresh reproduces a
// reauthorization failure on the update/delete paths and asserts both that
// the request is rejected and that the catalog is never asked to mutate the
// circle with a nil user. A status-only assertion is not enough here: the
// first, buggy write to the response recorder already fixes the status code
// before the handler mistakenly falls through and calls the catalog again.
func TestCircleMutationsNeverProceedAfterFailedSessionRefresh(t *testing.T) {
	t.Parallel()

	cfg := circleMemberConfig()
	spy := &circleMutationSpyCatalog{StaticCatalog: circle.NewStaticCatalog(cfg.Circles, cfg.AuthUser, cfg.Users)}
	server := newServerWithCircleCatalog(cfg, spy)
	cookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0022-7000-8000-000000000001@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("login status = %d; want %d, body=%s", recorder.Code, http.StatusNoContent, recorder.Body.String())
	}
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/circles/current/detail", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("detail status = %d; want %d, body=%s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	var detail circleDetailResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal circle detail: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/circles/current/submit", map[string]string{
		"lastUpdatedAt": detail.LastUpdatedAt,
	})
	if recorder.Code != http.StatusOK {
		t.Fatalf("submit status = %d; want %d, body=%s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &detail); err != nil {
		t.Fatalf("unmarshal submitted circle detail: %v", err)
	}

	updatePayload := map[string]any{
		"name":          detail.Name,
		"nameYomi":      detail.NameYomi,
		"groupName":     detail.GroupName,
		"groupNameYomi": detail.GroupNameYomi,
		"notes":         detail.Notes,
		"details":       map[string]any{},
	}
	// The circle was submitted just now and the session has never been
	// reauthorized, so refreshCircleMutationSession must refuse both
	// mutations without ever asking the catalog to act on behalf of a nil
	// user.
	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current/detail", updatePayload)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("update without reauthorization status = %d; want %d, body=%s", recorder.Code, http.StatusForbidden, recorder.Body.String())
	}
	if spy.updateCalledWithNilUser {
		t.Fatal("UpdateForUser must not be called with a nil user after a failed session refresh")
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/circles/current", nil)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("delete without reauthorization status = %d; want %d, body=%s", recorder.Code, http.StatusForbidden, recorder.Body.String())
	}
	if spy.deleteCalledWithNilUser {
		t.Fatal("DeleteForUser must not be called with a nil user after a failed session refresh")
	}
}
