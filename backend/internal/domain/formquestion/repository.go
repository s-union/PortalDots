package formquestion

import (
	"context"
	"errors"
	"slices"
	"sync"
	"time"

	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

var ErrNotFound = errors.New("form question not found")

var AllowedQuestionTypes = []string{
	"heading",
	"text",
	"textarea",
	"markdown",
	"number",
	"radio",
	"select",
	"checkbox",
	"upload",
}

type Question struct {
	ID           string
	FormID       string
	Name         string
	Description  string
	Type         string
	IsRequired   bool
	NumberMin    *int32
	NumberMax    *int32
	AllowedTypes string
	Options      []string
	Priority     int32
	CreatedAt    string
	UpdatedAt    string
}

type Repository interface {
	List(ctx context.Context, formID string) ([]Question, error)
	Create(ctx context.Context, formID, questionType string) (Question, error)
	Update(ctx context.Context, question Question) (Question, error)
	Delete(ctx context.Context, formID, questionID string) error
	ReplaceOrder(ctx context.Context, formID string, orderedQuestionIDs []string) error
}

type MemoryRepository struct {
	mu     sync.RWMutex
	items  map[string][]Question
	nextID int
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		items:  map[string][]Question{},
		nextID: 1,
	}
}

func (r *MemoryRepository) List(ctx context.Context, formID string) ([]Question, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	questions := r.items[formID]
	cloned := make([]Question, 0, len(questions))
	for _, question := range questions {
		cloned = append(cloned, cloneQuestion(question))
	}
	return cloned, nil
}

func (r *MemoryRepository) Create(ctx context.Context, formID, questionType string) (Question, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	priority := int32(len(r.items[formID]) + 1)
	question := Question{
		ID:           uuidv7.MustString(),
		FormID:       formID,
		Name:         "",
		Description:  "",
		Type:         questionType,
		IsRequired:   false,
		AllowedTypes: "",
		Options:      []string{},
		Priority:     priority,
		CreatedAt:    nowRFC3339(),
		UpdatedAt:    nowRFC3339(),
	}
	r.nextID++
	r.items[formID] = append(r.items[formID], question)

	return cloneQuestion(question), nil
}

func (r *MemoryRepository) Update(ctx context.Context, question Question) (Question, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	questions := r.items[question.FormID]
	for index, item := range questions {
		if item.ID != question.ID {
			continue
		}

		question.CreatedAt = item.CreatedAt
		question.UpdatedAt = nowRFC3339()
		r.items[question.FormID][index] = cloneQuestion(question)
		return cloneQuestion(r.items[question.FormID][index]), nil
	}

	return Question{}, ErrNotFound
}

func (r *MemoryRepository) Delete(ctx context.Context, formID, questionID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	questions := r.items[formID]
	for index, item := range questions {
		if item.ID != questionID {
			continue
		}

		questions = append(questions[:index], questions[index+1:]...)
		for priorityIndex := range questions {
			questions[priorityIndex].Priority = int32(priorityIndex + 1)
		}
		r.items[formID] = questions
		return nil
	}

	return ErrNotFound
}

func (r *MemoryRepository) ReplaceOrder(ctx context.Context, formID string, orderedQuestionIDs []string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	questions := r.items[formID]
	if len(questions) != len(orderedQuestionIDs) {
		return ErrNotFound
	}

	byID := make(map[string]Question, len(questions))
	for _, question := range questions {
		byID[question.ID] = question
	}

	reordered := make([]Question, 0, len(orderedQuestionIDs))
	for index, questionID := range orderedQuestionIDs {
		question, ok := byID[questionID]
		if !ok {
			return ErrNotFound
		}

		question.Priority = int32(index + 1)
		reordered = append(reordered, question)
	}

	r.items[formID] = reordered
	return nil
}

func cloneQuestion(question Question) Question {
	question.Options = slices.Clone(question.Options)
	if question.NumberMin != nil {
		value := *question.NumberMin
		question.NumberMin = &value
	}
	if question.NumberMax != nil {
		value := *question.NumberMax
		question.NumberMax = &value
	}
	return question
}

func nowRFC3339() string {
	return time.Now().UTC().Format(time.RFC3339)
}
