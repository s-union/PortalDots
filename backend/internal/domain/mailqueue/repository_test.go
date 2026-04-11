package mailqueue

import (
	"context"
	"testing"
	"time"
)

func TestListQueuedReturnsOldestFirst(t *testing.T) {
	t.Parallel()

	repository := NewMemoryRepository()
	first, err := repository.Enqueue(context.Background(), "circle-a", "staff", "subject-1", "body-1", []string{"a@example.com"})
	if err != nil {
		t.Fatalf("enqueue first mail: %v", err)
	}
	second, err := repository.Enqueue(context.Background(), "circle-a", "staff", "subject-2", "body-2", []string{"b@example.com"})
	if err != nil {
		t.Fatalf("enqueue second mail: %v", err)
	}
	third, err := repository.Enqueue(context.Background(), "circle-a", "staff", "subject-3", "body-3", []string{"c@example.com"})
	if err != nil {
		t.Fatalf("enqueue third mail: %v", err)
	}

	jobs := repository.ListQueued(0)
	if len(jobs) != 3 {
		t.Fatalf("expected 3 queued jobs, got %#v", jobs)
	}
	if jobs[0].ID != first.ID || jobs[1].ID != second.ID || jobs[2].ID != third.ID {
		t.Fatalf("expected oldest-first order, got %#v", jobs)
	}

	limited := repository.ListQueued(2)
	if len(limited) != 2 {
		t.Fatalf("expected 2 jobs with limit, got %#v", limited)
	}
	if limited[0].ID != first.ID || limited[1].ID != second.ID {
		t.Fatalf("expected oldest-first with limit, got %#v", limited)
	}
}

func TestMarkSentReturnsFalseWhenAlreadySent(t *testing.T) {
	t.Parallel()

	repository := NewMemoryRepository()
	job, err := repository.Enqueue(context.Background(), "circle-a", "staff", "subject", "body", []string{"a@example.com"})
	if err != nil {
		t.Fatalf("enqueue mail: %v", err)
	}

	if !repository.MarkSent(job.ID, nowUTC()) {
		t.Fatal("expected first mark sent to succeed")
	}
	if repository.MarkSent(job.ID, nowUTC()) {
		t.Fatal("expected second mark sent to fail for non-queued job")
	}
}

func TestMarkUndeliverableRemovesJobFromQueuedList(t *testing.T) {
	t.Parallel()

	repository := NewMemoryRepository()
	first, err := repository.Enqueue(context.Background(), "circle-a", "staff", "subject-1", "body-1", []string{"a@example.com"})
	if err != nil {
		t.Fatalf("enqueue first mail: %v", err)
	}
	second, err := repository.Enqueue(context.Background(), "circle-a", "staff", "subject-2", "body-2", []string{"b@example.com"})
	if err != nil {
		t.Fatalf("enqueue second mail: %v", err)
	}

	if !repository.MarkUndeliverable(first.ID) {
		t.Fatal("expected mark undeliverable to succeed")
	}
	if repository.MarkUndeliverable(first.ID) {
		t.Fatal("expected second mark undeliverable to fail for non-queued job")
	}

	queued := repository.ListQueued(0)
	if len(queued) != 1 || queued[0].ID != second.ID {
		t.Fatalf("expected only second job to remain queued, got %#v", queued)
	}

	allJobs := repository.ListAll()
	for _, job := range allJobs {
		if job.ID != first.ID {
			continue
		}
		if job.Status != JobStatusUndeliverable {
			t.Fatalf("expected first job status undeliverable, got %#v", job)
		}
		return
	}

	t.Fatalf("expected first job to exist in %#v", allJobs)
}

func nowUTC() time.Time {
	return time.Now().UTC()
}
