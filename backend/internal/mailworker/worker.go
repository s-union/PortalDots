package mailworker

import (
	"context"
	"log/slog"
	"time"

	"github.com/s-union/PortalDots/backend/internal/domain/mailqueue"
	"github.com/s-union/PortalDots/backend/internal/shared/cloudflareemail"
	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

// MailWorker periodically dequeues pending mail jobs from the local mail queue
// and sends them via the Cloudflare email producer.
type MailWorker struct {
	mails         mailqueue.Repository
	emailProducer *cloudflareemail.ProducerClient
	from          string
	appName       string
	appURL        string
	adminName     string
	contactEmail  string
	interval      time.Duration
	stopCh        chan struct{}
}

// New creates a MailWorker that polls the mail queue at the given interval.
// If interval is 0, it defaults to 30 seconds.
func New(
	mails mailqueue.Repository,
	emailProducer *cloudflareemail.ProducerClient,
	from, appName, appURL, adminName, contactEmail string,
	interval time.Duration,
) *MailWorker {
	if interval <= 0 {
		interval = 30 * time.Second
	}
	return &MailWorker{
		mails:         mails,
		emailProducer: emailProducer,
		from:          from,
		appName:       appName,
		appURL:        appURL,
		adminName:     adminName,
		contactEmail:  contactEmail,
		interval:      interval,
		stopCh:        make(chan struct{}),
	}
}

// Start begins the worker loop. It runs until Stop is called.
func (w *MailWorker) Start() {
	go w.loop()
}

// Stop signals the worker to stop and waits for the current iteration to finish.
func (w *MailWorker) Stop() {
	close(w.stopCh)
}

func (w *MailWorker) loop() {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-w.stopCh:
			return
		case <-ticker.C:
			w.process()
		}
	}
}

func (w *MailWorker) process() {
	jobs := w.mails.ListAll()
	if len(jobs) == 0 {
		return
	}

	slog.Info("mailworker: processing jobs", "count", len(jobs))

	for _, job := range jobs {
		w.sendJob(job)
	}
}

func (w *MailWorker) sendJob(job mailqueue.Job) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	emailJob := cloudflareemail.EmailJob{
		JobId:    uuidv7.MustString(),
		Template: "markdown-notice",
		Priority: cloudflareemail.PriorityNormal,
		From:     w.from,
		To:       job.Recipients,
		Subject:  job.Subject,
		Variables: map[string]string{
			"subject":      job.Subject,
			"body":         job.Body,
			"appName":      w.appName,
			"appURL":       w.appURL,
			"adminName":    w.adminName,
			"contactEmail": w.contactEmail,
		},
	}

	if err := w.emailProducer.Enqueue(ctx, emailJob); err != nil {
		slog.Error("mailworker: failed to send job",
			"job_id", job.ID,
			"subject", job.Subject,
			"recipients", len(job.Recipients),
			"error", err,
		)
		return
	}

	if err := w.mails.DeleteJob(ctx, job.ID); err != nil {
		slog.Error("mailworker: failed to delete job",
			"job_id", job.ID,
			"error", err,
		)
	}
}
