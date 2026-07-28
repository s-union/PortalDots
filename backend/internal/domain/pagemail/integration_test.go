package pagemail

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/s-union/PortalDots/backend/internal/domain/activitylog"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/document"
	"github.com/s-union/PortalDots/backend/internal/domain/mailhistory"
	"github.com/s-union/PortalDots/backend/internal/domain/page"
	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
	"github.com/s-union/PortalDots/backend/internal/platform/postgres/pgutil"
	"github.com/s-union/PortalDots/backend/internal/shared/emailqueue"
	"github.com/s-union/PortalDots/backend/internal/testutil/dbtest"
)

const (
	integrationUserID      = "0195ec00-0057-7000-8000-000000000001"
	integrationPageID      = "0195ec00-0031-7000-8000-000000000001"
	integrationPageID2     = "0195ec00-0031-7000-8000-000000000002"
	integrationPageID3     = "0195ec00-0031-7000-8000-000000000003"
	integrationJobID       = "job-integration-1"
	integrationMemberEmail = "member@example.com"
)

func TestIntegrationTickDispatchesDuePage(t *testing.T) {
	env := newIntegrationEnv(t, http.StatusOK)
	ctx := context.Background()
	seedIntegrationMember(t, env.pool)
	seedIntegrationPage(t, env.pool, time.Now().Add(-time.Minute))
	if err := env.schedules.Schedule(ctx, integrationPageID, integrationJobID, integrationUserID); err != nil {
		t.Fatalf("Schedule() error = %v", err)
	}

	if err := env.dispatcher.Tick(ctx); err != nil {
		t.Fatalf("Tick() error = %v", err)
	}

	requests := env.stub.snapshot()
	if len(requests) != 1 {
		t.Fatalf("enqueued %d jobs, want 1", len(requests))
	}
	request := requests[0]
	if request.method != http.MethodPost || request.path != "/enqueue" {
		t.Fatalf("enqueue request = %s %s, want POST /enqueue", request.method, request.path)
	}
	if request.auth != "Bearer test-token" {
		t.Fatalf("enqueue authorization = %q, want Bearer test-token", request.auth)
	}
	job := request.job
	if job.JobId != integrationJobID || job.Subject != "Test Announcement" || job.Template != "markdown-notice" {
		t.Fatalf("unexpected job: %#v", job)
	}
	if len(job.To) != 1 || job.To[0] != integrationMemberEmail {
		t.Fatalf("unexpected recipients: %#v", job.To)
	}

	status, _, dispatchedAt := scheduleRow(t, env.pool, integrationPageID)
	if status != "sent" {
		t.Fatalf("schedule status = %q, want sent", status)
	}
	if !dispatchedAt.Valid {
		t.Fatal("dispatched_at is null, want a timestamp")
	}
	if count := tableCount(t, env.pool, `SELECT COUNT(*) FROM outbound_mails WHERE job_id = $1`, integrationJobID); count != 1 {
		t.Fatalf("outbound_mails count = %d, want 1", count)
	}
	if count := tableCount(t, env.pool, `SELECT COUNT(*) FROM activity_logs WHERE action = $1`, "staff.mail.queued"); count != 1 {
		t.Fatalf("activity_logs count = %d, want 1", count)
	}
}

func TestIntegrationTickSkipsNotYetDuePage(t *testing.T) {
	env := newIntegrationEnv(t, http.StatusOK)
	ctx := context.Background()
	seedIntegrationMember(t, env.pool)
	seedIntegrationPage(t, env.pool, time.Now().Add(time.Hour))
	if err := env.schedules.Schedule(ctx, integrationPageID, integrationJobID, integrationUserID); err != nil {
		t.Fatalf("Schedule() error = %v", err)
	}

	if err := env.dispatcher.Tick(ctx); err != nil {
		t.Fatalf("Tick() error = %v", err)
	}

	if requests := env.stub.snapshot(); len(requests) != 0 {
		t.Fatalf("enqueued %d jobs, want 0", len(requests))
	}
	if status, attempts, _ := scheduleRow(t, env.pool, integrationPageID); status != "pending" || attempts != 0 {
		t.Fatalf("schedule = (%q, %d attempts), want (pending, 0)", status, attempts)
	}
}

