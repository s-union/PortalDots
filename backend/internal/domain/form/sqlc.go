package form

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
	"github.com/s-union/PortalDots/backend/internal/platform/postgres/pgutil"
)

type SQLCRepository struct {
	queries *dbgen.Queries
}

func NewSQLCRepository(queries *dbgen.Queries) *SQLCRepository {
	return &SQLCRepository{queries: queries}
}

func (r *SQLCRepository) ListByCircle(circleID string) []Form {
	rows, err := r.queries.ListStaffFormsByCircle(context.Background(), nullableText(circleID))
	if err != nil {
		return nil
	}

	forms := make([]Form, 0, len(rows))
	for _, row := range rows {
		form := mapStaffListRowToForm(row)
		if !form.IsPublic || !form.IsOpen {
			continue
		}
		forms = append(forms, form)
	}

	return forms
}

func (r *SQLCRepository) ListByCircleForStaff(circleID string) []Form {
	rows, err := r.queries.ListStaffFormsByCircle(context.Background(), nullableText(circleID))
	if err != nil {
		return nil
	}

	forms := make([]Form, 0, len(rows))
	for _, row := range rows {
		forms = append(forms, mapStaffListRowToForm(row))
	}

	return forms
}

func (r *SQLCRepository) FindByCircle(circleID, formID string) (Form, bool) {
	row, err := r.queries.GetStaffFormByID(context.Background(), dbgen.GetStaffFormByIDParams{
		CircleID: nullableText(circleID),
		ID:       formID,
	})
	if err != nil {
		return Form{}, false
	}
	form := mapStaffDetailRowToForm(row)
	if !form.IsPublic || !form.IsOpen {
		return Form{}, false
	}

	return form, true
}

func (r *SQLCRepository) FindByCircleForStaff(circleID, formID string) (Form, bool) {
	row, err := r.queries.GetStaffFormByID(context.Background(), dbgen.GetStaffFormByIDParams{
		CircleID: nullableText(circleID),
		ID:       formID,
	})
	if err != nil {
		return Form{}, false
	}

	return mapStaffDetailRowToForm(row), true
}

func (r *SQLCRepository) FindByIDForStaff(formID string) (Form, bool) {
	row, err := r.queries.GetAnyStaffFormByID(context.Background(), formID)
	if err != nil {
		return Form{}, false
	}

	return mapAnyStaffDetailRowToForm(row), true
}

func (r *SQLCRepository) Create(
	circleID string,
	name string,
	description string,
	isPublic bool,
	openAt string,
	closeAt string,
	maxAnswers int32,
	answerableTags []string,
	confirmationMessage string,
) Form {
	openAtValue, err := time.Parse(time.RFC3339, openAt)
	if err != nil {
		return Form{}
	}
	closeAtValue, err := time.Parse(time.RFC3339, closeAt)
	if err != nil {
		return Form{}
	}

	row, err := r.queries.CreateForm(context.Background(), dbgen.CreateFormParams{
		CircleID:            nullableText(circleID),
		Name:                name,
		Description:         description,
		IsPublic:            isPublic,
		IsOpen:              isOpenAt(time.Now().UTC(), openAtValue.UTC(), closeAtValue.UTC()),
		OpenAt:              pgutil.Timestamptz(openAtValue),
		CloseAt:             pgutil.Timestamptz(closeAtValue),
		MaxAnswers:          maxAnswers,
		AnswerableTags:      answerableTags,
		ConfirmationMessage: confirmationMessage,
	})
	if err != nil {
		return Form{}
	}

	return mapCreateRowToForm(row)
}

func (r *SQLCRepository) Update(
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
	openAtValue, err := time.Parse(time.RFC3339, openAt)
	if err != nil {
		return Form{}, false
	}
	closeAtValue, err := time.Parse(time.RFC3339, closeAt)
	if err != nil {
		return Form{}, false
	}

	row, err := r.queries.UpdateForm(context.Background(), dbgen.UpdateFormParams{
		CircleID:            nullableText(circleID),
		ID:                  formID,
		Name:                name,
		Description:         description,
		IsPublic:            isPublic,
		IsOpen:              isOpenAt(time.Now().UTC(), openAtValue.UTC(), closeAtValue.UTC()),
		OpenAt:              pgutil.Timestamptz(openAtValue),
		CloseAt:             pgutil.Timestamptz(closeAtValue),
		MaxAnswers:          maxAnswers,
		AnswerableTags:      answerableTags,
		ConfirmationMessage: confirmationMessage,
	})
	if err != nil {
		return Form{}, false
	}

	return mapUpdateRowToForm(row), true
}

