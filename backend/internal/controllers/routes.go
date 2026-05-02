package controllers

import "github.com/labstack/echo/v4"

// PublicRoutes holds handler function references for public endpoints.
type PublicRoutes struct {
	GetPublicConfig          echo.HandlerFunc
	GetPublicHome            echo.HandlerFunc
	ListPublicPages          echo.HandlerFunc
	GetPublicPage            echo.HandlerFunc
	ListPublicDocuments      echo.HandlerFunc
	GetPublicDocument        echo.HandlerFunc
	SessionBootstrap         echo.HandlerFunc
	UpdateProfile            echo.HandlerFunc
	UpdatePassword           echo.HandlerFunc
	DeleteAccount            echo.HandlerFunc
	Register                 echo.HandlerFunc
	StartRegistration        echo.HandlerFunc
	VerifyRegistration       echo.HandlerFunc
	CompleteRegistration     echo.HandlerFunc
	StartPasswordReset       echo.HandlerFunc
	VerifyPasswordReset      echo.HandlerFunc
	CompletePasswordReset    echo.HandlerFunc
	Login                    echo.HandlerFunc
	Logout                   echo.HandlerFunc
	GetAuthVerification      echo.HandlerFunc
	RequestAuthVerification  echo.HandlerFunc
	VerifyAuthVerification   echo.HandlerFunc
	ListContactCategories    echo.HandlerFunc
	ListContactHistory       echo.HandlerFunc
	SubmitContact            echo.HandlerFunc
	StaffStatus              echo.HandlerFunc
	RequestStaffVerification echo.HandlerFunc
	ConfirmStaffVerification echo.HandlerFunc
}

