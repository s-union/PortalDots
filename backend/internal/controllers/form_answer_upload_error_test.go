package controllers

import (
	"context"
	"errors"
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

// forcedUploadErrorRepository wraps the in-memory answer repository and
// forces AddUpload/AddUploadToAnswer to fail with a configured error, so
// tests can drive the handler's error-mapping without crafting a real 5MiB
// payload.
type forcedUploadErrorRepository struct {
	*answer.MemoryRepository
	err error
}

func (r *forcedUploadErrorRepository) AddUpload(_ context.Context, _, _, _, _, _ string, _ []byte) (answer.Upload, error) {
	return answer.Upload{}, r.err
}

func (r *forcedUploadErrorRepository) AddUploadToAnswer(_ context.Context, _, _, _, _ string, _ []byte) (answer.Upload, error) {
	return answer.Upload{}, r.err
}

// newServerWithAnswerRepository builds a server identical to NewServer but
// with a caller-supplied answer.Repository.
func newServerWithAnswerRepository(cfg config.Config, answers answer.Repository) *echo.Echo {
	authenticator, err := auth.NewStaticAuthenticator(cfg.AuthUser, cfg.Users)
	if err != nil {
		panic("failed to create static authenticator: " + err.Error())
	}
	mailHistory := mailhistory.NewMemoryRepository()
	return NewServerWithDependencies(
		cfg,
		email.NewSender(cfg, mailHistory),
		activitylog.NewMemoryRepository(),
		answers,
		authenticator,
		booth.NewMemoryRepository(cfg.Booths),
		circle.NewStaticCatalog(cfg.Circles, cfg.AuthUser, cfg.Users),
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

// TestUploadFormAnswerFileKeepsUnrelatedFailuresAsInternalError confirms a
// genuine repository failure is reported as a 500, so the handler's
// error-mapping does not swallow real failures.
func TestUploadFormAnswerFileKeepsUnrelatedFailuresAsInternalError(t *testing.T) {
	t.Parallel()

	server, questionID := newUploadErrorTestServer(t, errors.New("boom"))
	cookies := loginAndSelectCircleForUpload(t, server)

	recorder := doMultipartRequest(t, server, cookies, http.MethodPost, "/v1/forms/0195ec00-0014-7000-8000-000000000001/answer/uploads", "file", "layout.txt", []byte("layout content"), "text/plain", map[string]string{
		"questionId": questionID,
	})
	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("unrelated failure upload status = %d; want %d, body=%s", recorder.Code, http.StatusInternalServerError, recorder.Body.String())
	}
}

func newUploadErrorTestServer(t *testing.T, forcedErr error) (*echo.Echo, string) {
	t.Helper()

	cfg := testStaffConfig()
	server := newServerWithAnswerRepository(cfg, &forcedUploadErrorRepository{
		MemoryRepository: answer.NewMemoryRepository(),
		err:              forcedErr,
	})

	staffCookies := map[string]*http.Cookie{}
	loginAsStaff(t, server, staffCookies)
	authorizeStaff(t, server, staffCookies)
	questionID := createTestUploadQuestion(t, server, staffCookies, "0195ec00-0014-7000-8000-000000000001", "txt")

	return server, questionID
}

func loginAndSelectCircleForUpload(t *testing.T, server *echo.Echo) map[string]*http.Cookie {
	t.Helper()

	cookies := map[string]*http.Cookie{}
	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0022-7000-8000-000000000001@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("login status = %d; want %d, body=%s", recorder.Code, http.StatusNoContent, recorder.Body.String())
	}
	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current", map[string]string{
		"circleId": "0195ec00-0022-7000-8000-000000000001",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("select circle status = %d; want %d, body=%s", recorder.Code, http.StatusNoContent, recorder.Body.String())
	}
	return cookies
}
