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
		if job.Status != mailqueue.JobStatusSent {
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
	// "a_ok@" sorts before "z_ng@" so a_ok@ is attempted first.
	if _, err := repository.Enqueue(context.Background(), "0195ec00-0022-7000-8000-000000000001", "0195ec00-00b1-7000-8000-000000000001", "件名", "本文", []string{"a_ok@example.com", "z_ng@example.com"}); err != nil {
		t.Fatalf("enqueue mail: %v", err)
	}

	sender := &fakeMailSender{failRecipient: "z_ng@example.com"}
	processed := ProcessMailJobsOnce(repository, sender, 10)
	if processed != 0 {
		t.Fatalf("expected 0 processed jobs, got %d", processed)
	}

	jobs := repository.ListByCircle("0195ec00-0022-7000-8000-000000000001")
	if len(jobs) != 1 {
		t.Fatalf("expected one queued job, got %#v", jobs)
	}
	if jobs[0].Status != mailqueue.JobStatusQueued {
		t.Fatalf("expected queued status after send failure, got %#v", jobs[0])
	}
	if len(jobs[0].DeliveredTo) != 1 || jobs[0].DeliveredTo[0] != "a_ok@example.com" {
		t.Fatalf("expected a_ok@example.com tracked as delivered, got %#v", jobs[0].DeliveredTo)
	}
}

func TestProcessMailJobsOnceDoesNotResendOnRetry(t *testing.T) {
	t.Parallel()

	repository := mailqueue.NewMemoryRepository()
	// "a_ok@" sorts before "z_ng@" so a_ok@ is attempted first.
	if _, err := repository.Enqueue(context.Background(), "0195ec00-0025-7000-8000-000000000001", "0195ec00-00b1-7000-8000-000000000001", "件名", "本文", []string{"a_ok@example.com", "z_ng@example.com"}); err != nil {
		t.Fatalf("enqueue mail: %v", err)
	}

	sender := &fakeMailSender{failRecipient: "z_ng@example.com"}

	// First run: a_ok@ succeeds, z_ng@ fails — job stays queued.
	ProcessMailJobsOnce(repository, sender, 10)
	if len(sender.sentRecipients) != 1 || sender.sentRecipients[0] != "a_ok@example.com" {
		t.Fatalf("expected only a_ok@ on first run, got %#v", sender.sentRecipients)
	}

	// Second run (simulated retry): z_ng@ still fails, but a_ok@ must NOT be re-sent.
	sender.sentRecipients = nil
	ProcessMailJobsOnce(repository, sender, 10)
	for _, r := range sender.sentRecipients {
		if r == "a_ok@example.com" {
			t.Fatalf("a_ok@example.com was sent again on retry — duplicate delivery bug not fixed")
		}
	}
}

func TestProcessMailJobsOnceMarksJobUndeliverableWhenRecipientsNormalizeToEmpty(t *testing.T) {
	t.Parallel()

	repository := mailqueue.NewMemoryRepository()
	if _, err := repository.Enqueue(context.Background(), "0195ec00-0023-7000-8000-000000000001", "0195ec00-00b1-7000-8000-000000000001", "件名", "本文", []string{" ", "\t", "\n"}); err != nil {
		t.Fatalf("enqueue mail: %v", err)
	}

	sender := &fakeMailSender{}
	processed := ProcessMailJobsOnce(repository, sender, 10)
	if processed != 0 {
		t.Fatalf("expected 0 processed jobs, got %d", processed)
	}
	if len(sender.sentRecipients) != 0 {
		t.Fatalf("expected no deliveries, got %#v", sender.sentRecipients)
	}

	jobs := repository.ListByCircle("0195ec00-0023-7000-8000-000000000001")
	if len(jobs) != 1 {
		t.Fatalf("expected one job, got %#v", jobs)
	}
	if jobs[0].Status != mailqueue.JobStatusUndeliverable {
		t.Fatalf("expected undeliverable status when recipients normalize to empty, got %#v", jobs[0])
	}
	if jobs[0].DeliveredAt != "" {
		t.Fatalf("expected delivered timestamp to remain empty, got %#v", jobs[0])
	}
	if queued := repository.ListQueued(10); len(queued) != 0 {
		t.Fatalf("expected no queued jobs after marking undeliverable, got %#v", queued)
	}
}

func TestProcessMailJobsOnceProcessesQueuedJobAfterEarlierUndeliverableJob(t *testing.T) {
	t.Parallel()

	repository := mailqueue.NewMemoryRepository()
	poisoned, err := repository.Enqueue(context.Background(), "0195ec00-0024-7000-8000-000000000001", "0195ec00-00b1-7000-8000-000000000001", "件名", "本文", []string{" ", "\t"})
	if err != nil {
		t.Fatalf("enqueue poisoned mail: %v", err)
	}
	valid, err := repository.Enqueue(context.Background(), "0195ec00-0024-7000-8000-000000000001", "0195ec00-00b1-7000-8000-000000000001", "件名2", "本文2", []string{"valid@example.com"})
	if err != nil {
		t.Fatalf("enqueue valid mail: %v", err)
	}

	sender := &fakeMailSender{}
	processed := ProcessMailJobsOnce(repository, sender, 1)
	if processed != 0 {
		t.Fatalf("expected first run to process 0 jobs, got %d", processed)
	}
	queued := repository.ListQueued(10)
	if len(queued) != 1 || queued[0].ID != valid.ID {
		t.Fatalf("expected only valid job to remain queued, got %#v", queued)
	}

	processed = ProcessMailJobsOnce(repository, sender, 1)
	if processed != 1 {
		t.Fatalf("expected second run to process valid job, got %d", processed)
	}
	if len(sender.sentRecipients) != 1 || sender.sentRecipients[0] != "valid@example.com" {
		t.Fatalf("expected valid recipient to be delivered, got %#v", sender.sentRecipients)
	}

	jobs := repository.ListAll()
	poisonedJob := findJobByID(t, jobs, poisoned.ID)
	if poisonedJob.Status != mailqueue.JobStatusUndeliverable {
		t.Fatalf("expected poisoned job to be undeliverable, got %#v", poisonedJob)
	}
	validJob := findJobByID(t, jobs, valid.ID)
	if validJob.Status != mailqueue.JobStatusSent {
		t.Fatalf("expected valid job to be sent, got %#v", validJob)
	}
}

func findJobByID(t *testing.T, jobs []mailqueue.Job, id string) mailqueue.Job {
	t.Helper()

	for _, job := range jobs {
		if job.ID == id {
			return job
		}
	}

	t.Fatalf("expected job %s in %#v", id, jobs)
	return mailqueue.Job{}
}
