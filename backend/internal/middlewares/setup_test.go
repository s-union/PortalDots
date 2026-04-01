package middlewares

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
)

type stubSessionAccess struct {
	sessions map[string]session.Session
}

func (s stubSessionAccess) Get(id string) (session.Session, bool) {
	current, ok := s.sessions[id]
	return current, ok
}

func TestVerifyCSRF(t *testing.T) {
	t.Parallel()

	baseConfig := SessionMiddlewareConfig{
		SessionCookieName: "session",
		Sessions: stubSessionAccess{
			sessions: map[string]session.Session{
				"session-1": {CSRFToken: "token-1"},
			},
		},
	}

	t.Run("skips safe methods", func(t *testing.T) {
		t.Parallel()

		e := echo.New()
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		called := false
		handler := VerifyCSRF(baseConfig)(func(c echo.Context) error {
			called = true
			return c.NoContent(http.StatusNoContent)
		})

		if err := handler(c); err != nil {
			t.Fatalf("expected middleware to pass through, got %v", err)
		}
		if !called {
			t.Fatal("expected next handler to be called")
		}
		if rec.Code != http.StatusNoContent {
			t.Fatalf("expected 204, got %d", rec.Code)
		}
	})

	t.Run("rejects mismatched token", func(t *testing.T) {
		t.Parallel()

		e := echo.New()
		req := httptest.NewRequest(http.MethodPost, "/", nil)
		req.AddCookie(&http.Cookie{Name: "session", Value: "session-1"})
		req.Header.Set("X-CSRF-Token", "wrong")
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		called := false
		handler := VerifyCSRF(baseConfig)(func(c echo.Context) error {
			called = true
			return c.NoContent(http.StatusNoContent)
		})

		if err := handler(c); err != nil {
			t.Fatalf("expected JSON response, got %v", err)
		}
		if called {
			t.Fatal("expected next handler not to be called")
		}
		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403, got %d", rec.Code)
		}
		if rec.Body.String() != "{\"message\":\"csrf_token_invalid\"}\n" {
			t.Fatalf("unexpected response body: %q", rec.Body.String())
		}
	})

	t.Run("allows matching token and insecure defaults", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			name   string
			cfg    SessionMiddlewareConfig
			header string
		}{
			{
				name:   "matching token",
				cfg:    baseConfig,
				header: "token-1",
			},
			{
				name: "allow insecure defaults",
				cfg: SessionMiddlewareConfig{
					SessionCookieName:     "session",
					AllowInsecureDefaults: true,
					Sessions:              baseConfig.Sessions,
				},
				header: "",
			},
		}

		for _, tc := range testCases {
			tc := tc
			t.Run(tc.name, func(t *testing.T) {
				t.Parallel()

				e := echo.New()
				req := httptest.NewRequest(http.MethodPost, "/", nil)
				req.AddCookie(&http.Cookie{Name: "session", Value: "session-1"})
				if tc.header != "" {
					req.Header.Set("X-CSRF-Token", tc.header)
				}
				rec := httptest.NewRecorder()
				c := e.NewContext(req, rec)

				called := false
				handler := VerifyCSRF(tc.cfg)(func(c echo.Context) error {
					called = true
					return c.NoContent(http.StatusNoContent)
				})

				if err := handler(c); err != nil {
					t.Fatalf("expected middleware to pass through, got %v", err)
				}
				if !called {
					t.Fatal("expected next handler to be called")
				}
				if rec.Code != http.StatusNoContent {
					t.Fatalf("expected 204, got %d", rec.Code)
				}
			})
		}
	})
}

func TestRequireWorkspaceUser(t *testing.T) {
	t.Parallel()

	cfg := SessionMiddlewareConfig{
		SessionCookieName: "session",
		Sessions: stubSessionAccess{
			sessions: map[string]session.Session{
				"session-1": {
					User: &auth.User{
						ID:          "user-1",
						DisplayName: "User One",
						Roles:       []string{"participant"},
					},
				},
			},
		},
	}

	t.Run("returns unauthorized without session", func(t *testing.T) {
		t.Parallel()

		e := echo.New()
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		handler := RequireWorkspaceUser(cfg)(func(c echo.Context) error {
			return c.NoContent(http.StatusNoContent)
		})

		if err := handler(c); err != nil {
			t.Fatalf("expected JSON response, got %v", err)
		}
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", rec.Code)
		}
	})

	t.Run("stores session in context", func(t *testing.T) {
		t.Parallel()

		e := echo.New()
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.AddCookie(&http.Cookie{Name: "session", Value: "session-1"})
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		handler := RequireWorkspaceUser(cfg)(func(c echo.Context) error {
			sessionID, currentSession, ok := SessionFromContext(c)
			if !ok {
				t.Fatal("expected session in context")
			}
			if sessionID != "session-1" {
				t.Fatalf("expected session id to be stored, got %q", sessionID)
			}
			if currentSession.User == nil || currentSession.User.ID != "user-1" {
				t.Fatalf("expected authenticated user, got %+v", currentSession.User)
			}
			return c.NoContent(http.StatusNoContent)
		})

		if err := handler(c); err != nil {
			t.Fatalf("expected middleware to pass through, got %v", err)
		}
		if rec.Code != http.StatusNoContent {
			t.Fatalf("expected 204, got %d", rec.Code)
		}
	})
}