// StaffRoutes holds handler function references for staff endpoints.
type StaffRoutes struct {
	// Pages
	ListStaffPages        echo.HandlerFunc
	CreateStaffPage       echo.HandlerFunc
	DownloadStaffPagesCSV echo.HandlerFunc
	GetStaffPage          echo.HandlerFunc
	UpdateStaffPage       echo.HandlerFunc
	PatchStaffPagePin     echo.HandlerFunc
	DeleteStaffPage       echo.HandlerFunc
	// Documents
	ListStaffDocuments        echo.HandlerFunc
	CreateStaffDocument       echo.HandlerFunc
	DownloadStaffDocumentsCSV echo.HandlerFunc
	GetStaffDocument          echo.HandlerFunc
	DownloadStaffDocumentFile echo.HandlerFunc
	UpdateStaffDocument       echo.HandlerFunc
	DeleteStaffDocument       echo.HandlerFunc
	// Tags
	ListStaffTags        echo.HandlerFunc
	DownloadStaffTagsCSV echo.HandlerFunc
	CreateStaffTag       echo.HandlerFunc
	UpdateStaffTag       echo.HandlerFunc
	DeleteStaffTag       echo.HandlerFunc
	// Places
	ListStaffPlaces        echo.HandlerFunc
	DownloadStaffPlacesCSV echo.HandlerFunc
	CreateStaffPlace       echo.HandlerFunc
	UpdateStaffPlace       echo.HandlerFunc
	DeleteStaffPlace       echo.HandlerFunc
	// Contact Categories
	ListStaffContactCategories echo.HandlerFunc
	CreateStaffContactCategory echo.HandlerFunc
	UpdateStaffContactCategory echo.HandlerFunc
	DeleteStaffContactCategory echo.HandlerFunc
	// Forms
	ListStaffForms                    echo.HandlerFunc
	CreateStaffForm                   echo.HandlerFunc
	DownloadStaffFormsCSV             echo.HandlerFunc
	GetStaffForm                      echo.HandlerFunc
	PreviewStaffForm                  echo.HandlerFunc
	UpdateStaffForm                   echo.HandlerFunc
	CopyStaffForm                     echo.HandlerFunc
	DeleteStaffForm                   echo.HandlerFunc
	ListStaffFormAnswers              echo.HandlerFunc
	CreateStaffFormAnswer             echo.HandlerFunc
	DownloadStaffFormAnswersCSV       echo.HandlerFunc
	ListStaffFormNotAnsweredCircles   echo.HandlerFunc
	DownloadStaffFormAnswerUploadsZIP echo.HandlerFunc
	GetStaffFormAnswer                echo.HandlerFunc
	UpdateStaffFormAnswer             echo.HandlerFunc
	DeleteStaffFormAnswer             echo.HandlerFunc
	UploadStaffFormAnswerFile         echo.HandlerFunc
	DownloadStaffFormAnswerUpload     echo.HandlerFunc
	CreateStaffFormQuestion           echo.HandlerFunc
	UpdateStaffFormQuestion           echo.HandlerFunc
	DeleteStaffFormQuestion           echo.HandlerFunc
	ReorderStaffFormQuestions         echo.HandlerFunc
	DownloadStaffFormUpload           echo.HandlerFunc
	// Participation Types
	ListStaffParticipationTypes              echo.HandlerFunc
	CreateStaffParticipationType             echo.HandlerFunc
	GetStaffParticipationType                echo.HandlerFunc
	ListStaffParticipationTypeCircles        echo.HandlerFunc
	DownloadStaffParticipationTypeCirclesCSV echo.HandlerFunc
	UpdateStaffParticipationType             echo.HandlerFunc
	DeleteStaffParticipationType             echo.HandlerFunc
	// Circles
	ListStaffCircles        echo.HandlerFunc
	ListManagedStaffCircles echo.HandlerFunc
	ListAllStaffCircles     echo.HandlerFunc
	DownloadStaffCirclesCSV echo.HandlerFunc
	CreateStaffCircle       echo.HandlerFunc
	GetStaffCircle          echo.HandlerFunc
	UpdateStaffCircle       echo.HandlerFunc
	DeleteStaffCircle       echo.HandlerFunc
	ListStaffCircleMembers  echo.HandlerFunc
	AddStaffCircleMember    echo.HandlerFunc
	DeleteStaffCircleMember echo.HandlerFunc
	GetStaffCircleMailForm  echo.HandlerFunc
	SendStaffCircleMail     echo.HandlerFunc
	// Admin
	ListStaffMails            echo.HandlerFunc
	EnqueueStaffMail          echo.HandlerFunc
	DeleteStaffMails          echo.HandlerFunc
	ListStaffActivityLogs     echo.HandlerFunc
	GetStaffPortalSettings    echo.HandlerFunc
	UpdateStaffPortalSettings echo.HandlerFunc
	DownloadStaffSummaryCSV   echo.HandlerFunc
	DownloadStaffBundleZIP    echo.HandlerFunc
	// Users
	ListStaffUsers        echo.HandlerFunc
	DownloadStaffUsersCSV echo.HandlerFunc
	GetStaffUser          echo.HandlerFunc
	UpdateStaffUser       echo.HandlerFunc
	VerifyStaffUser       echo.HandlerFunc
	DeleteStaffUser       echo.HandlerFunc
	UpdateStaffUserRoles  echo.HandlerFunc
	// Permissions
	ListStaffPermissions   echo.HandlerFunc
	GetStaffPermission     echo.HandlerFunc
	UpdateStaffPermissions echo.HandlerFunc
}

// WorkspaceRoutes holds handler function references for workspace endpoints.
type WorkspaceRoutes struct {
	ListCircles                          echo.HandlerFunc
	ListParticipationTypes               echo.HandlerFunc
	GetParticipationTypeRegistrationForm echo.HandlerFunc
	CreateCircle                         echo.HandlerFunc
	SetCurrentCircle                     echo.HandlerFunc
	GetCurrentCircleDetail               echo.HandlerFunc
	UpdateCurrentCircle                  echo.HandlerFunc
	DeleteCurrentCircle                  echo.HandlerFunc
	SubmitCurrentCircle                  echo.HandlerFunc
	ListCurrentCircleMembers             echo.HandlerFunc
	AddCurrentCircleMember               echo.HandlerFunc
	RemoveCurrentCircleMember            echo.HandlerFunc
	RegenerateInvitationToken            echo.HandlerFunc
	JoinCircleByToken                    echo.HandlerFunc
	ListDocuments                        echo.HandlerFunc
	GetDocument                          echo.HandlerFunc
	ListForms                            echo.HandlerFunc
	GetForm                              echo.HandlerFunc
	ListFormAnswers                      echo.HandlerFunc
	CreateFormAnswer                     echo.HandlerFunc
	GetFormAnswerByID                    echo.HandlerFunc
	UpdateFormAnswer                     echo.HandlerFunc
	UploadFormAnswerFileByID             echo.HandlerFunc
	DownloadFormAnswerFileByID           echo.HandlerFunc
	GetFormAnswer                        echo.HandlerFunc
	UpsertFormAnswer                     echo.HandlerFunc
	UploadFormAnswerFile                 echo.HandlerFunc
	DownloadFormAnswerFile               echo.HandlerFunc
	ListPages                            echo.HandlerFunc
	GetPage                              echo.HandlerFunc
}

