package httpapi

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
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

// sharedDeps holds session-related dependencies shared across all domain handler structs.
type sharedDeps struct {
	sessionCookieName     string
	sessionCookieTTL      time.Duration
	sessionCookieSecure   bool
	allowInsecureDefaults bool
	sessions              session.Store
}

func (s *sharedDeps) getSession(c echo.Context) (string, session.Session, bool) {
	cookie, err := c.Cookie(s.sessionCookieName)
	if err != nil || cookie.Value == "" {
		return "", session.Session{}, false
	}

	currentSession, ok := s.sessions.Get(cookie.Value)
	if !ok {
		return "", session.Session{}, false
	}

	return cookie.Value, currentSession, true
}

// authHandlers handles authentication, session, and contact endpoints.
type authHandlers struct {
	sharedDeps
	activities        activitylog.Repository
	authenticator     auth.Authenticator
	passwordChanger   auth.PasswordChanger
	circles           circle.Catalog
	contactCategories contactcategory.Repository
	mails             mailqueue.Repository
	users             useradmin.Repository
}

// staffVerifyHandlers handles staff verification endpoints.
type staffVerifyHandlers struct {
	sharedDeps
	staffVerifyCode string
}

// staffUserHandlers handles staff user management endpoints.
type staffUserHandlers struct {
	sharedDeps
	activities activitylog.Repository
	users      useradmin.Repository
}

// staffCircleHandlers handles staff circle and participation type endpoints.
type staffCircleHandlers struct {
	sharedDeps
	activities         activitylog.Repository
	booths             booth.Repository
	circles            circle.Catalog
	forms              form.Repository
	mails              mailqueue.Repository
	participationTypes participationtype.Repository
	users              useradmin.Repository
}

// staffFormHandlers handles staff form and form answer endpoints.
type staffFormHandlers struct {
	sharedDeps
	activities         activitylog.Repository
	answers            answer.Repository
	circles            circle.Catalog
	forms              form.Repository
	formQuestions      formquestion.Repository
	mails              mailqueue.Repository
	participationTypes participationtype.Repository
	users              useradmin.Repository
}

// staffPageHandlers handles staff page endpoints.
type staffPageHandlers struct {
	sharedDeps
	activities activitylog.Repository
	circles    circle.Catalog
	documents  document.Repository
	mails      mailqueue.Repository
	pages      page.Repository
	tags       tag.Repository
	users      useradmin.Repository
}

// staffDocumentHandlers handles staff document endpoints.
type staffDocumentHandlers struct {
	sharedDeps
	activities activitylog.Repository
	circles    circle.Catalog
	documents  document.Repository
}

// staffMastersHandlers handles staff master data endpoints (tags, places, contact categories).
type staffMastersHandlers struct {
	sharedDeps
	activities        activitylog.Repository
	booths            booth.Repository
	circles           circle.Catalog
	contactCategories contactcategory.Repository
	places            place.Repository
	tags              tag.Repository
}

// staffPermissionHandlers handles staff permission endpoints.
type staffPermissionHandlers struct {
	sharedDeps
	activities activitylog.Repository
	users      useradmin.Repository
}

// staffAdminHandlers handles staff admin endpoints (mails, exports, activity logs).
type staffAdminHandlers struct {
	sharedDeps
	activities activitylog.Repository
	answers    answer.Repository
	circles    circle.Catalog
	documents  document.Repository
	forms      form.Repository
	mails      mailqueue.Repository
	pages      page.Repository
	portal     portalsetting.Repository
}

// workspaceHandlers handles participant-facing workspace endpoints.
type workspaceHandlers struct {
	sharedDeps
	answers            answer.Repository
	circles            circle.Catalog
	contactCategories  contactcategory.Repository
	documents          document.Repository
	forms              form.Repository
	formQuestions      formquestion.Repository
	pages              page.Repository
	participationTypes participationtype.Repository
	users              useradmin.Repository
}

