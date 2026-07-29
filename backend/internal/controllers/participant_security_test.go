package controllers

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestSubmittedCircleMutationsRequireFreshReauthorization(t *testing.T) {
	t.Parallel()

	server := NewServer(circleMemberConfig())
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
	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current/detail", updatePayload)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("update without reauthorization status = %d; want %d, body=%s", recorder.Code, http.StatusForbidden, recorder.Body.String())
	}
	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/circles/current", nil)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("delete without reauthorization status = %d; want %d, body=%s", recorder.Code, http.StatusForbidden, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodPost, "/v1/circles/current/auth", map[string]string{
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("reauthorization status = %d; want %d, body=%s", recorder.Code, http.StatusNoContent, recorder.Body.String())
	}
	recorder = doJSONRequest(t, server, cookies, http.MethodPut, "/v1/circles/current/detail", updatePayload)
	if recorder.Code != http.StatusOK {
		t.Fatalf("update after reauthorization status = %d; want %d, body=%s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	recorder = doJSONRequest(t, server, cookies, http.MethodDelete, "/v1/circles/current", nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("delete after reauthorization status = %d; want %d, body=%s", recorder.Code, http.StatusNoContent, recorder.Body.String())
	}
}

func TestParticipantUploadPathsRequireUploadQuestionAndReplace(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	staffCookies := map[string]*http.Cookie{}
	loginAsStaff(t, server, staffCookies)
	authorizeStaff(t, server, staffCookies)
	questionID := createTestUploadQuestion(t, server, staffCookies, "0195ec00-0014-7000-8000-000000000001", "txt")

	cookies := map[string]*http.Cookie{}
	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0022-7000-8000-000000000001@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("login status = %d; want %d, body=%s", recorder.Code, http.StatusNoContent, recorder.Body.String())
	}
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")

	uploadPath := "/v1/forms/0195ec00-0014-7000-8000-000000000001/answer/uploads"
	recorder = doMultipartRequest(t, server, cookies, http.MethodPost, uploadPath, "file", "missing.txt", []byte("missing"), "text/plain", nil)
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("current upload without question status = %d; want %d, body=%s", recorder.Code, http.StatusUnprocessableEntity, recorder.Body.String())
	}
	recorder = doMultipartRequest(t, server, cookies, http.MethodPost, uploadPath, "file", "unknown.txt", []byte("unknown"), "text/plain", map[string]string{
		"questionId": "0195ec00-0099-7000-8000-000000000099",
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("current upload with unknown question status = %d; want %d, body=%s", recorder.Code, http.StatusUnprocessableEntity, recorder.Body.String())
	}
	recorder = doMultipartRequest(t, server, cookies, http.MethodPost, uploadPath, "file", "first.txt", []byte("first"), "text/plain", map[string]string{
		"questionId": questionID,
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("current upload status = %d; want %d, body=%s", recorder.Code, http.StatusCreated, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/forms/0195ec00-0014-7000-8000-000000000001/answer", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("answer status = %d; want %d, body=%s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	var envelope formAnswerEnvelopeResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("unmarshal answer: %v", err)
	}
	if envelope.Answer == nil {
		t.Fatal("expected current upload to create an answer")
	}

	byIDPath := "/v1/forms/0195ec00-0014-7000-8000-000000000001/answers/" + envelope.Answer.ID + "/uploads"
	recorder = doMultipartRequest(t, server, cookies, http.MethodPost, byIDPath, "file", "missing.txt", []byte("missing"), "text/plain", nil)
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("answer upload without question status = %d; want %d, body=%s", recorder.Code, http.StatusUnprocessableEntity, recorder.Body.String())
	}
	recorder = doMultipartRequest(t, server, cookies, http.MethodPost, byIDPath, "file", "unknown.txt", []byte("unknown"), "text/plain", map[string]string{
		"questionId": "0195ec00-0099-7000-8000-000000000099",
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("answer upload with unknown question status = %d; want %d, body=%s", recorder.Code, http.StatusUnprocessableEntity, recorder.Body.String())
	}
	recorder = doMultipartRequest(t, server, cookies, http.MethodPost, byIDPath, "file", "replacement.txt", []byte("replacement"), "text/plain", map[string]string{
		"questionId": questionID,
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("answer replacement upload status = %d; want %d, body=%s", recorder.Code, http.StatusCreated, recorder.Body.String())
	}
	var replacement formAnswerUploadResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &replacement); err != nil {
		t.Fatalf("unmarshal replacement upload: %v", err)
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/forms/0195ec00-0014-7000-8000-000000000001/answers/"+envelope.Answer.ID, nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("answer detail status = %d; want %d, body=%s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("unmarshal updated answer: %v", err)
	}
	if envelope.Answer == nil || len(envelope.Answer.Uploads) != 1 || envelope.Answer.Uploads[0].ID != replacement.ID {
		t.Fatalf("uploads after replacement = %#v; want only replacement", envelope.Answer)
	}
}
