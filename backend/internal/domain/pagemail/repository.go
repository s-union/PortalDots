package pagemail

import (
	"context"
	"sync"
	"time"
)

// Schedule is the recorded intent to send the announcement email of a page.
//
// It deliberately carries neither the send time nor the mail body: both are
// derived from the live page row when the mail is dispatched. That is what
// makes unpublishing, rescheduling and deleting a page take effect without any
// reconciliation step.
type Schedule struct {
	PageID           string
	JobID            string
	ActorUserID      string
	DispatchAttempts int
}

// Repository stores the intent to send announcement emails.
type Repository interface {
	// Schedule records the intent to send the announcement email of a page.
	// The job ID of a pending or failed page is preserved so that a retried
	// dispatch stays idempotent; sent and skipped pages are rearmed with the
	// caller's new job ID.
	Schedule(ctx context.Context, pageID, jobID, actorUserID string) error
	// Unschedule drops a pending intent. Mail that was already sent is kept.
	Unschedule(ctx context.Context, pageID string) error
	// HasActiveSchedule reports whether a page still has an unsent mail intent.
	// Pending and dispatching rows are active; failed, sent and skipped rows are
	// not active because they will not be delivered without an explicit retry.
	HasActiveSchedule(ctx context.Context, pageID string) (bool, error)
	// ClaimDue marks up to limit due mails as being dispatched and returns them.
	ClaimDue(ctx context.Context, limit int) ([]Schedule, error)
	// Release returns a claimed mail to the pending state without counting an attempt.
	Release(ctx context.Context, pageID string) error
	// MarkSent records that the mail was accepted by the mail worker.
	MarkSent(ctx context.Context, pageID string) error
	// MarkSkipped records that a due mail had no recipients at dispatch time.
	MarkSkipped(ctx context.Context, pageID string) error
	// MarkFailed counts a failed attempt, giving up once maxAttempts is reached.
	MarkFailed(ctx context.Context, pageID string, maxAttempts int, cause string) error
	// ReclaimStale returns mails claimed before the given time to the pending
	// state, recovering from a process that died mid-dispatch.
	ReclaimStale(ctx context.Context, claimedBefore time.Time) (int, error)
}

type memoryEntry struct {
	Schedule
	status        string
	claimedAt     time.Time
	nextAttemptAt time.Time
}

// MemoryRepository is an in-memory Repository for tests and static deployments.
type MemoryRepository struct {
	mu      sync.Mutex
	entries map[string]*memoryEntry
}

// NewMemoryRepository creates an empty in-memory Repository.
func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{entries: map[string]*memoryEntry{}}
}

func (r *MemoryRepository) Schedule(_ context.Context, pageID, jobID, actorUserID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if existing, ok := r.entries[pageID]; ok {
		if existing.status == "dispatching" {
			return nil
		}
		if existing.status == "sent" || existing.status == "skipped" {
			existing.JobID = jobID
		}
		existing.ActorUserID = actorUserID
		existing.status = "pending"
		existing.DispatchAttempts = 0
		existing.nextAttemptAt = time.Now()
		return nil
	}
	r.entries[pageID] = &memoryEntry{
		Schedule:      Schedule{PageID: pageID, JobID: jobID, ActorUserID: actorUserID},
		status:        "pending",
		nextAttemptAt: time.Now(),
	}

	return nil
}

func (r *MemoryRepository) Unschedule(_ context.Context, pageID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if existing, ok := r.entries[pageID]; ok && (existing.status == "pending" || existing.status == "failed") {
		delete(r.entries, pageID)
	}

	return nil
}

func (r *MemoryRepository) HasActiveSchedule(_ context.Context, pageID string) (bool, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	entry, ok := r.entries[pageID]
	if !ok {
		return false, nil
	}

	return entry.status == "pending" || entry.status == "dispatching", nil
}

// ClaimDue returns every currently due pending entry. The in-memory repository
// has no page table to join, so the caller filters unpublished pages out itself.
func (r *MemoryRepository) ClaimDue(_ context.Context, limit int) ([]Schedule, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	claimed := make([]Schedule, 0, limit)
	for _, entry := range r.entries {
		if len(claimed) >= limit {
			break
		}
		if entry.status != "pending" || entry.nextAttemptAt.After(time.Now()) {
			continue
		}
		entry.status = "dispatching"
		entry.claimedAt = time.Now()
		claimed = append(claimed, entry.Schedule)
	}

	return claimed, nil
}

func (r *MemoryRepository) Release(_ context.Context, pageID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if entry, ok := r.entries[pageID]; ok && entry.status == "dispatching" {
		entry.status = "pending"
		entry.nextAttemptAt = time.Now()
	}

	return nil
}

func (r *MemoryRepository) MarkSent(_ context.Context, pageID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if entry, ok := r.entries[pageID]; ok {
		entry.status = "sent"
		entry.DispatchAttempts++
		entry.nextAttemptAt = time.Now()
	}

	return nil
}

func (r *MemoryRepository) MarkFailed(_ context.Context, pageID string, maxAttempts int, _ string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	entry, ok := r.entries[pageID]
	if !ok {
		return nil
	}
	entry.DispatchAttempts++
	if entry.DispatchAttempts >= maxAttempts {
		entry.status = "failed"
		entry.nextAttemptAt = time.Now()
		return nil
	}
	entry.status = "pending"
	backoff := time.Minute << min(entry.DispatchAttempts-1, 6)
	if backoff > time.Hour {
		backoff = time.Hour
	}
	entry.nextAttemptAt = time.Now().Add(backoff)

	return nil
}

func (r *MemoryRepository) MarkSkipped(_ context.Context, pageID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if entry, ok := r.entries[pageID]; ok {
		entry.status = "skipped"
		entry.nextAttemptAt = time.Now()
	}

	return nil
}

func (r *MemoryRepository) ReclaimStale(_ context.Context, claimedBefore time.Time) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	reclaimed := 0
	for _, entry := range r.entries {
		if entry.status == "dispatching" && entry.claimedAt.Before(claimedBefore) {
			entry.status = "pending"
			entry.nextAttemptAt = time.Now()
			reclaimed++
		}
	}

	return reclaimed, nil
}
