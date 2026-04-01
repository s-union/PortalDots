//go:build ignore

package staffhttp

import (
	"net/http"
	"slices"
	"strings"

	"github.com/labstack/echo/v4"
	domainauth "github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/domain/staffpermission"
	"github.com/s-union/PortalDots/backend/internal/http/shared"
)

type Guard struct {
	shared.SessionDeps
}

func NewGuard(deps shared.SessionDeps) Guard {
	return Guard{SessionDeps: deps}
}

func HasStaffAccess(roles []string, permissions []string) bool {
	for _, role := range roles {
		switch role {
		case "admin", "content_manager", "forms_manager", "circle_manager", "user_manager":
			return true
		}
	}

	for _, permission := range permissions {
		if strings.HasPrefix(permission, "staff.") {
			return true
		}
	}

	return false
}

type capabilityCheck struct {
	roles       []string
	permissions []string
}

var staffCapabilityChecks = map[string]capabilityCheck{
	"users.read": {
		roles:       []string{"admin", "user_manager"},
		permissions: []string{"staff.users", "staff.users.read,export", "staff.users.read,edit", "staff.users.read"},
	},
	"users.edit": {
		roles:       []string{"admin", "user_manager"},
		permissions: []string{"staff.users", "staff.users.read,edit"},
	},
	"users.export": {
		roles:       []string{"admin", "user_manager"},
		permissions: []string{"staff.users", "staff.users.read,export"},
	},
	"permissions.read": {
		roles:       []string{"admin"},
		permissions: []string{"staff.permissions", "staff.permissions.read,edit", "staff.permissions.read"},
	},
	"permissions.edit": {
		roles:       []string{"admin"},
		permissions: []string{"staff.permissions", "staff.permissions.read,edit"},
	},
	"circles.read": {
		roles:       []string{"admin", "circle_manager"},
		permissions: []string{"staff.circles", "staff.circles.read,edit,delete", "staff.circles.read,edit", "staff.circles.read,send_email", "staff.circles.read,export", "staff.circles.read"},
	},
	"circles.edit": {
		roles:       []string{"admin", "circle_manager"},
		permissions: []string{"staff.circles", "staff.circles.read,edit,delete", "staff.circles.read,edit"},
	},
	"circles.delete": {
		roles:       []string{"admin", "circle_manager"},
		permissions: []string{"staff.circles", "staff.circles.read,edit,delete"},
	},
	"circles.export": {
		roles:       []string{"admin", "circle_manager"},
		permissions: []string{"staff.circles", "staff.circles.read,export"},
	},
	"circles.sendEmails": {
		roles:       []string{"admin", "circle_manager"},
		permissions: []string{"staff.circles", "staff.circles.read,send_email"},
	},
	"circles.participationTypes": {
		roles:       []string{"admin", "circle_manager"},
		permissions: []string{"staff.circles", "staff.circles.participation_types"},
	},
	"pages.read": {
		roles:       []string{"admin", "content_manager"},
		permissions: []string{"staff.pages", "staff.pages.read,edit,delete", "staff.pages.read,edit,send_emails", "staff.pages.read,edit", "staff.pages.read,export", "staff.pages.read"},
	},
	"pages.edit": {
		roles:       []string{"admin", "content_manager"},
		permissions: []string{"staff.pages", "staff.pages.read,edit,delete", "staff.pages.read,edit,send_emails", "staff.pages.read,edit"},
	},
	"pages.delete": {
		roles:       []string{"admin", "content_manager"},
		permissions: []string{"staff.pages", "staff.pages.read,edit,delete"},
	},
	"pages.export": {
		roles:       []string{"admin", "content_manager"},
		permissions: []string{"staff.pages", "staff.pages.read,export"},
	},
	"pages.sendEmails": {
		roles:       []string{"admin", "content_manager"},
		permissions: []string{"staff.pages", "staff.pages.read,edit,send_emails"},
	},
	"documents.read": {
		roles:       []string{"admin", "content_manager"},
		permissions: []string{"staff.documents", "staff.documents.read,edit,delete", "staff.documents.read,edit", "staff.documents.read,export", "staff.documents.read"},
	},
	"documents.edit": {
		roles:       []string{"admin", "content_manager"},
		permissions: []string{"staff.documents", "staff.documents.read,edit,delete", "staff.documents.read,edit"},
	},
	"documents.delete": {
		roles:       []string{"admin", "content_manager"},
		permissions: []string{"staff.documents", "staff.documents.read,edit,delete"},
	},
	"documents.export": {
		roles:       []string{"admin", "content_manager"},
		permissions: []string{"staff.documents", "staff.documents.read,export"},
	},
	"forms.read": {
		roles:       []string{"admin", "forms_manager"},
		permissions: []string{"staff.forms", "staff.forms.read,edit,delete", "staff.forms.read,edit,duplicate", "staff.forms.read,edit", "staff.forms.read,export", "staff.forms.read"},
	},
	"forms.edit": {
		roles:       []string{"admin", "forms_manager"},
		permissions: []string{"staff.forms", "staff.forms.read,edit,delete", "staff.forms.read,edit,duplicate", "staff.forms.read,edit"},
	},
	"forms.delete": {
		roles:       []string{"admin", "forms_manager"},
		permissions: []string{"staff.forms", "staff.forms.read,edit,delete"},
	},
	"forms.export": {
		roles:       []string{"admin", "forms_manager"},
		permissions: []string{"staff.forms", "staff.forms.read,export"},
	},
	"forms.duplicate": {
		roles:       []string{"admin", "forms_manager"},
		permissions: []string{"staff.forms", "staff.forms.read,edit,duplicate"},
	},
	"formAnswers.read": {
		roles:       []string{"admin", "forms_manager"},
		permissions: []string{"staff.forms.answers.read,edit,delete", "staff.forms.answers.read,edit", "staff.forms.answers.read,export", "staff.forms.answers.read"},
	},
	"formAnswers.edit": {
		roles:       []string{"admin", "forms_manager"},
		permissions: []string{"staff.forms.answers.read,edit,delete", "staff.forms.answers.read,edit"},
	},
	"formAnswers.delete": {
		roles:       []string{"admin", "forms_manager"},
		permissions: []string{"staff.forms.answers.read,edit,delete"},
	},
	"formAnswers.export": {
		roles:       []string{"admin", "forms_manager"},
		permissions: []string{"staff.forms.answers.read,export"},
	},
	"tags.read": {
		roles:       []string{"admin", "content_manager"},
		permissions: []string{"staff.tags", "staff.tags.read,edit,delete", "staff.tags.read,edit", "staff.tags.read,export", "staff.tags.read"},
	},
	"tags.edit": {
		roles:       []string{"admin", "content_manager"},
		permissions: []string{"staff.tags", "staff.tags.read,edit,delete", "staff.tags.read,edit"},
	},
	"tags.delete": {
		roles:       []string{"admin", "content_manager"},
		permissions: []string{"staff.tags", "staff.tags.read,edit,delete"},
	},
	"places.read": {
		roles:       []string{"admin", "content_manager"},
		permissions: []string{"staff.places", "staff.places.read,edit,delete", "staff.places.read,edit", "staff.places.read,export", "staff.places.read"},
	},
	"places.edit": {
		roles:       []string{"admin", "content_manager"},
		permissions: []string{"staff.places", "staff.places.read,edit,delete", "staff.places.read,edit"},
	},
	"places.delete": {
		roles:       []string{"admin", "content_manager"},
		permissions: []string{"staff.places", "staff.places.read,edit,delete"},
	},
	"contactCategories.read": {
		roles:       []string{"admin", "content_manager"},
		permissions: []string{"staff.contacts", "staff.contacts.categories.read,edit,delete", "staff.contacts.categories.read,edit", "staff.contacts.categories.read"},
	},
	"contactCategories.edit": {
		roles:       []string{"admin", "content_manager"},
		permissions: []string{"staff.contacts", "staff.contacts.categories.read,edit,delete", "staff.contacts.categories.read,edit"},
	},
	"contactCategories.delete": {
		roles:       []string{"admin", "content_manager"},
		permissions: []string{"staff.contacts", "staff.contacts.categories.read,edit,delete"},
	},
	"mailQueue.use": {
		roles:       []string{"admin", "content_manager"},
		permissions: []string{"staff.pages", "staff.pages.read,edit,send_emails"},
	},
	"exports.use": {
		roles:       []string{"admin", "content_manager", "forms_manager"},
		permissions: []string{"staff.pages", "staff.pages.read,export", "staff.documents", "staff.documents.read,export", "staff.forms", "staff.forms.read,export", "staff.forms.answers.read,export"},
	},
	"activityLogs.read": {
		roles:       []string{"admin"},
		permissions: []string{},
	},
}

