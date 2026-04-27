package worker

import (
	"log/slog"
	"slices"
	"time"

	"github.com/s-union/PortalDots/backend/internal/domain/mailqueue"
	"github.com/s-union/PortalDots/backend/internal/shared/mailrecipients"
)

func isDelivered(deliveredTo []string, recipient string) bool {
	return slices.Contains(deliveredTo, recipient)
}

type MailSender interface {
	Send(recipient, subject, body string) error
}

type deliveryResult uint8

const (
	deliveryResultRetryableFailure deliveryResult = iota
	deliveryResultSent
	deliveryResultUndeliverable
)

func ProcessMailJobsOnce(repository mailqueue.Repository, sender MailSender, limit int) int {
	if sender == nil {
		sender = NewLogMailSender()
	}

	jobs := repository.ListQueued(limit)
	processed := 0

	for _, job := range jobs {
		switch deliverQueuedMailJob(repository, sender, job) {
		case deliveryResultSent:
			if repository.MarkSent(job.ID, time.Now().UTC()) {
				processed++
			}
		case deliveryResultUndeliverable:
			if !repository.MarkUndeliverable(job.ID) {
				slog.Error(
					"failed to mark queued mail as undeliverable",
					"jobID", job.ID,
					"circleID", job.CircleID,
				)
			}
		}
	}

	return processed
}

func deliverQueuedMailJob(repository mailqueue.Repository, sender MailSender, job mailqueue.Job) deliveryResult {
	recipients := normalizeRecipients(job.Recipients)
	if len(recipients) == 0 {
		slog.Warn(
			"queued mail has no deliverable recipients after normalization; marking as undeliverable",
			"jobID", job.ID,
			"circleID", job.CircleID,
			"rawRecipientCount", len(job.Recipients),
		)
		return deliveryResultUndeliverable
	}

	for _, recipient := range recipients {
		if isDelivered(job.DeliveredTo, recipient) {
			continue
		}
		if err := sender.Send(recipient, job.Subject, job.Body); err != nil {
			slog.Error(
				"failed to deliver queued mail",
				"jobID", job.ID,
				"circleID", job.CircleID,
				"recipient", recipient,
				"error", err.Error(),
			)
			return deliveryResultRetryableFailure
		}
		repository.MarkRecipientDelivered(job.ID, recipient)
	}

	return deliveryResultSent
}

func normalizeRecipients(recipients []string) []string {
	normalized := mailrecipients.Normalize(recipients)
	slices.Sort(normalized)

	return normalized
}
