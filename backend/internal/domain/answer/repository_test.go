package answer

import (
	"bytes"
	"context"
	"testing"
)

func TestMemoryRepositoryUploadRequiresQuestionAndReplacesAtomically(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repository := NewMemoryRepository()

	if _, ok := repository.AddUpload(ctx, "form-1", "circle-1", "", "blank.txt", "text/plain", []byte("blank")); ok {
		t.Fatal("expected an empty question ID to be rejected")
	}

	first, ok := repository.AddUpload(ctx, "form-1", "circle-1", "question-1", "first.txt", "text/plain", []byte("first"))
	if !ok {
		t.Fatal("expected first upload to succeed")
	}
	replacement, ok := repository.AddUpload(ctx, "form-1", "circle-1", "question-1", "replacement.txt", "text/plain", []byte("replacement"))
	if !ok {
		t.Fatal("expected replacement upload to succeed")
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

func TestMemoryRepositoryUploadQuotaPreservesExistingUpload(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repository := NewMemoryRepository()
	answerValue := repository.Create(ctx, "form-1", "circle-1", "", nil)

	originalContent := bytes.Repeat([]byte("a"), int(MaxTotalUploadBytes))
	original, ok := repository.AddUploadToAnswer(ctx, answerValue.ID, "question-1", "original.bin", "application/octet-stream", originalContent)
	if !ok {
		t.Fatal("expected upload at the durable limit to succeed")
	}
	if _, ok := repository.AddUploadToAnswer(ctx, answerValue.ID, "question-2", "overflow.bin", "application/octet-stream", []byte("x")); ok {
		t.Fatal("expected upload beyond the per-answer limit to be rejected")
	}
	if _, ok := repository.AddUploadToAnswer(ctx, answerValue.ID, "question-1", "oversized.bin", "application/octet-stream", append(originalContent, 'x')); ok {
		t.Fatal("expected oversized replacement to be rejected")
	}

	stored, ok := repository.FindUploadByAnswerAndQuestion(ctx, answerValue.ID, "question-1")
	if !ok || stored.ID != original.ID || !bytes.Equal(stored.Content, originalContent) {
		t.Fatal("expected rejected replacement to preserve the existing upload")
	}
}

func TestMemoryRepositoryUploadQuotaIsScopedToCircle(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repository := NewMemoryRepository()
	firstAnswer := repository.Create(ctx, "form-1", "circle-1", "", nil)
	secondAnswer := repository.Create(ctx, "form-2", "circle-1", "", nil)
	otherCircleAnswer := repository.Create(ctx, "form-1", "circle-2", "", nil)
	halfLimit := bytes.Repeat([]byte("a"), int(MaxTotalUploadBytes/2+1))

	if _, ok := repository.AddUploadToAnswer(ctx, firstAnswer.ID, "question-1", "first.bin", "application/octet-stream", halfLimit); !ok {
		t.Fatal("expected first circle upload to succeed")
	}
	if _, ok := repository.AddUploadToAnswer(ctx, secondAnswer.ID, "question-2", "second.bin", "application/octet-stream", halfLimit); ok {
		t.Fatal("expected uploads across answers to respect the per-circle limit")
	}
	if _, ok := repository.AddUploadToAnswer(ctx, otherCircleAnswer.ID, "question-1", "other.bin", "application/octet-stream", halfLimit); !ok {
		t.Fatal("expected another circle to have an independent upload allowance")
	}
}
