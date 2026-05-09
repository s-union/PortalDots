package mailhistory

import (
	"context"
	"sync"
	"time"

	"github.com/s-union/PortalDots/backend/internal/shared/cloudflareemail"
)

type Entry struct {
	JobID      string
	Template   string
	Priority   cloudflareemail.Priority
	From       string
	Subject    string
	Body       string
	Recipients []string
	CreatedAt  string
}

type Repository interface {
	Record(ctx context.Context, job cloudflareemail.EmailJob) error
	List(ctx context.Context) ([]Entry, error)
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

func (r *MemoryRepository) Record(_ context.Context, job cloudflareemail.EmailJob) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, entry := range r.entries {
		if entry.JobID == job.JobId {
			return nil
		}
	}

	r.entries = append(r.entries, Entry{
		JobID:      job.JobId,
		Template:   job.Template,
		Priority:   job.Priority,
		From:       job.From,
		Subject:    job.Subject,
		Body:       job.Body,
		Recipients: append([]string(nil), job.To...),
		CreatedAt:  time.Now().UTC().Format(time.RFC3339),
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