func canAccessCapability(user *domainauth.User, capability string) bool {
	check, ok := staffCapabilityChecks[capability]
	if !ok {
		return false
	}
	return userHasAnyRole(user, check.roles...) || userHasAnyPermission(user, check.permissions...)
}

func CanReadUsers(user *domainauth.User) bool       { return canAccessCapability(user, "users.read") }
func CanEditUsers(user *domainauth.User) bool       { return canAccessCapability(user, "users.edit") }
func CanExportUsers(user *domainauth.User) bool     { return canAccessCapability(user, "users.export") }
func CanReadPermissions(user *domainauth.User) bool { return canAccessCapability(user, "permissions.read") }
func CanEditPermissions(user *domainauth.User) bool { return canAccessCapability(user, "permissions.edit") }
func CanReadCircles(user *domainauth.User) bool     { return canAccessCapability(user, "circles.read") }
func CanEditCircles(user *domainauth.User) bool     { return canAccessCapability(user, "circles.edit") }
func CanDeleteCircles(user *domainauth.User) bool   { return canAccessCapability(user, "circles.delete") }
func CanExportCircles(user *domainauth.User) bool   { return canAccessCapability(user, "circles.export") }
func CanSendCircleEmails(user *domainauth.User) bool {
	return canAccessCapability(user, "circles.sendEmails")
}
func CanAccessCircleMail(user *domainauth.User) bool {
	return CanEditCircles(user) || CanSendCircleEmails(user)
}
func CanReadParticipationTypes(user *domainauth.User) bool {
	return CanReadCircles(user) || CanManageParticipationTypes(user)
}
func CanManageParticipationTypes(user *domainauth.User) bool {
	return canAccessCapability(user, "circles.participationTypes")
}
func CanReadPages(user *domainauth.User) bool       { return canAccessCapability(user, "pages.read") }
func CanEditPages(user *domainauth.User) bool       { return canAccessCapability(user, "pages.edit") }
func CanDeletePages(user *domainauth.User) bool     { return canAccessCapability(user, "pages.delete") }
func CanExportPages(user *domainauth.User) bool     { return canAccessCapability(user, "pages.export") }
func CanSendPageEmails(user *domainauth.User) bool  { return canAccessCapability(user, "pages.sendEmails") }
func CanReadDocuments(user *domainauth.User) bool   { return canAccessCapability(user, "documents.read") }
func CanEditDocuments(user *domainauth.User) bool   { return canAccessCapability(user, "documents.edit") }
func CanDeleteDocuments(user *domainauth.User) bool { return canAccessCapability(user, "documents.delete") }
func CanExportDocuments(user *domainauth.User) bool { return canAccessCapability(user, "documents.export") }
func CanReadForms(user *domainauth.User) bool       { return canAccessCapability(user, "forms.read") }
func CanEditForms(user *domainauth.User) bool       { return canAccessCapability(user, "forms.edit") }
func CanDeleteForms(user *domainauth.User) bool     { return canAccessCapability(user, "forms.delete") }
func CanExportForms(user *domainauth.User) bool     { return canAccessCapability(user, "forms.export") }
func CanDuplicateForms(user *domainauth.User) bool  { return canAccessCapability(user, "forms.duplicate") }
func CanReadFormAnswers(user *domainauth.User) bool { return canAccessCapability(user, "formAnswers.read") }
func CanEditFormAnswers(user *domainauth.User) bool { return canAccessCapability(user, "formAnswers.edit") }
func CanDeleteFormAnswers(user *domainauth.User) bool {
	return canAccessCapability(user, "formAnswers.delete")
}
func CanExportFormAnswers(user *domainauth.User) bool {
	return canAccessCapability(user, "formAnswers.export")
}
func CanReadTags(user *domainauth.User) bool     { return canAccessCapability(user, "tags.read") }
func CanEditTags(user *domainauth.User) bool     { return canAccessCapability(user, "tags.edit") }
func CanDeleteTags(user *domainauth.User) bool   { return canAccessCapability(user, "tags.delete") }
func CanReadPlaces(user *domainauth.User) bool   { return canAccessCapability(user, "places.read") }
func CanEditPlaces(user *domainauth.User) bool   { return canAccessCapability(user, "places.edit") }
func CanDeletePlaces(user *domainauth.User) bool { return canAccessCapability(user, "places.delete") }
func CanReadContactCategories(user *domainauth.User) bool {
	return canAccessCapability(user, "contactCategories.read")
}
func CanEditContactCategories(user *domainauth.User) bool {
	return canAccessCapability(user, "contactCategories.edit")
}
func CanDeleteContactCategories(user *domainauth.User) bool {
	return canAccessCapability(user, "contactCategories.delete")
}
func CanUseMailQueue(user *domainauth.User) bool     { return canAccessCapability(user, "mailQueue.use") }
func CanUseStaffExports(user *domainauth.User) bool  { return canAccessCapability(user, "exports.use") }
func CanViewActivityLogs(user *domainauth.User) bool { return canAccessCapability(user, "activityLogs.read") }
func CanListManagedCircles(user *domainauth.User) bool {
	return CanReadCircles(user) ||
		CanReadPages(user) ||
		CanReadDocuments(user) ||
		CanReadForms(user) ||
		CanUseMailQueue(user) ||
		CanUseStaffExports(user)
}
func CanManagePortalSettings(user *domainauth.User) bool {
	return userHasAnyRole(user, "admin")
}

