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
	if err := s.repository.Record(ctx, job); err != nil {
		return err
	}
	return s.next.Enqueue(ctx, job)
}
