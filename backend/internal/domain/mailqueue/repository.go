package mailqueue

import (
	"context"
	"slices"
	"sync"
	"time"

	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
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

const JobStatusQueued = "queued"

type Repository interface {
	Enqueue(ctx context.Context, circleID, createdByUserID, subject, body string, recipients []string) (Job, error)
	ListAll() []Job
	ListByCircle(circleID string) []Job
	DeleteAll() error
	DeleteByCircle(circleID string) error
	DeleteJob(ctx context.Context, id string) error
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
		ID:              uuidv7.MustString(),
		CircleID:        circleID,
		Subject:         subject,
		Body:            body,
		Recipients:      slices.Clone(recipients),
		Status:          JobStatusQueued,
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

func (r *MemoryRepository) DeleteByCircle(circleID string) error {
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
	return nil
}

func (r *MemoryRepository) DeleteAll() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.jobs = []Job{}
	return nil
}

func (r *MemoryRepository) DeleteJob(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	filtered := make([]Job, 0, len(r.jobs))
	for _, job := range r.jobs {
		if job.ID == id {
			continue
		}
		filtered = append(filtered, job)
	}
	r.jobs = filtered
	return nil
}

func cloneJob(job Job) Job {
	job.Recipients = slices.Clone(job.Recipients)
	return job
}
