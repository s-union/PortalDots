//go:build ignore

package staffhttp

import (
	"fmt"
	"slices"
	"strings"

	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	backendform "github.com/s-union/PortalDots/backend/internal/domain/form"
	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
)

func (h *staffFormHandlers) mapStaffFormSummary(formValue backendform.Form, circleValue staffManagedCircleResponse) staffFormSummaryResponse {
	return staffFormSummaryResponse{
		Circle:              circleValue,
		ID:                  formValue.ID,
		Name:                formValue.Name,
		Description:         formValue.Description,
		OpenAt:              formValue.OpenAt,
		CloseAt:             formValue.CloseAt,
		IsPublic:            formValue.IsPublic,
		IsOpen:              formValue.IsOpen,
		CreatedAt:           formValue.CreatedAt,
		UpdatedAt:           formValue.UpdatedAt,
		MaxAnswers:          formValue.MaxAnswers,
		AnswerableTags:      slices.Clone(formValue.AnswerableTags),
		ConfirmationMessage: formValue.ConfirmationMessage,
		IsParticipationForm: h.isParticipationForm(formValue.ID),
	}
}

func mapStaffFormQuestions(questions []formquestion.Question) []staffFormQuestion {
	response := make([]staffFormQuestion, 0, len(questions))
	for _, question := range questions {
		response = append(response, mapStaffFormQuestion(question))
	}
	return response
}

func mapStaffFormQuestion(question formquestion.Question) staffFormQuestion {
	return staffFormQuestion{
		ID:           question.ID,
		Name:         question.Name,
		Description:  question.Description,
		Type:         question.Type,
		IsRequired:   question.IsRequired,
		NumberMin:    question.NumberMin,
		NumberMax:    question.NumberMax,
		AllowedTypes: question.AllowedTypes,
		Options:      slices.Clone(question.Options),
		Priority:     question.Priority,
		CreatedAt:    question.CreatedAt,
		UpdatedAt:    question.UpdatedAt,
	}
}

func staffFormRowsExtendedWithCircles(forms []backendform.Form, circleNames map[string]string) [][]string {
	rows := make([][]string, 0, len(forms))
	for _, currentForm := range forms {
		rows = append(rows, append([]string{
			currentForm.CircleID,
			circleNames[currentForm.CircleID],
		}, staffFormRowExtended(currentForm)...))
	}
	return rows
}

func staffFormRowExtended(formValue backendform.Form) []string {
	return []string{
		formValue.ID,
		formValue.Name,
		visibilityLabel(formValue.IsPublic),
		formStatus(formValue.IsOpen),
		formValue.OpenAt,
		formValue.CloseAt,
		fmt.Sprintf("%d", formValue.MaxAnswers),
		strings.Join(formValue.AnswerableTags, ","),
		singleLine(formValue.ConfirmationMessage),
	}
}

func (h *staffFormHandlers) filterEditableStaffForms(forms []backendform.Form) []backendform.Form {
	filtered := make([]backendform.Form, 0, len(forms))
	for _, currentForm := range forms {
		if h.isParticipationForm(currentForm.ID) {
			continue
		}
		filtered = append(filtered, currentForm)
	}

	return filtered
}

func (h *staffFormHandlers) listManagedStaffForms() ([]circle.Circle, map[string]staffManagedCircleResponse, []backendform.Form, error) {
	circles, circlesByID, err := listStaffManagedCircles(h.circles)
	if err != nil {
		return nil, nil, nil, err
	}

	forms := make([]backendform.Form, 0)
	for _, currentCircle := range circles {
		forms = append(forms, h.forms.ListByCircleForStaff(currentCircle.ID)...)
	}

	return circles, circlesByID, forms, nil
}

func (h *staffFormHandlers) findManagedStaffForm(formID string, allowParticipation bool) (backendform.Form, circle.Circle, bool) {
	circles, _, err := listStaffManagedCircles(h.circles)
	if err == nil {
		for _, currentCircle := range circles {
			if formValue, found := h.forms.FindByCircleForStaff(currentCircle.ID, formID); found {
				return formValue, currentCircle, true
			}
		}
	}

	if !allowParticipation {
		return backendform.Form{}, circle.Circle{}, false
	}

	formValue, found := h.forms.FindByIDForStaff(formID)
	if !found || !h.isParticipationForm(formValue.ID) {
		return backendform.Form{}, circle.Circle{}, false
	}
	if formValue.CircleID != "" {
		if currentCircle, err := h.circles.Find(formValue.CircleID); err == nil {
			return formValue, currentCircle, true
		}
	}

	return formValue, circle.Circle{}, true
}

func questionIDsByPriority(questions []formquestion.Question, err error) ([]string, error) {
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(questions))
	for _, question := range questions {
		ids = append(ids, question.ID)
	}
	return ids, nil
}