func TestRequireStaffMode(t *testing.T) {
	t.Parallel()

	baseSession := session.Session{
		User: &auth.User{
			ID:          "staff-1",
			DisplayName: "Staff One",
			Roles:       []string{"staff"},
			Permissions: []string{"forms:read"},
		},
	}

	t.Run("returns forbidden for non-staff or unverified staff", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			name           string
			cfg            SessionMiddlewareConfig
			hasStaffAccess func([]string, []string) bool
			wantStatus     int
		}{
			{
				name: "missing session",
				cfg: SessionMiddlewareConfig{
					SessionCookieName: "session",
					Sessions:          stubSessionAccess{sessions: map[string]session.Session{}},
				},
				hasStaffAccess: func(_ []string, _ []string) bool { return true },
				wantStatus:     http.StatusUnauthorized,
			},
			{
				name: "staff capability denied",
				cfg: SessionMiddlewareConfig{
					SessionCookieName: "session",
					Sessions: stubSessionAccess{sessions: map[string]session.Session{
						"session-1": baseSession,
					}},
				},
				hasStaffAccess: func(_ []string, _ []string) bool { return false },
				wantStatus:     http.StatusForbidden,
			},
			{
				name: "staff not authorized",
				cfg: SessionMiddlewareConfig{
					SessionCookieName: "session",
					Sessions: stubSessionAccess{sessions: map[string]session.Session{
						"session-1": baseSession,
					}},
				},
				hasStaffAccess: func(_ []string, _ []string) bool { return true },
				wantStatus:     http.StatusForbidden,
			},
		}

		for _, tc := range testCases {
			tc := tc
			t.Run(tc.name, func(t *testing.T) {
				t.Parallel()

				e := echo.New()
				req := httptest.NewRequest(http.MethodGet, "/", nil)
				req.AddCookie(&http.Cookie{Name: "session", Value: "session-1"})
				rec := httptest.NewRecorder()
				c := e.NewContext(req, rec)

				handler := RequireStaffMode(tc.cfg, tc.hasStaffAccess)(func(c echo.Context) error {
					return c.NoContent(http.StatusNoContent)
				})

				if err := handler(c); err != nil {
					t.Fatalf("expected JSON response, got %v", err)
				}
				if rec.Code != tc.wantStatus {
					t.Fatalf("expected %d, got %d", tc.wantStatus, rec.Code)
				}
			})
		}
	})

	t.Run("allows authorized staff and insecure defaults", func(t *testing.T) {
		t.Parallel()

		testCases := []SessionMiddlewareConfig{
			{
				SessionCookieName: "session",
				Sessions: stubSessionAccess{sessions: map[string]session.Session{
					"session-1": {
						User:            baseSession.User,
						StaffAuthorized: true,
					},
				}},
			},
			{
				SessionCookieName:     "session",
				AllowInsecureDefaults: true,
				Sessions: stubSessionAccess{sessions: map[string]session.Session{
					"session-1": baseSession,
				}},
			},
		}

		for _, cfg := range testCases {
			cfg := cfg
			t.Run(cfg.SessionCookieName, func(t *testing.T) {
				t.Parallel()

				e := echo.New()
				req := httptest.NewRequest(http.MethodGet, "/", nil)
				req.AddCookie(&http.Cookie{Name: "session", Value: "session-1"})
				rec := httptest.NewRecorder()
				c := e.NewContext(req, rec)

				handler := RequireStaffMode(cfg, func(_ []string, _ []string) bool { return true })(func(c echo.Context) error {
					sessionID, _, ok := SessionFromContext(c)
					if !ok || sessionID != "session-1" {
						t.Fatalf("expected context session, got %q %v", sessionID, ok)
					}
					return c.NoContent(http.StatusNoContent)
				})

				if err := handler(c); err != nil {
					t.Fatalf("expected middleware to pass through, got %v", err)
				}
				if rec.Code != http.StatusNoContent {
					t.Fatalf("expected 204, got %d", rec.Code)
				}
			})
		}
	})
}

func TestSessionFromContextRejectsInvalidValues(t *testing.T) {
	t.Parallel()

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	c.Set(sessionIDContextKey, 123)
	c.Set(sessionContextKey, "not-session")

	if _, _, ok := SessionFromContext(c); ok {
		t.Fatal("expected invalid context values to be rejected")
	}
}