// RegisterPublicRoutes registers public API routes on the given group.
func RegisterPublicRoutes(v1 *echo.Group, r PublicRoutes) {
	v1.GET("/public/config", r.GetPublicConfig)
	v1.GET("/public/home", r.GetPublicHome)
	v1.GET("/public/pages", r.ListPublicPages)
	v1.GET("/public/pages/:pageID", r.GetPublicPage)
	v1.GET("/public/documents", r.ListPublicDocuments)
	v1.GET("/public/documents/:documentID", r.GetPublicDocument)
	v1.GET("/session/bootstrap", r.SessionBootstrap)
	v1.PUT("/session/profile", r.UpdateProfile)
	v1.PUT("/session/password", r.UpdatePassword)
	v1.DELETE("/session/account", r.DeleteAccount)
	v1.POST("/auth/register", r.Register)
	v1.POST("/auth/register/start", r.StartRegistration)
	v1.POST("/auth/register/verify", r.VerifyRegistration)
	v1.POST("/auth/register/complete", r.CompleteRegistration)
	v1.POST("/auth/password/reset/start", r.StartPasswordReset)
	v1.POST("/auth/password/reset/verify", r.VerifyPasswordReset)
	v1.POST("/auth/password/reset/complete", r.CompletePasswordReset)
	v1.POST("/auth/login", r.Login)
	v1.POST("/auth/logout", r.Logout)
	v1.GET("/auth/verification", r.GetAuthVerification)
	v1.POST("/auth/verification/request", r.RequestAuthVerification)
	v1.POST("/auth/verification/verify", r.VerifyAuthVerification)
	v1.GET("/contact-categories", r.ListContactCategories)
	v1.GET("/contact", r.ListContactHistory)
	v1.POST("/contact", r.SubmitContact)
	v1.GET("/staff/status", r.StaffStatus)
	v1.POST("/staff/verify/request", r.RequestStaffVerification)
	v1.POST("/staff/verify/confirm", r.ConfirmStaffVerification)
}

