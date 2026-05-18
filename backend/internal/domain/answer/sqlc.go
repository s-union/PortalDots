package answer

import (
	"context"

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

func (r *SQLCRepository) Get(ctx context.Context, formID, circleID string) (Answer, bool) {
	row, err := r.queries.GetLatestAnswerByFormAndCircle(ctx, dbgen.GetLatestAnswerByFormAndCircleParams{
		FormID:   formID,
		CircleID: circleID,
	})
	if err != nil {
		return Answer{}, false
	}

	return r.loadAnswer(ctx, row.ID, row.FormID, row.CircleID, row.Body, row.CreatedAt, row.UpdatedAt)
}

func (r *SQLCRepository) Find(ctx context.Context, answerID string) (Answer, bool) {
	row, err := r.queries.GetAnswerByID(ctx, answerID)
	if err != nil {
		return Answer{}, false
	}

	return r.loadAnswer(ctx, row.ID, row.FormID, row.CircleID, row.Body, row.CreatedAt, row.UpdatedAt)
}

func (r *SQLCRepository) ListByCircle(ctx context.Context, circleID string) []Answer {
	rows, err := r.queries.ListAnswersByCircle(ctx, circleID)
	if err != nil {
		return nil
	}

	answerRows := make([]dbgen.Answer, len(rows))
	for i, row := range rows {
		answerRows[i] = dbgen.Answer{ID: row.ID, FormID: row.FormID, CircleID: row.CircleID, Body: row.Body, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
	}
	return r.loadAnswerRows(ctx, answerRows)
}

func (r *SQLCRepository) ListByForm(ctx context.Context, formID string) []Answer {
	rows, err := r.queries.ListAnswersByForm(ctx, formID)
	if err != nil {
		return nil
	}

	answerRows := make([]dbgen.Answer, len(rows))
	for i, row := range rows {
		answerRows[i] = dbgen.Answer{ID: row.ID, FormID: row.FormID, CircleID: row.CircleID, Body: row.Body, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
	}
	return r.loadAnswerRows(ctx, answerRows)
}

func (r *SQLCRepository) ListByFormAndCircle(ctx context.Context, formID, circleID string) []Answer {
	rows, err := r.queries.ListAnswersByFormAndCircle(ctx, dbgen.ListAnswersByFormAndCircleParams{
		FormID:   formID,
		CircleID: circleID,
	})
	if err != nil {
		return nil
	}

	answerRows := make([]dbgen.Answer, len(rows))
	for i, row := range rows {
		answerRows[i] = dbgen.Answer{ID: row.ID, FormID: row.FormID, CircleID: row.CircleID, Body: row.Body, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
	}
	return r.loadAnswerRows(ctx, answerRows)
}

func (r *SQLCRepository) Upsert(ctx context.Context, formID, circleID, body string, details map[string][]string) Answer {
	currentAnswer, found := r.Get(ctx, formID, circleID)
	if !found {
		return r.Create(ctx, formID, circleID, body, details)
	}

	updated, ok := r.Update(ctx, currentAnswer.ID, body, details)
	if !ok {
		return currentAnswer
	}
	return updated
}

func (r *SQLCRepository) Create(ctx context.Context, formID, circleID, body string, details map[string][]string) Answer {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return Answer{}
	}
	defer tx.Rollback(ctx)

	queries := r.queries.WithTx(tx)
	row, err := queries.CreateAnswer(ctx, dbgen.CreateAnswerParams{
		FormID:   formID,
		CircleID: circleID,
		Body:     body,
	})
	if err != nil {
		return Answer{}
	}

	if !persistAnswerDetails(ctx, queries, row.ID, row.FormID, row.CircleID, details) {
		return Answer{}
	}

	if err := tx.Commit(ctx); err != nil {
		return Answer{}
	}

	return Answer{
		ID:        row.ID,
		FormID:    row.FormID,
		CircleID:  row.CircleID,
		Body:      row.Body,
		CreatedAt: pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt: pgutil.FormatTimestamptz(row.UpdatedAt),
		Details:   cloneDetails(details),
	}
}

func (r *SQLCRepository) Update(ctx context.Context, answerID, body string, details map[string][]string) (Answer, bool) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return Answer{}, false
	}
	defer tx.Rollback(ctx)

	queries := r.queries.WithTx(tx)
	row, err := queries.UpdateAnswerByID(ctx, dbgen.UpdateAnswerByIDParams{
		ID:   answerID,
		Body: body,
	})
	if err != nil {
		return Answer{}, false
	}

	if !persistAnswerDetails(ctx, queries, row.ID, row.FormID, row.CircleID, details) {
		return Answer{}, false
	}

	if err := tx.Commit(ctx); err != nil {
		return Answer{}, false
	}

	return Answer{
		ID:        row.ID,
		FormID:    row.FormID,
		CircleID:  row.CircleID,
		Body:      row.Body,
		CreatedAt: pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt: pgutil.FormatTimestamptz(row.UpdatedAt),
		Details:   cloneDetails(details),
	}, true
}

func (r *SQLCRepository) Delete(ctx context.Context, answerID string) bool {
	deleted, err := r.queries.DeleteAnswerByID(ctx, answerID)
	if err != nil {
		return false
	}

	return deleted > 0
}

func (r *SQLCRepository) ListUploads(ctx context.Context, formID, circleID string) []Upload {
	currentAnswer, found := r.Get(ctx, formID, circleID)
	if !found {
		return nil
	}

	return r.ListUploadsByAnswer(ctx, currentAnswer.ID)
}

func (r *SQLCRepository) ListUploadsByAnswer(ctx context.Context, answerID string) []Upload {
	rows, err := r.queries.ListAnswerUploadsByAnswerID(ctx, answerID)
	if err != nil {
		return nil
	}

	uploads := make([]Upload, 0, len(rows))
	for _, row := range rows {
		uploads = append(uploads, Upload{
			ID:         row.ID,
			AnswerID:   row.AnswerID,
			FormID:     row.FormID,
			CircleID:   row.CircleID,
			QuestionID: derefString(row.QuestionID),
			Filename:   row.Filename,
			MimeType:   row.MimeType,
			SizeBytes:  row.SizeBytes,
			CreatedAt:  pgutil.FormatTimestamptz(row.CreatedAt),
		})
	}

	return uploads
}

func (r *SQLCRepository) FindUpload(ctx context.Context, formID, circleID, uploadID string) (Upload, bool) {
	row, err := r.queries.GetAnswerUploadFileByID(ctx, uploadID)
	if err != nil {
		return Upload{}, false
	}
	if row.FormID != formID || row.CircleID != circleID {
		return Upload{}, false
	}

	return mapUploadFileByIDRow(row), true
}

func (r *SQLCRepository) FindUploadByAnswerAndQuestion(ctx context.Context, answerID, questionID string) (Upload, bool) {
	row, err := r.queries.GetAnswerUploadFileByAnswerAndQuestion(ctx, dbgen.GetAnswerUploadFileByAnswerAndQuestionParams{
		AnswerID:   answerID,
		QuestionID: optionalString(questionID),
	})
	if err != nil {
		return Upload{}, false
	}

	return mapUploadFileByQuestionRow(row), true
}

func (r *SQLCRepository) AddUpload(ctx context.Context, formID, circleID, questionID, filename, mimeType string, content []byte) (Upload, bool) {
	currentAnswer, found := r.Get(ctx, formID, circleID)
	if !found {
		currentAnswer = r.Create(ctx, formID, circleID, "", map[string][]string{})
		if currentAnswer.ID == "" {
			return Upload{}, false
		}
	}

	return r.AddUploadToAnswer(ctx, currentAnswer.ID, questionID, filename, mimeType, content)
}

func (r *SQLCRepository) AddUploadToAnswer(ctx context.Context, answerID, questionID, filename, mimeType string, content []byte) (Upload, bool) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return Upload{}, false
	}
	defer tx.Rollback(ctx)

	queries := r.queries.WithTx(tx)
	answerRow, err := queries.GetAnswerByID(ctx, answerID)
	if err != nil {
		return Upload{}, false
	}

	if questionID != "" {
		if _, err := queries.DeleteAnswerUploadsByAnswerAndQuestion(ctx, dbgen.DeleteAnswerUploadsByAnswerAndQuestionParams{
			AnswerID:   answerID,
			QuestionID: optionalString(questionID),
		}); err != nil {
			return Upload{}, false
		}
	}

	row, err := queries.CreateAnswerUpload(ctx, dbgen.CreateAnswerUploadParams{
		AnswerID:   answerID,
		FormID:     answerRow.FormID,
		CircleID:   answerRow.CircleID,
		QuestionID: optionalString(questionID),
		Filename:   filename,
		MimeType:   mimeType,
		Content:    content,
		SizeBytes:  int64(len(content)),
	})
	if err != nil {
		return Upload{}, false
	}

	if err := tx.Commit(ctx); err != nil {
		return Upload{}, false
	}

	return Upload{
		ID:         row.ID,
		AnswerID:   row.AnswerID,
		FormID:     row.FormID,
		CircleID:   row.CircleID,
		QuestionID: derefString(row.QuestionID),
		Filename:   row.Filename,
		MimeType:   row.MimeType,
		SizeBytes:  row.SizeBytes,
		CreatedAt:  pgutil.FormatTimestamptz(row.CreatedAt),
	}, true
}