func TestIntegrationTickGivesUpAfterRepeatedFailures(t *testing.T) {
	env := newIntegrationEnv(t, http.StatusInternalServerError)
	ctx := context.Background()
	seedIntegrationMember(t, env.pool)
	seedIntegrationPage(t, env.pool, time.Now().Add(-time.Minute))
	if err := env.schedules.Schedule(ctx, integrationPageID, integrationJobID, integrationUserID); err != nil {
		t.Fatalf("Schedule() error = %v", err)
	}

	for attempt := 1; attempt <= defaultMaxAttempts; attempt++ {
		makeIntegrationRetryDue(t, env.pool)
		if err := env.dispatcher.Tick(ctx); err == nil {
			t.Fatalf("Tick() attempt %d error = nil, want the enqueue failure", attempt)
		}
	}

	if requests := env.stub.snapshot(); len(requests) != defaultMaxAttempts {
		t.Fatalf("enqueue attempts = %d, want %d", len(requests), defaultMaxAttempts)
	}
	if status, attempts, _ := scheduleRow(t, env.pool, integrationPageID); status != "failed" || attempts != defaultMaxAttempts {
		t.Fatalf("schedule = (%q, %d attempts), want (failed, %d)", status, attempts, defaultMaxAttempts)
	}
}

func TestIntegrationScheduleRearmsSentMailWithNewJob(t *testing.T) {
	env := newIntegrationEnv(t, http.StatusOK)
	ctx := context.Background()
	seedIntegrationMember(t, env.pool)
	seedIntegrationPage(t, env.pool, time.Now().Add(-time.Minute))

	if err := env.schedules.Schedule(ctx, integrationPageID, "job-first", integrationUserID); err != nil {
		t.Fatalf("initial Schedule() error = %v", err)
	}
	active, err := env.schedules.HasActiveSchedule(ctx, integrationPageID)
	if err != nil || !active {
		t.Fatalf("HasActiveSchedule() = (%v, %v), want (true, nil)", active, err)
	}
	claimed, err := env.schedules.ClaimDue(ctx, 1)
	if err != nil || len(claimed) != 1 {
		t.Fatalf("ClaimDue() = (%v, %v), want one claim", claimed, err)
	}
	if err := env.schedules.MarkSent(ctx, integrationPageID); err != nil {
		t.Fatalf("MarkSent() error = %v", err)
	}
	active, err = env.schedules.HasActiveSchedule(ctx, integrationPageID)
	if err != nil || active {
		t.Fatalf("HasActiveSchedule() after sent = (%v, %v), want (false, nil)", active, err)
	}

	if err := env.schedules.Schedule(ctx, integrationPageID, "job-second", integrationUserID); err != nil {
		t.Fatalf("reschedule error = %v", err)
	}
	status, attempts, _ := scheduleRow(t, env.pool, integrationPageID)
	if status != "pending" || attempts != 0 {
		t.Fatalf("rescheduled row = (%q, %d), want (pending, 0)", status, attempts)
	}
	var jobID string
	if err := env.pool.QueryRow(ctx, `SELECT job_id FROM scheduled_page_mails WHERE page_id = $1`, integrationPageID).Scan(&jobID); err != nil {
		t.Fatalf("query rescheduled job ID: %v", err)
	}
	if jobID != "job-second" {
		t.Fatalf("rescheduled job ID = %q, want job-second", jobID)
	}
	claimed, err = env.schedules.ClaimDue(ctx, 1)
	if err != nil || len(claimed) != 1 || claimed[0].JobID != "job-second" {
		t.Fatalf("ClaimDue() after reschedule = (%v, %v), want job-second", claimed, err)
	}
}

func TestIntegrationZeroRecipientMailIsSkippedAndCanBeRearmed(t *testing.T) {
	env := newIntegrationEnv(t, http.StatusOK)
	ctx := context.Background()
	seedIntegrationMember(t, env.pool)
	seedIntegrationPageWithTags(t, env.pool, integrationPageID, time.Now().Add(-time.Minute), []string{"unmatched"})
	if err := env.schedules.Schedule(ctx, integrationPageID, "job-empty", integrationUserID); err != nil {
		t.Fatalf("Schedule() error = %v", err)
	}

	if err := env.dispatcher.Tick(ctx); err != nil {
		t.Fatalf("Tick() error = %v", err)
	}
	if status, _, _ := scheduleRow(t, env.pool, integrationPageID); status != "skipped" {
		t.Fatalf("schedule status = %q, want skipped", status)
	}
	active, err := env.schedules.HasActiveSchedule(ctx, integrationPageID)
	if err != nil || active {
		t.Fatalf("HasActiveSchedule() after skipped = (%v, %v), want (false, nil)", active, err)
	}
	if err := env.schedules.Schedule(ctx, integrationPageID, "job-rearmed", integrationUserID); err != nil {
		t.Fatalf("rearm Schedule() error = %v", err)
	}
	if status, _, _ := scheduleRow(t, env.pool, integrationPageID); status != "pending" {
		t.Fatalf("rearmed schedule status = %q, want pending", status)
	}
}

