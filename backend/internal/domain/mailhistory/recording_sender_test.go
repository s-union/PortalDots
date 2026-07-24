package mailhistory

import (
	"context"
	"testing"

	"github.com/s-union/PortalDots/backend/internal/shared/cloudflareemail"
)

type capturingSender struct {
	job         cloudflareemail.EmailJob
	syncOutcome cloudflareemail.SyncOutcome
}

func (s *capturingSender) Enqueue(_ context.Context, job cloudflareemail.EmailJob) error {
	s.job = job
	return nil
}

func (s *capturingSender) SyncScheduledPage(_ context.Context, _ cloudflareemail.ScheduledPageEmail) (cloudflareemail.SyncOutcome, error) {
	return s.syncOutcome, nil
}

func TestRecordingSenderSeparatesHistoryBodyFromDeliveredBody(t *testing.T) {
	t.Parallel()

	repository := NewMemoryRepository()
	next := &capturingSender{}
	sender := NewRecordingSender(repository, next)
	job := cloudflareemail.EmailJob{
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

func TestRecordingSenderSyncScheduledPage(t *testing.T) {
	t.Parallel()

	newPayload := func() *cloudflareemail.EmailJob {
		return &cloudflareemail.EmailJob{
			JobId:       "page-job",
			Body:        "body with bearer token",
			HistoryBody: "body without bearer token",
		}
	}

	tests := []struct {
		name        string
		outcome     cloudflareemail.SyncOutcome
		payload     *cloudflareemail.EmailJob
		wantRecords int
	}{
		{name: "scheduled with payload records", outcome: cloudflareemail.SyncScheduled, payload: newPayload(), wantRecords: 1},
		{name: "dispatched with payload records", outcome: cloudflareemail.SyncDispatched, payload: newPayload(), wantRecords: 1},
		{name: "scheduled without payload does not record", outcome: cloudflareemail.SyncScheduled, wantRecords: 0},
		{name: "dispatched without payload does not record", outcome: cloudflareemail.SyncDispatched, wantRecords: 0},
		{name: "updated does not record", outcome: cloudflareemail.SyncUpdated, payload: newPayload(), wantRecords: 0},
		{name: "cancelled does not record", outcome: cloudflareemail.SyncCancelled, payload: newPayload(), wantRecords: 0},
		{name: "unchanged does not record", outcome: cloudflareemail.SyncUnchanged, payload: newPayload(), wantRecords: 0},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()

			repository := NewMemoryRepository()
			next := &capturingSender{syncOutcome: testCase.outcome}
			sender := NewRecordingSender(repository, next)

			outcome, err := sender.SyncScheduledPage(context.Background(), cloudflareemail.ScheduledPageEmail{
				GroupID: "page-1",
				Payload: testCase.payload,
			})
			if err != nil {
				t.Fatalf("SyncScheduledPage() error = %v", err)
			}
			if outcome != testCase.outcome {
				t.Fatalf("SyncScheduledPage() outcome = %q, want %q", outcome, testCase.outcome)
			}

			entries, err := repository.List(context.Background())
			if err != nil {
				t.Fatalf("List() error = %v", err)
			}
			if len(entries) != testCase.wantRecords {
				t.Fatalf("recorded %d entries, want %d (%#v)", len(entries), testCase.wantRecords, entries)
			}
			if testCase.wantRecords != 1 {
				return
			}
			if entries[0].Body != testCase.payload.HistoryBody {
				t.Fatalf("recorded body = %q, want %q", entries[0].Body, testCase.payload.HistoryBody)
			}
			if entries[0].JobID != testCase.payload.JobId {
				t.Fatalf("recorded job id = %q, want %q", entries[0].JobID, testCase.payload.JobId)
			}
		})
	}
}
