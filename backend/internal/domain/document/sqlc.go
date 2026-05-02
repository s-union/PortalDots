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

func (r *SQLCRepository) ListByCircle(circleID string) []Document {
	rows, err := r.queries.ListPublicDocumentsByCircle(context.Background(), circleID)
	if err != nil {
		return nil
	}

	documents := make([]Document, 0, len(rows))
	for _, row := range rows {
		documents = append(documents, mapPublicDocumentByCircle(row))
	}

	return documents
}

func (r *SQLCRepository) ListPublic() []Document {
	rows, err := r.queries.ListPublicDocuments(context.Background())
	if err != nil {
		return nil
	}

	documents := make([]Document, 0, len(rows))
	for _, row := range rows {
		documents = append(documents, mapPublicDocument(row))
	}

	return documents
}

func (r *SQLCRepository) ListByCircleForStaff(circleID string) []Document {
	rows, err := r.queries.ListStaffDocumentsByCircle(context.Background(), circleID)
	if err != nil {
		return nil
	}

	documents := make([]Document, 0, len(rows))
	for _, row := range rows {
		documents = append(documents, mapStaffDocument(row))
	}

	return documents
}

func (r *SQLCRepository) FindByCircle(circleID, documentID string) (Document, bool) {
	row, err := r.queries.GetPublicDocumentByID(context.Background(), dbgen.GetPublicDocumentByIDParams{
		CircleID: circleID,
		ID:       documentID,
	})
	if err != nil {
		return Document{}, false
	}

	return mapPublicDocumentByID(row), true
}

func (r *SQLCRepository) FindPublic(documentID string) (Document, bool) {
	row, err := r.queries.GetPublicDocumentByIDGlobal(context.Background(), documentID)
	if err != nil {
		return Document{}, false
	}

	return mapPublicDocumentGlobal(row), true
}

func (r *SQLCRepository) FindForStaff(documentID string) (Document, bool) {
	row, err := r.queries.GetStaffDocumentByIDGlobal(context.Background(), documentID)
	if err != nil {
		return Document{}, false
	}

	return mapStaffDocumentByIDGlobal(row), true
}

func (r *SQLCRepository) FindByCircleForStaff(circleID, documentID string) (Document, bool) {
	row, err := r.queries.GetStaffDocumentByID(context.Background(), dbgen.GetStaffDocumentByIDParams{
		CircleID: circleID,
		ID:       documentID,
	})
	if err != nil {
		return Document{}, false
	}

	return mapStaffDocumentByID(row), true
}

func (r *SQLCRepository) Create(
	circleID,
	name,
	description,
	notes string,
	isPublic bool,
	isImportant bool,
	filename,
	mimeType string,
	content []byte,
) (Document, bool) {
	row, err := r.queries.CreateStaffDocument(context.Background(), dbgen.CreateStaffDocumentParams{
		CircleID:    circleID,
		Name:        name,
		Description: description,
		Notes:       notes,
		IsPublic:    isPublic,
		IsImportant: isImportant,
		Filename:    filename,
		MimeType:    mimeType,
		Content:     content,
	})
	if err != nil {
		return Document{}, false
	}

	return Document{
		ID:          row.ID,
		CircleID:    row.CircleID,
		Name:        row.Name,
		Description: row.Description,
		Notes:       row.Notes,
		IsPublic:    row.IsPublic,
		IsImportant: row.IsImportant,
		Filename:    row.Filename,
		Extension:   normalizeDocumentExtension(row.Filename),
		MimeType:    row.MimeType,
		SizeBytes:   int64(len(row.Content)),
		CreatedAt:   formatDocumentTimestamp(row.CreatedAt),
		UpdatedAt:   formatDocumentTimestamp(row.UpdatedAt),
		Content:     append([]byte(nil), row.Content...),
	}, true
}

func (r *SQLCRepository) Update(
	circleID,
	documentID,
	name,
	description,
	notes string,
	isPublic bool,
	isImportant bool,
	filename,
	mimeType string,
	content []byte,
) (Document, bool) {
	row, err := r.queries.UpdateStaffDocument(context.Background(), dbgen.UpdateStaffDocumentParams{
		CircleID:    circleID,
		ID:          documentID,
		Name:        name,
		Description: description,
		Notes:       notes,
		IsPublic:    isPublic,
		IsImportant: isImportant,
		Filename:    filename,
		MimeType:    mimeType,
		Content:     content,
	})
	if err != nil {
		return Document{}, false
	}

	return Document{
		ID:          row.ID,
		CircleID:    row.CircleID,
		Name:        row.Name,
		Description: row.Description,
		Notes:       row.Notes,
		IsPublic:    row.IsPublic,
		IsImportant: row.IsImportant,
		Filename:    row.Filename,
		Extension:   normalizeDocumentExtension(row.Filename),
		MimeType:    row.MimeType,
		SizeBytes:   int64(len(row.Content)),
		CreatedAt:   formatDocumentTimestamp(row.CreatedAt),
		UpdatedAt:   formatDocumentTimestamp(row.UpdatedAt),
		Content:     append([]byte(nil), row.Content...),
	}, true
}

