package mailhistory

import (
	"context"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/s-union/PortalDots/backend/internal/shared/emailqueue"
)

type Entry struct {
	JobID      string
	Template   string
	Priority   emailqueue.Priority
	From       string
	Subject    string
	Body       string
	Recipients []string
	CreatedAt  string
	createdAt  time.Time
}

type Repository interface {
	Record(ctx context.Context, job emailqueue.EmailJob) error
	List(ctx context.Context) ([]Entry, error)
	ListPage(ctx context.Context, limit int, cursor string) (Page, error)
	ListContactHistory(ctx context.Context, userID, circleID string) ([]Entry, error)
	Delete(ctx context.Context, jobID string) error
}

type MemoryRepository struct {
	mu      sync.RWMutex
	entries []Entry
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		entries: []Entry{},
	}
}

func (r *MemoryRepository) Record(_ context.Context, job emailqueue.EmailJob) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, entry := range r.entries {
		if entry.JobID == job.JobId {
			return nil
		}
	}

	now := time.Now().UTC()
	r.entries = append(r.entries, Entry{
		JobID:      job.JobId,
		Template:   job.Template,
		Priority:   job.Priority,
		From:       job.From,
		Subject:    job.Subject,
		Body:       job.Body,
		Recipients: append([]string(nil), job.To...),
		CreatedAt:  now.Format(time.RFC3339),
		createdAt:  now,
	})
	return nil
}

func (r *MemoryRepository) List(_ context.Context) ([]Entry, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	entries := make([]Entry, 0, len(r.entries))
	for index := len(r.entries) - 1; index >= 0; index-- {
		entry := r.entries[index]
		entry.Recipients = append([]string(nil), entry.Recipients...)
		entries = append(entries, entry)
	}
	return entries, nil
}

func (r *MemoryRepository) Delete(_ context.Context, jobID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index, entry := range r.entries {
		if entry.JobID == jobID {
			r.entries = append(r.entries[:index], r.entries[index+1:]...)
			return nil
		}
	}
	return nil
}

func (r *MemoryRepository) ListPage(_ context.Context, limit int, cursor string) (Page, error) {
	before, err := decodeCursor(cursor)
	if err != nil {
		return Page{}, err
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	entries := slices.Clone(r.entries)
	slices.SortFunc(entries, func(a, b Entry) int {
		if order := b.createdAt.Compare(a.createdAt); order != 0 {
			return order
		}
		return strings.Compare(b.JobID, a.JobID)
	})
	result := make([]Entry, 0, limit+1)
	for _, entry := range entries {
		if before != nil && (entry.createdAt.After(before.CreatedAt) || entry.createdAt.Equal(before.CreatedAt) && entry.JobID >= before.JobID) {
			continue
		}
		entry.Recipients = slices.Clone(entry.Recipients)
		result = append(result, entry)
		if len(result) > limit {
			break
		}
	}
	return buildPage(result, limit)
}

func (r *MemoryRepository) ListContactHistory(_ context.Context, userID, circleID string) ([]Entry, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	entries := []Entry{}
	for index := len(r.entries) - 1; index >= 0; index-- {
		entry := r.entries[index]
		if strings.HasPrefix(entry.JobID, "contact-confirm-") || !ContactHistoryMatches(entry.Body, circleID, userID) {
			continue
		}
		entry.Body = ContactHistoryHeader(entry.Body)
		entry.Recipients = nil
		entries = append(entries, entry)
	}
	return entries, nil
}
