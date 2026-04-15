package controllers

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
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
	"github.com/s-union/PortalDots/backend/internal/domain/pendingregistration"
	"github.com/s-union/PortalDots/backend/internal/domain/place"
	"github.com/s-union/PortalDots/backend/internal/domain/portalsetting"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/domain/tag"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/middlewares"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

// sharedDeps holds session-related dependencies shared across all domain handler structs.
type sharedDeps struct {
	sessionCookieName     string
	sessionCookieTTL      time.Duration
	sessionCookieSecure   bool
	staffVerifyCode       string
	allowInsecureDefaults bool
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

// authHandlers handles authentication, session, and contact endpoints.
type authHandlers struct {
	sharedDeps
	activities                activitylog.Repository
	authenticator             auth.Authenticator
	passwordChanger           auth.PasswordChanger
	passwordResetter          auth.PasswordResetter
	registrationAuth          auth.RegistrationAuthenticator
	circles                   circle.Catalog
	contactCategories         contactcategory.Repository
	mails                     mailqueue.Repository
	pendingRegistrations      pendingregistration.Repository
	passwordResetTokens       *passwordResetTokenStore
	authVerificationTokens    *authVerificationTokenStore
	portalUnivemailDomainPart string
	registrationVerifyTTL     time.Duration
	appURL                    string
	appName                   string
	users                     useradmin.Repository
}

// staffVerifyHandlers handles staff verification endpoints.
type staffVerifyHandlers struct {
	sharedDeps
	mails   mailqueue.Repository
	users   useradmin.Repository
	appName string
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
	activities         activitylog.Repository
	circles            circle.Catalog
	documents          document.Repository
	mails              mailqueue.Repository
	pages              page.Repository
	participationTypes participationtype.Repository
	tags               tag.Repository
	users              useradmin.Repository
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
	mails             mailqueue.Repository
	places            place.Repository
	tags              tag.Repository
	appName           string
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
	mails              mailqueue.Repository
	pages              page.Repository
	participationTypes participationtype.Repository
	users              useradmin.Repository
}

func NewServer(cfg config.Config) *echo.Echo {
	return NewServerWithDependencies(
		cfg,
		activitylog.NewMemoryRepository(),
		answer.NewMemoryRepository(),
		auth.NewStaticAuthenticator(cfg.AuthUser, cfg.Users),
		booth.NewMemoryRepository(cfg.Booths),
		circle.NewStaticCatalog(cfg.Circles, cfg.AuthUser, cfg.Users),
		contactcategory.NewMemoryRepository(cfg.ContactCategories),
		document.NewStaticRepository(cfg.Documents),
		form.NewStaticRepository(cfg.Forms),
		formquestion.NewMemoryRepository(),
		mailqueue.NewMemoryRepository(),
		page.NewStaticRepository(cfg.Pages),
		pendingregistration.NewMemoryRepository(),
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
	pendingRegistrations pendingregistration.Repository,
	participationTypes participationtype.Repository,
	portal portalsetting.Repository,
	places place.Repository,
	sessionStore session.Store,
	tags tag.Repository,
	users useradmin.Repository,
) *echo.Echo {
	e := echo.New()
	e.HideBanner = true
	middlewares.Setup(e, middlewares.SetupConfig{
		AllowedOrigins: []string{cfg.AppURL},
	})

	shared := sharedDeps{
		sessionCookieName:     cfg.SessionCookieName,
		sessionCookieTTL:      cfg.SessionTTL,
		sessionCookieSecure:   cfg.SessionCookieSecure,
		staffVerifyCode:       cfg.StaffVerifyCode,
		allowInsecureDefaults: cfg.AllowInsecureDefaults,
		sessions:              sessionStore,
	}

	var passwordChanger auth.PasswordChanger
	if pc, ok := authenticator.(auth.PasswordChanger); ok {
		passwordChanger = pc
	}
	var registrationAuth auth.RegistrationAuthenticator
	if ra, ok := authenticator.(auth.RegistrationAuthenticator); ok {
		registrationAuth = ra
	}
	var passwordResetter auth.PasswordResetter
	if pr, ok := authenticator.(auth.PasswordResetter); ok {
		passwordResetter = pr
	}

	authH := &authHandlers{
		sharedDeps:                shared,
		activities:                activities,
		authenticator:             authenticator,
		passwordChanger:           passwordChanger,
		passwordResetter:          passwordResetter,
		registrationAuth:          registrationAuth,
		circles:                   circles,
		contactCategories:         contactCategories,
		mails:                     mails,
		pendingRegistrations:      pendingRegistrations,
		passwordResetTokens:       newPasswordResetTokenStore(),
		authVerificationTokens:    newAuthVerificationTokenStore(),
		portalUnivemailDomainPart: cfg.PortalUnivemailDomainPart,
		registrationVerifyTTL:     cfg.RegistrationVerifyTTL,
		appURL:                    cfg.AppURL,
		appName:                   cfg.AppName,
		users:                     users,
	}

	publicHomeH := &publicHomeHandlers{
		sharedDeps:            shared,
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
		sharedDeps: shared,
		mails:      mails,
		users:      users,
		appName:    cfg.AppName,
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
		sharedDeps:         shared,
		activities:         activities,
		circles:            circles,
		documents:          documents,
		mails:              mails,
		pages:              pages,
		participationTypes: participationTypes,
		tags:               tags,
		users:              users,
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
		mails:             mails,
		places:            places,
		tags:              tags,
		appName:           cfg.AppName,
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
		mails:              mails,
		pages:              pages,
		participationTypes: participationTypes,
		users:              users,
	}

	e.GET("/healthz", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	v1 := e.Group("/v1")
	sessionMiddlewareConfig := middlewares.SessionMiddlewareConfig{
		SessionCookieName:     cfg.SessionCookieName,
		AllowInsecureDefaults: cfg.AllowInsecureDefaults,
		Sessions:              sessionStore,
	}
	v1.Use(middlewares.VerifyCSRF(sessionMiddlewareConfig))

	RegisterPublicRoutes(v1, PublicRoutes{
		GetPublicConfig:          publicHomeH.getPublicConfig,
		GetPublicHome:            publicHomeH.getPublicHome,
		ListPublicPages:          publicHomeH.listPublicPages,
		GetPublicPage:            publicHomeH.getPublicPage,
		ListPublicDocuments:      publicHomeH.listPublicDocuments,
		GetPublicDocument:        publicHomeH.getPublicDocument,
		SessionBootstrap:         authH.sessionBootstrap,
		UpdateProfile:            authH.updateProfile,
		UpdatePassword:           authH.updatePassword,
		DeleteAccount:            authH.deleteAccount,
		Register:                 authH.register,
		StartRegistration:        authH.startRegistration,
		VerifyRegistration:       authH.verifyRegistration,
		CompleteRegistration:     authH.completeRegistration,
		StartPasswordReset:       authH.startPasswordReset,
		VerifyPasswordReset:      authH.verifyPasswordReset,
		CompletePasswordReset:    authH.completePasswordReset,
		Login:                    authH.login,
		Logout:                   authH.logout,
		GetAuthVerification:      authH.getAuthVerification,
		RequestAuthVerification:  authH.requestAuthVerification,
		VerifyAuthVerification:   authH.verifyAuthVerification,
		ListContactCategories:    authH.listContactCategories,
		ListContactHistory:       authH.listContactHistory,
		SubmitContact:            authH.submitContact,
		StaffStatus:              staffVerifyH.staffStatus,
		RequestStaffVerification: staffVerifyH.requestStaffVerification,
		ConfirmStaffVerification: staffVerifyH.confirmStaffVerification,
	})

	RegisterStaffRoutes(v1, StaffRoutes{
		// Pages
		ListStaffPages:        staffPageH.listStaffPages,
		CreateStaffPage:       staffPageH.createStaffPage,
		DownloadStaffPagesCSV: staffPageH.downloadStaffPagesCSV,
		GetStaffPage:          staffPageH.getStaffPage,
		UpdateStaffPage:       staffPageH.updateStaffPage,
		PatchStaffPagePin:     staffPageH.patchStaffPagePin,
		DeleteStaffPage:       staffPageH.deleteStaffPage,
		// Documents
		ListStaffDocuments:        staffDocumentH.listStaffDocuments,
		CreateStaffDocument:       staffDocumentH.createStaffDocument,
		DownloadStaffDocumentsCSV: staffDocumentH.downloadStaffDocumentsCSV,
		GetStaffDocument:          staffDocumentH.getStaffDocument,
		DownloadStaffDocumentFile: staffDocumentH.downloadStaffDocumentFile,
		UpdateStaffDocument:       staffDocumentH.updateStaffDocument,
		DeleteStaffDocument:       staffDocumentH.deleteStaffDocument,
		// Tags
		ListStaffTags:        staffMastersH.listStaffTags,
		DownloadStaffTagsCSV: staffMastersH.downloadStaffTagsCSV,
		CreateStaffTag:       staffMastersH.createStaffTag,
		UpdateStaffTag:       staffMastersH.updateStaffTag,
		DeleteStaffTag:       staffMastersH.deleteStaffTag,
		// Places
		ListStaffPlaces:        staffMastersH.listStaffPlaces,
		DownloadStaffPlacesCSV: staffMastersH.downloadStaffPlacesCSV,
		CreateStaffPlace:       staffMastersH.createStaffPlace,
		UpdateStaffPlace:       staffMastersH.updateStaffPlace,
		DeleteStaffPlace:       staffMastersH.deleteStaffPlace,
		// Contact Categories
		ListStaffContactCategories: staffMastersH.listStaffContactCategories,
		CreateStaffContactCategory: staffMastersH.createStaffContactCategory,
		UpdateStaffContactCategory: staffMastersH.updateStaffContactCategory,
		DeleteStaffContactCategory: staffMastersH.deleteStaffContactCategory,
		// Forms
		ListStaffForms:                    staffFormH.listStaffForms,
		CreateStaffForm:                   staffFormH.createStaffForm,
		DownloadStaffFormsCSV:             staffFormH.downloadStaffFormsCSV,
		GetStaffForm:                      staffFormH.getStaffForm,
		PreviewStaffForm:                  staffFormH.previewStaffForm,
		UpdateStaffForm:                   staffFormH.updateStaffForm,
		CopyStaffForm:                     staffFormH.copyStaffForm,
		DeleteStaffForm:                   staffFormH.deleteStaffForm,
		ListStaffFormAnswers:              staffFormH.listStaffFormAnswers,
		CreateStaffFormAnswer:             staffFormH.createStaffFormAnswer,
		DownloadStaffFormAnswersCSV:       staffFormH.downloadStaffFormAnswersCSV,
		ListStaffFormNotAnsweredCircles:   staffFormH.listStaffFormNotAnsweredCircles,
		DownloadStaffFormAnswerUploadsZIP: staffFormH.downloadStaffFormAnswerUploadsZIP,
		GetStaffFormAnswer:                staffFormH.getStaffFormAnswer,
		UpdateStaffFormAnswer:             staffFormH.updateStaffFormAnswer,
		DeleteStaffFormAnswer:             staffFormH.deleteStaffFormAnswer,
		UploadStaffFormAnswerFile:         staffFormH.uploadStaffFormAnswerFile,
		DownloadStaffFormAnswerUpload:     staffFormH.downloadStaffFormAnswerUpload,
		CreateStaffFormQuestion:           staffFormH.createStaffFormQuestion,
		UpdateStaffFormQuestion:           staffFormH.updateStaffFormQuestion,
		DeleteStaffFormQuestion:           staffFormH.deleteStaffFormQuestion,
		ReorderStaffFormQuestions:         staffFormH.reorderStaffFormQuestions,
		DownloadStaffFormUpload:           staffFormH.downloadStaffFormUpload,
		// Participation Types
		ListStaffParticipationTypes:              staffCircleH.listStaffParticipationTypes,
		CreateStaffParticipationType:             staffCircleH.createStaffParticipationType,
		GetStaffParticipationType:                staffCircleH.getStaffParticipationType,
		ListStaffParticipationTypeCircles:        staffCircleH.listStaffParticipationTypeCircles,
		DownloadStaffParticipationTypeCirclesCSV: staffCircleH.downloadStaffParticipationTypeCirclesCSV,
		UpdateStaffParticipationType:             staffCircleH.updateStaffParticipationType,
		DeleteStaffParticipationType:             staffCircleH.deleteStaffParticipationType,
		// Circles
		ListStaffCircles:        staffCircleH.listStaffCircles,
		ListManagedStaffCircles: staffCircleH.listManagedStaffCircles,
		ListAllStaffCircles:     staffCircleH.listAllStaffCircles,
		DownloadStaffCirclesCSV: staffCircleH.downloadStaffCirclesCSV,
		CreateStaffCircle:       staffCircleH.createStaffCircle,
		GetStaffCircle:          staffCircleH.getStaffCircle,
		UpdateStaffCircle:       staffCircleH.updateStaffCircle,
		DeleteStaffCircle:       staffCircleH.deleteStaffCircle,
		ListStaffCircleMembers:  staffCircleH.listStaffCircleMembers,
		AddStaffCircleMember:    staffCircleH.addStaffCircleMember,
		DeleteStaffCircleMember: staffCircleH.deleteStaffCircleMember,
		GetStaffCircleMailForm:  staffCircleH.getStaffCircleMailForm,
		SendStaffCircleMail:     staffCircleH.sendStaffCircleMail,
		// Admin
		ListStaffMails:            staffAdminH.listStaffMails,
		EnqueueStaffMail:          staffAdminH.enqueueStaffMail,
		DeleteStaffMails:          staffAdminH.deleteStaffMails,
		ListStaffActivityLogs:     staffAdminH.listStaffActivityLogs,
		GetStaffPortalSettings:    staffAdminH.getStaffPortalSettings,
		UpdateStaffPortalSettings: staffAdminH.updateStaffPortalSettings,
		DownloadStaffSummaryCSV:   staffAdminH.downloadStaffSummaryCSV,
		DownloadStaffBundleZIP:    staffAdminH.downloadStaffBundleZIP,
		// Users
		ListStaffUsers:        staffUsersH.listStaffUsers,
		DownloadStaffUsersCSV: staffUsersH.downloadStaffUsersCSV,
		GetStaffUser:          staffUsersH.getStaffUser,
		UpdateStaffUser:       staffUsersH.updateStaffUser,
		VerifyStaffUser:       staffUsersH.verifyStaffUser,
		DeleteStaffUser:       staffUsersH.deleteStaffUser,
		UpdateStaffUserRoles:  staffUsersH.updateStaffUserRoles,
		// Permissions
		ListStaffPermissions:   staffPermissionH.listStaffPermissions,
		GetStaffPermission:     staffPermissionH.getStaffPermission,
		UpdateStaffPermissions: staffPermissionH.updateStaffPermissions,
	}, middlewares.RequireStaffMode(sessionMiddlewareConfig, hasStaffAccess))

	RegisterWorkspaceRoutes(v1, WorkspaceRoutes{
		ListCircles:                          workspaceH.listCircles,
		ListParticipationTypes:               workspaceH.listParticipationTypes,
		GetParticipationTypeRegistrationForm: workspaceH.getParticipationTypeRegistrationForm,
		CreateCircle:                         workspaceH.createCircle,
		SetCurrentCircle:                     workspaceH.setCurrentCircle,
		GetCurrentCircleDetail:               workspaceH.getCurrentCircleDetail,
		UpdateCurrentCircle:                  workspaceH.updateCurrentCircle,
		DeleteCurrentCircle:                  workspaceH.deleteCurrentCircle,
		SubmitCurrentCircle:                  workspaceH.submitCurrentCircle,
		ListCurrentCircleMembers:             workspaceH.listCurrentCircleMembers,
		AddCurrentCircleMember:               workspaceH.addCurrentCircleMember,
		RemoveCurrentCircleMember:            workspaceH.removeCurrentCircleMember,
		RegenerateInvitationToken:            workspaceH.regenerateInvitationToken,
		JoinCircleByToken:                    workspaceH.joinCircleByToken,
		ListDocuments:                        workspaceH.listDocuments,
		GetDocument:                          workspaceH.getDocument,
		ListForms:                            workspaceH.listForms,
		GetForm:                              workspaceH.getForm,
		ListFormAnswers:                      workspaceH.listFormAnswers,
		CreateFormAnswer:                     workspaceH.createFormAnswer,
		GetFormAnswerByID:                    workspaceH.getFormAnswerByID,
		UpdateFormAnswer:                     workspaceH.updateFormAnswer,
		UploadFormAnswerFileByID:             workspaceH.uploadFormAnswerFileByID,
		DownloadFormAnswerFileByID:           workspaceH.downloadFormAnswerFileByID,
		GetFormAnswer:                        workspaceH.getFormAnswer,
		UpsertFormAnswer:                     workspaceH.upsertFormAnswer,
		UploadFormAnswerFile:                 workspaceH.uploadFormAnswerFile,
		DownloadFormAnswerFile:               workspaceH.downloadFormAnswerFile,
		ListPages:                            workspaceH.listPages,
		GetPage:                              workspaceH.getPage,
	}, middlewares.RequireWorkspaceUser(sessionMiddlewareConfig))

	return e
}
