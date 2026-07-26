// Package pagemail schedules and dispatches the announcement email of a staff page.
package pagemail

import (
	"context"
	"strings"

	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/document"
	"github.com/s-union/PortalDots/backend/internal/domain/page"
	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/shared/cloudflareemail"
)

// MailConfig holds the sender information shared by every announcement email.
type MailConfig struct {
	From             string
	AdminName        string
	ContactEmail     string
	AppName          string
	AppURL           string
	AllowDangerously bool
}

// Builder renders the announcement email of a page from the live page state.
type Builder struct {
	circles            circle.Catalog
	documents          document.Repository
	participationTypes participationtype.Repository
	users              useradmin.Repository
	config             MailConfig
}

// NewBuilder creates a Builder rendering announcement emails for the given portal.
func NewBuilder(
	circles circle.Catalog,
	documents document.Repository,
	participationTypes participationtype.Repository,
	users useradmin.Repository,
	config MailConfig,
) *Builder {
	return &Builder{
		circles:            circles,
		documents:          documents,
		participationTypes: participationTypes,
		users:              users,
		config:             config,
	}
}

// Build renders the announcement email of the page under the given job ID.
// The returned job has no recipients when the page reaches nobody, which is a
// legitimate outcome; an error means the recipients could not be determined at
// all and the caller must not treat the mail as handled.
func (b *Builder) Build(ctx context.Context, currentPage page.Page, jobID string) (cloudflareemail.EmailJob, error) {
	recipients, err := b.recipients(ctx, currentPage.ViewableTags)
	if err != nil {
		return cloudflareemail.EmailJob{}, err
	}
	if len(recipients) == 0 {
		return cloudflareemail.EmailJob{}, nil
	}

	body := currentPage.Body + b.documentsSection(currentPage)
	return cloudflareemail.EmailJob{
		JobId:    jobID,
		Template: "markdown-notice",
		Priority: cloudflareemail.PriorityNormal,
		From:     b.config.From,
		To:       recipients,
		Subject:  currentPage.Title,
		Body:     body,
		Variables: map[string]string{
			"subject":      currentPage.Title,
			"body":         body,
			"appName":      b.config.AppName,
			"appURL":       b.config.AppURL,
			"adminName":    b.config.AdminName,
			"contactEmail": b.config.ContactEmail,
			"preview":      currentPage.Title,
		},
	}, nil
}

func (b *Builder) documentsSection(currentPage page.Page) string {
	lines := make([]string, 0, len(currentPage.DocumentIDs)+3)
	for _, documentID := range currentPage.DocumentIDs {
		documentValue, found := b.documents.FindPublic(documentID, currentPage.ViewableTags)
		if !found {
			continue
		}
		line := "- " + documentValue.Name
		if documentValue.Description != "" {
			line += ": " + strings.ReplaceAll(documentValue.Description, "\n", " ")
		}
		lines = append(lines, line)
	}
	if len(lines) == 0 {
		return ""
	}

	return strings.Join(append([]string{"", "", "関連する配布資料"}, lines...), "\n")
}

func (b *Builder) recipients(ctx context.Context, viewableTags []string) ([]string, error) {
	circleIDs := []string{}
	if len(viewableTags) > 0 {
		circles, err := b.circles.ListForStaff(ctx)
		if err != nil {
			return nil, err
		}

		for _, currentCircle := range circles {
			if page.VisibleToCircleTags(viewableTags, circle.EffectiveTags(ctx, currentCircle, b.participationTypes)) {
				circleIDs = append(circleIDs, currentCircle.ID)
			}
		}
		if len(circleIDs) == 0 {
			return nil, nil
		}
	}

	users, err := b.users.ListVerifiedByCircleIDs(circleIDs)
	if err != nil {
		return nil, err
	}

	return useradmin.MailRecipients(users...), nil
}
