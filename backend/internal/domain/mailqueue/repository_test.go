package mailqueue

import (
	"context"
	"testing"
)

func TestEnqueueCreatesJob(t *testing.T) {
	t.Parallel()

	repository := NewMemoryRepository()
	job, err := repository.Enqueue(context.Background(), "circle-a", "staff", "subject", "body", []string{"a@example.com"})
	if err != nil {
		t.Fatalf("enqueue mail: %v", err)
	}
	if job.ID == "" {
		t.Fatal("expected non-empty job ID")
	}
	if job.Status != JobStatusQueued {
		t.Fatalf("expected status queued, got %q", job.Status)
	}
}

func TestListAllReturnsJobs(t *testing.T) {
	t.Parallel()

	repository := NewMemoryRepository()
	_, _ = repository.Enqueue(context.Background(), "circle-a", "staff", "subject-1", "body-1", []string{"a@example.com"})
	_, _ = repository.Enqueue(context.Background(), "circle-a", "staff", "subject-2", "body-2", []string{"b@example.com"})

	jobs := repository.ListAll()
	if len(jobs) != 2 {
		t.Fatalf("expected 2 jobs, got %d", len(jobs))
	}
}

func TestListByCircleFiltersByCircle(t *testing.T) {
	t.Parallel()

	repository := NewMemoryRepository()
	_, _ = repository.Enqueue(context.Background(), "circle-a", "staff", "s-1", "b-1", []string{"a@example.com"})
	_, _ = repository.Enqueue(context.Background(), "circle-b", "staff", "s-2", "b-2", []string{"b@example.com"})

	if jobs := repository.ListByCircle("circle-a"); len(jobs) != 1 {
		t.Fatalf("expected 1 job for circle-a, got %d", len(jobs))
	}
	if jobs := repository.ListByCircle("circle-b"); len(jobs) != 1 {
		t.Fatalf("expected 1 job for circle-b, got %d", len(jobs))
	}
}

func TestDeleteAllClearsJobs(t *testing.T) {
	t.Parallel()

	repository := NewMemoryRepository()
	_, _ = repository.Enqueue(context.Background(), "circle-a", "staff", "subject", "body", []string{"a@example.com"})

	if err := repository.DeleteAll(); err != nil {
		t.Fatalf("delete all: %v", err)
	}
	if len(repository.ListAll()) != 0 {
		t.Fatal("expected no jobs after delete all")
	}
}

func TestDeleteByCircleRemovesOnlyTargetCircle(t *testing.T) {
	t.Parallel()

	repository := NewMemoryRepository()
	_, _ = repository.Enqueue(context.Background(), "circle-a", "staff", "s-1", "b-1", []string{"a@example.com"})
	_, _ = repository.Enqueue(context.Background(), "circle-b", "staff", "s-2", "b-2", []string{"b@example.com"})

	if err := repository.DeleteByCircle("circle-a"); err != nil {
		t.Fatalf("delete by circle: %v", err)
	}
	jobs := repository.ListAll()
	if len(jobs) != 1 || jobs[0].CircleID != "circle-b" {
		t.Fatalf("expected only circle-b job, got %#v", jobs)
	}
}
