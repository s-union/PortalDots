package answer_test

import (
	"context"
	"slices"
	"sync/atomic"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/s-union/PortalDots/backend/internal/domain/answer"
	"github.com/s-union/PortalDots/backend/internal/platform/database"
	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
	"github.com/s-union/PortalDots/backend/internal/testutil/dbtest"
)

func TestSQLCRepositoryBatchesAnswerDetailsAndUploadMetadata(t *testing.T) {
	databaseURL := dbtest.RequireDatabaseURL(t)
	lockPool := dbtest.OpenLockedPool(t, databaseURL)
	dbtest.ResetPublicSchema(t, lockPool)

	poolConfig, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		t.Fatalf("parse postgres config: %v", err)
	}
	queryCounter := &answerQueryCounter{}
	poolConfig.ConnConfig.Tracer = queryCounter
	pool, err := pgxpool.NewWithConfig(context.Background(), poolConfig)
	if err != nil {
		t.Fatalf("open postgres pool: %v", err)
	}
	t.Cleanup(pool.Close)

	ctx := context.Background()
	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("ping postgres: %v", err)
	}
	if err := database.Migrate(ctx, pool, dbtest.MigrationsDir(t)); err != nil {
		t.Fatalf("apply migrations: %v", err)
	}
	seedAnswerBatchFixture(t, pool)
	queryCounter.count.Store(0)

	repository := answer.NewSQLCRepository(pool, dbgen.New(pool))
	answers := repository.ListByForm(ctx, answerBatchFormID)
	if len(answers) != 50 {
		t.Fatalf("ListByForm() returned %d answers; want 50", len(answers))
	}
	answerByID := make(map[string]answer.Answer, len(answers))
	answerIDs := make([]string, 0, len(answers))
	for _, currentAnswer := range answers {
		answerByID[currentAnswer.ID] = currentAnswer
		answerIDs = append(answerIDs, currentAnswer.ID)
	}
	if got := answerByID[answerBatchFirstID].Details[answerBatchTextQuestionID]; !slices.Equal(got, []string{"first value", "second value"}) {
		t.Fatalf("first answer details = %#v; want both values in position order", got)
	}
	if got := answerByID[answerBatchSecondID].Details[answerBatchTextQuestionID]; !slices.Equal(got, []string{"other value"}) {
		t.Fatalf("second answer details = %#v; want answer-specific value", got)
	}

	uploadsByAnswer := repository.ListUploadsByAnswers(ctx, answerIDs)
	if len(uploadsByAnswer[answerBatchFirstID]) != 1 || uploadsByAnswer[answerBatchFirstID][0].Filename != "first.pdf" {
		t.Fatalf("first answer uploads = %#v; want first metadata", uploadsByAnswer[answerBatchFirstID])
	}
	if len(uploadsByAnswer[answerBatchSecondID]) != 1 || uploadsByAnswer[answerBatchSecondID][0].Filename != "second.pdf" {
		t.Fatalf("second answer uploads = %#v; want second metadata", uploadsByAnswer[answerBatchSecondID])
	}
	if uploadsByAnswer[answerBatchFirstID][0].Content != nil || uploadsByAnswer[answerBatchSecondID][0].Content != nil {
		t.Fatal("batch upload metadata unexpectedly included content")
	}
	for _, currentAnswer := range answers {
		if currentAnswer.ID == answerBatchFirstID || currentAnswer.ID == answerBatchSecondID {
			continue
		}
		if len(currentAnswer.Details) != 0 || len(uploadsByAnswer[currentAnswer.ID]) != 0 {
			t.Fatalf("empty answer %s has details or uploads: %#v, %#v", currentAnswer.ID, currentAnswer.Details, uploadsByAnswer[currentAnswer.ID])
		}
	}
	if got := queryCounter.count.Load(); got != 3 {
		t.Fatalf("batched answer listing used %d database queries; want 3 (answers, details, uploads)", got)
	}
}

const (
	answerBatchFormID             = "10000000-0000-7000-8000-000000000001"
	answerBatchFirstCircleID      = "10000000-0000-7000-8000-000000000002"
	answerBatchSecondCircleID     = "10000000-0000-7000-8000-000000000003"
	answerBatchTextQuestionID     = "10000000-0000-7000-8000-000000000004"
	answerBatchCheckboxQuestionID = "10000000-0000-7000-8000-000000000005"
	answerBatchUploadQuestionID   = "10000000-0000-7000-8000-000000000006"
	answerBatchFirstID            = "10000000-0000-7000-8000-000000000007"
	answerBatchSecondID           = "10000000-0000-7000-8000-000000000008"
)