// RegisterStaffRoutes registers staff API routes on the given group with capability enforcement.
func RegisterStaffRoutes(v1 *echo.Group, r StaffRoutes, middlewares ...echo.MiddlewareFunc) {
	staff := v1.Group("/staff", middlewares...)
	staff.GET("/pages", r.ListStaffPages, RequireCapability(canReadPages))
	staff.POST("/pages", r.CreateStaffPage, RequireCapability(canEditPages))
	staff.GET("/pages/export.csv", r.DownloadStaffPagesCSV, RequireCapability(canExportPages))
	staff.GET("/pages/:pageID", r.GetStaffPage, RequireCapability(canReadPages))
	staff.PUT("/pages/:pageID", r.UpdateStaffPage, RequireCapability(canEditPages))
	staff.PATCH("/pages/:pageID/pin", r.PatchStaffPagePin, RequireCapability(canEditPages))
	staff.DELETE("/pages/:pageID", r.DeleteStaffPage, RequireCapability(canDeletePages))
	staff.GET("/documents", r.ListStaffDocuments, RequireCapability(canReadDocuments))
	staff.POST("/documents", r.CreateStaffDocument, RequireCapability(canEditDocuments))
	staff.GET("/documents/export", r.DownloadStaffDocumentsCSV, RequireCapability(canExportDocuments))
	staff.GET("/documents/:documentID/edit", r.GetStaffDocument, RequireCapability(canReadDocuments))
	staff.GET("/documents/:documentID", r.DownloadStaffDocumentFile, RequireCapability(canReadDocuments))
	staff.PUT("/documents/:documentID", r.UpdateStaffDocument, RequireCapability(canEditDocuments))
	staff.DELETE("/documents/:documentID", r.DeleteStaffDocument, RequireCapability(canDeleteDocuments))
	staff.GET("/tags", r.ListStaffTags, RequireCapability(canReadTags))
	staff.GET("/tags/export", r.DownloadStaffTagsCSV, RequireCapability(canReadTags))
	staff.POST("/tags", r.CreateStaffTag, RequireCapability(canEditTags))
	staff.PUT("/tags/:tagID", r.UpdateStaffTag, RequireCapability(canEditTags))
	staff.DELETE("/tags/:tagID", r.DeleteStaffTag, RequireCapability(canDeleteTags))
	staff.GET("/places", r.ListStaffPlaces, RequireCapability(canReadPlaces))
	staff.GET("/places/export", r.DownloadStaffPlacesCSV, RequireCapability(canReadPlaces))
	staff.POST("/places", r.CreateStaffPlace, RequireCapability(canEditPlaces))
	staff.PUT("/places/:placeID", r.UpdateStaffPlace, RequireCapability(canEditPlaces))
	staff.DELETE("/places/:placeID", r.DeleteStaffPlace, RequireCapability(canDeletePlaces))
	staff.GET("/contact-categories", r.ListStaffContactCategories, RequireCapability(canReadContactCategories))
	staff.POST("/contact-categories", r.CreateStaffContactCategory, RequireCapability(canEditContactCategories))
	staff.PUT("/contact-categories/:categoryID", r.UpdateStaffContactCategory, RequireCapability(canEditContactCategories))
	staff.DELETE("/contact-categories/:categoryID", r.DeleteStaffContactCategory, RequireCapability(canDeleteContactCategories))
	staff.GET("/forms", r.ListStaffForms, RequireCapability(canReadForms))
	staff.POST("/forms", r.CreateStaffForm, RequireCapability(canEditForms))
	staff.GET("/forms/export", r.DownloadStaffFormsCSV, RequireCapability(canExportForms))
	staff.GET("/forms/:formID", r.GetStaffForm, RequireCapability(canReadForms))
	staff.GET("/forms/:formID/edit", r.GetStaffForm, RequireCapability(canReadForms))
	staff.GET("/forms/:formID/preview", r.PreviewStaffForm, RequireCapability(canReadForms))
	staff.PUT("/forms/:formID", r.UpdateStaffForm, RequireCapability(canEditForms))
	staff.POST("/forms/:formID/copy", r.CopyStaffForm, RequireCapability(canDuplicateForms))
	staff.DELETE("/forms/:formID", r.DeleteStaffForm, RequireCapability(canDeleteForms))
	staff.GET("/forms/:formID/answers", r.ListStaffFormAnswers, RequireCapability(canReadFormAnswers))
	staff.POST("/forms/:formID/answers", r.CreateStaffFormAnswer, RequireCapability(canEditFormAnswers))
	staff.GET("/forms/:formID/answers/export", r.DownloadStaffFormAnswersCSV, RequireCapability(canExportFormAnswers))
	staff.GET("/forms/:formID/answers/not_answered", r.ListStaffFormNotAnsweredCircles, RequireCapability(canReadFormAnswers))
	staff.GET("/forms/:formID/not_answered", r.ListStaffFormNotAnsweredCircles, RequireCapability(canReadFormAnswers))
	staff.GET("/forms/:formID/answers/uploads.zip", r.DownloadStaffFormAnswerUploadsZIP, RequireCapability(canReadFormAnswers))
	staff.POST("/forms/:formID/answers/uploads/download_zip", r.DownloadStaffFormAnswerUploadsZIP, RequireCapability(canReadFormAnswers))
	staff.GET("/forms/:formID/answers/:answerID/edit", r.GetStaffFormAnswer, RequireCapability(canReadFormAnswers))
	staff.PUT("/forms/:formID/answers/:answerID", r.UpdateStaffFormAnswer, RequireCapability(canEditFormAnswers))
	staff.DELETE("/forms/:formID/answers/:answerID", r.DeleteStaffFormAnswer, RequireCapability(canDeleteFormAnswers))
	staff.POST("/forms/:formID/answers/:answerID/uploads", r.UploadStaffFormAnswerFile, RequireCapability(canEditFormAnswers))
	staff.GET("/forms/:formID/answers/:answerID/uploads/:questionID/file", r.DownloadStaffFormAnswerUpload, RequireCapability(canReadFormAnswers))
	staff.POST("/forms/:formID/questions", r.CreateStaffFormQuestion, RequireCapability(canEditForms))
	staff.PUT("/forms/:formID/questions/:questionID", r.UpdateStaffFormQuestion, RequireCapability(canEditForms))
	staff.DELETE("/forms/:formID/questions/:questionID", r.DeleteStaffFormQuestion, RequireCapability(canEditForms))
	staff.PUT("/forms/:formID/questions/order", r.ReorderStaffFormQuestions, RequireCapability(canEditForms))
	staff.GET("/forms/:formID/uploads/:uploadID/file", r.DownloadStaffFormUpload, RequireCapability(canReadForms))
	staff.GET("/participation-types", r.ListStaffParticipationTypes, RequireCapability(canReadParticipationTypes))
	staff.POST("/participation-types", r.CreateStaffParticipationType, RequireCapability(canManageParticipationTypes))
	staff.GET("/participation-types/:typeID", r.GetStaffParticipationType, RequireCapability(canReadParticipationTypes))
	staff.GET("/participation-types/:typeID/circles", r.ListStaffParticipationTypeCircles, RequireCapability(canReadCircles))
	staff.GET("/participation-types/:typeID/circles/export", r.DownloadStaffParticipationTypeCirclesCSV, RequireCapability(canExportCircles))
	staff.PUT("/participation-types/:typeID", r.UpdateStaffParticipationType, RequireCapability(canManageParticipationTypes))
	staff.DELETE("/participation-types/:typeID", r.DeleteStaffParticipationType, RequireCapability(canManageParticipationTypes))
	staff.GET("/circles", r.ListStaffCircles, RequireCapability(canReadCircles))
	staff.GET("/circles/managed", r.ListManagedStaffCircles, RequireCapability(canListManagedCircles))
	staff.GET("/circles/all", r.ListAllStaffCircles, RequireCapability(canReadCircles))
	staff.GET("/circles/export", r.DownloadStaffCirclesCSV, RequireCapability(canExportCircles))
	staff.POST("/circles", r.CreateStaffCircle, RequireCapability(canEditCircles))
	staff.GET("/circles/:circleID", r.GetStaffCircle, RequireCapability(canReadCircles))
	staff.PUT("/circles/:circleID", r.UpdateStaffCircle, RequireCapability(canEditCircles))
	staff.DELETE("/circles/:circleID", r.DeleteStaffCircle, RequireCapability(canDeleteCircles))
	staff.GET("/circles/:circleID/members", r.ListStaffCircleMembers, RequireCapability(canReadCircles))
	staff.POST("/circles/:circleID/members", r.AddStaffCircleMember, RequireCapability(canEditCircles))
	staff.DELETE("/circles/:circleID/members/:userID", r.DeleteStaffCircleMember, RequireCapability(canEditCircles))
	staff.GET("/circles/:circleID/email", r.GetStaffCircleMailForm, RequireCapability(canAccessCircleMail))
	staff.POST("/circles/:circleID/email", r.SendStaffCircleMail, RequireCapability(canSendCircleEmails))
	staff.GET("/mails", r.ListStaffMails, RequireCapability(canUseMailQueue))
	staff.POST("/mails", r.EnqueueStaffMail, RequireCapability(canUseMailQueue))
	staff.DELETE("/mails", r.DeleteStaffMails, RequireCapability(canUseMailQueue))
	staff.GET("/activity-logs", r.ListStaffActivityLogs, RequireCapability(canViewActivityLogs))
	staff.GET("/portal-settings", r.GetStaffPortalSettings, RequireCapability(canManagePortalSettings))
	staff.PUT("/portal-settings", r.UpdateStaffPortalSettings, RequireCapability(canManagePortalSettings))
	staff.GET("/exports/summary.csv", r.DownloadStaffSummaryCSV, RequireCapability(canUseStaffExports))
	staff.GET("/exports/bundle.zip", r.DownloadStaffBundleZIP, RequireCapability(canUseStaffExports))
	staff.GET("/users", r.ListStaffUsers, RequireCapability(canReadUsers))
	staff.GET("/users/export", r.DownloadStaffUsersCSV, RequireCapability(canExportUsers))
	staff.GET("/users/:userID", r.GetStaffUser, RequireCapability(canReadUsers))
	staff.PUT("/users/:userID", r.UpdateStaffUser, RequireCapability(canEditUsers))
	staff.PATCH("/users/:userID/verify", r.VerifyStaffUser, RequireCapability(canEditUsers))
	staff.DELETE("/users/:userID", r.DeleteStaffUser, RequireCapability(canEditUsers))
	staff.PUT("/users/:userID/roles", r.UpdateStaffUserRoles, RequireCapability(canEditUsers))
	staff.GET("/permissions", r.ListStaffPermissions, RequireCapability(canReadPermissions))
	staff.GET("/permissions/:userID", r.GetStaffPermission, RequireCapability(canReadPermissions))
	staff.PUT("/permissions/:userID", r.UpdateStaffPermissions, RequireCapability(canEditPermissions))
}

