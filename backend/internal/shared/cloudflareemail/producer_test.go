package cloudflareemail

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestEnqueue_SendsCorrectPayload(t *testing.T) {
	t.Parallel()

	var receivedJob EmailJob
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if r.URL.Path != "/enqueue" {
			t.Errorf("expected /enqueue, got %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer test-token" {
			t.Errorf("expected Authorization header, got %s", r.Header.Get("Authorization"))
		}
		if err := json.NewDecoder(r.Body).Decode(&receivedJob); err != nil {
			t.Fatalf("failed to decode body: %v", err)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := NewProducerClient(server.URL, "test-token")
	err := client.Enqueue(context.Background(), EmailJob{
		JobId:       "job-1",
		Template:    "markdown-notice",
		Priority:    PriorityHigh,
		From:        "sender@example.com",
		To:          []string{"a@example.com", "b@example.com"},
		Subject:     "Test",
		HistoryBody: "must not be delivered",
		Variables: map[string]string{
			"appName": "PortalDots",
		},
	})
	if err != nil {
		t.Fatalf("enqueue failed: %v", err)
	}
	if receivedJob.JobId != "job-1" {
		t.Errorf("expected jobId job-1, got %s", receivedJob.JobId)
	}
	if receivedJob.Priority != PriorityHigh {
		t.Errorf("expected priority high, got %s", receivedJob.Priority)
	}
	if receivedJob.HistoryBody != "" {
		t.Errorf("history body leaked into producer payload: %q", receivedJob.HistoryBody)
	}
}

func TestEmailJobHistoryBodyIsNotSerialized(t *testing.T) {
	t.Parallel()

	payload, err := json.Marshal(EmailJob{Body: "delivered", HistoryBody: "recorded"})
	if err != nil {
		t.Fatalf("Marshal() error = %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(payload, &decoded); err != nil {
		t.Fatalf("Unmarshal() error = %v", err)
	}
	if _, exists := decoded["HistoryBody"]; exists {
		t.Fatalf("serialized payload exposed HistoryBody: %s", payload)
	}
	if _, exists := decoded["historyBody"]; exists {
		t.Fatalf("serialized payload exposed historyBody: %s", payload)
	}
}

func TestEnqueue_ReturnsErrorOnNon200(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
	}))
	defer server.Close()

	client := NewProducerClient(server.URL, "test-token")
	err := client.Enqueue(context.Background(), EmailJob{
		JobId:   "job-1",
		From:    "sender@example.com",
		To:      []string{"a@example.com"},
		Subject: "Test",
	})
	if err == nil {
		t.Fatal("expected error for 400 response")
	}
}

func TestEnqueue_ReturnsErrorOnConnectionFailure(t *testing.T) {
	t.Parallel()

	client := NewProducerClient("http://127.0.0.1:1", "test-token")
	err := client.Enqueue(context.Background(), EmailJob{
		JobId:   "job-1",
		From:    "sender@example.com",
		To:      []string{"a@example.com"},
		Subject: "Test",
	})
	if err == nil {
		t.Fatal("expected error for connection failure")
	}
}

func TestSyncScheduledPage_SendsCorrectPayload(t *testing.T) {
	t.Parallel()

	var received map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/scheduled/sync" {
			t.Errorf("expected /scheduled/sync, got %s", r.URL.Path)
		}
		if err := json.NewDecoder(r.Body).Decode(&received); err != nil {
			t.Fatalf("failed to decode body: %v", err)
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"success":true,"status":"scheduled"}`))
	}))
	defer server.Close()

	client := NewProducerClient(server.URL, "test-token")
	sendAt := time.Date(2026, 8, 1, 9, 0, 0, 0, time.UTC)
	outcome, err := client.SyncScheduledPage(context.Background(), ScheduledPageEmail{
		GroupID:    "page-1",
		IsPublic:   true,
		SendEmails: true,
		SendAt:     sendAt,
		Payload: &EmailJob{
			JobId:       "job-1",
			Template:    "markdown-notice",
			From:        "sender@example.com",
			To:          []string{"a@example.com"},
			Subject:     "Test",
			Body:        "delivered",
			HistoryBody: "must not be delivered",
		},
	})
	if err != nil {
		t.Fatalf("sync failed: %v", err)
	}
	if outcome != SyncScheduled {
		t.Errorf("expected outcome scheduled, got %s", outcome)
	}
	if received["groupId"] != "page-1" || received["isPublic"] != true || received["sendEmails"] != true {
		t.Errorf("unexpected envelope: %#v", received)
	}
	if received["sendAt"] != "2026-08-01T09:00:00Z" {
		t.Errorf("expected sendAt 2026-08-01T09:00:00Z, got %v", received["sendAt"])
	}
	payload, _ := received["payload"].(map[string]any)
	if payload == nil || payload["jobId"] != "job-1" {
		t.Errorf("expected payload jobId job-1, got %#v", received["payload"])
	}
	if _, exists := payload["HistoryBody"]; exists {
		t.Errorf("history body leaked into payload: %#v", payload)
	}
}

func TestSyncScheduledPage_OmitsSendAtWhenZero(t *testing.T) {
	t.Parallel()

	var received map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&received)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"success":true,"status":"cancelled"}`))
	}))
	defer server.Close()

	client := NewProducerClient(server.URL, "test-token")
	outcome, err := client.SyncScheduledPage(context.Background(), ScheduledPageEmail{
		GroupID:  "page-1",
		IsPublic: false,
	})
	if err != nil {
		t.Fatalf("sync failed: %v", err)
	}
	if outcome != SyncCancelled {
		t.Errorf("expected outcome cancelled, got %s", outcome)
	}
	if _, exists := received["sendAt"]; exists {
		t.Errorf("expected sendAt to be omitted when zero, got %#v", received)
	}
	if received["payload"] != nil {
		t.Errorf("expected nil payload, got %#v", received["payload"])
	}
}
