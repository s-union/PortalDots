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

func (r *SQLCRepository) Get(formID, circleID string) (Answer, bool) {
	row, err := r.queries.GetLatestAnswerByFormAndCircle(context.Background(), dbgen.GetLatestAnswerByFormAndCircleParams{
		FormID:   formID,
		CircleID: circleID,
	})
	if err != nil {
		return Answer{}, false
	}

	return r.loadAnswer(row)
}

func (r *SQLCRepository) Find(answerID string) (Answer, bool) {
	row, err := r.queries.GetAnswerByID(context.Background(), answerID)
	if err != nil {
		return Answer{}, false
	}

	return r.loadAnswer(row)
}

func (r *SQLCRepository) ListByCircle(circleID string) []Answer {
	rows, err := r.queries.ListAnswersByCircle(context.Background(), circleID)
	if err != nil {
		return nil
	}

	return r.loadAnswerRows(rows)
}

func (r *SQLCRepository) ListByForm(formID string) []Answer {
	rows, err := r.queries.ListAnswersByForm(context.Background(), formID)
	if err != nil {
		return nil
	}

	return r.loadAnswerRows(rows)
}

func (r *SQLCRepository) ListByFormAndCircle(formID, circleID string) []Answer {
	rows, err := r.queries.ListAnswersByFormAndCircle(context.Background(), dbgen.ListAnswersByFormAndCircleParams{
		FormID:   formID,
		CircleID: circleID,
	})
	if err != nil {
		return nil
	}

	return r.loadAnswerRows(rows)
}

func (r *SQLCRepository) Upsert(formID, circleID, body string, details map[string][]string) Answer {
	currentAnswer, found := r.Get(formID, circleID)
	if !found {
		return r.Create(formID, circleID, body, details)
	}

	updated, _ := r.Update(currentAnswer.ID, body, details)
	return updated
}

func (r *SQLCRepository) Create(formID, circleID, body string, details map[string][]string) Answer {
	ctx := context.Background()
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

func (r *SQLCRepository) Update(answerID, body string, details map[string][]string) (Answer, bool) {
	ctx := context.Background()
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

func (r *SQLCRepository) Delete(answerID string) bool {
	deleted, err := r.queries.DeleteAnswerByID(context.Background(), answerID)
	if err != nil {
		return false
	}

	return deleted > 0
}

func (r *SQLCRepository) ListUploads(formID, circleID string) []Upload {
	currentAnswer, found := r.Get(formID, circleID)
	if !found {
		return nil
	}

	return r.ListUploadsByAnswer(currentAnswer.ID)
}

func (r *SQLCRepository) ListUploadsByAnswer(answerID string) []Upload {
	rows, err := r.queries.ListAnswerUploadsByAnswerID(context.Background(), answerID)
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
			QuestionID: nullableTextValue(row.QuestionID),
			Filename:   row.Filename,
			MimeType:   row.MimeType,
			SizeBytes:  row.SizeBytes,
			CreatedAt:  pgutil.FormatTimestamptz(row.CreatedAt),
		})
	}

	return uploads
}

func (r *SQLCRepository) FindUpload(formID, circleID, uploadID string) (Upload, bool) {
	row, err := r.queries.GetAnswerUploadFileByID(context.Background(), uploadID)
	if err != nil {
		return Upload{}, false
	}
	if row.FormID != formID || row.CircleID != circleID {
		return Upload{}, false
	}

	return mapUploadFileByIDRow(row), true
}

func (r *SQLCRepository) FindUploadByAnswerAndQuestion(answerID, questionID string) (Upload, bool) {
	row, err := r.queries.GetAnswerUploadFileByAnswerAndQuestion(context.Background(), dbgen.GetAnswerUploadFileByAnswerAndQuestionParams{
		AnswerID:   answerID,
		QuestionID: nullableText(questionID),
	})
	if err != nil {
		return Upload{}, false
	}

	return mapUploadFileByQuestionRow(row), true
}

func (r *SQLCRepository) AddUpload(formID, circleID, questionID, filename, mimeType string, content []byte) (Upload, bool) {
	currentAnswer, found := r.Get(formID, circleID)
	if !found {
		currentAnswer = r.Create(formID, circleID, "", map[string][]string{})
		if currentAnswer.ID == "" {
			return Upload{}, false
		}
	}

	return r.AddUploadToAnswer(currentAnswer.ID, questionID, filename, mimeType, content)
}

func (r *SQLCRepository) AddUploadToAnswer(answerID, questionID, filename, mimeType string, content []byte) (Upload, bool) {
	ctx := context.Background()
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
			QuestionID: nullableText(questionID),
		}); err != nil {
			return Upload{}, false
		}
	}

	row, err := queries.CreateAnswerUpload(ctx, dbgen.CreateAnswerUploadParams{
		AnswerID:   answerID,
		FormID:     answerRow.FormID,
		CircleID:   answerRow.CircleID,
		QuestionID: nullableText(questionID),
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
		QuestionID: nullableTextValue(row.QuestionID),
		Filename:   row.Filename,
		MimeType:   row.MimeType,
		SizeBytes:  row.SizeBytes,
		CreatedAt:  pgutil.FormatTimestamptz(row.CreatedAt),
	}, true
}

func (r *SQLCRepository) loadAnswer(row dbgen.Answer) (Answer, bool) {
	details, err := r.listDetails(row.ID)
	if err != nil {
		return Answer{}, false
	}

	return Answer{
		ID:        row.ID,
		FormID:    row.FormID,
		CircleID:  row.CircleID,
		Body:      row.Body,
		CreatedAt: pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt: pgutil.FormatTimestamptz(row.UpdatedAt),
		Details:   details,
	}, true
}

func (r *SQLCRepository) listDetails(answerID string) (map[string][]string, error) {
	rows, err := r.queries.ListAnswerDetailsByAnswerID(context.Background(), answerID)
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

func (r *SQLCRepository) loadAnswerRows(rows []dbgen.Answer) []Answer {
	answers := make([]Answer, 0, len(rows))
	for _, row := range rows {
		a, ok := r.loadAnswer(row)
		if ok {
			answers = append(answers, a)
		}
	}

	return answers
}

func mapUploadFileByIDRow(row dbgen.GetAnswerUploadFileByIDRow) Upload {
	return Upload{
		ID:         row.ID,
		AnswerID:   row.AnswerID,
		FormID:     row.FormID,
		CircleID:   row.CircleID,
		QuestionID: nullableTextValue(row.QuestionID),
		Filename:   row.Filename,
		MimeType:   row.MimeType,
		SizeBytes:  row.SizeBytes,
		CreatedAt:  pgutil.FormatTimestamptz(row.CreatedAt),
		Content:    row.Content,
	}
}

func mapUploadFileByQuestionRow(row dbgen.GetAnswerUploadFileByAnswerAndQuestionRow) Upload {
	return Upload{
		ID:         row.ID,
		AnswerID:   row.AnswerID,
		FormID:     row.FormID,
		CircleID:   row.CircleID,
		QuestionID: nullableTextValue(row.QuestionID),
		Filename:   row.Filename,
		MimeType:   row.MimeType,
		SizeBytes:  row.SizeBytes,
		CreatedAt:  pgutil.FormatTimestamptz(row.CreatedAt),
		Content:    row.Content,
	}
}

func nullableText(value string) pgtype.Text {
	if value == "" {
		return pgtype.Text{}
	}

	return pgtype.Text{
		String: value,
		Valid:  true,
	}
}

func nullableTextValue(value pgtype.Text) string {
	if !value.Valid {
		return ""
	}
	return value.String
}
