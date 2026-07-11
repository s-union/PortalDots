package contact

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"slices"
	"sync"
	"time"

	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

// ErrNotFound indicates that a contact or attachment does not exist.
var ErrNotFound = errors.New("contact attachment not found")

// Contact is a persisted contact submission and its optional attachment metadata.
type Contact struct {
	ID             string
	UserID         string
	CircleID       string
	CategoryID     string
	CategoryName   string
	Subject        string
	Body           string
	Status         string
	StaffMailJobID string
	CreatedAt      string
	Attachment     *AttachmentMetadata
}

// AttachmentMetadata describes a contact attachment without exposing its content or token.
type AttachmentMetadata struct {
	Filename  string
	MimeType  string
	SizeBytes int64
}

// Attachment contains the stored bytes returned for a valid download token.
type Attachment struct {
	ID        string
	ContactID string
	Filename  string
	MimeType  string
	SizeBytes int64
	Content   []byte
	TokenHash []byte
	CreatedAt string
}

// NewContact contains the submission fields required to create a contact.
type NewContact struct {
	UserID         string
	CircleID       string
	CategoryID     string
	CategoryName   string
	Subject        string
	Body           string
	Status         string
	StaffMailJobID string
}

// NewAttachment contains validated attachment metadata and content.
type NewAttachment struct {
	Filename string
	MimeType string
	Content  []byte
}

// Repository stores contacts and resolves opaque attachment tokens.
type Repository interface {
	Create(ctx context.Context, input NewContact, attachment *NewAttachment) (Contact, string, error)
	ListByOwner(ctx context.Context, userID, circleID string) ([]Contact, error)
	FindAttachment(ctx context.Context, tokenHash []byte) (Attachment, error)
	Delete(ctx context.Context, id string) error
}

// GenerateDownloadToken returns a 256-bit URL-safe token and its SHA-256 digest.
func GenerateDownloadToken() (raw string, digest []byte, err error) {
	token := make([]byte, 32)
	if _, err := rand.Read(token); err != nil {
		return "", nil, err
	}
	hash := sha256.Sum256(token)
	return base64.RawURLEncoding.EncodeToString(token), hash[:], nil
}

// HashDownloadToken validates and hashes a URL-safe 256-bit download token.
func HashDownloadToken(raw string) ([]byte, error) {
	token, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil || len(token) != 32 {
		return nil, ErrNotFound
	}
	hash := sha256.Sum256(token)
	return hash[:], nil
}

// MemoryRepository stores contacts in memory for tests and database-free development.
type MemoryRepository struct {
	mu          sync.RWMutex
	contacts    []Contact
	attachments map[string]Attachment
}

// NewMemoryRepository creates an empty in-memory contact repository.
func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{attachments: map[string]Attachment{}}
}

// Create stores a contact and optional attachment atomically in memory.
func (r *MemoryRepository) Create(_ context.Context, input NewContact, newAttachment *NewAttachment) (Contact, string, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	created := Contact{
		ID:             uuidv7.MustString(),
		UserID:         input.UserID,
		CircleID:       input.CircleID,
		CategoryID:     input.CategoryID,
		CategoryName:   input.CategoryName,
		Subject:        input.Subject,
		Body:           input.Body,
		Status:         input.Status,
		StaffMailJobID: input.StaffMailJobID,
		CreatedAt:      time.Now().UTC().Format(time.RFC3339),
	}

	rawToken := ""
	if newAttachment != nil {
		var digest []byte
		var err error
		rawToken, digest, err = GenerateDownloadToken()
		if err != nil {
			return Contact{}, "", err
		}
		created.Attachment = &AttachmentMetadata{
			Filename:  newAttachment.Filename,
			MimeType:  newAttachment.MimeType,
			SizeBytes: int64(len(newAttachment.Content)),
		}
		r.attachments[string(digest)] = Attachment{
			ID:        uuidv7.MustString(),
			ContactID: created.ID,
			Filename:  newAttachment.Filename,
			MimeType:  newAttachment.MimeType,
			SizeBytes: int64(len(newAttachment.Content)),
			Content:   slices.Clone(newAttachment.Content),
			TokenHash: slices.Clone(digest),
			CreatedAt: created.CreatedAt,
		}
	}

	r.contacts = append(r.contacts, created)
	return cloneContact(created), rawToken, nil
}

// ListByOwner returns contacts submitted by a user for one circle.
func (r *MemoryRepository) ListByOwner(_ context.Context, userID, circleID string) ([]Contact, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	items := make([]Contact, 0)
	for index := len(r.contacts) - 1; index >= 0; index-- {
		item := r.contacts[index]
		if item.UserID == userID && item.CircleID == circleID {
			items = append(items, cloneContact(item))
		}
	}
	return items, nil
}

// FindAttachment returns an attachment matching a token digest.
func (r *MemoryRepository) FindAttachment(_ context.Context, tokenHash []byte) (Attachment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	attachment, ok := r.attachments[string(tokenHash)]
	if !ok {
		return Attachment{}, ErrNotFound
	}
	attachment.Content = slices.Clone(attachment.Content)
	attachment.TokenHash = slices.Clone(attachment.TokenHash)
	return attachment, nil
}

// Delete removes a contact and its attachment.
func (r *MemoryRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index, item := range r.contacts {
		if item.ID != id {
			continue
		}
		r.contacts = append(r.contacts[:index], r.contacts[index+1:]...)
		for tokenHash, attachment := range r.attachments {
			if attachment.ContactID == id {
				delete(r.attachments, tokenHash)
			}
		}
		return nil
	}
	return ErrNotFound
}

func cloneContact(value Contact) Contact {
	if value.Attachment != nil {
		attachment := *value.Attachment
		value.Attachment = &attachment
	}
	return value
}