// RegisterWorkspaceRoutes registers workspace API routes on the given group.
func RegisterWorkspaceRoutes(v1 *echo.Group, r WorkspaceRoutes, middlewares ...echo.MiddlewareFunc) {
	workspace := v1.Group("", middlewares...)
	workspace.GET("/circles", r.ListCircles)
	workspace.GET("/participation-types", r.ListParticipationTypes)
	workspace.GET("/participation-types/:typeID/registration-form", r.GetParticipationTypeRegistrationForm)
	workspace.POST("/circles", r.CreateCircle)
	workspace.PUT("/circles/current", r.SetCurrentCircle)
	workspace.GET("/circles/current/detail", r.GetCurrentCircleDetail)
	workspace.PUT("/circles/current/detail", r.UpdateCurrentCircle)
	workspace.DELETE("/circles/current", r.DeleteCurrentCircle)
	workspace.POST("/circles/current/submit", r.SubmitCurrentCircle)
	workspace.GET("/circles/current/members", r.ListCurrentCircleMembers)
	workspace.POST("/circles/current/members", r.AddCurrentCircleMember)
	workspace.DELETE("/circles/current/members/:userID", r.RemoveCurrentCircleMember)
	workspace.POST("/circles/current/invitation-token/regenerate", r.RegenerateInvitationToken)
	workspace.POST("/circles/join/:token", r.JoinCircleByToken)
	workspace.GET("/documents", r.ListDocuments)
	workspace.GET("/documents/:documentID", r.GetDocument)
	workspace.GET("/forms", r.ListForms)
	workspace.GET("/forms/:formID", r.GetForm)
	workspace.GET("/forms/:formID/answers", r.ListFormAnswers)
	workspace.POST("/forms/:formID/answers", r.CreateFormAnswer)
	workspace.GET("/forms/:formID/answers/:answerID", r.GetFormAnswerByID)
	workspace.PUT("/forms/:formID/answers/:answerID", r.UpdateFormAnswer)
	workspace.POST("/forms/:formID/answers/:answerID/uploads", r.UploadFormAnswerFileByID)
	workspace.GET("/forms/:formID/answers/:answerID/uploads/:questionID/file", r.DownloadFormAnswerFileByID)
	workspace.GET("/forms/:formID/answer", r.GetFormAnswer)
	workspace.PUT("/forms/:formID/answer", r.UpsertFormAnswer)
	workspace.POST("/forms/:formID/answer/uploads", r.UploadFormAnswerFile)
	workspace.GET("/forms/:formID/answer/uploads/:uploadID/file", r.DownloadFormAnswerFile)
	workspace.GET("/pages", r.ListPages)
	workspace.GET("/pages/:pageID", r.GetPage)
}
