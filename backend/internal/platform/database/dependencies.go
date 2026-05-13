package database

import (
	"context"

	"github.com/s-union/PortalDots/backend/internal/domain/activitylog"
	"github.com/s-union/PortalDots/backend/internal/domain/answer"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/booth"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/contactcategory"
	"github.com/s-union/PortalDots/backend/internal/domain/document"
	"github.com/s-union/PortalDots/backend/internal/domain/form"
	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
	"github.com/s-union/PortalDots/backend/internal/domain/mailhistory"
	"github.com/s-union/PortalDots/backend/internal/domain/page"
	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
	"github.com/s-union/PortalDots/backend/internal/domain/pendingregistration"
	"github.com/s-union/PortalDots/backend/internal/domain/place"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/domain/tag"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

type Dependencies struct {
	Activities           activitylog.Repository
	Answers              answer.Repository
	Authenticator        auth.Authenticator
	Booths               booth.Repository
	Circles              circle.Catalog
	ContactCategories    contactcategory.Repository
	Documents            document.Repository
	Forms                form.Repository
	FormQuestions        formquestion.Repository
	MailHistory          mailhistory.Repository
	Pages                page.Repository
	PendingRegistrations pendingregistration.Repository
	ParticipationTypes   participationtype.Repository
	Places               place.Repository
	Sessions             session.Store
	Tags                 tag.Repository
	Users                useradmin.Repository
	Close                func()
}

func BuildDependencies(ctx context.Context, cfg config.Config) (Dependencies, error) {
	store, err := Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return Dependencies{}, err
	}

	if err := Migrate(ctx, store.Pool(), cfg.MigrationsDir); err != nil {
		store.Close()
		return Dependencies{}, err
	}

	if err := EnsureSeedData(ctx, store, cfg); err != nil {
		store.Close()
		return Dependencies{}, err
	}

	queries := store.Queries()

	return Dependencies{
		Activities:           activitylog.NewSQLCRepository(queries),
		Answers:              answer.NewSQLCRepository(store.Pool(), queries),
		Authenticator:        auth.NewSQLCAuthenticator(queries),
		Booths:               booth.NewSQLCRepository(queries),
		Circles:              circle.NewSQLCCatalog(queries),
		ContactCategories:    contactcategory.NewSQLCRepository(queries),
		Documents:            document.NewSQLCRepository(queries),
		Forms:                form.NewSQLCRepository(queries),
		FormQuestions:        formquestion.NewSQLCRepository(store.Pool(), queries),
		MailHistory:          mailhistory.NewPostgresRepository(store.Pool()),
		Pages:                page.NewSQLCRepository(queries),
		PendingRegistrations: pendingregistration.NewSQLCRepository(queries),
		ParticipationTypes:   participationtype.NewSQLCRepository(queries),
		Places:               place.NewSQLCRepository(queries),
		Sessions:             session.NewSQLCStore(queries, cfg.SessionTTL),
		Tags:                 tag.NewSQLCRepository(queries),
		Users:                useradmin.NewSQLCRepository(store.Pool(), queries),
		Close:                store.Close,
	}, nil
}

func EnsureSeedData(ctx context.Context, store *SQLCStore, cfg config.Config) error {
	userCount, err := store.CountUsers(ctx)
	if err != nil {
		return err
	}

	if shouldReseedOnStartup(userCount, cfg) {
		if err := Seed(ctx, store.Pool(), cfg); err != nil {
			return err
		}
	}

	return nil
}

func shouldReseedOnStartup(userCount int64, cfg config.Config) bool {
	if userCount == 0 {
		return true
	}

	return cfg.AllowDangerously && cfg.SyncAuthUserOnStartup
}
