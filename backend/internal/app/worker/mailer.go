package worker

import (
	"time"

	"github.com/s-union/PortalDots/backend/internal/domain/mailqueue"
)

func ProcessMailJobsOnce(repository mailqueue.Repository, limit int) int {
	jobs := repository.ListQueued(limit)
	processed := 0

	for _, job := range jobs {
		if repository.MarkSent(job.ID, time.Now().UTC()) {
			processed++
		}
	}

	return processed
}
