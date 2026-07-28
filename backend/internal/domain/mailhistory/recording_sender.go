package mailhistory

import (
	"context"

	"github.com/s-union/PortalDots/backend/internal/shared/emailqueue"
)

type RecordingSender struct {
	repository Repository
	next       emailqueue.Sender
}

func NewRecordingSender(repository Repository, next emailqueue.Sender) RecordingSender {
	return RecordingSender{
		repository: repository,
		next:       next,
	}
}

func (s RecordingSender) Enqueue(ctx context.Context, job emailqueue.EmailJob) error {
	recordedJob := job
	if job.HistoryBody != "" {
		recordedJob.Body = job.HistoryBody
	}
	recordedJob.HistoryBody = ""
	if err := s.repository.Record(ctx, recordedJob); err != nil {
		return err
	}
	return s.next.Enqueue(ctx, job)
}
