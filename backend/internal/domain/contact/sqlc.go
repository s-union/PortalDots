package contact

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
	"github.com/s-union/PortalDots/backend/internal/platform/postgres/pgutil"
)

// SQLCRepository persists contacts and attachments in PostgreSQL.
type SQLCRepository struct {
	pool    *pgxpool.Pool
	queries *dbgen.Queries
}

// NewSQLCRepository creates a PostgreSQL-backed contact repository.
func NewSQLCRepository(pool *pgxpool.Pool, queries *dbgen.Queries) *SQLCRepository {
	return &SQLCRepository{pool: pool, queries: queries}
}

// Create stores a contact and optional attachment in one PostgreSQL transaction.
func (r *SQLCRepository) Create(ctx context.Context, input NewContact, newAttachment *NewAttachment) (Contact, string, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return Contact{}, "", err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	queries := r.queries.WithTx(tx)
	row, err := queries.CreateContact(ctx, dbgen.CreateContactParams{
		UserID:         input.UserID,
		CircleID:       input.CircleID,
		CategoryID:     input.CategoryID,
		CategoryName:   input.CategoryName,
		Subject:        input.Subject,
		Body:           input.Body,
		Status:         input.Status,
		StaffMailJobID: input.StaffMailJobID,
	})
	if err != nil {
		return Contact{}, "", err
	}

	created := Contact{
		ID:             row.ID,
		UserID:         row.UserID,
		CircleID:       row.CircleID,
		CategoryID:     row.CategoryID,
		CategoryName:   row.CategoryName,
		Subject:        row.Subject,
		Body:           row.Body,
		Status:         row.Status,
		StaffMailJobID: row.StaffMailJobID,
		CreatedAt:      pgutil.FormatTimestamptz(row.CreatedAt),
	}

	rawToken := ""
	if newAttachment != nil {
		var digest []byte
		rawToken, digest, err = GenerateDownloadToken()
		if err != nil {
			return Contact{}, "", err
		}
		if _, err := queries.CreateContactAttachment(ctx, dbgen.CreateContactAttachmentParams{
			ContactID:         row.ID,
			Filename:          newAttachment.Filename,
			MimeType:          newAttachment.MimeType,
			SizeBytes:         int64(len(newAttachment.Content)),
			Content:           newAttachment.Content,
			DownloadTokenHash: digest,
		}); err != nil {
			return Contact{}, "", err
		}
		created.Attachment = &AttachmentMetadata{
			Filename:  newAttachment.Filename,
			MimeType:  newAttachment.MimeType,
			SizeBytes: int64(len(newAttachment.Content)),
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return Contact{}, "", err
	}
	return created, rawToken, nil
}

// ListByOwner returns contacts submitted by a user for one circle.
func (r *SQLCRepository) ListByOwner(ctx context.Context, userID, circleID string) ([]Contact, error) {
	rows, err := r.queries.ListContactsByOwner(ctx, dbgen.ListContactsByOwnerParams{
		UserID:   userID,
		CircleID: circleID,
	})
	if err != nil {
		return nil, err
	}

	items := make([]Contact, 0, len(rows))
	for _, row := range rows {
		item := Contact{
			ID:             row.ID,
			UserID:         row.UserID,
			CircleID:       row.CircleID,
			CategoryID:     row.CategoryID,
			CategoryName:   row.CategoryName,
			Subject:        row.Subject,
			Body:           row.Body,
			Status:         row.Status,
			StaffMailJobID: row.StaffMailJobID,
			CreatedAt:      pgutil.FormatTimestamptz(row.CreatedAt),
		}
		if row.Filename.Valid && row.MimeType.Valid && row.SizeBytes.Valid {
			item.Attachment = &AttachmentMetadata{
				Filename:  row.Filename.String,
				MimeType:  row.MimeType.String,
				SizeBytes: row.SizeBytes.Int64,
			}
		}
		items = append(items, item)
	}
	return items, nil
}

// FindAttachment returns an attachment matching a token digest.
func (r *SQLCRepository) FindAttachment(ctx context.Context, tokenHash []byte) (Attachment, error) {
	row, err := r.queries.FindContactAttachmentByTokenHash(ctx, tokenHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return Attachment{}, ErrNotFound
	}
	if err != nil {
		return Attachment{}, err
	}
	return Attachment{
		ID:        row.ID,
		ContactID: row.ContactID,
		Filename:  row.Filename,
		MimeType:  row.MimeType,
		SizeBytes: row.SizeBytes,
		Content:   row.Content,
		TokenHash: append([]byte(nil), tokenHash...),
		CreatedAt: pgutil.FormatTimestamptz(row.CreatedAt),
	}, nil
}

// Delete removes a contact and cascades to its attachment.
func (r *SQLCRepository) Delete(ctx context.Context, id string) error {
	rows, err := r.queries.DeleteContact(ctx, id)
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}
