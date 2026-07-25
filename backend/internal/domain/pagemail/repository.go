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
	// The job ID of an already scheduled page is preserved so that a retried
	// dispatch stays idempotent.
	Schedule(ctx context.Context, pageID, jobID, actorUserID string) error
	// Unschedule drops a pending intent. Mail that was already sent is kept.
	Unschedule(ctx context.Context, pageID string) error
	// ClaimDue marks up to limit due mails as being dispatched and returns them.
	ClaimDue(ctx context.Context, limit int) ([]Schedule, error)
	// Release returns a claimed mail to the pending state without counting an attempt.
	Release(ctx context.Context, pageID string) error
	// MarkSent records that the mail was accepted by the mail worker.
	MarkSent(ctx context.Context, pageID string) error
	// MarkFailed counts a failed attempt, giving up once maxAttempts is reached.
	MarkFailed(ctx context.Context, pageID string, maxAttempts int, cause string) error
	// ReclaimStale returns mails claimed before the given time to the pending
	// state, recovering from a process that died mid-dispatch.
	ReclaimStale(ctx context.Context, claimedBefore time.Time) (int, error)
}

type memoryEntry struct {
	Schedule
	status    string
	claimedAt time.Time
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
		if existing.status == "sent" || existing.status == "dispatching" {
			return nil
		}
		existing.ActorUserID = actorUserID
		existing.status = "pending"
		existing.DispatchAttempts = 0
		return nil
	}
	r.entries[pageID] = &memoryEntry{
		Schedule: Schedule{PageID: pageID, JobID: jobID, ActorUserID: actorUserID},
		status:   "pending",
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

// ClaimDue returns every pending entry. The in-memory repository has no page
// table to join, so the caller filters unpublished pages out itself.
func (r *MemoryRepository) ClaimDue(_ context.Context, limit int) ([]Schedule, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	claimed := make([]Schedule, 0, limit)
	for _, entry := range r.entries {
		if len(claimed) >= limit {
			break
		}
		if entry.status != "pending" {
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
	}

	return nil
}

func (r *MemoryRepository) MarkSent(_ context.Context, pageID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if entry, ok := r.entries[pageID]; ok {
		entry.status = "sent"
		entry.DispatchAttempts++
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
		return nil
	}
	entry.status = "pending"

	return nil
}

func (r *MemoryRepository) ReclaimStale(_ context.Context, claimedBefore time.Time) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	reclaimed := 0
	for _, entry := range r.entries {
		if entry.status == "dispatching" && entry.claimedAt.Before(claimedBefore) {
			entry.status = "pending"
			reclaimed++
		}
	}

	return reclaimed, nil
}
