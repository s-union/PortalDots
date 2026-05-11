package document

import (
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

type Document struct {
	ID           string
	CircleID     string
	Name         string
	Description  string
	Notes        string
	IsPublic     bool
	IsImportant  bool
	ViewableTags []string
	Filename     string
	Extension    string
	MimeType     string
	SizeBytes    int64
	CreatedAt    string
	UpdatedAt    string
	Content      []byte
}

type Repository interface {
	ListByCircle(circleID string) []Document
	ListPublic() []Document
	ListForCircle(circleTags []string) []Document
	ListByCircleForStaff(circleID string) []Document
	FindByCircle(circleID, documentID string) (Document, bool)
	FindPublic(documentID string) (Document, bool)
	FindForCircle(circleTags []string, documentID string) (Document, bool)
	FindForStaff(documentID string) (Document, bool)
	FindByCircleForStaff(circleID, documentID string) (Document, bool)
	Create(circleID, name, description, notes string, isPublic bool, isImportant bool, viewableTags []string, filename, mimeType string, content []byte) (Document, bool)
	Update(circleID, documentID, name, description, notes string, isPublic bool, isImportant bool, viewableTags []string, filename, mimeType string, content []byte) (Document, bool)
	Delete(circleID, documentID string) bool
	ListReadDocumentIDs(userID string, documentIDs []string) []string
	MarkRead(documentID, userID string) error
}

type StaticRepository struct {
	mu        sync.RWMutex
	documents []Document
	nextID    int
	reads     map[string]map[string]struct{}
}

func NewStaticRepository(cfg []config.Document) *StaticRepository {
	documents := make([]Document, 0, len(cfg))
	for _, item := range cfg {
		documents = append(documents, Document{
			ID:           item.ID,
			CircleID:     item.CircleID,
			Name:         item.Name,
			Description:  item.Description,
			Notes:        item.Notes,
			IsPublic:     item.IsPublic,
			IsImportant:  item.IsImportant,
			ViewableTags: append([]string{}, item.ViewableTags...),
			Filename:     item.Filename,
			Extension:    normalizeDocumentExtension(item.Filename),
			MimeType:     item.MimeType,
			SizeBytes:    int64(len(item.Content)),
			CreatedAt:    item.CreatedAt,
			UpdatedAt:    item.UpdatedAt,
			Content:      []byte(item.Content),
		})
	}

	return &StaticRepository{
		documents: documents,
		nextID:    len(documents) + 1,
		reads:     map[string]map[string]struct{}{},
	}
}

func (r *StaticRepository) ListByCircle(circleID string) []Document {
	r.mu.RLock()
	defer r.mu.RUnlock()

	documents := make([]Document, 0, len(r.documents))
	for _, document := range r.documents {
		if document.CircleID == circleID && document.IsPublic && documentVisibleForTags(document, nil) {
			documents = append(documents, cloneDocument(document))
		}
	}
	sortDocumentsByUpdatedAt(documents)
	return documents
}

func (r *StaticRepository) ListPublic() []Document {
	r.mu.RLock()
	defer r.mu.RUnlock()

	documents := make([]Document, 0, len(r.documents))
	for _, document := range r.documents {
		if document.IsPublic && documentVisibleForTags(document, nil) {
			documents = append(documents, cloneDocument(document))
		}
	}
	sortDocumentsByUpdatedAt(documents)
	return documents
}

func (r *StaticRepository) ListForCircle(circleTags []string) []Document {
	r.mu.RLock()
	defer r.mu.RUnlock()

	documents := make([]Document, 0, len(r.documents))
	for _, document := range r.documents {
		if document.IsPublic && documentVisibleForTags(document, circleTags) {
			documents = append(documents, cloneDocument(document))
		}
	}
	sortDocumentsByUpdatedAt(documents)
	return documents
}

func (r *StaticRepository) ListByCircleForStaff(circleID string) []Document {
	r.mu.RLock()
	defer r.mu.RUnlock()

	documents := make([]Document, 0, len(r.documents))
	for _, document := range r.documents {
		if document.CircleID == circleID {
			documents = append(documents, cloneDocument(document))
		}
	}
	sortDocumentsByUpdatedAt(documents)
	return documents
}

func (r *StaticRepository) FindByCircle(circleID, documentID string) (Document, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, document := range r.documents {
		if document.CircleID == circleID && document.ID == documentID && document.IsPublic && documentVisibleForTags(document, nil) {
			return cloneDocument(document), true
		}
	}
	return Document{}, false
}

func (r *StaticRepository) FindPublic(documentID string) (Document, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, document := range r.documents {
		if document.ID == documentID && document.IsPublic && documentVisibleForTags(document, nil) {
			return cloneDocument(document), true
		}
	}
	return Document{}, false
}

func (r *StaticRepository) FindForCircle(circleTags []string, documentID string) (Document, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, document := range r.documents {
		if document.ID == documentID && document.IsPublic && documentVisibleForTags(document, circleTags) {
			return cloneDocument(document), true
		}
	}
	return Document{}, false
}

func (r *StaticRepository) FindForStaff(documentID string) (Document, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, document := range r.documents {
		if document.ID == documentID {
			return cloneDocument(document), true
		}
	}
	return Document{}, false
}

func (r *StaticRepository) FindByCircleForStaff(circleID, documentID string) (Document, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, document := range r.documents {
		if document.CircleID == circleID && document.ID == documentID {
			return cloneDocument(document), true
		}
	}
	return Document{}, false
}

func (r *StaticRepository) Create(
	circleID,
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
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now().UTC().Format(time.RFC3339)
	created := Document{
		ID:           uuidv7.MustString(),
		CircleID:     circleID,
		Name:         name,
		Description:  description,
		Notes:        notes,
		IsPublic:     isPublic,
		IsImportant:  isImportant,
		ViewableTags: append([]string{}, viewableTags...),
		Filename:     filename,
		Extension:    normalizeDocumentExtension(filename),
		MimeType:     mimeType,
		SizeBytes:    int64(len(content)),
		CreatedAt:    now,
		UpdatedAt:    now,
		Content:      append([]byte(nil), content...),
	}
	r.nextID++
	r.documents = append(r.documents, created)

	return cloneDocument(created), true
}

func (r *StaticRepository) Update(
	circleID,
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
	r.mu.Lock()
	defer r.mu.Unlock()

	for index, currentDocument := range r.documents {
		if currentDocument.CircleID != circleID || currentDocument.ID != documentID {
			continue
		}

		currentDocument.Name = name
		currentDocument.Description = description
		currentDocument.Notes = notes
		currentDocument.IsPublic = isPublic
		currentDocument.IsImportant = isImportant
		currentDocument.ViewableTags = append([]string{}, viewableTags...)
		currentDocument.Filename = filename
		currentDocument.Extension = normalizeDocumentExtension(filename)
		currentDocument.MimeType = mimeType
		currentDocument.SizeBytes = int64(len(content))
		currentDocument.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
		currentDocument.Content = append([]byte(nil), content...)
		r.documents[index] = currentDocument
		return cloneDocument(currentDocument), true
	}

	return Document{}, false
}

func (r *StaticRepository) Delete(circleID, documentID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index, currentDocument := range r.documents {
		if currentDocument.CircleID != circleID || currentDocument.ID != documentID {
			continue
		}

		r.documents = append(r.documents[:index], r.documents[index+1:]...)
		return true
	}

	return false
}

func cloneDocument(document Document) Document {
	document.ViewableTags = append([]string{}, document.ViewableTags...)
	document.Content = append([]byte(nil), document.Content...)
	return document
}

func documentVisibleForTags(document Document, circleTags []string) bool {
	if len(document.ViewableTags) == 0 {
		return true
	}
	for _, viewableTag := range document.ViewableTags {
		for _, circleTag := range circleTags {
			if viewableTag == circleTag {
				return true
			}
		}
	}
	return false
}

func normalizeDocumentExtension(filename string) string {
	extension := strings.TrimPrefix(filepath.Ext(filename), ".")
	if extension == "" {
		return ""
	}
	return strings.ToUpper(extension)
}

func sortDocumentsByUpdatedAt(documents []Document) {
	sort.SliceStable(documents, func(i, j int) bool {
		if documents[i].UpdatedAt == documents[j].UpdatedAt {
			return documents[i].ID > documents[j].ID
		}
		return documents[i].UpdatedAt > documents[j].UpdatedAt
	})
}

func (r *StaticRepository) ListReadDocumentIDs(userID string, documentIDs []string) []string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	readIDs := make([]string, 0, len(documentIDs))
	for _, docID := range documentIDs {
		if users, ok := r.reads[docID]; ok {
			if _, read := users[userID]; read {
				readIDs = append(readIDs, docID)
			}
		}
	}
	return readIDs
}

func (r *StaticRepository) MarkRead(documentID, userID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.reads[documentID]; !ok {
		r.reads[documentID] = map[string]struct{}{}
	}
	r.reads[documentID][userID] = struct{}{}
	return nil
}
