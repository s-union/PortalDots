package activitylog

import (
	"errors"
	"sync"
	"time"

	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

var ErrNotFound = errors.New("activity log not found")

type Entry struct {
	ID          string
	ActorUserID string
	Action      string
	TargetType  string
	TargetID    string
	CircleID    string
	Summary     string
	CreatedAt   string
}

type Repository interface {
	List() ([]Entry, error)
	Record(actorUserID, action, targetType, targetID, circleID, summary string) error
}

type MemoryRepository struct {
	mu      sync.RWMutex
	entries []Entry
	nextID  int
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		entries: []Entry{},
		nextID:  1,
	}
}

func (r *MemoryRepository) List() ([]Entry, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	entries := make([]Entry, 0, len(r.entries))
	for index := len(r.entries) - 1; index >= 0; index-- {
		entries = append(entries, r.entries[index])
	}

	return entries, nil
}

func (r *MemoryRepository) Record(
	actorUserID string,
	action string,
	targetType string,
	targetID string,
	circleID string,
	summary string,
) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	entry := Entry{
		ID:          uuidv7.MustString(),
		ActorUserID: actorUserID,
		Action:      action,
		TargetType:  targetType,
		TargetID:    targetID,
		CircleID:    circleID,
		Summary:     summary,
		CreatedAt:   time.Now().UTC().Format(time.RFC3339),
	}

	r.nextID++
	r.entries = append(r.entries, entry)

	return nil
}
