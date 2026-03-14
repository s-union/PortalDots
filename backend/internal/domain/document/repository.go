package document

import (
	"fmt"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

type Document struct {
	ID          string
	CircleID    string
	Name        string
	Description string
	Notes       string
	IsPublic    bool
	IsImportant bool
	Filename    string
	Extension   string
	MimeType    string
	SizeBytes   int64
	CreatedAt   string
	UpdatedAt   string
	Content     []byte
}

type Repository interface {
	ListByCircle(circleID string) []Document
	ListByCircleForStaff(circleID string) []Document
	FindByCircle(circleID, documentID string) (Document, bool)
	FindByCircleForStaff(circleID, documentID string) (Document, bool)
	Create(circleID, name, description, notes string, isPublic bool, isImportant bool, filename, mimeType string, content []byte) (Document, bool)
	Update(circleID, documentID, name, description, notes string, isPublic bool, isImportant bool, filename, mimeType string, content []byte) (Document, bool)
	Delete(circleID, documentID string) bool
}

type StaticRepository struct {
	mu        sync.RWMutex
	documents []Document
	nextID    int
}

func NewStaticRepository(cfg []config.Document) *StaticRepository {
	documents := make([]Document, 0, len(cfg))
	for _, item := range cfg {
		documents = append(documents, Document{
			ID:          item.ID,
			CircleID:    item.CircleID,
			Name:        item.Name,
			Description: item.Description,
			Notes:       item.Notes,
			IsPublic:    item.IsPublic,
			IsImportant: item.IsImportant,
			Filename:    item.Filename,
			Extension:   normalizeDocumentExtension(item.Filename),
			MimeType:    item.MimeType,
			SizeBytes:   int64(len(item.Content)),
			CreatedAt:   item.CreatedAt,
			UpdatedAt:   item.UpdatedAt,
			Content:     []byte(item.Content),
		})
	}

	return &StaticRepository{
		documents: documents,
		nextID:    len(documents) + 1,
	}
}

func (r *StaticRepository) ListByCircle(circleID string) []Document {
	r.mu.RLock()
	defer r.mu.RUnlock()

	documents := make([]Document, 0, len(r.documents))
	for _, document := range r.documents {
		if document.CircleID == circleID && document.IsPublic {
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
		if document.CircleID == circleID && document.ID == documentID && document.IsPublic {
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
	filename,
	mimeType string,
	content []byte,
) (Document, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now().UTC().Format(time.RFC3339)
	created := Document{
		ID:          fmt.Sprintf("document-generated-%d", r.nextID),
		CircleID:    circleID,
		Name:        name,
		Description: description,
		Notes:       notes,
		IsPublic:    isPublic,
		IsImportant: isImportant,
		Filename:    filename,
		Extension:   normalizeDocumentExtension(filename),
		MimeType:    mimeType,
		SizeBytes:   int64(len(content)),
		CreatedAt:   now,
		UpdatedAt:   now,
		Content:     append([]byte(nil), content...),
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
	document.Content = append([]byte(nil), document.Content...)
	return document
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
