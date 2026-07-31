package answer

import (
	"bytes"
	"context"
	"errors"
	"testing"
)

func TestMemoryRepositoryUploadRequiresQuestionAndReplacesAtomically(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repository := NewMemoryRepository()

	if _, err := repository.AddUpload(ctx, "form-1", "circle-1", "", "blank.txt", "text/plain", []byte("blank")); !errors.Is(err, ErrInvalidQuestionID) {
		t.Fatalf("AddUpload() error = %v; want ErrInvalidQuestionID", err)
	}

	first, err := repository.AddUpload(ctx, "form-1", "circle-1", "question-1", "first.txt", "text/plain", []byte("first"))
	if err != nil {
		t.Fatalf("expected first upload to succeed, got error: %v", err)
	}
	replacement, err := repository.AddUpload(ctx, "form-1", "circle-1", "question-1", "replacement.txt", "text/plain", []byte("replacement"))
	if err != nil {
		t.Fatalf("expected replacement upload to succeed, got error: %v", err)
	}
	if replacement.ID == first.ID {
		t.Fatal("expected replacement to create new upload metadata")
	}

	uploads := repository.ListUploads(ctx, "form-1", "circle-1")
	if len(uploads) != 1 || uploads[0].ID != replacement.ID {
		t.Fatalf("uploads after replacement = %#v; want only replacement", uploads)
	}
	stored, ok := repository.FindUploadByAnswerAndQuestion(ctx, replacement.AnswerID, "question-1")
	if !ok || !bytes.Equal(stored.Content, []byte("replacement")) {
		t.Fatalf("stored replacement = %#v; want replacement content", stored)
	}
}

// TestMemoryRepositoryUploadAcceptsTwoLargeUploadsOnOneAnswer proves the
// aggregate byte quota removal: an answer can hold two uploads on two
// different upload questions that each exceed half of the old 5 MiB
// aggregate cap, so their combined size would have been rejected before.
func TestMemoryRepositoryUploadAcceptsTwoLargeUploadsOnOneAnswer(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repository := NewMemoryRepository()
	answerValue := repository.Create(ctx, "form-1", "circle-1", "", nil)

	overHalfOldLimit := bytes.Repeat([]byte("a"), 3*1024*1024)

	if _, err := repository.AddUploadToAnswer(ctx, answerValue.ID, "question-1", "first.bin", "application/octet-stream", overHalfOldLimit); err != nil {
		t.Fatalf("expected first upload to succeed, got error: %v", err)
	}
	if _, err := repository.AddUploadToAnswer(ctx, answerValue.ID, "question-2", "second.bin", "application/octet-stream", overHalfOldLimit); err != nil {
		t.Fatalf("expected second upload to succeed, got error: %v", err)
	}

	uploads := repository.ListUploadsByAnswer(ctx, answerValue.ID)
	if len(uploads) != 2 {
		t.Fatalf("uploads on answer = %#v; want 2", uploads)
	}
}