func (r *SQLCRepository) loadAnswer(ctx context.Context, id, formID, circleID, body string, createdAt, updatedAt pgtype.Timestamptz) (Answer, bool) {
	details, err := r.listDetails(ctx, id)
	if err != nil {
		return Answer{}, false
	}

	return Answer{
		ID:        id,
		FormID:    formID,
		CircleID:  circleID,
		Body:      body,
		CreatedAt: pgutil.FormatTimestamptz(createdAt),
		UpdatedAt: pgutil.FormatTimestamptz(updatedAt),
		Details:   details,
	}, true
}

func (r *SQLCRepository) listDetails(ctx context.Context, answerID string) (map[string][]string, error) {
	rows, err := r.queries.ListAnswerDetailsByAnswerID(ctx, answerID)
	if err != nil {
		return nil, err
	}

	details := map[string][]string{}
	for _, row := range rows {
		details[row.QuestionID] = append(details[row.QuestionID], row.Value)
	}

	return details, nil
}

func persistAnswerDetails(
	ctx context.Context,
	queries *dbgen.Queries,
	answerID string,
	formID string,
	circleID string,
	details map[string][]string,
) bool {
	if _, err := queries.DeleteAnswerDetailsByAnswer(ctx, answerID); err != nil {
		return false
	}

	for questionID, values := range details {
		for index, value := range values {
			if _, err := queries.CreateAnswerDetail(ctx, dbgen.CreateAnswerDetailParams{
				AnswerID:   answerID,
				FormID:     formID,
				CircleID:   circleID,
				QuestionID: questionID,
				Value:      value,
				Position:   int32(index),
			}); err != nil {
				return false
			}
		}
	}

	return true
}

