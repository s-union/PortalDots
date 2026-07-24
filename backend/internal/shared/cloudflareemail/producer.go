package cloudflareemail

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"
)

type Priority string

const (
	PriorityHigh   Priority = "high"
	PriorityNormal Priority = "normal"
)

type EmailJob struct {
	JobId       string            `json:"jobId"`
	Template    string            `json:"template"`
	Priority    Priority          `json:"priority"`
	From        string            `json:"from"`
	To          []string          `json:"to"`
	Subject     string            `json:"subject"`
	Body        string            `json:"body"`
	HistoryBody string            `json:"-"`
	Variables   map[string]string `json:"variables"`
}

type Sender interface {
	Enqueue(ctx context.Context, job EmailJob) error
	SyncScheduledPage(ctx context.Context, req ScheduledPageEmail) (SyncOutcome, error)
}

// ScheduledPageEmail reconciles the announcement email for a single page with
// the email worker. The worker is the source of truth for any pending scheduled
// email, keyed by GroupID (the page ID).
type ScheduledPageEmail struct {
	GroupID    string
	IsPublic   bool
	SendEmails bool
	SendAt     time.Time
	Payload    *EmailJob
}

type SyncOutcome string

const (
	SyncScheduled  SyncOutcome = "scheduled"
	SyncUpdated    SyncOutcome = "updated"
	SyncDispatched SyncOutcome = "dispatched"
	SyncCancelled  SyncOutcome = "cancelled"
	SyncUnchanged  SyncOutcome = "unchanged"
)

type NoopSender struct{}

func NewNoopSender() NoopSender {
	return NoopSender{}
}

func (NoopSender) Enqueue(_ context.Context, job EmailJob) error {
	slog.Info("email producer is not configured; skipping email delivery",
		"job_id", job.JobId,
		"template", job.Template,
		"recipients", len(job.To),
		"verifyURL", job.Variables["verifyURL"],
	)
	return nil
}

func (NoopSender) SyncScheduledPage(_ context.Context, req ScheduledPageEmail) (SyncOutcome, error) {
	slog.Info("email producer is not configured; skipping scheduled page email sync",
		"kind", "email",
		"group_id", req.GroupID,
		"is_public", req.IsPublic,
		"send_emails", req.SendEmails,
	)
	// deliberate: mirror the worker state machine so mail history, activity
	// logs, and queued-mail observations still fire without an email producer.
	if !req.IsPublic {
		return SyncCancelled, nil
	}
	if req.SendEmails && req.Payload != nil {
		if !req.SendAt.IsZero() && req.SendAt.After(time.Now()) {
			return SyncScheduled, nil
		}
		return SyncDispatched, nil
	}
	return SyncUnchanged, nil
}

type ProducerClient struct {
	BaseURL    string
	AuthToken  string
	HTTPClient *http.Client
}

func NewProducerClient(baseURL, authToken string) *ProducerClient {
	return &ProducerClient{
		BaseURL:   baseURL,
		AuthToken: authToken,
		HTTPClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *ProducerClient) Enqueue(ctx context.Context, job EmailJob) error {
	body, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("marshal email job: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/enqueue", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.AuthToken)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer func() {
		_, _ = io.Copy(io.Discard, resp.Body)
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}
	return nil
}

func (c *ProducerClient) SyncScheduledPage(ctx context.Context, req ScheduledPageEmail) (SyncOutcome, error) {
	wire := struct {
		GroupID    string    `json:"groupId"`
		IsPublic   bool      `json:"isPublic"`
		SendEmails bool      `json:"sendEmails"`
		SendAt     string    `json:"sendAt,omitempty"`
		Payload    *EmailJob `json:"payload"`
	}{
		GroupID:    req.GroupID,
		IsPublic:   req.IsPublic,
		SendEmails: req.SendEmails,
		Payload:    req.Payload,
	}
	if !req.SendAt.IsZero() {
		wire.SendAt = req.SendAt.UTC().Format(time.RFC3339)
	}

	body, err := json.Marshal(wire)
	if err != nil {
		return SyncUnchanged, fmt.Errorf("marshal scheduled page email: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/scheduled/sync", bytes.NewReader(body))
	if err != nil {
		return SyncUnchanged, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.AuthToken)

	resp, err := c.HTTPClient.Do(httpReq)
	if err != nil {
		return SyncUnchanged, fmt.Errorf("send request: %w", err)
	}
	defer func() {
		_, _ = io.Copy(io.Discard, resp.Body)
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusOK {
		return SyncUnchanged, fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	var result struct {
		Status SyncOutcome `json:"status"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return SyncUnchanged, fmt.Errorf("decode response: %w", err)
	}
	return result.Status, nil
}