func TestIntegrationClaimDueClaimsEachRowOnceConcurrently(t *testing.T) {
	env := newIntegrationEnv(t, http.StatusOK)
	ctx := context.Background()
	seedIntegrationMember(t, env.pool)
	seedIntegrationPageWithTags(t, env.pool, integrationPageID, time.Now().Add(-time.Minute), nil)
	seedIntegrationPageWithTags(t, env.pool, integrationPageID2, time.Now().Add(-2*time.Minute), nil)
	for _, pageID := range []string{integrationPageID, integrationPageID2} {
		if err := env.schedules.Schedule(ctx, pageID, "job-"+pageID[len(pageID)-1:], integrationUserID); err != nil {
			t.Fatalf("Schedule(%s) error = %v", pageID, err)
		}
	}

	start := make(chan struct{})
	results := make(chan []Schedule, 2)
	var waitGroup sync.WaitGroup
	for range 2 {
		waitGroup.Add(1)
		go func() {
			defer waitGroup.Done()
			<-start
			claimed, err := env.schedules.ClaimDue(ctx, 2)
			if err != nil {
				t.Errorf("ClaimDue() error = %v", err)
				return
			}
			results <- claimed
		}()
	}
	close(start)
	waitGroup.Wait()
	close(results)

	seen := map[string]int{}
	for claimed := range results {
		for _, schedule := range claimed {
			seen[schedule.PageID]++
		}
	}
	if len(seen) != 2 || seen[integrationPageID] != 1 || seen[integrationPageID2] != 1 {
		t.Fatalf("concurrent claims = %#v, want each page exactly once", seen)
	}
}

func TestIntegrationClaimDueDoesNotClaimFuturePage(t *testing.T) {
	env := newIntegrationEnv(t, http.StatusOK)
	ctx := context.Background()
	seedIntegrationMember(t, env.pool)
	seedIntegrationPage(t, env.pool, time.Now().Add(time.Hour))
	if err := env.schedules.Schedule(ctx, integrationPageID, integrationJobID, integrationUserID); err != nil {
		t.Fatalf("Schedule() error = %v", err)
	}
	claimed, err := env.schedules.ClaimDue(ctx, 1)
	if err != nil {
		t.Fatalf("ClaimDue() error = %v", err)
	}
	if len(claimed) != 0 {
		t.Fatalf("ClaimDue() returned %d future rows, want 0", len(claimed))
	}
	if status, _, _ := scheduleRow(t, env.pool, integrationPageID); status != "pending" {
		t.Fatalf("future schedule status = %q, want pending", status)
	}
}

type integrationEnv struct {
	pool       *pgxpool.Pool
	schedules  *SQLCRepository
	dispatcher *Dispatcher
	stub       *enqueueStub
}

func newIntegrationEnv(t *testing.T, stubStatus int) *integrationEnv {
	t.Helper()

	databaseURL := dbtest.RequireDatabaseURL(t)
	lockPool := dbtest.OpenLockedPool(t, databaseURL)
	dbtest.ResetPublicSchema(t, lockPool)

	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		t.Fatalf("open postgres pool: %v", err)
	}
	t.Cleanup(pool.Close)

	applyMigrations(t, pool, dbtest.MigrationsDir(t))

	queries := dbgen.New(pool)
	schedules := NewSQLCRepository(queries)
	builder := NewBuilder(
		circle.NewSQLCCatalog(pool, queries),
		document.NewSQLCRepository(queries),
		participationtype.NewSQLCRepository(queries),
		useradmin.NewSQLCRepository(pool, queries),
		MailConfig{
			From:         "noreply@example.com",
			AdminName:    "Test Admin",
			ContactEmail: "contact@example.com",
			AppName:      "Test",
			AppURL:       "https://test.example.com",
		},
	)

	stub := &enqueueStub{status: stubStatus}
	server := httptest.NewServer(http.HandlerFunc(stub.handle))
	t.Cleanup(server.Close)

	sender := mailhistory.NewRecordingSender(
		mailhistory.NewPostgresRepository(pool),
		emailqueue.NewProducerClient(server.URL, "test-token"),
	)

	return &integrationEnv{
		pool:      pool,
		schedules: schedules,
		stub:      stub,
		dispatcher: NewDispatcher(
			schedules,
			page.NewSQLCRepository(queries),
			builder,
			sender,
			activitylog.NewSQLCRepository(queries),
			time.Minute,
		),
	}
}