func (r *SQLCRepository) loadAnswerRows(ctx context.Context, rows []dbgen.Answer) []Answer {
	answers := make([]Answer, 0, len(rows))
	for _, row := range rows {
		a, ok := r.loadAnswer(ctx, row.ID, row.FormID, row.CircleID, row.Body, row.CreatedAt, row.UpdatedAt)
		if ok {
			answers = append(answers, a)
		}
	}

	return answers
}

func mapUploadFileByIDRow(row dbgen.AnswerUpload) Upload {
	return Upload{
		ID:         row.ID,
		AnswerID:   row.AnswerID,
		FormID:     row.FormID,
		CircleID:   row.CircleID,
		QuestionID: derefString(row.QuestionID),
		Filename:   row.Filename,
		MimeType:   row.MimeType,
		SizeBytes:  row.SizeBytes,
		CreatedAt:  pgutil.FormatTimestamptz(row.CreatedAt),
		Content:    row.Content,
	}
}

func mapUploadFileByQuestionRow(row dbgen.AnswerUpload) Upload {
	return Upload{
		ID:         row.ID,
		AnswerID:   row.AnswerID,
		FormID:     row.FormID,
		CircleID:   row.CircleID,
		QuestionID: derefString(row.QuestionID),
		Filename:   row.Filename,
		MimeType:   row.MimeType,
		SizeBytes:  row.SizeBytes,
		CreatedAt:  pgutil.FormatTimestamptz(row.CreatedAt),
		Content:    row.Content,
	}
}

func optionalString(value string) *string {
	if value == "" {
		return nil
	}
	s := value
	return &s
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
