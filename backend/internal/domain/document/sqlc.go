package document

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
)

type SQLCRepository struct {
	queries *dbgen.Queries
}

func NewSQLCRepository(queries *dbgen.Queries) *SQLCRepository {
	return &SQLCRepository{queries: queries}
}

func (r *SQLCRepository) ListReadDocumentIDs(userID string, documentIDs []string) []string {
	if len(documentIDs) == 0 {
		return nil
	}
	ids, err := r.queries.ListReadDocumentIDsByUser(context.Background(), dbgen.ListReadDocumentIDsByUserParams{
		UserID:  userID,
		Column2: documentIDs,
	})
	if err != nil {
		return nil
	}
	return ids
}

func (r *SQLCRepository) MarkRead(documentID, userID string) error {
	return r.queries.MarkDocumentRead(context.Background(), dbgen.MarkDocumentReadParams{
		DocumentID: documentID,
		UserID:     userID,
	})
}

func (r *SQLCRepository) ListPublic(circleTags []string) []Document {
	rows, err := r.queries.ListPublicDocuments(context.Background(), circleTags)
	if err != nil {
		return nil
	}

	documents := make([]Document, 0, len(rows))
	for _, row := range rows {
		documents = append(documents, mapPublicDocument(row))
	}

	return documents
}

func (r *SQLCRepository) FindPublic(documentID string, circleTags []string) (Document, bool) {
	row, err := r.queries.GetPublicDocumentByID(context.Background(), dbgen.GetPublicDocumentByIDParams{
		ID:      documentID,
		Column2: circleTags,
	})
	if err != nil {
		return Document{}, false
	}

	return mapPublicDocumentByID(row), true
}

func (r *SQLCRepository) ListForStaff() []Document {
	rows, err := r.queries.ListStaffDocuments(context.Background())
	if err != nil {
		return nil
	}

	documents := make([]Document, 0, len(rows))
	for _, row := range rows {
		documents = append(documents, mapStaffDocument(row))
	}

	return documents
}

func (r *SQLCRepository) FindForStaff(documentID string) (Document, bool) {
	row, err := r.queries.GetStaffDocumentByID(context.Background(), documentID)
	if err != nil {
		return Document{}, false
	}

	return mapStaffDocumentByID(row), true
}

func (r *SQLCRepository) Create(
	name,
	description,
	notes string,
	isPublic bool,
	isImportant bool,
	viewableTags []string,
	filename,
	mimeType string,
	content []byte,
) (Document, bool) {
	row, err := r.queries.CreateStaffDocument(context.Background(), dbgen.CreateStaffDocumentParams{
		Name:         name,
		Description:  description,
		Notes:        notes,
		IsPublic:     isPublic,
		ViewableTags: viewableTags,
		IsImportant:  isImportant,
		Filename:     filename,
		MimeType:     mimeType,
		Content:      content,
	})
	if err != nil {
		return Document{}, false
	}

	return Document{
		ID:           row.ID,
		Name:         row.Name,
		Description:  row.Description,
		Notes:        row.Notes,
		IsPublic:     row.IsPublic,
		IsImportant:  row.IsImportant,
		ViewableTags: append([]string{}, row.ViewableTags...),
		Filename:     row.Filename,
		Extension:    normalizeDocumentExtension(row.Filename),
		MimeType:     row.MimeType,
		SizeBytes:    int64(len(row.Content)),
		CreatedAt:    formatDocumentTimestamp(row.CreatedAt),
		UpdatedAt:    formatDocumentTimestamp(row.UpdatedAt),
		Content:      append([]byte(nil), row.Content...),
	}, true
}

