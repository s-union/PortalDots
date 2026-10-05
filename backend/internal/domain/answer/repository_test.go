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

func TestMemoryRepositoryListByFormAndUploadsByAnswersKeepValuesAndMetadataSeparate(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repository := NewMemoryRepository()
	first := repository.Create(ctx, "form-1", "circle-1", "first", map[string][]string{
		"question-1": {"first value", "second value"},
		"question-2": {"checkbox value"},
	})
	second := repository.Create(ctx, "form-1", "circle-2", "second", map[string][]string{
		"question-1": {"other value"},
	})

	firstUpload, err := repository.AddUploadToAnswer(ctx, first.ID, "question-upload", "first.pdf", "application/pdf", []byte("first content"))
	if err != nil {
		t.Fatalf("add first upload: %v", err)
	}
	secondUpload, err := repository.AddUploadToAnswer(ctx, second.ID, "question-upload", "second.pdf", "application/pdf", []byte("second content"))
	if err != nil {
		t.Fatalf("add second upload: %v", err)
	}

	answers := repository.ListByForm(ctx, "form-1")
	if len(answers) != 2 {
		t.Fatalf("ListByForm() returned %d answers; want 2", len(answers))
	}
	byID := make(map[string]Answer, len(answers))
	for _, currentAnswer := range answers {
		byID[currentAnswer.ID] = currentAnswer
	}
	if got := byID[first.ID].Details["question-1"]; len(got) != 2 || got[0] != "first value" || got[1] != "second value" {
		t.Fatalf("first answer details = %#v; want both values in position order", got)
	}
	if got := byID[second.ID].Details["question-1"]; len(got) != 1 || got[0] != "other value" {
		t.Fatalf("second answer details = %#v; want answer-specific value", got)
	}

	uploadsByAnswer := repository.ListUploadsByAnswers(ctx, []string{first.ID, second.ID})
	if len(uploadsByAnswer[first.ID]) != 1 || uploadsByAnswer[first.ID][0].ID != firstUpload.ID {
		t.Fatalf("first answer uploads = %#v; want first metadata", uploadsByAnswer[first.ID])
	}
	if len(uploadsByAnswer[second.ID]) != 1 || uploadsByAnswer[second.ID][0].ID != secondUpload.ID {
		t.Fatalf("second answer uploads = %#v; want second metadata", uploadsByAnswer[second.ID])
	}
	if uploadsByAnswer[first.ID][0].Content != nil || uploadsByAnswer[second.ID][0].Content != nil {
		t.Fatal("batch upload metadata unexpectedly included content")
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
