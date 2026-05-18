package pendingregistration

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

var ErrNotFound = errors.New("pending registration not found")

type PendingRegistration struct {
	ID         string
	Univemail  string
	StudentID  string
	TokenHash  string
	ExpiresAt  time.Time
	VerifiedAt time.Time
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

func (p PendingRegistration) IsVerified() bool {
	return !p.VerifiedAt.IsZero()
}

type Repository interface {
	Save(ctx context.Context, univemail, studentID, tokenHash string, expiresAt time.Time) (PendingRegistration, error)
	Find(ctx context.Context, id string) (PendingRegistration, error)
	Delete(ctx context.Context, id string) error
	DeleteExpired(ctx context.Context, now time.Time) error
	MarkVerified(ctx context.Context, id string, verifiedAt time.Time) (PendingRegistration, error)
}

type MemoryRepository struct {
	mu     sync.RWMutex
	items  []PendingRegistration
	nextID int
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		items:  []PendingRegistration{},
		nextID: 1,
	}
}

func (r *MemoryRepository) Save(ctx context.Context, univemail, studentID, tokenHash string, expiresAt time.Time) (PendingRegistration, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now().UTC()
	r.deleteExpiredLocked(now)

	normalizedEmail := normalizeEmail(univemail)
	for index := range r.items {
		if normalizeEmail(r.items[index].Univemail) != normalizedEmail {
			continue
		}
		r.items[index].StudentID = strings.TrimSpace(studentID)
		r.items[index].TokenHash = strings.TrimSpace(tokenHash)
		r.items[index].ExpiresAt = expiresAt.UTC()
		r.items[index].VerifiedAt = time.Time{}
		r.items[index].UpdatedAt = now
		return clonePendingRegistration(r.items[index]), nil
	}

	created := PendingRegistration{
		ID:        uuidv7.MustString(),
		Univemail: normalizedEmail,
		StudentID: strings.TrimSpace(studentID),
		TokenHash: strings.TrimSpace(tokenHash),
		ExpiresAt: expiresAt.UTC(),
		CreatedAt: now,
		UpdatedAt: now,
	}
	r.nextID++
	r.items = append(r.items, created)

	return clonePendingRegistration(created), nil
}

func (r *MemoryRepository) Find(ctx context.Context, id string) (PendingRegistration, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.deleteExpiredLocked(time.Now().UTC())

	for _, item := range r.items {
		if item.ID == id {
			return clonePendingRegistration(item), nil
		}
	}

	return PendingRegistration{}, ErrNotFound
}

func (r *MemoryRepository) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.items {
		if r.items[index].ID != id {
			continue
		}
		r.items = append(r.items[:index], r.items[index+1:]...)
		return nil
	}

	return ErrNotFound
}

func (r *MemoryRepository) DeleteExpired(ctx context.Context, now time.Time) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.deleteExpiredLocked(now.UTC())
	return nil
}

func (r *MemoryRepository) MarkVerified(ctx context.Context, id string, verifiedAt time.Time) (PendingRegistration, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.deleteExpiredLocked(verifiedAt.UTC())

	for index := range r.items {
		if r.items[index].ID != id {
			continue
		}
		r.items[index].VerifiedAt = verifiedAt.UTC()
		r.items[index].UpdatedAt = verifiedAt.UTC()
		return clonePendingRegistration(r.items[index]), nil
	}

	return PendingRegistration{}, ErrNotFound
}

func (r *MemoryRepository) deleteExpiredLocked(now time.Time) {
	filtered := make([]PendingRegistration, 0, len(r.items))
	for _, item := range r.items {
		if !now.Before(item.ExpiresAt) {
			continue
		}
		filtered = append(filtered, item)
	}
	r.items = filtered
}

func clonePendingRegistration(item PendingRegistration) PendingRegistration {
	return PendingRegistration{
		ID:         item.ID,
		Univemail:  item.Univemail,
		StudentID:  item.StudentID,
		TokenHash:  item.TokenHash,
		ExpiresAt:  item.ExpiresAt,
		VerifiedAt: item.VerifiedAt,
		CreatedAt:  item.CreatedAt,
		UpdatedAt:  item.UpdatedAt,
	}
}

func normalizeEmail(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}