func (g Guard) RequireStaffCapability(c echo.Context, allowed func(*domainauth.User) bool) (string, session.Session, int, bool) {
	sessionID, currentSession, status, ok := g.RequireStaffMode(c)
	if !ok {
		return "", session.Session{}, status, false
	}
	if currentSession.User == nil || !allowed(currentSession.User) {
		return "", session.Session{}, http.StatusForbidden, false
	}
	return sessionID, currentSession, http.StatusOK, true
}

func (g Guard) RequireStaffUser(c echo.Context) (string, session.Session, int, bool) {
	sessionID, currentSession, ok := g.GetSession(c)
	if !ok || currentSession.User == nil {
		return "", session.Session{}, http.StatusUnauthorized, false
	}
	if !HasStaffAccess(currentSession.User.Roles, currentSession.User.Permissions) {
		return "", session.Session{}, http.StatusForbidden, false
	}

	return sessionID, currentSession, http.StatusOK, true
}

func (g Guard) RequireStaffMode(c echo.Context) (string, session.Session, int, bool) {
	sessionID, currentSession, status, ok := g.RequireStaffUser(c)
	if !ok {
		return "", session.Session{}, status, false
	}
	if g.AllowInsecureDefaults {
		return sessionID, currentSession, http.StatusOK, true
	}
	if !currentSession.StaffAuthorized {
		return "", session.Session{}, http.StatusForbidden, false
	}

	return sessionID, currentSession, http.StatusOK, true
}

func userHasAnyRole(user *domainauth.User, roles ...string) bool {
	if user == nil {
		return false
	}
	for _, role := range roles {
		if slices.Contains(user.Roles, role) {
			return true
		}
	}
	return false
}

func userHasAnyPermission(user *domainauth.User, permissions ...string) bool {
	if user == nil {
		return false
	}
	return staffpermission.HasAny(user.Permissions, permissions...)
}
