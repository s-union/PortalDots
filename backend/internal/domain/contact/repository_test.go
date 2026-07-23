package contact

import (
	"context"
	"encoding/base64"
	"errors"
	"slices"
	"testing"
)

func TestMemoryRepositoryStoresOnlyTokenDigestAndScopesHistory(t *testing.T) {
	t.Parallel()
	repository := NewMemoryRepository()
	created, rawToken, err := repository.Create(context.Background(), NewContact{
		UserID:         "user-a",
		CircleID:       "circle-a",
		CategoryID:     "category-a",
		CategoryName:   "General",
		Subject:        "Subject",
		Body:           "Body",
		Status:         "sent",
		StaffMailJobID: "contact-job-a",
	}, &NewAttachment{Filename: "proposal.pdf", MimeType: "application/pdf", Content: []byte("%PDF-1.7")})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	rawBytes, err := base64.RawURLEncoding.DecodeString(rawToken)
	if err != nil || len(rawBytes) != 32 {
		t.Fatalf("raw token has %d decoded bytes, want 32", len(rawBytes))
	}
	digest, err := HashDownloadToken(rawToken)
	if err != nil {
		t.Fatalf("HashDownloadToken() error = %v", err)
	}
	attachment, err := repository.FindAttachment(context.Background(), digest)
	if err != nil {
		t.Fatalf("FindAttachment() error = %v", err)
	}
	if string(attachment.Content) != "%PDF-1.7" || slices.Equal(attachment.TokenHash, rawBytes) {
		t.Fatalf("unexpected stored attachment: %#v", attachment)
	}

	items, err := repository.ListByOwner(context.Background(), "user-a", "circle-a")
	if err != nil || len(items) != 1 || items[0].ID != created.ID {
		t.Fatalf("ListByOwner() = %#v, %v; want created contact", items, err)
	}
	items, err = repository.ListByOwner(context.Background(), "user-a", "circle-b")
	if err != nil || len(items) != 0 {
		t.Fatalf("ListByOwner() for other circle = %#v, %v; want empty", items, err)
	}

	if err := repository.Delete(context.Background(), created.ID); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if _, err := repository.FindAttachment(context.Background(), digest); !errors.Is(err, ErrNotFound) {
		t.Fatalf("FindAttachment() after delete error = %v, want ErrNotFound", err)
	}
}

func TestHashDownloadTokenRejectsMalformedTokens(t *testing.T) {
	t.Parallel()
	for _, token := range []string{"", "not-base64!", base64.RawURLEncoding.EncodeToString(make([]byte, 31))} {
		if _, err := HashDownloadToken(token); !errors.Is(err, ErrNotFound) {
			t.Errorf("HashDownloadToken(%q) error = %v, want ErrNotFound", token, err)
		}
	}
}
