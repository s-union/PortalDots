package controllers

import (
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestParseRFC3339Field(t *testing.T) {
	t.Parallel()

	if _, ok := parseRFC3339Field("invalid"); ok {
		t.Fatal("expected invalid RFC3339 value to be rejected")
	}
	if parsed, ok := parseRFC3339Field("2026-04-01T09:00:00Z"); !ok || parsed.IsZero() {
		t.Fatalf("expected valid RFC3339 value, got %v %v", parsed, ok)
	}
}

func TestBindAndValidateStaffForm(t *testing.T) {
	t.Parallel()

	newContext := func(body string) echo.Context {
		e := echo.New()
		req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		return e.NewContext(req, rec)
	}

	t.Run("bind failure returns invalid request", func(t *testing.T) {
		t.Parallel()

		_, errors, ok := bindAndValidateStaffForm(newContext("{"), true)
		if ok {
			t.Fatal("expected invalid JSON to fail")
		}
		want := map[string][]string{"request": {"invalid_request"}}
		if !reflect.DeepEqual(errors, want) {
			t.Fatalf("unexpected errors: %#v", errors)
		}
	})

	t.Run("trims and validates valid request", func(t *testing.T) {
		t.Parallel()

		request, errors, ok := bindAndValidateStaffForm(newContext(`{
			"circleId": " circle-1 ",
			"name": " 参加申請 ",
			"description": " 説明 ",
			"openAt": "2026-04-01T09:00:00Z",
			"closeAt": "2026-04-02T09:00:00Z",
			"maxAnswers": 2,
			"answerableTags": [" crew ", "", "staff"],
			"confirmationMessage": " 完了 "
		}`), true)

		if !ok {
			t.Fatalf("expected request to be valid, got %#v", errors)
		}
		if request.CircleID != "circle-1" || request.Name != "参加申請" || request.Description != "説明" {
			t.Fatalf("expected trimmed request, got %#v", request)
		}
		if request.ConfirmationMessage != "完了" {
			t.Fatalf("expected trimmed confirmation message, got %q", request.ConfirmationMessage)
		}
		if !reflect.DeepEqual(request.AnswerableTags, []string{"crew", "staff"}) {
			t.Fatalf("unexpected tags: %#v", request.AnswerableTags)
		}
		if len(errors) != 0 {
			t.Fatalf("expected no errors, got %#v", errors)
		}
	})

	t.Run("returns validation errors for invalid request", func(t *testing.T) {
		t.Parallel()

		_, errors, ok := bindAndValidateStaffForm(newContext(`{
			"circleId": "",
			"name": " ",
			"openAt": "invalid",
			"closeAt": "2026-04-01T09:00:00Z",
			"maxAnswers": 0
		}`), true)

		if ok {
			t.Fatal("expected request to be invalid")
		}
		if !reflect.DeepEqual(errors["circleId"], []string{"企画を選択してください"}) {
			t.Fatalf("unexpected circle errors: %#v", errors["circleId"])
		}
		if !reflect.DeepEqual(errors["name"], []string{"フォーム名を入力してください"}) {
			t.Fatalf("unexpected name errors: %#v", errors["name"])
		}
		if !reflect.DeepEqual(errors["maxAnswers"], []string{"回答可能数は 1 以上にしてください"}) {
			t.Fatalf("unexpected maxAnswers errors: %#v", errors["maxAnswers"])
		}
		if !reflect.DeepEqual(errors["openAt"], []string{"開始日時は RFC3339 形式で入力してください"}) {
			t.Fatalf("unexpected openAt errors: %#v", errors["openAt"])
		}
	})

	t.Run("rejects close time before open time", func(t *testing.T) {
		t.Parallel()

		_, errors, ok := bindAndValidateStaffForm(newContext(`{
			"circleId": "circle-1",
			"name": "参加申請",
			"openAt": "2026-04-02T09:00:00Z",
			"closeAt": "2026-04-01T09:00:00Z",
			"maxAnswers": 1
		}`), false)

		if ok {
			t.Fatal("expected request to be invalid")
		}
		if !reflect.DeepEqual(errors["closeAt"], []string{"締切日時は開始日時より後にしてください"}) {
			t.Fatalf("unexpected closeAt errors: %#v", errors["closeAt"])
		}
	})
}

func TestValidateStaffFormQuestionRequest(t *testing.T) {
	t.Parallel()

	t.Run("validates question-specific fields", func(t *testing.T) {
		t.Parallel()

		min := int32(5)
		max := int32(3)
		request := &updateStaffFormQuestionRequest{
			Name:      "",
			Type:      "number",
			NumberMin: &min,
			NumberMax: &max,
		}

		errors := validateStaffFormQuestionRequest(request)

		if !reflect.DeepEqual(errors["name"], []string{"設問名を入力してください"}) {
			t.Fatalf("unexpected name errors: %#v", errors["name"])
		}
		if !reflect.DeepEqual(errors["numberMax"], []string{"最大値は最小値以上にしてください"}) {
			t.Fatalf("unexpected numberMax errors: %#v", errors["numberMax"])
		}
		if request.AllowedTypes != "" {
			t.Fatalf("expected non-upload question to clear allowed types, got %q", request.AllowedTypes)
		}
	})

	t.Run("requires options for select-like questions", func(t *testing.T) {
		t.Parallel()

		request := &updateStaffFormQuestionRequest{
			Name:    "区分",
			Type:    "select",
			Options: nil,
		}

		errors := validateStaffFormQuestionRequest(request)
		if !reflect.DeepEqual(errors["options"], []string{"選択肢を 1 つ以上指定してください"}) {
			t.Fatalf("unexpected options errors: %#v", errors["options"])
		}
	})

	t.Run("preserves allowed types for upload and rejects invalid type", func(t *testing.T) {
		t.Parallel()

		request := &updateStaffFormQuestionRequest{
			Name:         "添付",
			Type:         "unknown",
			AllowedTypes: "pdf",
		}

		errors := validateStaffFormQuestionRequest(request)
		if !reflect.DeepEqual(errors["type"], []string{"設問タイプが不正です"}) {
			t.Fatalf("unexpected type errors: %#v", errors["type"])
		}

		uploadRequest := &updateStaffFormQuestionRequest{
			Name:         "添付",
			Type:         "upload",
			AllowedTypes: "pdf",
		}
		errors = validateStaffFormQuestionRequest(uploadRequest)
		if len(errors) != 0 {
			t.Fatalf("expected upload request to be valid, got %#v", errors)
		}
		if uploadRequest.AllowedTypes != "pdf" {
			t.Fatalf("expected upload allowed types to be preserved, got %q", uploadRequest.AllowedTypes)
		}
	})
}

func TestNormalizeQuestionOptions(t *testing.T) {
	t.Parallel()

	got := normalizeQuestionOptions([]string{" A ", "", "B"})
	want := []string{"A", "B"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("unexpected options: %#v", got)
	}
}
