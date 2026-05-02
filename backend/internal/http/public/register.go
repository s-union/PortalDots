//go:build ignore

package publichttp

import (
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/activitylog"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/contactcategory"
	backenddocument "github.com/s-union/PortalDots/backend/internal/domain/document"
	backendform "github.com/s-union/PortalDots/backend/internal/domain/form"
	"github.com/s-union/PortalDots/backend/internal/domain/mailqueue"
	backendpage "github.com/s-union/PortalDots/backend/internal/domain/page"
	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
	"github.com/s-union/PortalDots/backend/internal/domain/pendingregistration"
	"github.com/s-union/PortalDots/backend/internal/domain/portalsetting"
	"github.com/s-union/PortalDots/backend/internal/domain/registrationmail"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/middlewares"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

type sharedDeps struct {
	sessionCookieName     string
	sessionCookieTTL      time.Duration
	sessionCookieSecure   bool
	staffVerifyCode       string
	allowDangerously bool
	sessions              session.Store
}

func (s *sharedDeps) getSession(c echo.Context) (string, session.Session, bool) {
	if sessionID, currentSession, ok := middlewares.SessionFromContext(c); ok {
		return sessionID, currentSession, true
	}

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

type authHandlers struct {
	sharedDeps
	activities                activitylog.Repository
	authenticator             auth.Authenticator
	passwordChanger           auth.PasswordChanger
	registrationAuth          auth.RegistrationAuthenticator
	circles                   circle.Catalog
	contactCategories         contactcategory.Repository
	mails                     mailqueue.Repository
	pendingRegistrations      pendingregistration.Repository
	portalUnivemailDomainPart string
	registrationMailSender    registrationmail.Sender
	registrationVerifyTTL     time.Duration
	appName                   string
	appURL                    string
	users                     useradmin.Repository
	verifyCodes               *participantVerifyCodeStore
}

type publicHomeHandlers struct {
	circles               circle.Catalog
	documents             backenddocument.Repository
	forms                 backendform.Repository
	pages                 backendpage.Repository
	participationTypes    participationtype.Repository
	portal                portalsetting.Repository
	allowDangerously bool
	authUser              config.AuthUser
	users                 []config.User
}

type staffVerifyHandlers struct {
	sharedDeps
}

type Dependencies struct {
	SessionCookieName         string
	SessionCookieTTL          time.Duration
	SessionCookieSecure       bool
	StaffVerifyCode           string
	AllowDangerously     bool
	RegistrationVerifyTTL     time.Duration
	AppName                   string
	AppURL                    string
	PortalUnivemailDomainPart string
	SMTPHost                  string
	SMTPPort                  int
	SMTPUsername              string
	SMTPPassword              string
	SMTPFrom                  string
	AuthUser                  config.AuthUser
	Users                     []config.User
	Activities                activitylog.Repository
	Authenticator             auth.Authenticator
	Circles                   circle.Catalog
	ContactCategories         contactcategory.Repository
	Documents                 backenddocument.Repository
	Forms                     backendform.Repository
	Mails                     mailqueue.Repository
	Pages                     backendpage.Repository
	PendingRegistrations      pendingregistration.Repository
	ParticipationTypes        participationtype.Repository
	Portal                    portalsetting.Repository
	Sessions                  session.Store
	UserRepository            useradmin.Repository
}

func Register(v1 *echo.Group, deps Dependencies) {
	shared := sharedDeps{
		sessionCookieName:     deps.SessionCookieName,
		sessionCookieTTL:      deps.SessionCookieTTL,
		sessionCookieSecure:   deps.SessionCookieSecure,
		staffVerifyCode:       deps.StaffVerifyCode,
		allowDangerously: deps.AllowDangerously,
		sessions:              deps.Sessions,
	}

	var passwordChanger auth.PasswordChanger
	if pc, ok := deps.Authenticator.(auth.PasswordChanger); ok {
		passwordChanger = pc
	}
	var registrationAuth auth.RegistrationAuthenticator
	if ra, ok := deps.Authenticator.(auth.RegistrationAuthenticator); ok {
		registrationAuth = ra
	}

	var registrationMailSender registrationmail.Sender = registrationmail.NewMockSender()
	if deps.SMTPHost != "" {
		registrationMailSender = registrationmail.NewSMTPSender(
			deps.SMTPHost,
			deps.SMTPPort,
			deps.SMTPUsername,
			deps.SMTPPassword,
			deps.SMTPFrom,
		)
	}

	authH := &authHandlers{
		sharedDeps:                shared,
		activities:                deps.Activities,
		authenticator:             deps.Authenticator,
		passwordChanger:           passwordChanger,
		registrationAuth:          registrationAuth,
		circles:                   deps.Circles,
		contactCategories:         deps.ContactCategories,
		mails:                     deps.Mails,
		pendingRegistrations:      deps.PendingRegistrations,
		portalUnivemailDomainPart: deps.PortalUnivemailDomainPart,
		registrationMailSender:    registrationMailSender,
		registrationVerifyTTL:     deps.RegistrationVerifyTTL,
		appName:                   deps.AppName,
		appURL:                    deps.AppURL,
		users:                     deps.UserRepository,
		verifyCodes:               newParticipantVerifyCodeStore(),
	}

	publicHomeH := &publicHomeHandlers{
		circles:               deps.Circles,
		documents:             deps.Documents,
		forms:                 deps.Forms,
		pages:                 deps.Pages,
		participationTypes:    deps.ParticipationTypes,
		portal:                deps.Portal,
		allowDangerously: deps.AllowDangerously,
		authUser:              deps.AuthUser,
		users:                 deps.Users,
	}

	staffVerifyH := &staffVerifyHandlers{sharedDeps: shared}

	v1.GET("/public/config", publicHomeH.getPublicConfig)
	v1.GET("/public/home", publicHomeH.getPublicHome)
	v1.GET("/public/pages", publicHomeH.listPublicPages)
	v1.GET("/public/pages/:pageID", publicHomeH.getPublicPage)
	v1.GET("/public/documents", publicHomeH.listPublicDocuments)
	v1.GET("/public/documents/:documentID", publicHomeH.getPublicDocument)
	v1.GET("/session/bootstrap", authH.sessionBootstrap)
	v1.PUT("/session/profile", authH.updateProfile)
	v1.PUT("/session/password", authH.updatePassword)
	v1.DELETE("/session/account", authH.deleteAccount)
	v1.POST("/auth/register", authH.register)
	v1.POST("/auth/register/start", authH.startRegistration)
	v1.POST("/auth/register/verify", authH.verifyRegistration)
	v1.POST("/auth/register/complete", authH.completeRegistration)
	v1.POST("/auth/login", authH.login)
	v1.POST("/auth/logout", authH.logout)
	v1.GET("/auth/verification", authH.getAuthVerification)
	v1.POST("/auth/verification/request", authH.requestAuthVerification)
	v1.POST("/auth/verification/confirm", authH.confirmAuthVerification)
	v1.GET("/contact-categories", authH.listContactCategories)
	v1.GET("/contact", authH.listContactHistory)
	v1.POST("/contact", authH.submitContact)
	v1.GET("/staff/status", staffVerifyH.staffStatus)
	v1.POST("/staff/verify/request", staffVerifyH.requestStaffVerification)
	v1.POST("/staff/verify/confirm", staffVerifyH.confirmStaffVerification)
}