func NewServer(cfg config.Config) *echo.Echo {
	return NewServerWithDependencies(
		cfg,
		activitylog.NewMemoryRepository(),
		answer.NewMemoryRepository(),
		auth.NewStaticAuthenticator(cfg.AuthUser),
		booth.NewMemoryRepository(cfg.Booths),
		circle.NewStaticCatalog(cfg.Circles, cfg.AuthUser, cfg.Users),
		contactcategory.NewMemoryRepository(cfg.ContactCategories),
		document.NewStaticRepository(cfg.Documents),
		form.NewStaticRepository(cfg.Forms),
		formquestion.NewMemoryRepository(),
		mailqueue.NewMemoryRepository(),
		page.NewStaticRepository(cfg.Pages),
		participationtype.NewMemoryRepository(cfg.ParticipationTypes),
		portalsetting.NewMemoryRepository(portalsetting.Settings{
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
		place.NewMemoryRepository(cfg.Places),
		session.NewMemoryStore(cfg.SessionTTL),
		tag.NewMemoryRepository(cfg.Tags),
		useradmin.NewStaticRepository(cfg.AuthUser, cfg.Users),
	)
}

func NewServerWithDependencies(
	cfg config.Config,
	activities activitylog.Repository,
	answers answer.Repository,
	authenticator auth.Authenticator,
	booths booth.Repository,
	circles circle.Catalog,
	contactCategories contactcategory.Repository,
	documents document.Repository,
	forms form.Repository,
	formQuestions formquestion.Repository,
	mails mailqueue.Repository,
	pages page.Repository,
	participationTypes participationtype.Repository,
	portal portalsetting.Repository,
	places place.Repository,
	sessionStore session.Store,
	tags tag.Repository,
	users useradmin.Repository,
) *echo.Echo {
	e := echo.New()
	e.HideBanner = true
	e.Use(middleware.Recover())
	e.Use(middleware.RequestID())

	shared := sharedDeps{
		sessionCookieName:     cfg.SessionCookieName,
		sessionCookieTTL:      cfg.SessionTTL,
		sessionCookieSecure:   cfg.SessionCookieSecure,
		allowInsecureDefaults: cfg.AllowInsecureDefaults,
		sessions:              sessionStore,
	}

	var passwordChanger auth.PasswordChanger
	if pc, ok := authenticator.(auth.PasswordChanger); ok {
		passwordChanger = pc
	}

	authH := &authHandlers{
		sharedDeps:        shared,
		activities:        activities,
		authenticator:     authenticator,
		passwordChanger:   passwordChanger,
		circles:           circles,
		contactCategories: contactCategories,
		mails:             mails,
		users:             users,
	}

	publicHomeH := &publicHomeHandlers{
		circles:               circles,
		documents:             documents,
		forms:                 forms,
		pages:                 pages,
		participationTypes:    participationTypes,
		portal:                portal,
		allowInsecureDefaults: cfg.AllowInsecureDefaults,
		authUser:              cfg.AuthUser,
		users:                 cfg.Users,
	}

	staffVerifyH := &staffVerifyHandlers{
		sharedDeps:      shared,
		staffVerifyCode: cfg.StaffVerifyCode,
	}

	staffUsersH := &staffUserHandlers{
		sharedDeps: shared,
		activities: activities,
		users:      users,
	}

	staffCircleH := &staffCircleHandlers{
		sharedDeps:         shared,
		activities:         activities,
		booths:             booths,
		circles:            circles,
		forms:              forms,
		mails:              mails,
		participationTypes: participationTypes,
		users:              users,
	}

	staffFormH := &staffFormHandlers{
		sharedDeps:         shared,
		activities:         activities,
		answers:            answers,
		circles:            circles,
		forms:              forms,
		formQuestions:      formQuestions,
		mails:              mails,
		participationTypes: participationTypes,
		users:              users,
	}

	staffPageH := &staffPageHandlers{
		sharedDeps: shared,
		activities: activities,
		circles:    circles,
		documents:  documents,
		mails:      mails,
		pages:      pages,
		tags:       tags,
		users:      users,
	}

	staffDocumentH := &staffDocumentHandlers{
		sharedDeps: shared,
		activities: activities,
		circles:    circles,
		documents:  documents,
	}

	staffMastersH := &staffMastersHandlers{
		sharedDeps:        shared,
		activities:        activities,
		booths:            booths,
		circles:           circles,
		contactCategories: contactCategories,
		places:            places,
		tags:              tags,
	}

	staffPermissionH := &staffPermissionHandlers{
		sharedDeps: shared,
		activities: activities,
		users:      users,
	}

	staffAdminH := &staffAdminHandlers{
		sharedDeps: shared,
		activities: activities,
		answers:    answers,
		circles:    circles,
		documents:  documents,
		forms:      forms,
		mails:      mails,
		pages:      pages,
		portal:     portal,
	}

	workspaceH := &workspaceHandlers{
		sharedDeps:         shared,
		answers:            answers,
		circles:            circles,
		contactCategories:  contactCategories,
		documents:          documents,
		forms:              forms,
		formQuestions:      formQuestions,
		pages:              pages,
		participationTypes: participationTypes,
		users:              users,
	}

	e.GET("/healthz", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	v1 := e.Group("/v1")
	registerPublicRoutes(v1, authH, publicHomeH, staffVerifyH)
	registerStaffRoutes(v1, staffAdminH, staffCircleH, staffDocumentH, staffFormH, staffMastersH, staffPageH, staffPermissionH, staffUsersH)
	registerWorkspaceRoutes(v1, workspaceH)

	return e
}