func seedIntegrationMember(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()

	ctx := context.Background()
	if _, err := pool.Exec(ctx, `
INSERT INTO users (id, display_name, password, is_verified)
VALUES ($1, 'Test Member', 'x', true)`, integrationUserID); err != nil {
		t.Fatalf("seed integration member: %v", err)
	}
	if _, err := pool.Exec(ctx, `
INSERT INTO user_login_ids (login_id, user_id)
VALUES ($1, $2)`, integrationMemberEmail, integrationUserID); err != nil {
		t.Fatalf("seed integration member login id: %v", err)
	}
}

func seedIntegrationPage(t *testing.T, pool *pgxpool.Pool, publishedAt time.Time) {
	t.Helper()
	seedIntegrationPageWithTags(t, pool, integrationPageID, publishedAt, nil)
}

func seedIntegrationPageWithTags(t *testing.T, pool *pgxpool.Pool, pageID string, publishedAt time.Time, viewableTags []string) {
	t.Helper()

	if viewableTags == nil {
		viewableTags = []string{}
	}
	if _, err := pool.Exec(context.Background(), `
	INSERT INTO pages (id, title, body, is_public, viewable_tags, published_at)
	VALUES ($1, 'Test Announcement', 'Hello world', true, $2, $3)`,
		pageID, viewableTags, pgutil.Timestamptz(publishedAt)); err != nil {
		t.Fatalf("seed integration page: %v", err)
	}
}

func makeIntegrationRetryDue(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	if _, err := pool.Exec(context.Background(), `UPDATE scheduled_page_mails SET next_attempt_at = now()`); err != nil {
		t.Fatalf("make retry due: %v", err)
	}
}

func scheduleRow(t *testing.T, pool *pgxpool.Pool, pageID string) (string, int, pgtype.Timestamptz) {
	t.Helper()

	var (
		status       string
		attempts     int
		dispatchedAt pgtype.Timestamptz
	)
	err := pool.QueryRow(context.Background(), `
SELECT status, dispatch_attempts, dispatched_at
FROM scheduled_page_mails
WHERE page_id = $1`, pageID).Scan(&status, &attempts, &dispatchedAt)
	if err != nil {
		t.Fatalf("query schedule row for page %s: %v", pageID, err)
	}

	return status, attempts, dispatchedAt
}

func tableCount(t *testing.T, pool *pgxpool.Pool, query string, args ...any) int {
	t.Helper()

	var count int
	if err := pool.QueryRow(context.Background(), query, args...).Scan(&count); err != nil {
		t.Fatalf("count query: %v", err)
	}

	return count
}

type enqueueRequest struct {
	method string
	path   string
	auth   string
	job    emailqueue.EmailJob
}

type enqueueStub struct {
	mu       sync.Mutex
	status   int
	requests []enqueueRequest
}

func (s *enqueueStub) handle(w http.ResponseWriter, r *http.Request) {
	var job emailqueue.EmailJob
	if err := json.NewDecoder(r.Body).Decode(&job); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	s.mu.Lock()
	s.requests = append(s.requests, enqueueRequest{
		method: r.Method,
		path:   r.URL.Path,
		auth:   r.Header.Get("Authorization"),
		job:    job,
	})
	s.mu.Unlock()

	w.WriteHeader(s.status)
}

func (s *enqueueStub) snapshot() []enqueueRequest {
	s.mu.Lock()
	defer s.mu.Unlock()

	return append([]enqueueRequest(nil), s.requests...)
}

// applyMigrations mirrors platform/database.Migrate, which cannot be imported
// here: platform/database depends on pagemail, so the import would form a cycle.
// The schema is freshly reset per test, so migration tracking is unnecessary.
func applyMigrations(t *testing.T, pool *pgxpool.Pool, dir string) {
	t.Helper()

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("read migrations directory: %v", err)
	}
	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".sql" {
			continue
		}
		names = append(names, entry.Name())
	}
	sort.Strings(names)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	for _, name := range names {
		contents, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			t.Fatalf("read migration %s: %v", name, err)
		}
		statement := gooseUpStatement(t, name, string(contents))
		if statement == "" {
			continue
		}
		if _, err := pool.Exec(ctx, statement); err != nil {
			t.Fatalf("apply migration %s: %v", name, err)
		}
	}
}

func gooseUpStatement(t *testing.T, name, contents string) string {
	t.Helper()

	const upMarker = "-- +goose Up"
	index := strings.Index(contents, upMarker)
	if index < 0 {
		t.Fatalf("migration %s: missing goose up marker", name)
	}

	statement := contents[index+len(upMarker):]
	if newline := strings.Index(statement, "\n"); newline >= 0 {
		statement = statement[newline+1:]
	}
	if down := strings.Index(statement, "-- +goose Down"); down >= 0 {
		statement = statement[:down]
	}

	return strings.TrimSpace(statement)
}
