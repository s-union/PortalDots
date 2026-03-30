package mailqueue

import "testing"

func TestListQueuedReturnsOldestFirst(t *testing.T) {
	t.Parallel()

	repository := NewMemoryRepository()
	first := repository.Enqueue("circle-a", "staff", "subject-1", "body-1", []string{"a@example.com"})
	second := repository.Enqueue("circle-a", "staff", "subject-2", "body-2", []string{"b@example.com"})
	third := repository.Enqueue("circle-a", "staff", "subject-3", "body-3", []string{"c@example.com"})

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
