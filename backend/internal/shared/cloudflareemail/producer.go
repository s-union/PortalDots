package cloudflareemail

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
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
	JobId     string            `json:"jobId"`
	Template  string            `json:"template"`
	Priority  Priority          `json:"priority"`
	From      string            `json:"from"`
	To        []string          `json:"to"`
	Subject   string            `json:"subject"`
	Body      string            `json:"body"`
	Variables map[string]string `json:"variables"`
}

type Sender interface {
	Enqueue(ctx context.Context, job EmailJob) error
}

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
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}
	return nil
}