type answerQueryCounter struct {
	count atomic.Int64
}

func (c *answerQueryCounter) TraceQueryStart(ctx context.Context, _ *pgx.Conn, _ pgx.TraceQueryStartData) context.Context {
	c.count.Add(1)
	return ctx
}

func (c *answerQueryCounter) TraceQueryEnd(context.Context, *pgx.Conn, pgx.TraceQueryEndData) {}

func seedAnswerBatchFixture(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	statements := []struct {
		query string
		args  []any
	}{
		{
			`INSERT INTO forms (id, name, description, open_at, close_at) VALUES ($1, 'Batch form', '', now(), now())`,
			[]any{answerBatchFormID},
		},
		{
			`INSERT INTO circles (id, name, group_name, participation_type_name) VALUES ($1, 'First circle', 'First group', '')`,
			[]any{answerBatchFirstCircleID},
		},
		{
			`INSERT INTO circles (id, name, group_name, participation_type_name) VALUES ($1, 'Second circle', 'Second group', '')`,
			[]any{answerBatchSecondCircleID},
		},
		{
			`INSERT INTO form_questions (id, form_id, type) VALUES ($1, $2, 'text')`,
			[]any{answerBatchTextQuestionID, answerBatchFormID},
		},
		{
			`INSERT INTO form_questions (id, form_id, type) VALUES ($1, $2, 'checkbox')`,
			[]any{answerBatchCheckboxQuestionID, answerBatchFormID},
		},
		{
			`INSERT INTO form_questions (id, form_id, type) VALUES ($1, $2, 'upload')`,
			[]any{answerBatchUploadQuestionID, answerBatchFormID},
		},
		{
			`INSERT INTO answers (id, form_id, circle_id, body) VALUES ($1, $2, $3, 'first')`,
			[]any{answerBatchFirstID, answerBatchFormID, answerBatchFirstCircleID},
		},
		{
			`INSERT INTO answers (id, form_id, circle_id, body) VALUES ($1, $2, $3, 'second')`,
			[]any{answerBatchSecondID, answerBatchFormID, answerBatchSecondCircleID},
		},
		{
			`INSERT INTO answers (form_id, circle_id, body) SELECT $1, $2, 'extra' FROM generate_series(1, 48)`,
			[]any{answerBatchFormID, answerBatchFirstCircleID},
		},
		{
			`INSERT INTO answer_details (answer_id, form_id, circle_id, question_id, value, position) VALUES ($1, $2, $3, $4, 'first value', 0)`,
			[]any{answerBatchFirstID, answerBatchFormID, answerBatchFirstCircleID, answerBatchTextQuestionID},
		},
		{
			`INSERT INTO answer_details (answer_id, form_id, circle_id, question_id, value, position) VALUES ($1, $2, $3, $4, 'second value', 1)`,
			[]any{answerBatchFirstID, answerBatchFormID, answerBatchFirstCircleID, answerBatchTextQuestionID},
		},
		{
			`INSERT INTO answer_details (answer_id, form_id, circle_id, question_id, value, position) VALUES ($1, $2, $3, $4, 'checkbox value', 0)`,
			[]any{answerBatchFirstID, answerBatchFormID, answerBatchFirstCircleID, answerBatchCheckboxQuestionID},
		},
		{
			`INSERT INTO answer_details (answer_id, form_id, circle_id, question_id, value, position) VALUES ($1, $2, $3, $4, 'other value', 0)`,
			[]any{answerBatchSecondID, answerBatchFormID, answerBatchSecondCircleID, answerBatchTextQuestionID},
		},
		{
			`INSERT INTO answer_uploads (answer_id, form_id, circle_id, question_id, filename, mime_type, content, size_bytes) VALUES ($1, $2, $3, $4, 'first.pdf', 'application/pdf', 'first content', 13)`,
			[]any{answerBatchFirstID, answerBatchFormID, answerBatchFirstCircleID, answerBatchUploadQuestionID},
		},
		{
			`INSERT INTO answer_uploads (answer_id, form_id, circle_id, question_id, filename, mime_type, content, size_bytes) VALUES ($1, $2, $3, $4, 'second.pdf', 'application/pdf', 'second content', 14)`,
			[]any{answerBatchSecondID, answerBatchFormID, answerBatchSecondCircleID, answerBatchUploadQuestionID},
		},
	}
	for _, statement := range statements {
		if _, err := pool.Exec(ctx, statement.query, statement.args...); err != nil {
			t.Fatalf("seed answer batch fixture: %v", err)
		}
	}
}
