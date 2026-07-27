package emailqueue

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestEnqueue_SendsCorrectPayload(t *testing.T) {
	t.Parallel()

	var received map[string]any
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
		if err := json.NewDecoder(r.Body).Decode(&received); err != nil {
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
		Body:        "delivered",
		HistoryBody: "must not be delivered",
		Variables: map[string]string{
			"appName": "PortalDots",
		},
	})
	if err != nil {
		t.Fatalf("enqueue failed: %v", err)
	}
	if received["jobId"] != "job-1" {
		t.Errorf("expected jobId job-1, got %v", received["jobId"])
	}
	if received["priority"] != string(PriorityHigh) {
		t.Errorf("expected priority high, got %v", received["priority"])
	}
	if received["body"] != "delivered" {
		t.Errorf("expected the delivered body on the wire, got %v", received["body"])
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
