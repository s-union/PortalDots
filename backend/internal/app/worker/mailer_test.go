package worker

import (
	"context"
	"errors"
	"testing"

	"github.com/s-union/PortalDots/backend/internal/domain/mailqueue"
)

type fakeMailSender struct {
	sentRecipients []string
	failRecipient  string
}

func (s *fakeMailSender) Send(recipient, _subject, _body string) error {
	if recipient == s.failRecipient {
		return errors.New("send failed")
	}
	s.sentRecipients = append(s.sentRecipients, recipient)
	return nil
}

func TestProcessMailJobsOnceMarksQueuedJobsAsSent(t *testing.T) {
	t.Parallel()

	repository := mailqueue.NewMemoryRepository()
	if _, err := repository.Enqueue(context.Background(), "0195ec00-0021-7000-8000-000000000001", "0195ec00-00b1-7000-8000-000000000001", "件名1", "本文1", []string{"b@example.com", "a@example.com", "a@example.com"}); err != nil {
		t.Fatalf("enqueue first mail: %v", err)
	}
	if _, err := repository.Enqueue(context.Background(), "0195ec00-0021-7000-8000-000000000001", "0195ec00-00b1-7000-8000-000000000001", "件名2", "本文2", []string{"c@example.com"}); err != nil {
		t.Fatalf("enqueue second mail: %v", err)
	}

	sender := &fakeMailSender{}
	processed := ProcessMailJobsOnce(repository, sender, 10)
	if processed != 2 {
		t.Fatalf("expected 2 processed jobs, got %d", processed)
	}
	if len(sender.sentRecipients) != 3 {
		t.Fatalf("expected 3 delivered recipients, got %#v", sender.sentRecipients)
	}

	jobs := repository.ListByCircle("0195ec00-0021-7000-8000-000000000001")
	for _, job := range jobs {
		if job.Status != "sent" {
			t.Fatalf("expected sent status, got %#v", job)
		}
		if job.DeliveredAt == "" {
			t.Fatalf("expected delivered timestamp, got %#v", job)
		}
	}
}

func TestProcessMailJobsOnceKeepsFailedJobQueued(t *testing.T) {
	t.Parallel()

	repository := mailqueue.NewMemoryRepository()
	if _, err := repository.Enqueue(context.Background(), "0195ec00-0022-7000-8000-000000000001", "0195ec00-00b1-7000-8000-000000000001", "件名", "本文", []string{"ok@example.com", "ng@example.com"}); err != nil {
		t.Fatalf("enqueue mail: %v", err)
	}

	sender := &fakeMailSender{failRecipient: "ng@example.com"}
	processed := ProcessMailJobsOnce(repository, sender, 10)
	if processed != 0 {
		t.Fatalf("expected 0 processed jobs, got %d", processed)
	}

	jobs := repository.ListByCircle("0195ec00-0022-7000-8000-000000000001")
	if len(jobs) != 1 {
		t.Fatalf("expected one queued job, got %#v", jobs)
	}
	if jobs[0].Status != "queued" {
		t.Fatalf("expected queued status after send failure, got %#v", jobs[0])
	}
}