func (r *SQLCRepository) Update(
	documentID,
	name,
	description,
	notes string,
	isPublic bool,
	isImportant bool,
	viewableTags []string,
	filename,
	mimeType string,
	content []byte,
) (Document, bool) {
	row, err := r.queries.UpdateStaffDocument(context.Background(), dbgen.UpdateStaffDocumentParams{
		ID:           documentID,
		Name:         name,
		Description:  description,
		Notes:        notes,
		IsPublic:     isPublic,
		ViewableTags: viewableTags,
		IsImportant:  isImportant,
		Filename:     filename,
		MimeType:     mimeType,
		Content:      content,
	})
	if err != nil {
		return Document{}, false
	}

	return Document{
		ID:           row.ID,
		Name:         row.Name,
		Description:  row.Description,
		Notes:        row.Notes,
		IsPublic:     row.IsPublic,
		IsImportant:  row.IsImportant,
		ViewableTags: append([]string{}, row.ViewableTags...),
		Filename:     row.Filename,
		Extension:    normalizeDocumentExtension(row.Filename),
		MimeType:     row.MimeType,
		SizeBytes:    int64(len(row.Content)),
		CreatedAt:    formatDocumentTimestamp(row.CreatedAt),
		UpdatedAt:    formatDocumentTimestamp(row.UpdatedAt),
		Content:      append([]byte(nil), row.Content...),
	}, true
}

func (r *SQLCRepository) Delete(documentID string) bool {
	deleted, err := r.queries.DeleteStaffDocument(context.Background(), documentID)
	if err != nil {
		return false
	}

	return deleted > 0
}

func formatDocumentTimestamp(value pgtype.Timestamptz) string {
	if !value.Valid {
		return ""
	}
	return value.Time.UTC().Format(time.RFC3339)
}

func mapPublicDocument(row dbgen.ListPublicDocumentsRow) Document {
	return Document{
		ID:           row.ID,
		Name:         row.Name,
		Description:  row.Description,
		Notes:        row.Notes,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		IsImportant:  row.IsImportant,
		Filename:     row.Filename,
		Extension:    normalizeDocumentExtension(row.Filename),
		MimeType:     row.MimeType,
		SizeBytes:    int64(len(row.Content)),
		CreatedAt:    formatDocumentTimestamp(row.CreatedAt),
		UpdatedAt:    formatDocumentTimestamp(row.UpdatedAt),
		Content:      append([]byte(nil), row.Content...),
	}
}

func mapStaffDocument(row dbgen.ListStaffDocumentsRow) Document {
	return Document{
		ID:           row.ID,
		Name:         row.Name,
		Description:  row.Description,
		Notes:        row.Notes,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		IsImportant:  row.IsImportant,
		Filename:     row.Filename,
		Extension:    normalizeDocumentExtension(row.Filename),
		MimeType:     row.MimeType,
		SizeBytes:    int64(len(row.Content)),
		CreatedAt:    formatDocumentTimestamp(row.CreatedAt),
		UpdatedAt:    formatDocumentTimestamp(row.UpdatedAt),
		Content:      append([]byte(nil), row.Content...),
	}
}

func mapPublicDocumentByID(row dbgen.GetPublicDocumentByIDRow) Document {
	return Document{
		ID:           row.ID,
		Name:         row.Name,
		Description:  row.Description,
		Notes:        row.Notes,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		IsImportant:  row.IsImportant,
		Filename:     row.Filename,
		Extension:    normalizeDocumentExtension(row.Filename),
		MimeType:     row.MimeType,
		SizeBytes:    int64(len(row.Content)),
		CreatedAt:    formatDocumentTimestamp(row.CreatedAt),
		UpdatedAt:    formatDocumentTimestamp(row.UpdatedAt),
		Content:      append([]byte(nil), row.Content...),
	}
}

func mapStaffDocumentByID(row dbgen.GetStaffDocumentByIDRow) Document {
	return Document{
		ID:           row.ID,
		Name:         row.Name,
		Description:  row.Description,
		Notes:        row.Notes,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		IsImportant:  row.IsImportant,
		Filename:     row.Filename,
		Extension:    normalizeDocumentExtension(row.Filename),
		MimeType:     row.MimeType,
		SizeBytes:    int64(len(row.Content)),
		CreatedAt:    formatDocumentTimestamp(row.CreatedAt),
		UpdatedAt:    formatDocumentTimestamp(row.UpdatedAt),
		Content:      append([]byte(nil), row.Content...),
	}
}
