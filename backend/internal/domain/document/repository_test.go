package document

import (
	"bytes"
	"testing"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

const (
	staticDocumentPublicID  = "0195ec00-0201-7000-8000-000000000001"
	staticDocumentTaggedID  = "0195ec00-0201-7000-8000-000000000002"
	staticDocumentPrivateID = "0195ec00-0201-7000-8000-000000000003"
)

func TestStaticRepositoryListMethodsReturnMetadataOnly(t *testing.T) {
	repository := NewStaticRepository([]config.Document{
		{
			ID:           staticDocumentPublicID,
			Name:         "Public document",
			Filename:     "public.pdf",
			MimeType:     "application/pdf",
			Content:      "public content",
			IsPublic:     true,
			ViewableTags: []string{},
			CreatedAt:    "2026-01-01T00:00:00Z",
			UpdatedAt:    "2026-01-03T00:00:00Z",
		},
		{
			ID:           staticDocumentTaggedID,
			Name:         "Tagged document",
			Filename:     "tagged.pdf",
			MimeType:     "application/pdf",
			Content:      "tagged content",
			IsPublic:     true,
			ViewableTags: []string{"circle-a"},
			CreatedAt:    "2026-01-01T00:00:00Z",
			UpdatedAt:    "2026-01-02T00:00:00Z",
		},
		{
			ID:           staticDocumentPrivateID,
			Name:         "Private document",
			Filename:     "private.pdf",
			MimeType:     "application/pdf",
			Content:      "private content",
			IsPublic:     false,
			ViewableTags: []string{},
			CreatedAt:    "2026-01-01T00:00:00Z",
			UpdatedAt:    "2026-01-01T00:00:00Z",
		},
	})

	listCases := []struct {
		name      string
		documents []Document
	}{
		{name: "public", documents: repository.ListPublic([]string{"circle-a"})},
		{name: "public by ids", documents: repository.ListPublicByIDs([]string{staticDocumentTaggedID}, []string{"circle-a"})},
		{name: "staff", documents: repository.ListForStaff()},
		{name: "staff by ids", documents: repository.ListForStaffByIDs([]string{staticDocumentPrivateID})},
	}
	for _, testCase := range listCases {
		t.Run(testCase.name, func(t *testing.T) {
			if len(testCase.documents) == 0 {
				t.Fatal("list returned no documents")
			}
			for _, currentDocument := range testCase.documents {
				if currentDocument.Content != nil {
					t.Fatalf("list returned content for %s", currentDocument.ID)
				}
				if currentDocument.SizeBytes == 0 {
					t.Fatalf("list returned no size for %s", currentDocument.ID)
				}
			}
		})
	}

	publicDocuments := repository.ListPublic([]string{"circle-a"})
	if len(publicDocuments) != 2 {
		t.Fatalf("ListPublic() returned %d documents; want 2", len(publicDocuments))
	}
	for index := range publicDocuments {
		if publicDocuments[index].ID == staticDocumentTaggedID {
			publicDocuments[index].ViewableTags[0] = "changed"
		}
	}
	if found, ok := repository.FindPublic(staticDocumentTaggedID, []string{"circle-a"}); !ok || found.ViewableTags[0] != "circle-a" {
		t.Fatalf("list changed stored viewable tags: %#v, found=%v", found.ViewableTags, ok)
	}
}

func TestStaticRepositoryFindMethodsKeepContentIsolated(t *testing.T) {
	repository := NewStaticRepository([]config.Document{{
		ID:           staticDocumentPublicID,
		Name:         "Public document",
		Filename:     "public.pdf",
		MimeType:     "application/pdf",
		Content:      "document content",
		IsPublic:     true,
		ViewableTags: []string{},
	}})

	publicDocument, found := repository.FindPublic(staticDocumentPublicID, nil)
	if !found || !bytes.Equal(publicDocument.Content, []byte("document content")) {
		t.Fatalf("FindPublic() = (%#v, %v), want the stored content", publicDocument, found)
	}
	publicDocument.Content[0] = 'X'
	publicAgain, found := repository.FindPublic(staticDocumentPublicID, nil)
	if !found || !bytes.Equal(publicAgain.Content, []byte("document content")) {
		t.Fatalf("FindPublic() content was not isolated: (%#v, %v)", publicAgain, found)
	}

	staffDocument, found := repository.FindForStaff(staticDocumentPublicID)
	if !found || !bytes.Equal(staffDocument.Content, []byte("document content")) {
		t.Fatalf("FindForStaff() = (%#v, %v), want the stored content", staffDocument, found)
	}
}