func (r *SQLCRepository) Delete(circleID, documentID string) bool {
	deleted, err := r.queries.DeleteStaffDocument(context.Background(), dbgen.DeleteStaffDocumentParams{
		CircleID: circleID,
		ID:       documentID,
	})
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

func mapPublicDocumentByCircle(row dbgen.ListPublicDocumentsByCircleRow) Document {
	return Document{
		ID:          row.ID,
		CircleID:    row.CircleID,
		Name:        row.Name,
		Description: row.Description,
		Notes:       row.Notes,
		IsPublic:    row.IsPublic,
		IsImportant: row.IsImportant,
		Filename:    row.Filename,
		Extension:   normalizeDocumentExtension(row.Filename),
		MimeType:    row.MimeType,
		SizeBytes:   int64(len(row.Content)),
		CreatedAt:   formatDocumentTimestamp(row.CreatedAt),
		UpdatedAt:   formatDocumentTimestamp(row.UpdatedAt),
		Content:     append([]byte(nil), row.Content...),
	}
}

func mapPublicDocument(row dbgen.ListPublicDocumentsRow) Document {
	return Document{
		ID:          row.ID,
		CircleID:    row.CircleID,
		Name:        row.Name,
		Description: row.Description,
		Notes:       row.Notes,
		IsPublic:    row.IsPublic,
		IsImportant: row.IsImportant,
		Filename:    row.Filename,
		Extension:   normalizeDocumentExtension(row.Filename),
		MimeType:    row.MimeType,
		SizeBytes:   int64(len(row.Content)),
		CreatedAt:   formatDocumentTimestamp(row.CreatedAt),
		UpdatedAt:   formatDocumentTimestamp(row.UpdatedAt),
		Content:     append([]byte(nil), row.Content...),
	}
}

func mapStaffDocument(row dbgen.ListStaffDocumentsByCircleRow) Document {
	return Document{
		ID:          row.ID,
		CircleID:    row.CircleID,
		Name:        row.Name,
		Description: row.Description,
		Notes:       row.Notes,
		IsPublic:    row.IsPublic,
		IsImportant: row.IsImportant,
		Filename:    row.Filename,
		Extension:   normalizeDocumentExtension(row.Filename),
		MimeType:    row.MimeType,
		SizeBytes:   int64(len(row.Content)),
		CreatedAt:   formatDocumentTimestamp(row.CreatedAt),
		UpdatedAt:   formatDocumentTimestamp(row.UpdatedAt),
		Content:     append([]byte(nil), row.Content...),
	}
}

func mapPublicDocumentByID(row dbgen.GetPublicDocumentByIDRow) Document {
	return Document{
		ID:          row.ID,
		CircleID:    row.CircleID,
		Name:        row.Name,
		Description: row.Description,
		Notes:       row.Notes,
		IsPublic:    row.IsPublic,
		IsImportant: row.IsImportant,
		Filename:    row.Filename,
		Extension:   normalizeDocumentExtension(row.Filename),
		MimeType:    row.MimeType,
		SizeBytes:   int64(len(row.Content)),
		CreatedAt:   formatDocumentTimestamp(row.CreatedAt),
		UpdatedAt:   formatDocumentTimestamp(row.UpdatedAt),
		Content:     append([]byte(nil), row.Content...),
	}
}

func mapStaffDocumentByIDGlobal(row dbgen.GetStaffDocumentByIDGlobalRow) Document {
	return Document{
		ID:          row.ID,
		CircleID:    row.CircleID,
		Name:        row.Name,
		Description: row.Description,
		Notes:       row.Notes,
		IsPublic:    row.IsPublic,
		IsImportant: row.IsImportant,
		Filename:    row.Filename,
		Extension:   normalizeDocumentExtension(row.Filename),
		MimeType:    row.MimeType,
		SizeBytes:   int64(len(row.Content)),
		CreatedAt:   formatDocumentTimestamp(row.CreatedAt),
		UpdatedAt:   formatDocumentTimestamp(row.UpdatedAt),
		Content:     append([]byte(nil), row.Content...),
	}
}

func mapPublicDocumentGlobal(row dbgen.GetPublicDocumentByIDGlobalRow) Document {
	return Document{
		ID:          row.ID,
		CircleID:    row.CircleID,
		Name:        row.Name,
		Description: row.Description,
		Notes:       row.Notes,
		IsPublic:    row.IsPublic,
		IsImportant: row.IsImportant,
		Filename:    row.Filename,
		Extension:   normalizeDocumentExtension(row.Filename),
		MimeType:    row.MimeType,
		SizeBytes:   int64(len(row.Content)),
		CreatedAt:   formatDocumentTimestamp(row.CreatedAt),
		UpdatedAt:   formatDocumentTimestamp(row.UpdatedAt),
		Content:     append([]byte(nil), row.Content...),
	}
}

func mapStaffDocumentByID(row dbgen.GetStaffDocumentByIDRow) Document {
	return Document{
		ID:          row.ID,
		CircleID:    row.CircleID,
		Name:        row.Name,
		Description: row.Description,
		Notes:       row.Notes,
		IsPublic:    row.IsPublic,
		IsImportant: row.IsImportant,
		Filename:    row.Filename,
		Extension:   normalizeDocumentExtension(row.Filename),
		MimeType:    row.MimeType,
		SizeBytes:   int64(len(row.Content)),
		CreatedAt:   formatDocumentTimestamp(row.CreatedAt),
		UpdatedAt:   formatDocumentTimestamp(row.UpdatedAt),
		Content:     append([]byte(nil), row.Content...),
	}
}
