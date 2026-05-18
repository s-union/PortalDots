package formquestion

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
	"github.com/s-union/PortalDots/backend/internal/platform/postgres/pgutil"
)

type SQLCRepository struct {
	pool    *pgxpool.Pool
	queries *dbgen.Queries
}

func NewSQLCRepository(pool *pgxpool.Pool, queries *dbgen.Queries) *SQLCRepository {
	return &SQLCRepository{
		pool:    pool,
		queries: queries,
	}
}

func (r *SQLCRepository) List(ctx context.Context, formID string) ([]Question, error) {
	rows, err := r.queries.ListFormQuestionsByFormID(ctx, formID)
	if err != nil {
		return nil, err
	}

	questions := make([]Question, 0, len(rows))
	for _, row := range rows {
		question, err := mapListQuestionRow(row)
		if err != nil {
			return nil, err
		}
		questions = append(questions, question)
	}

	return questions, nil
}

func (r *SQLCRepository) Create(ctx context.Context, formID, questionType string) (Question, error) {
	count, err := r.queries.CountFormQuestionsByFormID(ctx, formID)
	if err != nil {
		return Question{}, err
	}

	row, err := r.queries.CreateFormQuestion(ctx, dbgen.CreateFormQuestionParams{
		FormID:       formID,
		Name:         "",
		Description:  "",
		Type:         questionType,
		IsRequired:   false,
		NumberMin:    int4Ptr(nil),
		NumberMax:    int4Ptr(nil),
		AllowedTypes: "",
		Options:      []byte("[]"),
		Priority:     int32(count + 1),
	})
	if err != nil {
		return Question{}, err
	}

	return mapCreateQuestionRow(row)
}

func (r *SQLCRepository) Update(ctx context.Context, question Question) (Question, error) {
	options, err := json.Marshal(question.Options)
	if err != nil {
		return Question{}, err
	}

	row, err := r.queries.UpdateFormQuestion(ctx, dbgen.UpdateFormQuestionParams{
		ID:           question.ID,
		Name:         question.Name,
		Description:  question.Description,
		Type:         question.Type,
		IsRequired:   question.IsRequired,
		NumberMin:    int4Ptr(question.NumberMin),
		NumberMax:    int4Ptr(question.NumberMax),
		AllowedTypes: question.AllowedTypes,
		Options:      options,
		Priority:     question.Priority,
	})
	if err != nil {
		return Question{}, err
	}

	return mapUpdateQuestionRow(row)
}

func (r *SQLCRepository) Delete(ctx context.Context, formID, questionID string) error {
	rows, err := r.queries.DeleteFormQuestion(ctx, questionID)
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}

	questions, err := r.List(ctx, formID)
	if err != nil {
		return err
	}

	return r.ReplaceOrder(ctx, formID, extractQuestionIDs(questions))
}

func (r *SQLCRepository) ReplaceOrder(ctx context.Context, formID string, orderedQuestionIDs []string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	queries := r.queries.WithTx(tx)
	currentQuestions, err := queries.ListFormQuestionsByFormID(ctx, formID)
	if err != nil {
		return err
	}
	if len(currentQuestions) != len(orderedQuestionIDs) {
		return ErrNotFound
	}

	byID := make(map[string]dbgen.FormQuestion, len(currentQuestions))
	for _, question := range currentQuestions {
		byID[question.ID] = question
	}

	for index, questionID := range orderedQuestionIDs {
		question, ok := byID[questionID]
		if !ok {
			return ErrNotFound
		}

		if _, err := queries.UpdateFormQuestion(ctx, dbgen.UpdateFormQuestionParams{
			ID:           question.ID,
			Name:         question.Name,
			Description:  question.Description,
			Type:         question.Type,
			IsRequired:   question.IsRequired,
			NumberMin:    question.NumberMin,
			NumberMax:    question.NumberMax,
			AllowedTypes: question.AllowedTypes,
			Options:      question.Options,
			Priority:     int32(index + 1),
		}); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func extractQuestionIDs(questions []Question) []string {
	ids := make([]string, 0, len(questions))
	for _, question := range questions {
		ids = append(ids, question.ID)
	}
	return ids
}

func mapListQuestionRow(row dbgen.FormQuestion) (Question, error) {
	options, err := decodeOptions(row.Options)
	if err != nil {
		return Question{}, err
	}

	return Question{
		ID:           row.ID,
		FormID:       row.FormID,
		Name:         row.Name,
		Description:  row.Description,
		Type:         row.Type,
		IsRequired:   row.IsRequired,
		NumberMin:    pgutil.Int4ToPtr(row.NumberMin),
		NumberMax:    pgutil.Int4ToPtr(row.NumberMax),
		AllowedTypes: row.AllowedTypes,
		Options:      options,
		Priority:     row.Priority,
		CreatedAt:    pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt:    pgutil.FormatTimestamptz(row.UpdatedAt),
	}, nil
}

func mapCreateQuestionRow(row dbgen.FormQuestion) (Question, error) {
	options, err := decodeOptions(row.Options)
	if err != nil {
		return Question{}, err
	}

	return Question{
		ID:           row.ID,
		FormID:       row.FormID,
		Name:         row.Name,
		Description:  row.Description,
		Type:         row.Type,
		IsRequired:   row.IsRequired,
		NumberMin:    pgutil.Int4ToPtr(row.NumberMin),
		NumberMax:    pgutil.Int4ToPtr(row.NumberMax),
		AllowedTypes: row.AllowedTypes,
		Options:      options,
		Priority:     row.Priority,
		CreatedAt:    pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt:    pgutil.FormatTimestamptz(row.UpdatedAt),
	}, nil
}

func mapUpdateQuestionRow(row dbgen.FormQuestion) (Question, error) {
	options, err := decodeOptions(row.Options)
	if err != nil {
		return Question{}, err
	}

	return Question{
		ID:           row.ID,
		FormID:       row.FormID,
		Name:         row.Name,
		Description:  row.Description,
		Type:         row.Type,
		IsRequired:   row.IsRequired,
		NumberMin:    pgutil.Int4ToPtr(row.NumberMin),
		NumberMax:    pgutil.Int4ToPtr(row.NumberMax),
		AllowedTypes: row.AllowedTypes,
		Options:      options,
		Priority:     row.Priority,
		CreatedAt:    pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt:    pgutil.FormatTimestamptz(row.UpdatedAt),
	}, nil
}

func decodeOptions(value []byte) ([]string, error) {
	if len(value) == 0 {
		return []string{}, nil
	}

	var options []string
	if err := json.Unmarshal(value, &options); err != nil {
		return nil, err
	}

	return options, nil
}

func int4Ptr(value *int32) pgtype.Int4 {
	if value == nil {
		return pgtype.Int4{}
	}

	return pgtype.Int4{
		Int32: *value,
		Valid: true,
	}
}
