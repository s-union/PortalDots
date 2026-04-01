package mailqueue

import (
	"context"
	"fmt"
	"slices"
	"sync"
	"time"
)

type Job struct {
	ID              string
	CircleID        string
	Subject         string
	Body            string
	Recipients      []string
	Status          string
	CreatedByUserID string
	CreatedAt       string
	DeliveredAt     string
}

type Repository interface {
	Enqueue(ctx context.Context, circleID, createdByUserID, subject, body string, recipients []string) (Job, error)
	ListAll() []Job
	ListByCircle(circleID string) []Job
	ListQueued(limit int) []Job
	MarkSent(id string, deliveredAt time.Time) bool
	DeleteAll()
	DeleteByCircle(circleID string)
}

type MemoryRepository struct {
	mu     sync.RWMutex
	jobs   []Job
	nextID int
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		jobs:   []Job{},
		nextID: 1,
	}
}

func (r *MemoryRepository) Enqueue(_ context.Context, circleID, createdByUserID, subject, body string, recipients []string) (Job, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	job := Job{
		ID:              fmt.Sprintf("mail-job-%d", r.nextID),
		CircleID:        circleID,
		Subject:         subject,
		Body:            body,
		Recipients:      slices.Clone(recipients),
		Status:          "queued",
		CreatedByUserID: createdByUserID,
		CreatedAt:       time.Now().UTC().Format(time.RFC3339),
	}
	r.jobs = append(r.jobs, job)
	r.nextID++

	return job, nil
}

func (r *MemoryRepository) ListByCircle(circleID string) []Job {
	r.mu.RLock()
	defer r.mu.RUnlock()

	jobs := make([]Job, 0, len(r.jobs))
	for index := len(r.jobs) - 1; index >= 0; index-- {
		job := r.jobs[index]
		if job.CircleID == circleID {
			jobs = append(jobs, cloneJob(job))
		}
	}

	return jobs
}

func (r *MemoryRepository) ListAll() []Job {
	r.mu.RLock()
	defer r.mu.RUnlock()

	jobs := make([]Job, 0, len(r.jobs))
	for index := len(r.jobs) - 1; index >= 0; index-- {
		job := r.jobs[index]
		jobs = append(jobs, cloneJob(job))
	}

	return jobs
}

func (r *MemoryRepository) ListQueued(limit int) []Job {
	r.mu.RLock()
	defer r.mu.RUnlock()

	capHint := limit
	if capHint <= 0 {
		capHint = len(r.jobs)
	}
	jobs := make([]Job, 0, capHint)
	for index := 0; index < len(r.jobs); index++ {
		job := r.jobs[index]
		if job.Status != "queued" {
			continue
		}
		jobs = append(jobs, cloneJob(job))
		if limit > 0 && len(jobs) >= limit {
			break
		}
	}

	return jobs
}

func (r *MemoryRepository) MarkSent(id string, deliveredAt time.Time) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.jobs {
		if r.jobs[index].ID != id {
			continue
		}
		if r.jobs[index].Status != "queued" {
			return false
		}
		r.jobs[index].Status = "sent"
		r.jobs[index].DeliveredAt = deliveredAt.UTC().Format(time.RFC3339)
		return true
	}

	return false
}

func (r *MemoryRepository) DeleteByCircle(circleID string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	filtered := make([]Job, 0, len(r.jobs))
	for _, job := range r.jobs {
		if job.CircleID == circleID {
			continue
		}
		filtered = append(filtered, job)
	}
	r.jobs = filtered
}

func (r *MemoryRepository) DeleteAll() {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.jobs = []Job{}
}

func cloneJob(job Job) Job {
	job.Recipients = slices.Clone(job.Recipients)
	return job
}
