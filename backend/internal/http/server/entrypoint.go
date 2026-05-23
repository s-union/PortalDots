package server

import (
	"github.com/labstack/echo/v5"
	legacy "github.com/s-union/PortalDots/backend/internal/controllers"
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

type SharedDependencies struct {
	Activities  activitylog.Repository
	MailHistory mailhistory.Repository
	Sessions    session.Store
	Users       useradmin.Repository
}

type PublicDependencies struct {
	Authenticator        auth.Authenticator
	Circles              circle.Catalog
	ContactCategories    contactcategory.Repository
	Documents            document.Repository
	Forms                form.Repository
	Pages                page.Repository
	PendingRegistrations pendingregistration.Repository
	ParticipationTypes   participationtype.Repository
}

type WorkspaceDependencies struct {
	Answers            answer.Repository
	Circles            circle.Catalog
	ContactCategories  contactcategory.Repository
	Documents          document.Repository
	Forms              form.Repository
	FormQuestions      formquestion.Repository
	Pages              page.Repository
	ParticipationTypes participationtype.Repository
	Users              useradmin.Repository
}

type StaffDependencies struct {
	Answers            answer.Repository
	Booths             booth.Repository
	Circles            circle.Catalog
	ContactCategories  contactcategory.Repository
	Documents          document.Repository
	Forms              form.Repository
	FormQuestions      formquestion.Repository
	Pages              page.Repository
	ParticipationTypes participationtype.Repository
	Places             place.Repository
	Tags               tag.Repository
	Users              useradmin.Repository
}

type Dependencies struct {
	Shared    SharedDependencies
	Public    PublicDependencies
	Workspace WorkspaceDependencies
	Staff     StaffDependencies
}

func New(cfg config.Config) *echo.Echo {
	return legacy.NewServer(cfg)
}

func NewWithDependencies(cfg config.Config, deps Dependencies) *echo.Echo {
	return legacy.NewServerWithDependencies(
		cfg,
		deps.Shared.Activities,
		deps.Workspace.Answers,
		deps.Public.Authenticator,
		deps.Staff.Booths,
		deps.Workspace.Circles,
		deps.Public.ContactCategories,
		deps.Public.Documents,
		deps.Public.Forms,
		deps.Workspace.FormQuestions,
		deps.Shared.MailHistory,
		deps.Public.Pages,
		deps.Public.PendingRegistrations,
		deps.Public.ParticipationTypes,
		deps.Staff.Places,
		deps.Shared.Sessions,
		deps.Staff.Tags,
		deps.Shared.Users,
	)
}