func (r *SQLCRepository) UpdateByID(
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
	openAtValue, err := time.Parse(time.RFC3339, openAt)
	if err != nil {
		return Form{}, false
	}
	closeAtValue, err := time.Parse(time.RFC3339, closeAt)
	if err != nil {
		return Form{}, false
	}

	row, err := r.queries.UpdateAnyFormByID(context.Background(), dbgen.UpdateAnyFormByIDParams{
		ID:                  formID,
		Name:                name,
		Description:         description,
		IsPublic:            isPublic,
		IsOpen:              isOpenAt(time.Now().UTC(), openAtValue.UTC(), closeAtValue.UTC()),
		OpenAt:              pgutil.Timestamptz(openAtValue),
		CloseAt:             pgutil.Timestamptz(closeAtValue),
		MaxAnswers:          maxAnswers,
		AnswerableTags:      answerableTags,
		ConfirmationMessage: confirmationMessage,
	})
	if err != nil {
		return Form{}, false
	}

	return mapUpdateAnyRowToForm(row), true
}

func (r *SQLCRepository) Delete(circleID, formID string) bool {
	rows, err := r.queries.DeleteForm(context.Background(), dbgen.DeleteFormParams{
		CircleID: nullableText(circleID),
		ID:       formID,
	})
	if err != nil {
		return false
	}

	return rows > 0
}

func mapStaffListRowToForm(row dbgen.ListStaffFormsByCircleRow) Form {
	return buildForm(
		row.ID,
		row.CircleID,
		row.Name,
		row.Description,
		row.IsPublic,
		row.OpenAt,
		row.CloseAt,
		row.MaxAnswers,
		row.AnswerableTags,
		row.ConfirmationMessage,
	)
}

func mapStaffDetailRowToForm(row dbgen.GetStaffFormByIDRow) Form {
	return buildForm(
		row.ID,
		row.CircleID,
		row.Name,
		row.Description,
		row.IsPublic,
		row.OpenAt,
		row.CloseAt,
		row.MaxAnswers,
		row.AnswerableTags,
		row.ConfirmationMessage,
	)
}

func mapAnyStaffDetailRowToForm(row dbgen.GetAnyStaffFormByIDRow) Form {
	return buildForm(
		row.ID,
		row.CircleID,
		row.Name,
		row.Description,
		row.IsPublic,
		row.OpenAt,
		row.CloseAt,
		row.MaxAnswers,
		row.AnswerableTags,
		row.ConfirmationMessage,
	)
}

func mapCreateRowToForm(row dbgen.CreateFormRow) Form {
	return buildForm(
		row.ID,
		row.CircleID,
		row.Name,
		row.Description,
		row.IsPublic,
		row.OpenAt,
		row.CloseAt,
		row.MaxAnswers,
		row.AnswerableTags,
		row.ConfirmationMessage,
	)
}

func mapUpdateRowToForm(row dbgen.UpdateFormRow) Form {
	return buildForm(
		row.ID,
		row.CircleID,
		row.Name,
		row.Description,
		row.IsPublic,
		row.OpenAt,
		row.CloseAt,
		row.MaxAnswers,
		row.AnswerableTags,
		row.ConfirmationMessage,
	)
}

func mapUpdateAnyRowToForm(row dbgen.UpdateAnyFormByIDRow) Form {
	return buildForm(
		row.ID,
		row.CircleID,
		row.Name,
		row.Description,
		row.IsPublic,
		row.OpenAt,
		row.CloseAt,
		row.MaxAnswers,
		row.AnswerableTags,
		row.ConfirmationMessage,
	)
}

func buildForm(
	id string,
	circleID pgtype.Text,
	name string,
	description string,
	isPublic bool,
	openAtValue pgtype.Timestamptz,
	closeAtValue pgtype.Timestamptz,
	maxAnswers int32,
	answerableTags []string,
	confirmationMessage string,
) Form {
	openAt := pgutil.FormatTimestamptz(openAtValue)
	closeAt := pgutil.FormatTimestamptz(closeAtValue)
	return Form{
		ID:                  id,
		CircleID:            nullableTextValue(circleID),
		Name:                name,
		Description:         description,
		IsPublic:            isPublic,
		IsOpen:              isOpenWindow(openAt, closeAt),
		OpenAt:              openAt,
		CloseAt:             closeAt,
		MaxAnswers:          maxAnswers,
		AnswerableTags:      append([]string{}, answerableTags...),
		ConfirmationMessage: confirmationMessage,
	}
}

func nullableText(value string) pgtype.Text {
	if value == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: value, Valid: true}
}

func nullableTextValue(value pgtype.Text) string {
	if !value.Valid {
		return ""
	}
	return value.String
}
