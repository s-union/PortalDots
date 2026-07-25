// Package email builds the email sender this deployment delivers mail with.
package email

import (
	"github.com/s-union/PortalDots/backend/internal/domain/mailhistory"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/shared/cloudflareemail"
)

// NewSender builds the sender every part of the application delivers mail
// through: the email producer when it is configured, a no-op sender otherwise,
// wrapped so that every enqueued mail is recorded in the mail history.
//
// One instance is shared by the HTTP handlers and the background dispatchers so
// that mail sent outside a request still shows up in the mail history.
func NewSender(cfg config.Config, history mailhistory.Repository) cloudflareemail.Sender {
	var sender cloudflareemail.Sender = cloudflareemail.NewNoopSender()
	if ProducerEnabled(cfg) {
		sender = cloudflareemail.NewProducerClient(cfg.EmailProducerURL, cfg.EmailProducerToken)
	}

	return mailhistory.NewRecordingSender(history, sender)
}

// ProducerEnabled reports whether mail is handed to the email producer instead
// of being dropped by the no-op sender.
func ProducerEnabled(cfg config.Config) bool {
	return cfg.EmailProducerURL != "" && (!cfg.AllowDangerously || cfg.EmailProducerEnabled)
}
