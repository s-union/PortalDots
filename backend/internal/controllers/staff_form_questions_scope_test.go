package controllers

import (
	"encoding/json"
	"net/http"
	"reflect"
	"strings"
	"testing"

	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

func TestStaffFormQuestionsStayWithinForm(t *testing.T) {
	for _, backend := range []struct {
		name      string
		newServer func(*testing.T, config.Config) *echo.Echo
	}{
		{"memory", func(_ *testing.T, cfg config.Config) *echo.Echo { return NewServer(cfg) }},
		{"postgres", newSQLCIntegrationServer},
	} {
		t.Run(backend.name, func(t *testing.T) {
			server := backend.newServer(t, testStaffConfig())
			cookies := map[string]*http.Cookie{}
			loginAsStaff(t, server, cookies)
			authorizeStaff(t, server, cookies)

			const ownerForm = "0195ec00-0014-7000-8000-000000000001"
			const otherForm = "0195ec00-0013-7000-8000-000000000001"
			var questionID string
			for _, formID := range []string{ownerForm, ownerForm, otherForm} {
				recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms/"+formID+"/questions", map[string]string{"type": "text"})
				if recorder.Code != http.StatusCreated {
					t.Fatalf("create question: status=%d body=%s", recorder.Code, recorder.Body.String())
				}
				var question staffFormQuestion
				if err := json.Unmarshal(recorder.Body.Bytes(), &question); err != nil {
					t.Fatal(err)
				}
				if questionID == "" {
					questionID = question.ID
				}
			}

			listQuestions := func(formID string) []staffFormQuestion {
				t.Helper()
				recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/"+formID, nil)
				if recorder.Code != http.StatusOK {
					t.Fatalf("get form: status=%d body=%s", recorder.Code, recorder.Body.String())
				}
				var form staffFormDetailResponse
				if err := json.Unmarshal(recorder.Body.Bytes(), &form); err != nil {
					t.Fatal(err)
				}
				return form.Questions
			}
			ownerQuestions := listQuestions(ownerForm)
			otherQuestions := listQuestions(otherForm)
			update := map[string]any{
				"name": "Updated question", "type": "text", "priority": 1,
				"options": []string{},
			}

			for _, method := range []string{http.MethodPut, http.MethodDelete} {
				recorder := doJSONRequest(t, server, cookies, method, "/v1/staff/forms/"+otherForm+"/questions/"+questionID, update)
				if recorder.Code != http.StatusNotFound || !strings.Contains(recorder.Body.String(), "question_not_found") {
					t.Fatalf("cross-form %s: status=%d body=%s", method, recorder.Code, recorder.Body.String())
				}
				if got := listQuestions(ownerForm); !reflect.DeepEqual(got, ownerQuestions) {
					t.Fatalf("cross-form %s changed owner questions: %#v", method, got)
				}
				if got := listQuestions(otherForm); !reflect.DeepEqual(got, otherQuestions) {
					t.Fatalf("cross-form %s changed other questions: %#v", method, got)
				}
			}

			path := "/v1/staff/forms/" + ownerForm + "/questions/" + questionID
			recorder := doJSONRequest(t, server, cookies, http.MethodPut, path, update)
			if recorder.Code != http.StatusOK {
				t.Fatalf("same-form update: status=%d body=%s", recorder.Code, recorder.Body.String())
			}
			recorder = doJSONRequest(t, server, cookies, http.MethodDelete, path, nil)
			if recorder.Code != http.StatusNoContent {
				t.Fatalf("same-form delete: status=%d body=%s", recorder.Code, recorder.Body.String())
			}
			remaining := listQuestions(ownerForm)
			if len(remaining) != 1 || remaining[0].ID != ownerQuestions[1].ID || remaining[0].Priority != 1 {
				t.Fatalf("same-form delete did not preserve and reorder the remaining question: %#v", remaining)
			}
		})
	}
}
