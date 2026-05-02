//go:build ignore

package staffhttp

import (
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/activitylog"
	"github.com/s-union/PortalDots/backend/internal/domain/answer"
	"github.com/s-union/PortalDots/backend/internal/domain/booth"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/contactcategory"
	backenddocument "github.com/s-union/PortalDots/backend/internal/domain/document"
	backendform "github.com/s-union/PortalDots/backend/internal/domain/form"
	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
	"github.com/s-union/PortalDots/backend/internal/domain/mailqueue"
	backendpage "github.com/s-union/PortalDots/backend/internal/domain/page"
	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
	"github.com/s-union/PortalDots/backend/internal/domain/place"
	"github.com/s-union/PortalDots/backend/internal/domain/portalsetting"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/domain/tag"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/middlewares"
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

type staffUserHandlers struct {
	sharedDeps
	activities activitylog.Repository
	users      useradmin.Repository
}

type staffCircleHandlers struct {
	sharedDeps
	activities         activitylog.Repository
	booths             booth.Repository
	circles            circle.Catalog
	forms              backendform.Repository
	mails              mailqueue.Repository
	participationTypes participationtype.Repository
	users              useradmin.Repository
}

type staffFormHandlers struct {
	sharedDeps
	activities         activitylog.Repository
	answers            answer.Repository
	circles            circle.Catalog
	forms              backendform.Repository
	formQuestions      formquestion.Repository
	mails              mailqueue.Repository
	participationTypes participationtype.Repository
	users              useradmin.Repository
}

type staffPageHandlers struct {
	sharedDeps
	activities         activitylog.Repository
	circles            circle.Catalog
	documents          backenddocument.Repository
	mails              mailqueue.Repository
	pages              backendpage.Repository
	participationTypes participationtype.Repository
	tags               tag.Repository
	users              useradmin.Repository
}

type staffDocumentHandlers struct {
	sharedDeps
	activities activitylog.Repository
	circles    circle.Catalog
	documents  backenddocument.Repository
}

type staffMastersHandlers struct {
	sharedDeps
	activities        activitylog.Repository
	booths            booth.Repository
	circles           circle.Catalog
	contactCategories contactcategory.Repository
	places            place.Repository
	tags              tag.Repository
}

type staffPermissionHandlers struct {
	sharedDeps
	activities activitylog.Repository
	users      useradmin.Repository
}

type staffAdminHandlers struct {
	sharedDeps
	activities activitylog.Repository
	answers    answer.Repository
	circles    circle.Catalog
	documents  backenddocument.Repository
	forms      backendform.Repository
	mails      mailqueue.Repository
	pages      backendpage.Repository
	portal     portalsetting.Repository
}

type Dependencies struct {
	SessionCookieName     string
	SessionCookieTTL      time.Duration
	SessionCookieSecure   bool
	StaffVerifyCode       string
	AllowDangerously bool
	Sessions              session.Store
	Activities            activitylog.Repository
	Answers               answer.Repository
	Booths                booth.Repository
	Circles               circle.Catalog
	ContactCategories     contactcategory.Repository
	Documents             backenddocument.Repository
	Forms                 backendform.Repository
	FormQuestions         formquestion.Repository
	Mails                 mailqueue.Repository
	Pages                 backendpage.Repository
	ParticipationTypes    participationtype.Repository
	Places                place.Repository
	Portal                portalsetting.Repository
	Tags                  tag.Repository
	Users                 useradmin.Repository
}

func Register(v1 *echo.Group, deps Dependencies, middleware ...echo.MiddlewareFunc) {
	staff := v1.Group("/staff", middleware...)
	shared := sharedDeps{
		sessionCookieName:     deps.SessionCookieName,
		sessionCookieTTL:      deps.SessionCookieTTL,
		sessionCookieSecure:   deps.SessionCookieSecure,
		staffVerifyCode:       deps.StaffVerifyCode,
		allowDangerously: deps.AllowDangerously,
		sessions:              deps.Sessions,
	}

	usersH := &staffUserHandlers{sharedDeps: shared, activities: deps.Activities, users: deps.Users}
	circlesH := &staffCircleHandlers{sharedDeps: shared, activities: deps.Activities, booths: deps.Booths, circles: deps.Circles, forms: deps.Forms, mails: deps.Mails, participationTypes: deps.ParticipationTypes, users: deps.Users}
	formsH := &staffFormHandlers{sharedDeps: shared, activities: deps.Activities, answers: deps.Answers, circles: deps.Circles, forms: deps.Forms, formQuestions: deps.FormQuestions, mails: deps.Mails, participationTypes: deps.ParticipationTypes, users: deps.Users}
	pagesH := &staffPageHandlers{sharedDeps: shared, activities: deps.Activities, circles: deps.Circles, documents: deps.Documents, mails: deps.Mails, pages: deps.Pages, participationTypes: deps.ParticipationTypes, tags: deps.Tags, users: deps.Users}
	documentsH := &staffDocumentHandlers{sharedDeps: shared, activities: deps.Activities, circles: deps.Circles, documents: deps.Documents}
	mastersH := &staffMastersHandlers{sharedDeps: shared, activities: deps.Activities, booths: deps.Booths, circles: deps.Circles, contactCategories: deps.ContactCategories, places: deps.Places, tags: deps.Tags}
	permissionsH := &staffPermissionHandlers{sharedDeps: shared, activities: deps.Activities, users: deps.Users}
	adminH := &staffAdminHandlers{sharedDeps: shared, activities: deps.Activities, answers: deps.Answers, circles: deps.Circles, documents: deps.Documents, forms: deps.Forms, mails: deps.Mails, pages: deps.Pages, portal: deps.Portal}

	staff.GET("/pages", pagesH.listStaffPages)
	staff.POST("/pages", pagesH.createStaffPage)
	staff.GET("/pages/export.csv", pagesH.downloadStaffPagesCSV)
	staff.GET("/pages/:pageID", pagesH.getStaffPage)
	staff.PUT("/pages/:pageID", pagesH.updateStaffPage)
	staff.PATCH("/pages/:pageID/pin", pagesH.patchStaffPagePin)
	staff.DELETE("/pages/:pageID", pagesH.deleteStaffPage)
	staff.GET("/documents", documentsH.listStaffDocuments)
	staff.POST("/documents", documentsH.createStaffDocument)
	staff.GET("/documents/export", documentsH.downloadStaffDocumentsCSV)
	staff.GET("/documents/:documentID/edit", documentsH.getStaffDocument)
	staff.GET("/documents/:documentID", documentsH.downloadStaffDocumentFile)
	staff.PUT("/documents/:documentID", documentsH.updateStaffDocument)
	staff.DELETE("/documents/:documentID", documentsH.deleteStaffDocument)
	staff.GET("/tags", mastersH.listStaffTags)
	staff.GET("/tags/export", mastersH.downloadStaffTagsCSV)
	staff.POST("/tags", mastersH.createStaffTag)
	staff.PUT("/tags/:tagID", mastersH.updateStaffTag)
	staff.DELETE("/tags/:tagID", mastersH.deleteStaffTag)
	staff.GET("/places", mastersH.listStaffPlaces)
	staff.GET("/places/export", mastersH.downloadStaffPlacesCSV)
	staff.POST("/places", mastersH.createStaffPlace)
	staff.PUT("/places/:placeID", mastersH.updateStaffPlace)
	staff.DELETE("/places/:placeID", mastersH.deleteStaffPlace)
	staff.GET("/contact-categories", mastersH.listStaffContactCategories)
	staff.POST("/contact-categories", mastersH.createStaffContactCategory)
	staff.PUT("/contact-categories/:categoryID", mastersH.updateStaffContactCategory)
	staff.DELETE("/contact-categories/:categoryID", mastersH.deleteStaffContactCategory)
	staff.GET("/forms", formsH.listStaffForms)
	staff.POST("/forms", formsH.createStaffForm)
	staff.GET("/forms/export", formsH.downloadStaffFormsCSV)
	staff.GET("/forms/:formID", formsH.getStaffForm)
	staff.GET("/forms/:formID/edit", formsH.getStaffForm)
	staff.GET("/forms/:formID/preview", formsH.previewStaffForm)
	staff.PUT("/forms/:formID", formsH.updateStaffForm)
	staff.POST("/forms/:formID/copy", formsH.copyStaffForm)
	staff.DELETE("/forms/:formID", formsH.deleteStaffForm)
	staff.GET("/forms/:formID/answers", formsH.listStaffFormAnswers)
	staff.POST("/forms/:formID/answers", formsH.createStaffFormAnswer)
	staff.GET("/forms/:formID/answers/export", formsH.downloadStaffFormAnswersCSV)
	staff.GET("/forms/:formID/answers/not_answered", formsH.listStaffFormNotAnsweredCircles)
	staff.GET("/forms/:formID/not_answered", formsH.listStaffFormNotAnsweredCircles)
	staff.GET("/forms/:formID/answers/uploads.zip", formsH.downloadStaffFormAnswerUploadsZIP)
	staff.POST("/forms/:formID/answers/uploads/download_zip", formsH.downloadStaffFormAnswerUploadsZIP)
	staff.GET("/forms/:formID/answers/:answerID/edit", formsH.getStaffFormAnswer)
	staff.PUT("/forms/:formID/answers/:answerID", formsH.updateStaffFormAnswer)
	staff.DELETE("/forms/:formID/answers/:answerID", formsH.deleteStaffFormAnswer)
	staff.POST("/forms/:formID/answers/:answerID/uploads", formsH.uploadStaffFormAnswerFile)
	staff.GET("/forms/:formID/answers/:answerID/uploads/:questionID/file", formsH.downloadStaffFormAnswerUpload)
	staff.POST("/forms/:formID/questions", formsH.createStaffFormQuestion)
	staff.PUT("/forms/:formID/questions/:questionID", formsH.updateStaffFormQuestion)
	staff.DELETE("/forms/:formID/questions/:questionID", formsH.deleteStaffFormQuestion)
	staff.PUT("/forms/:formID/questions/order", formsH.reorderStaffFormQuestions)
	staff.GET("/forms/:formID/uploads/:uploadID/file", formsH.downloadStaffFormUpload)
	staff.GET("/participation-types", circlesH.listStaffParticipationTypes)
	staff.POST("/participation-types", circlesH.createStaffParticipationType)
	staff.GET("/participation-types/:typeID", circlesH.getStaffParticipationType)
	staff.GET("/participation-types/:typeID/circles", circlesH.listStaffParticipationTypeCircles)
	staff.GET("/participation-types/:typeID/circles/export", circlesH.downloadStaffParticipationTypeCirclesCSV)
	staff.PUT("/participation-types/:typeID", circlesH.updateStaffParticipationType)
	staff.DELETE("/participation-types/:typeID", circlesH.deleteStaffParticipationType)
	staff.GET("/circles", circlesH.listStaffCircles)
	staff.GET("/circles/managed", circlesH.listManagedStaffCircles)
	staff.GET("/circles/all", circlesH.listAllStaffCircles)
	staff.GET("/circles/export", circlesH.downloadStaffCirclesCSV)
	staff.POST("/circles", circlesH.createStaffCircle)
	staff.GET("/circles/:circleID", circlesH.getStaffCircle)
	staff.PUT("/circles/:circleID", circlesH.updateStaffCircle)
	staff.DELETE("/circles/:circleID", circlesH.deleteStaffCircle)
	staff.GET("/circles/:circleID/members", circlesH.listStaffCircleMembers)
	staff.POST("/circles/:circleID/members", circlesH.addStaffCircleMember)
	staff.DELETE("/circles/:circleID/members/:userID", circlesH.deleteStaffCircleMember)
	staff.GET("/circles/:circleID/email", circlesH.getStaffCircleMailForm)
	staff.POST("/circles/:circleID/email", circlesH.sendStaffCircleMail)
	staff.GET("/activity-logs", adminH.listStaffActivityLogs)
	staff.GET("/portal-settings", adminH.getStaffPortalSettings)
	staff.PUT("/portal-settings", adminH.updateStaffPortalSettings)
	staff.GET("/exports/summary.csv", adminH.downloadStaffSummaryCSV)
	staff.GET("/exports/bundle.zip", adminH.downloadStaffBundleZIP)
	staff.GET("/mails", adminH.listStaffMails)
	staff.POST("/mails", adminH.enqueueStaffMail)
	staff.DELETE("/mails", adminH.deleteStaffMails)
	staff.GET("/users", usersH.listStaffUsers)
	staff.GET("/users/export", usersH.downloadStaffUsersCSV)
	staff.GET("/users/:userID", usersH.getStaffUser)
	staff.PUT("/users/:userID", usersH.updateStaffUser)
	staff.PATCH("/users/:userID/verify", usersH.verifyStaffUser)
	staff.DELETE("/users/:userID", usersH.deleteStaffUser)
	staff.PUT("/users/:userID/roles", usersH.updateStaffUserRoles)
	staff.GET("/permissions", permissionsH.listStaffPermissions)
	staff.GET("/permissions/:userID", permissionsH.getStaffPermission)
	staff.PUT("/permissions/:userID", permissionsH.updateStaffPermissions)
}
