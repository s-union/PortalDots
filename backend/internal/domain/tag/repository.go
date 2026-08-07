package tag

import (
	"errors"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

var ErrNotFound = errors.New("tag not found")

const DefaultColor = "gray"

var validColors = []string{"gray", "red", "orange", "green", "blue", "purple"}

type Tag struct {
	ID        string
	Name      string
	Color     string
	CreatedAt string
	UpdatedAt string
}

type Repository interface {
	List() ([]Tag, error)
	Create(name, color string) (Tag, error)
	// Update sets name and, when color is non-nil, color. A nil color leaves
	// the stored colour untouched so omitted fields never roll back concurrent
	// updates.
	Update(id, name string, color *string) (Tag, error)
	Delete(id string) error
}

// NormalizeColor trims and lower-cases a colour token, falling back to the
// default when empty so rows created before colour existed keep working.
func NormalizeColor(color string) string {
	color = strings.ToLower(strings.TrimSpace(color))
	if color == "" {
		return DefaultColor
	}
	return color
}

// IsValidColor reports whether color is one of the palette tokens stored in
// the tags table. An empty or whitespace-only value is rejected: the default
// only applies when the field is omitted from a request, never when it is
// sent explicitly. Unknown tokens are rejected server-side before touching
// the database.
func IsValidColor(color string) bool {
	color = strings.TrimSpace(color)
	return color != "" && slices.Contains(validColors, NormalizeColor(color))
}

type MemoryRepository struct {
	mu     sync.RWMutex
	items  []Tag
	nextID int
}

func NewMemoryRepository(cfg []config.Tag) *MemoryRepository {
	items := make([]Tag, 0, len(cfg))
	for _, item := range cfg {
		items = append(items, Tag{
			ID:        item.ID,
			Name:      item.Name,
			Color:     NormalizeColor(item.Color),
			CreatedAt: item.CreatedAt,
			UpdatedAt: item.UpdatedAt,
		})
	}

	slices.SortFunc(items, func(a, b Tag) int { return strings.Compare(a.Name, b.Name) })

	return &MemoryRepository{
		items:  items,
		nextID: len(items) + 1,
	}
}

func (r *MemoryRepository) List() ([]Tag, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return slices.Clone(r.items), nil
}

func (r *MemoryRepository) Create(name, color string) (Tag, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now().UTC().Format(time.RFC3339)
	created := Tag{
		ID:        uuidv7.MustString(),
		Name:      name,
		Color:     NormalizeColor(color),
		CreatedAt: now,
		UpdatedAt: now,
	}
	r.nextID++
	insertAt, _ := slices.BinarySearchFunc(r.items, created, func(item Tag, target Tag) int {
		return strings.Compare(item.Name, target.Name)
	})
	r.items = slices.Insert(r.items, insertAt, created)

	return created, nil
}

func (r *MemoryRepository) Update(id, name string, color *string) (Tag, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index, item := range r.items {
		if item.ID != id {
			continue
		}
		updated := r.items[index]
		updated.Name = name
		if color != nil {
			updated.Color = NormalizeColor(*color)
		}
		updated.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
		r.items = append(r.items[:index], r.items[index+1:]...)
		insertAt, _ := slices.BinarySearchFunc(r.items, updated, func(item Tag, target Tag) int {
			return strings.Compare(item.Name, target.Name)
		})
		r.items = slices.Insert(r.items, insertAt, updated)
		return updated, nil
	}

	return Tag{}, ErrNotFound
}

func (r *MemoryRepository) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index, item := range r.items {
		if item.ID != id {
			continue
		}
		r.items = append(r.items[:index], r.items[index+1:]...)
		return nil
	}

	return ErrNotFound
}
