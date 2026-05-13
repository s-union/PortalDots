package form

import (
	"sync"
	"time"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

type Form struct {
	ID                  string
	CircleID            string
	Name                string
	Description         string
	IsPublic            bool
	IsOpen              bool
	OpenAt              string
	CloseAt             string
	CreatedAt           string
	UpdatedAt           string
	MaxAnswers          int32
	AnswerableTags      []string
	ConfirmationMessage string
	CreatedByUserID     string
}

type Repository interface {
	ListByCircle(circleID string) []Form
	ListByCircleForStaff(circleID string) []Form
	FindByCircle(circleID, formID string) (Form, bool)
	FindByCircleForStaff(circleID, formID string) (Form, bool)
	FindByIDForStaff(formID string) (Form, bool)
	Create(circleID, name, description string, isPublic bool, openAt, closeAt string, maxAnswers int32, answerableTags []string, confirmationMessage string, createdByUserID string) Form
	Update(circleID, formID, name, description string, isPublic bool, openAt, closeAt string, maxAnswers int32, answerableTags []string, confirmationMessage string) (Form, bool)
	UpdateByID(formID, name, description string, isPublic bool, openAt, closeAt string, maxAnswers int32, answerableTags []string, confirmationMessage string) (Form, bool)
	Delete(circleID, formID string) bool
}

type StaticRepository struct {
	mu     sync.RWMutex
	forms  []Form
	nextID int
}

func NewStaticRepository(cfg []config.Form) *StaticRepository {
	forms := make([]Form, 0, len(cfg))
	for _, item := range cfg {
		createdAt := item.CreatedAt
		if createdAt == "" {
			createdAt = item.OpenAt
		}
		updatedAt := item.UpdatedAt
		if updatedAt == "" {
			updatedAt = createdAt
		}

		forms = append(forms, Form{
			ID:                  item.ID,
			CircleID:            item.CircleID,
			Name:                item.Name,
			Description:         item.Description,
			IsPublic:            item.IsPublic,
			IsOpen:              item.IsOpen,
			OpenAt:              item.OpenAt,
			CloseAt:             item.CloseAt,
			CreatedAt:           createdAt,
			UpdatedAt:           updatedAt,
			MaxAnswers:          item.MaxAnswers,
			AnswerableTags:      append([]string{}, item.AnswerableTags...),
			ConfirmationMessage: item.ConfirmationMessage,
			CreatedByUserID:     item.CreatedByUserID,
		})
	}

	return &StaticRepository{
		forms:  forms,
		nextID: len(forms) + 1,
	}
}

func (r *StaticRepository) ListByCircle(circleID string) []Form {
	r.mu.RLock()
	defer r.mu.RUnlock()

	forms := make([]Form, 0, len(r.forms))
	for _, form := range r.forms {
		if form.CircleID == circleID && form.IsPublic && isOpenWindow(form.OpenAt, form.CloseAt) {
			forms = append(forms, cloneFormWithComputedStatus(form))
		}
	}
	return forms
}

func (r *StaticRepository) ListByCircleForStaff(circleID string) []Form {
	r.mu.RLock()
	defer r.mu.RUnlock()

	forms := make([]Form, 0, len(r.forms))
	for _, form := range r.forms {
		if form.CircleID == circleID {
			forms = append(forms, cloneFormWithComputedStatus(form))
		}
	}
	return forms
}

func (r *StaticRepository) FindByCircle(circleID, formID string) (Form, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, form := range r.forms {
		if form.CircleID == circleID && form.ID == formID && form.IsPublic && isOpenWindow(form.OpenAt, form.CloseAt) {
			return cloneFormWithComputedStatus(form), true
		}
	}
	return Form{}, false
}

func (r *StaticRepository) FindByCircleForStaff(circleID, formID string) (Form, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, form := range r.forms {
		if form.CircleID == circleID && form.ID == formID {
			return cloneFormWithComputedStatus(form), true
		}
	}

	return Form{}, false
}

func (r *StaticRepository) FindByIDForStaff(formID string) (Form, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, form := range r.forms {
		if form.ID == formID {
			return cloneFormWithComputedStatus(form), true
		}
	}

	return Form{}, false
}

func (r *StaticRepository) Create(
	circleID string,
	name string,
	description string,
	isPublic bool,
	openAt string,
	closeAt string,
	maxAnswers int32,
	answerableTags []string,
	confirmationMessage string,
	createdByUserID string,
) Form {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now().UTC().Format(time.RFC3339)
	form := Form{
		ID:                  uuidv7.MustString(),
		CircleID:            circleID,
		Name:                name,
		Description:         description,
		IsPublic:            isPublic,
		OpenAt:              openAt,
		CloseAt:             closeAt,
		CreatedAt:           now,
		UpdatedAt:           now,
		MaxAnswers:          maxAnswers,
		AnswerableTags:      append([]string{}, answerableTags...),
		ConfirmationMessage: confirmationMessage,
		CreatedByUserID:     createdByUserID,
	}

	if form.OpenAt == "" {
		form.OpenAt = time.Now().UTC().Format(time.RFC3339)
	}
	if form.CloseAt == "" {
		form.CloseAt = time.Now().UTC().Add(7 * 24 * time.Hour).Format(time.RFC3339)
	}
	form.IsOpen = isOpenWindow(form.OpenAt, form.CloseAt)

	r.nextID++
	r.forms = append(r.forms, form)

	return cloneFormWithComputedStatus(form)
}

func (r *StaticRepository) Update(
	circleID string,
	formID string,
	name string,
	description string,
	isPublic bool,
	openAt string,
	closeAt string,
	maxAnswers int32,
	answerableTags []string,
	confirmationMessage string,
) (Form, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.forms {
		if r.forms[index].CircleID != circleID || r.forms[index].ID != formID {
			continue
		}

		updatedAt := time.Now().UTC().Format(time.RFC3339)
		r.forms[index].Name = name
		r.forms[index].Description = description
		r.forms[index].IsPublic = isPublic
		r.forms[index].OpenAt = openAt
		r.forms[index].CloseAt = closeAt
		r.forms[index].UpdatedAt = updatedAt
		r.forms[index].MaxAnswers = maxAnswers
		r.forms[index].AnswerableTags = append([]string{}, answerableTags...)
		r.forms[index].ConfirmationMessage = confirmationMessage
		r.forms[index].IsOpen = isOpenWindow(openAt, closeAt)

		return cloneFormWithComputedStatus(r.forms[index]), true
	}

	return Form{}, false
}

func (r *StaticRepository) UpdateByID(
	formID string,
	name string,
	description string,
	isPublic bool,
	openAt string,
	closeAt string,
	maxAnswers int32,
	answerableTags []string,
	confirmationMessage string,
) (Form, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.forms {
		if r.forms[index].ID != formID {
			continue
		}

		updatedAt := time.Now().UTC().Format(time.RFC3339)
		r.forms[index].Name = name
		r.forms[index].Description = description
		r.forms[index].IsPublic = isPublic
		r.forms[index].OpenAt = openAt
		r.forms[index].CloseAt = closeAt
		r.forms[index].UpdatedAt = updatedAt
		r.forms[index].MaxAnswers = maxAnswers
		r.forms[index].AnswerableTags = append([]string{}, answerableTags...)
		r.forms[index].ConfirmationMessage = confirmationMessage
		r.forms[index].IsOpen = isOpenWindow(openAt, closeAt)

		return cloneFormWithComputedStatus(r.forms[index]), true
	}

	return Form{}, false
}

func (r *StaticRepository) Delete(circleID, formID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.forms {
		if r.forms[index].CircleID != circleID || r.forms[index].ID != formID {
			continue
		}

		r.forms = append(r.forms[:index], r.forms[index+1:]...)
		return true
	}

	return false
}

func cloneFormWithComputedStatus(form Form) Form {
	form.AnswerableTags = append([]string{}, form.AnswerableTags...)
	form.IsOpen = isOpenWindow(form.OpenAt, form.CloseAt)
	return form
}

func isOpenWindow(openAt, closeAt string) bool {
	openAtValue, err := time.Parse(time.RFC3339, openAt)
	if err != nil {
		return false
	}
	closeAtValue, err := time.Parse(time.RFC3339, closeAt)
	if err != nil {
		return false
	}

	return isOpenAt(time.Now().UTC(), openAtValue.UTC(), closeAtValue.UTC())
}

func isOpenAt(now, openAt, closeAt time.Time) bool {
	return !now.Before(openAt) && !now.After(closeAt)
}
