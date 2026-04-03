package participationtype

import (
	"errors"
	"slices"
	"sync"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

var ErrNotFound = errors.New("participation type not found")

type ParticipationType struct {
	ID            string
	Name          string
	Description   string
	UsersCountMin int32
	UsersCountMax int32
	Tags          []string
	FormID        string
}

type Repository interface {
	List() ([]ParticipationType, error)
	Find(typeID string) (ParticipationType, error)
	FindByFormID(formID string) (ParticipationType, error)
	Create(name, description string, usersCountMin, usersCountMax int32, tags []string, formID string) (ParticipationType, error)
	Update(typeID, name, description string, usersCountMin, usersCountMax int32, tags []string) (ParticipationType, error)
	Delete(typeID string) error
}

type MemoryRepository struct {
	mu     sync.RWMutex
	items  []ParticipationType
	nextID int
}

func NewMemoryRepository(cfg []config.ParticipationType) *MemoryRepository {
	items := make([]ParticipationType, 0, len(cfg))
	for _, item := range cfg {
		items = append(items, ParticipationType{
			ID:            item.ID,
			Name:          item.Name,
			Description:   item.Description,
			UsersCountMin: item.UsersCountMin,
			UsersCountMax: item.UsersCountMax,
			Tags:          slices.Clone(item.Tags),
			FormID:        item.FormID,
		})
	}

	return &MemoryRepository{items: items, nextID: len(items) + 1}
}

func (r *MemoryRepository) List() ([]ParticipationType, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	items := make([]ParticipationType, 0, len(r.items))
	for _, item := range r.items {
		items = append(items, cloneParticipationType(item))
	}
	return items, nil
}

func (r *MemoryRepository) Find(typeID string) (ParticipationType, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, item := range r.items {
		if item.ID == typeID {
			return cloneParticipationType(item), nil
		}
	}

	return ParticipationType{}, ErrNotFound
}

func (r *MemoryRepository) FindByFormID(formID string) (ParticipationType, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, item := range r.items {
		if item.FormID == formID {
			return cloneParticipationType(item), nil
		}
	}

	return ParticipationType{}, ErrNotFound
}

func (r *MemoryRepository) Create(name, description string, usersCountMin, usersCountMax int32, tags []string, formID string) (ParticipationType, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	item := ParticipationType{
		ID:            uuidv7.MustString(),
		Name:          name,
		Description:   description,
		UsersCountMin: usersCountMin,
		UsersCountMax: usersCountMax,
		Tags:          slices.Clone(tags),
		FormID:        formID,
	}
	r.items = append(r.items, item)
	r.nextID++
	return cloneParticipationType(item), nil
}

func (r *MemoryRepository) Update(typeID, name, description string, usersCountMin, usersCountMax int32, tags []string) (ParticipationType, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.items {
		if r.items[index].ID != typeID {
			continue
		}
		r.items[index].Name = name
		r.items[index].Description = description
		r.items[index].UsersCountMin = usersCountMin
		r.items[index].UsersCountMax = usersCountMax
		r.items[index].Tags = slices.Clone(tags)
		return cloneParticipationType(r.items[index]), nil
	}

	return ParticipationType{}, ErrNotFound
}

func (r *MemoryRepository) Delete(typeID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.items {
		if r.items[index].ID != typeID {
			continue
		}
		r.items = append(r.items[:index], r.items[index+1:]...)
		return nil
	}

	return ErrNotFound
}

func cloneParticipationType(item ParticipationType) ParticipationType {
	item.Tags = slices.Clone(item.Tags)
	return item
}
