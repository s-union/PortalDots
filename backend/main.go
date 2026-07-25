package main

import (
	"context"
	"log"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/domain/pagemail"
	httpserver "github.com/s-union/PortalDots/backend/internal/http/server"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/platform/database"
	"github.com/s-union/PortalDots/backend/internal/platform/email"
	"github.com/s-union/PortalDots/backend/internal/shared/cloudflareemail"
)

// pageMailInterval is how often the scheduled announcement mail of a page is
// checked for being due.
const pageMailInterval = time.Minute

// shutdownTimeout bounds how long in-flight requests may finish after a
// termination signal.
const shutdownTimeout = 20 * time.Second

func main() {
	cfg := config.FromEnv()
	if err := cfg.ValidateForAPI(); err != nil {
		log.Fatal(err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if err := run(ctx, cfg); err != nil {
		log.Fatal(err)
	}
}

func run(ctx context.Context, cfg config.Config) error {
	dependencies, err := database.BuildDependencies(ctx, cfg)
	if err != nil {
		return err
	}
	defer dependencies.Close()

	emailSender := email.NewSender(cfg, dependencies.MailHistory)
	server := httpserver.NewWithDependencies(cfg, httpserver.Dependencies{
		Shared: httpserver.SharedDependencies{
			Activities:  dependencies.Activities,
			Contacts:    dependencies.Contacts,
			EmailSender: emailSender,
			MailHistory: dependencies.MailHistory,
			Sessions:    dependencies.Sessions,
			Users:       dependencies.Users,
		},
		Public: httpserver.PublicDependencies{
			Authenticator:        dependencies.Authenticator,
			Circles:              dependencies.Circles,
			ContactCategories:    dependencies.ContactCategories,
			Documents:            dependencies.Documents,
			Forms:                dependencies.Forms,
			Pages:                dependencies.Pages,
			PendingRegistrations: dependencies.PendingRegistrations,
			ParticipationTypes:   dependencies.ParticipationTypes,
		},
		Workspace: httpserver.WorkspaceDependencies{
			Answers:            dependencies.Answers,
			Circles:            dependencies.Circles,
			ContactCategories:  dependencies.ContactCategories,
			Documents:          dependencies.Documents,
			Forms:              dependencies.Forms,
			FormQuestions:      dependencies.FormQuestions,
			Pages:              dependencies.Pages,
			ParticipationTypes: dependencies.ParticipationTypes,
			Users:              dependencies.Users,
		},
		Staff: httpserver.StaffDependencies{
			Answers:            dependencies.Answers,
			Booths:             dependencies.Booths,
			Circles:            dependencies.Circles,
			ContactCategories:  dependencies.ContactCategories,
			Documents:          dependencies.Documents,
			Forms:              dependencies.Forms,
			FormQuestions:      dependencies.FormQuestions,
			Pages:              dependencies.Pages,
			ParticipationTypes: dependencies.ParticipationTypes,
			Places:             dependencies.Places,
			ScheduledPageMails: dependencies.ScheduledPageMails,
			Tags:               dependencies.Tags,
			Users:              dependencies.Users,
		},
	})

	var dispatcher sync.WaitGroup
	dispatcher.Add(1)
	go func() {
		defer dispatcher.Done()
		newPageMailDispatcher(cfg, dependencies, emailSender).Run(ctx)
	}()
	// The dispatcher shares the database pool, so it must be done before the
	// deferred Close tears the pool down.
	defer dispatcher.Wait()

	log.Printf("starting api server on %s", cfg.BindAddress)
	// Start blocks until the context is cancelled, then drains in-flight
	// requests within the graceful timeout.
	return echo.StartConfig{
		Address:         cfg.BindAddress,
		GracefulTimeout: shutdownTimeout,
	}.Start(ctx, server)
}

func newPageMailDispatcher(
	cfg config.Config,
	dependencies database.Dependencies,
	emailSender cloudflareemail.Sender,
) *pagemail.Dispatcher {
	builder := pagemail.NewBuilder(
		dependencies.Circles,
		dependencies.Documents,
		dependencies.ParticipationTypes,
		dependencies.Users,
		pagemail.MailConfig{
			From:         cfg.EmailFrom,
			AdminName:    cfg.PortalAdminName,
			ContactEmail: cfg.PortalContactEmail,
			AppName:      cfg.AppName,
			AppURL:       cfg.AppURL,
		},
	)

	return pagemail.NewDispatcher(
		dependencies.ScheduledPageMails,
		dependencies.Pages,
		builder,
		emailSender,
		dependencies.Activities,
		pageMailInterval,
	)
}
