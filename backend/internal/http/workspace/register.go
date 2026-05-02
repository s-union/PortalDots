//go:build ignore

package workspacehttp

import (
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/answer"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/contactcategory"
	backenddocument "github.com/s-union/PortalDots/backend/internal/domain/document"
	backendform "github.com/s-union/PortalDots/backend/internal/domain/form"
	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
	backendpage "github.com/s-union/PortalDots/backend/internal/domain/page"
	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/middlewares"
)

type sharedDeps struct {
	sessionCookieName     string
	sessionCookieTTL      time.Duration
	sessionCookieSecure   bool
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

type workspaceHandlers struct {
	sharedDeps
	answers            answer.Repository
	circles            circle.Catalog
	contactCategories  contactcategory.Repository
	documents          backenddocument.Repository
	forms              backendform.Repository
	formQuestions      formquestion.Repository
	pages              backendpage.Repository
	participationTypes participationtype.Repository
	users              useradmin.Repository
}

type Dependencies struct {
	SessionCookieName     string
	SessionCookieTTL      time.Duration
	SessionCookieSecure   bool
	AllowDangerously bool
	Sessions              session.Store
	Answers               answer.Repository
	Circles               circle.Catalog
	ContactCategories     contactcategory.Repository
	Documents             backenddocument.Repository
	Forms                 backendform.Repository
	FormQuestions         formquestion.Repository
	Pages                 backendpage.Repository
	ParticipationTypes    participationtype.Repository
	Users                 useradmin.Repository
}

func Register(v1 *echo.Group, deps Dependencies, middleware ...echo.MiddlewareFunc) {
	workspace := v1.Group("", middleware...)
	h := &workspaceHandlers{
		sharedDeps: sharedDeps{
			sessionCookieName:     deps.SessionCookieName,
			sessionCookieTTL:      deps.SessionCookieTTL,
			sessionCookieSecure:   deps.SessionCookieSecure,
			allowDangerously: deps.AllowDangerously,
			sessions:              deps.Sessions,
		},
		answers:            deps.Answers,
		circles:            deps.Circles,
		contactCategories:  deps.ContactCategories,
		documents:          deps.Documents,
		forms:              deps.Forms,
		formQuestions:      deps.FormQuestions,
		pages:              deps.Pages,
		participationTypes: deps.ParticipationTypes,
		users:              deps.Users,
	}

	workspace.GET("/circles", h.listCircles)
	workspace.GET("/participation-types", h.listParticipationTypes)
	workspace.GET("/participation-types/:typeID/registration-form", h.getParticipationTypeRegistrationForm)
	workspace.POST("/circles", h.createCircle)
	workspace.PUT("/circles/current", h.setCurrentCircle)
	workspace.GET("/circles/current/detail", h.getCurrentCircleDetail)
	workspace.PUT("/circles/current/detail", h.updateCurrentCircle)
	workspace.DELETE("/circles/current", h.deleteCurrentCircle)
	workspace.POST("/circles/current/submit", h.submitCurrentCircle)
	workspace.GET("/circles/current/members", h.listCurrentCircleMembers)
	workspace.POST("/circles/current/members", h.addCurrentCircleMember)
	workspace.DELETE("/circles/current/members/:userID", h.removeCurrentCircleMember)
	workspace.POST("/circles/current/invitation-token/regenerate", h.regenerateInvitationToken)
	workspace.POST("/circles/join/:token", h.joinCircleByToken)
	workspace.GET("/documents", h.listDocuments)
	workspace.GET("/documents/:documentID", h.getDocument)
	workspace.GET("/forms", h.listForms)
	workspace.GET("/forms/:formID", h.getForm)
	workspace.GET("/forms/:formID/answers", h.listFormAnswers)
	workspace.POST("/forms/:formID/answers", h.createFormAnswer)
	workspace.GET("/forms/:formID/answers/:answerID", h.getFormAnswerByID)
	workspace.PUT("/forms/:formID/answers/:answerID", h.updateFormAnswer)
	workspace.POST("/forms/:formID/answers/:answerID/uploads", h.uploadFormAnswerFileByID)
	workspace.GET("/forms/:formID/answers/:answerID/uploads/:questionID/file", h.downloadFormAnswerFileByID)
	workspace.GET("/forms/:formID/answer", h.getFormAnswer)
	workspace.PUT("/forms/:formID/answer", h.upsertFormAnswer)
	workspace.POST("/forms/:formID/answer/uploads", h.uploadFormAnswerFile)
	workspace.GET("/forms/:formID/answer/uploads/:uploadID/file", h.downloadFormAnswerFile)
	workspace.GET("/pages", h.listPages)
	workspace.GET("/pages/:pageID", h.getPage)
}
