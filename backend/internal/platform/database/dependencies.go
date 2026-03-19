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
	"github.com/s-union/PortalDots/backend/internal/domain/mailqueue"
	"github.com/s-union/PortalDots/backend/internal/domain/page"
	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
	"github.com/s-union/PortalDots/backend/internal/domain/place"
	"github.com/s-union/PortalDots/backend/internal/domain/portalsetting"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/domain/tag"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

type Dependencies struct {
	Activities         activitylog.Repository
	Answers            answer.Repository
	Authenticator      auth.Authenticator
	Booths             booth.Repository
	Circles            circle.Catalog
	ContactCategories  contactcategory.Repository
	Documents          document.Repository
	Forms              form.Repository
	FormQuestions      formquestion.Repository
	Mails              mailqueue.Repository
	Pages              page.Repository
	ParticipationTypes participationtype.Repository
	Portal             portalsetting.Repository
	Places             place.Repository
	Sessions           session.Store
	Tags               tag.Repository
	Users              useradmin.Repository
	Close              func()
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

	userCount, err := store.CountUsers(ctx)
	if err != nil {
		store.Close()
		return Dependencies{}, err
	}

	if userCount == 0 {
		if err := Seed(ctx, store.Pool(), cfg); err != nil {
			store.Close()
			return Dependencies{}, err
		}
	} else if cfg.AllowInsecureDefaults && cfg.SyncAuthUserOnStartup {
		if err := SyncConfiguredUsers(ctx, store.Pool(), cfg.AuthUser, cfg.Users); err != nil {
			store.Close()
			return Dependencies{}, err
		}
	}

	queries := store.Queries()

	return Dependencies{
		Activities:         activitylog.NewSQLCRepository(queries),
		Answers:            answer.NewSQLCRepository(store.Pool(), queries),
		Authenticator:      auth.NewSQLCAuthenticator(queries),
		Booths:             booth.NewSQLCRepository(queries),
		Circles:            circle.NewSQLCCatalog(queries),
		ContactCategories:  contactcategory.NewSQLCRepository(queries),
		Documents:          document.NewSQLCRepository(queries),
		Forms:              form.NewSQLCRepository(queries),
		FormQuestions:      formquestion.NewSQLCRepository(store.Pool(), queries),
		Mails:              mailqueue.NewSQLCRepository(queries),
		Pages:              page.NewSQLCRepository(queries),
		ParticipationTypes: participationtype.NewSQLCRepository(queries),
		Portal: portalsetting.NewMemoryRepository(portalsetting.Settings{
			AppName:                   cfg.AppName,
			PortalDescription:         cfg.PortalDescription,
			AppURL:                    cfg.AppURL,
			AppForceHTTPS:             cfg.AppForceHTTPS,
			PortalAdminName:           cfg.PortalAdminName,
			PortalContactEmail:        cfg.PortalContactEmail,
			PortalUnivemailLocalPart:  cfg.PortalUnivemailLocalPart,
			PortalUnivemailDomainPart: cfg.PortalUnivemailDomainPart,
			PortalStudentIDName:       cfg.PortalStudentIDName,
			PortalUnivemailName:       cfg.PortalUnivemailName,
			PortalPrimaryColorH:       cfg.PortalPrimaryColorH,
			PortalPrimaryColorS:       cfg.PortalPrimaryColorS,
			PortalPrimaryColorL:       cfg.PortalPrimaryColorL,
		}),
		Places:   place.NewSQLCRepository(queries),
		Sessions: session.NewSQLCStore(queries, cfg.SessionTTL),
		Tags:     tag.NewSQLCRepository(queries),
		Users:    useradmin.NewSQLCRepository(store.Pool(), queries),
		Close:    store.Close,
	}, nil
}
