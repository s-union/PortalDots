package document_test

import (
	"context"
	"sync/atomic"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/s-union/PortalDots/backend/internal/domain/document"
	"github.com/s-union/PortalDots/backend/internal/platform/database"
	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
	"github.com/s-union/PortalDots/backend/internal/testutil/dbtest"
)

const (
	documentBatchPublicID    = "10000000-0000-7000-8000-000000000001"
	documentBatchTaggedID    = "10000000-0000-7000-8000-000000000002"
	documentBatchPrivateID   = "10000000-0000-7000-8000-000000000003"
	documentBatchDescription = "batch document"
)

func TestSQLCRepositoryListsDocumentMetadataWithoutContent(t *testing.T) {
	databaseURL := dbtest.RequireDatabaseURL(t)
	lockPool := dbtest.OpenLockedPool(t, databaseURL)
	dbtest.ResetPublicSchema(t, lockPool)

	poolConfig, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		t.Fatalf("parse postgres config: %v", err)
	}
	queryCounter := &documentQueryCounter{}
	poolConfig.ConnConfig.Tracer = queryCounter
	pool, err := pgxpool.NewWithConfig(context.Background(), poolConfig)
	if err != nil {
		t.Fatalf("open postgres pool: %v", err)
	}
	t.Cleanup(pool.Close)

	ctx := context.Background()
	if err := database.Migrate(ctx, pool, dbtest.MigrationsDir(t)); err != nil {
		t.Fatalf("apply migrations: %v", err)
	}
	seedDocumentBatchFixture(t, pool)
	queryCounter.count.Store(0)

	repository := document.NewSQLCRepository(dbgen.New(pool))
	publicDocuments := repository.ListPublic(nil)
	if len(publicDocuments) != 1 || publicDocuments[0].ID != documentBatchPublicID {
		t.Fatalf("ListPublic() = %#v, want the untagged public document", publicDocuments)
	}
	if publicDocuments[0].Content != nil || publicDocuments[0].SizeBytes != 5 {
		t.Fatalf("ListPublic() metadata = %#v, want nil content and size 5", publicDocuments[0])
	}

	staffDocuments := repository.ListForStaff()
	if len(staffDocuments) != 3 {
		t.Fatalf("ListForStaff() returned %d documents; want 3", len(staffDocuments))
	}
	for _, currentDocument := range staffDocuments {
		if currentDocument.Content != nil {
			t.Fatalf("ListForStaff() included content for %s", currentDocument.ID)
		}
	}

	publicByIDs := repository.ListPublicByIDs(
		[]string{documentBatchTaggedID, documentBatchPublicID, documentBatchPrivateID},
		[]string{"circle-a"},
	)
	if len(publicByIDs) != 2 {
		t.Fatalf("ListPublicByIDs() returned %d documents; want 2 visible documents", len(publicByIDs))
	}
	publicByID := make(map[string]document.Document, len(publicByIDs))
	for _, currentDocument := range publicByIDs {
		publicByID[currentDocument.ID] = currentDocument
	}
	if _, ok := publicByID[documentBatchPrivateID]; ok {
		t.Fatal("ListPublicByIDs() returned a private document")
	}
	if publicByID[documentBatchTaggedID].Content != nil || publicByID[documentBatchTaggedID].SizeBytes != 4 {
		t.Fatalf("ListPublicByIDs() tagged metadata = %#v, want nil content and size 4", publicByID[documentBatchTaggedID])
	}

	staffByIDs := repository.ListForStaffByIDs([]string{documentBatchPrivateID, documentBatchPublicID})
	if len(staffByIDs) != 2 {
		t.Fatalf("ListForStaffByIDs() returned %d documents; want 2", len(staffByIDs))
	}
	for _, currentDocument := range staffByIDs {
		if currentDocument.Content != nil {
			t.Fatalf("ListForStaffByIDs() included content for %s", currentDocument.ID)
		}
	}
	if got := queryCounter.count.Load(); got != 4 {
		t.Fatalf("metadata listing used %d database queries; want 4", got)
	}
}

type documentQueryCounter struct {
	count atomic.Int64
}

func (c *documentQueryCounter) TraceQueryStart(ctx context.Context, _ *pgx.Conn, _ pgx.TraceQueryStartData) context.Context {
	c.count.Add(1)
	return ctx
}

func (c *documentQueryCounter) TraceQueryEnd(context.Context, *pgx.Conn, pgx.TraceQueryEndData) {}

func seedDocumentBatchFixture(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()

	statements := []struct {
		id         string
		isPublic   bool
		viewable   []string
		content    []byte
		nameSuffix string
	}{
		{id: documentBatchPublicID, isPublic: true, viewable: []string{}, content: []byte("first"), nameSuffix: "public"},
		{id: documentBatchTaggedID, isPublic: true, viewable: []string{"circle-a"}, content: []byte{0, 1, 2, 3}, nameSuffix: "tagged"},
		{id: documentBatchPrivateID, isPublic: false, viewable: []string{}, content: []byte("private content"), nameSuffix: "private"},
	}
	for _, statement := range statements {
		if _, err := pool.Exec(context.Background(), `
			INSERT INTO documents (id, name, description, is_public, viewable_tags, filename, mime_type, content)
			VALUES ($1, $2, $3, $4, $5, $6, 'text/plain', $7)
		`, statement.id, "Document "+statement.nameSuffix, documentBatchDescription, statement.isPublic, statement.viewable, statement.nameSuffix+".txt", statement.content); err != nil {
			t.Fatalf("seed document %s: %v", statement.id, err)
		}
	}
}
