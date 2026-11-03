package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/domain/pendingregistration"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/models"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

type registrationConflictRepository struct {
	useradmin.Repository
	err error
}

func (r registrationConflictRepository) Create(useradmin.CreateParams) (useradmin.User, error) {
	return useradmin.User{}, r.err
}

func TestCompleteRegistrationMapsCreateConflictsToFields(t *testing.T) {
	t.Parallel()

	for _, tt := range []struct {
		name  string
		err   error
		field string
	}{
		{"contact email", useradmin.ErrContactEmailConflict, "contactEmail"},
		{"wrapped contact email", fmt.Errorf("create user: %w", useradmin.ErrContactEmailConflict), "contactEmail"},
		{"login ID", useradmin.ErrConflict, "univemail"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			ctx := context.Background()
			pending := pendingregistration.NewMemoryRepository()
			registration, err := pending.Save(ctx, "24v4001@example.ac.jp", "24v4001", hashRegistrationToken("token"), time.Now().Add(time.Hour))
			if err != nil {
				t.Fatal(err)
			}
			if _, err := pending.MarkVerified(ctx, registration.ID, time.Now()); err != nil {
				t.Fatal(err)
			}
			h := authHandlers{
				pendingRegistrations: pending,
				users: registrationConflictRepository{
					Repository: useradmin.NewStaticRepository(config.AuthUser{}, nil),
					err:        tt.err,
				},
			}
			body, err := json.Marshal(map[string]string{
				"pendingRegistrationId": registration.ID,
				"token":                 "token",
				"name":                  "新規 登録",
				"nameYomi":              "しんき とうろく",
				"contactEmail":          "contact@example.com",
				"phoneNumber":           "090-5555-5555",
				"password":              "password123",
				"passwordConfirmation":  "password123",
			})
			if err != nil {
				t.Fatal(err)
			}
			e := echo.New()
			e.POST("/", h.completeRegistration)
			request := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(string(body)))
			request.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			recorder := httptest.NewRecorder()
			e.ServeHTTP(recorder, request)

			if recorder.Code != http.StatusUnprocessableEntity {
				t.Fatalf("status=%d body=%s; want 422", recorder.Code, recorder.Body.String())
			}
			var response models.ValidationErrorResponse
			if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
				t.Fatal(err)
			}
			if len(response.Errors) != 1 || len(response.Errors[tt.field]) == 0 {
				t.Fatalf("expected only %s errors, got %#v", tt.field, response.Errors)
			}
			if _, err := pending.Find(ctx, registration.ID); err != nil {
				t.Fatalf("registration must remain available for retry: %v", err)
			}
		})
	}
}
