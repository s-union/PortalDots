package mailhistory

import (
	"context"
	"testing"

	"github.com/s-union/PortalDots/backend/internal/shared/emailqueue"
)

type capturingSender struct {
	job emailqueue.EmailJob
}

func (s *capturingSender) Enqueue(_ context.Context, job emailqueue.EmailJob) error {
	s.job = job
	return nil
}

func TestRecordingSenderSeparatesHistoryBodyFromDeliveredBody(t *testing.T) {
	t.Parallel()

	repository := NewMemoryRepository()
	next := &capturingSender{}
	sender := NewRecordingSender(repository, next)
	job := emailqueue.EmailJob{
		JobId:       "contact-job",
		Body:        "body with bearer token",
		HistoryBody: "body without bearer token",
	}

	if err := sender.Enqueue(context.Background(), job); err != nil {
		t.Fatalf("Enqueue() error = %v", err)
	}
	entries, err := repository.List(context.Background())
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	if len(entries) != 1 || entries[0].Body != job.HistoryBody {
		t.Fatalf("recorded body = %#v, want %q", entries, job.HistoryBody)
	}
	if next.job.Body != job.Body {
		t.Fatalf("delivered body = %q, want %q", next.job.Body, job.Body)
	}
}
