package worker

import (
	"log/slog"
	"slices"
	"strings"
	"time"

	"github.com/s-union/PortalDots/backend/internal/domain/mailqueue"
)

type MailSender interface {
	Send(recipient, subject, body string) error
}

func ProcessMailJobsOnce(repository mailqueue.Repository, sender MailSender, limit int) int {
	if sender == nil {
		sender = NewLogMailSender()
	}

	jobs := repository.ListQueued(limit)
	processed := 0

	for _, job := range jobs {
		if !deliverQueuedMailJob(sender, job) {
			continue
		}
		if repository.MarkSent(job.ID, time.Now().UTC()) {
			processed++
		}
	}

	return processed
}

func deliverQueuedMailJob(sender MailSender, job mailqueue.Job) bool {
	recipients := normalizeRecipients(job.Recipients)
	if len(recipients) == 0 {
		slog.Warn("skip queued mail without recipients", "jobID", job.ID, "circleID", job.CircleID)
		return true
	}

	for _, recipient := range recipients {
		if err := sender.Send(recipient, job.Subject, job.Body); err != nil {
			slog.Error(
				"failed to deliver queued mail",
				"jobID", job.ID,
				"circleID", job.CircleID,
				"recipient", recipient,
				"error", err.Error(),
			)
			return false
		}
	}

	return true
}

func normalizeRecipients(recipients []string) []string {
	normalized := make([]string, 0, len(recipients))
	seen := map[string]struct{}{}
	for _, recipient := range recipients {
		trimmed := strings.TrimSpace(recipient)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		normalized = append(normalized, trimmed)
	}
	slices.Sort(normalized)

	return normalized
}
