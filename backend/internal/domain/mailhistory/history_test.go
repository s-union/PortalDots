package mailhistory_test

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/s-union/PortalDots/backend/internal/domain/mailhistory"
	"github.com/s-union/PortalDots/backend/internal/platform/database"
	"github.com/s-union/PortalDots/backend/internal/shared/emailqueue"
	"github.com/s-union/PortalDots/backend/internal/testutil/dbtest"
)

func TestHistoryPagingAndContactIsolation(t *testing.T) {
	for _, backend := range []string{"memory", "postgres"} {
		t.Run(backend, func(t *testing.T) {
			ctx := context.Background()
			var repo mailhistory.Repository = mailhistory.NewMemoryRepository()
			var pool *pgxpool.Pool
			if backend == "postgres" {
				pool = dbtest.OpenLockedPool(t, dbtest.RequireDatabaseURL(t))
				dbtest.ResetPublicSchema(t, pool)
				if err := database.Migrate(ctx, pool, dbtest.MigrationsDir(t)); err != nil {
					t.Fatal(err)
				}
				repo = mailhistory.NewPostgresRepository(pool)
			}
			record := func(id, body string) {
				t.Helper()
				if err := repo.Record(ctx, emailqueue.EmailJob{JobId: id, Template: "markdown-notice", Priority: emailqueue.PriorityNormal, Body: body, To: []string{"test@example.com"}}); err != nil {
					t.Fatal(err)
				}
			}
			for index := 0; index < 6; index++ {
				record(fmt.Sprintf("mail-%d", index), "full message body")
			}
			if pool != nil {
				// Equal timestamps exercise the job-ID tie breaker and retain microsecond precision.
				if _, err := pool.Exec(ctx, `UPDATE outbound_mails SET created_at = '2026-01-01 00:00:00.123456+00'`); err != nil {
					t.Fatal(err)
				}
			}
			page, err := repo.ListPage(ctx, 2, "")
			if err != nil {
				t.Fatal(err)
			}
			if len(page.Entries) != 2 || page.NextCursor == "" || page.Entries[0].JobID != "mail-5" || page.Entries[1].JobID != "mail-4" {
				t.Fatalf("first page: %#v", page)
			}
			if page.Entries[0].Body != "full message body" || !slices.Equal(page.Entries[0].Recipients, []string{"test@example.com"}) {
				t.Fatal("paging lost display fields")
			}
			seen := []string{page.Entries[0].JobID, page.Entries[1].JobID}
			record("newer-mail", "arrived after the first page")
			if err := repo.Delete(ctx, "mail-4"); err != nil {
				t.Fatal(err)
			}
			for page.NextCursor != "" {
				page, err = repo.ListPage(ctx, 2, page.NextCursor)
				if err != nil {
					t.Fatal(err)
				}
				for _, entry := range page.Entries {
					seen = append(seen, entry.JobID)
				}
				if len(seen) > 6 {
					t.Fatal("paging repeated entries")
				}
			}
			if !slices.Equal(seen, []string{"mail-5", "mail-4", "mail-3", "mail-2", "mail-1", "mail-0"}) {
				t.Fatalf("unexpected traversal: %v", seen)
			}
			if _, err := repo.ListPage(ctx, 2, "invalid!"); !errors.Is(err, mailhistory.ErrInvalidCursor) {
				t.Fatalf("invalid cursor error: %v", err)
			}

			structured := "PortalDots contact request\nfrom_user_id: user-a\ncircle_id: circle-a\ncategory_id: category-a\ncategory_name: General"
			legacy := "PortalDots contact request\nfrom: Old Name (user-a)\ncircle: Old Circle (circle-a)"
			record("contact-owner", structured+"\n\n"+strings.Repeat("private body", 1000))
			record("contact-legacy", legacy+"\n\nlegacy body")
			record("contact-other-user", strings.ReplaceAll(structured, "user-a", "user-b"))
			record("contact-other-circle", strings.ReplaceAll(structured, "circle-a", "circle-b"))
			record("contact-spoofed-body", "ordinary message\n\n"+structured)
			record("contact-confirm-owner", structured)
			entries, err := repo.ListContactHistory(ctx, "user-a", "circle-a")
			if err != nil {
				t.Fatal(err)
			}
			if len(entries) != 2 {
				t.Fatalf("expected only current owner's two contacts: %#v", entries)
			}
			for _, entry := range entries {
				if entry.JobID != "contact-owner" && entry.JobID != "contact-legacy" {
					t.Fatalf("unrelated contact: %s", entry.JobID)
				}
				if strings.Contains(entry.Body, "\n\n") || strings.Contains(entry.Body, "private body") || len(entry.Recipients) != 0 {
					t.Fatalf("contact listing loaded message content: %#v", entry)
				}
			}
		})
	}
}
