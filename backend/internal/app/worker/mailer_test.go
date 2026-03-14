package worker

import (
	"testing"

	"github.com/s-union/PortalDots/backend/internal/domain/mailqueue"
)

func TestProcessMailJobsOnceMarksQueuedJobsAsSent(t *testing.T) {
	t.Parallel()

	repository := mailqueue.NewMemoryRepository()
	repository.Enqueue("circle-a", "staff-user", "件名1", "本文1", []string{"a@example.com"})
	repository.Enqueue("circle-a", "staff-user", "件名2", "本文2", []string{"b@example.com"})

	processed := ProcessMailJobsOnce(repository, 10)
	if processed != 2 {
		t.Fatalf("expected 2 processed jobs, got %d", processed)
	}

	jobs := repository.ListByCircle("circle-a")
	for _, job := range jobs {
		if job.Status != "sent" {
			t.Fatalf("expected sent status, got %#v", job)
		}
		if job.DeliveredAt == "" {
			t.Fatalf("expected delivered timestamp, got %#v", job)
		}
	}
}
