package mailhistory

import (
	"context"

	"github.com/s-union/PortalDots/backend/internal/shared/cloudflareemail"
)

type RecordingSender struct {
	repository Repository
	next       cloudflareemail.Sender
}

func NewRecordingSender(repository Repository, next cloudflareemail.Sender) RecordingSender {
	return RecordingSender{
		repository: repository,
		next:       next,
	}
}

func (s RecordingSender) Enqueue(ctx context.Context, job cloudflareemail.EmailJob) error {
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

func (s RecordingSender) SyncScheduledPage(ctx context.Context, req cloudflareemail.ScheduledPageEmail) (cloudflareemail.SyncOutcome, error) {
	outcome, err := s.next.SyncScheduledPage(ctx, req)
	if err != nil {
		return outcome, err
	}
	if (outcome == cloudflareemail.SyncScheduled || outcome == cloudflareemail.SyncDispatched) && req.Payload != nil {
		recordedJob := *req.Payload
		if recordedJob.HistoryBody != "" {
			recordedJob.Body = recordedJob.HistoryBody
		}
		recordedJob.HistoryBody = ""
		if err := s.repository.Record(ctx, recordedJob); err != nil {
			return outcome, err
		}
	}
	return outcome, nil
}
