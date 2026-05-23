package controllers

import (
	"net/http"
	"slices"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/domain/staffpermission"
	"github.com/s-union/PortalDots/backend/internal/middlewares"
)

func hasStaffAccess(roles []string, permissions []string) bool {
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
		roles:       []string{"admin"},
		permissions: []string{},
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

func canAccessCapability(user *auth.User, capability string) bool {
	check, ok := staffCapabilityChecks[capability]
	if !ok {
		return false
	}
	return userHasAnyRole(user, check.roles...) || userHasAnyPermission(user, check.permissions...)
}

func canReadUsers(user *auth.User) bool       { return canAccessCapability(user, "users.read") }
func canEditUsers(user *auth.User) bool       { return canAccessCapability(user, "users.edit") }
func canExportUsers(user *auth.User) bool     { return canAccessCapability(user, "users.export") }
func canReadPermissions(user *auth.User) bool { return canAccessCapability(user, "permissions.read") }
func canEditPermissions(user *auth.User) bool { return canAccessCapability(user, "permissions.edit") }
func canReadCircles(user *auth.User) bool     { return canAccessCapability(user, "circles.read") }
func canEditCircles(user *auth.User) bool     { return canAccessCapability(user, "circles.edit") }
func canDeleteCircles(user *auth.User) bool   { return canAccessCapability(user, "circles.delete") }
func canExportCircles(user *auth.User) bool   { return canAccessCapability(user, "circles.export") }
func canSendCircleEmails(user *auth.User) bool {
	return canAccessCapability(user, "circles.sendEmails")
}
func canAccessCircleMail(user *auth.User) bool {
	return canEditCircles(user) || canSendCircleEmails(user)
}
func canReadParticipationTypes(user *auth.User) bool {
	return canReadCircles(user) || canManageParticipationTypes(user)
}
func canManageParticipationTypes(user *auth.User) bool {
	return canAccessCapability(user, "circles.participationTypes")
}
func canReadPages(user *auth.User) bool       { return canAccessCapability(user, "pages.read") }
func canEditPages(user *auth.User) bool       { return canAccessCapability(user, "pages.edit") }
func canDeletePages(user *auth.User) bool     { return canAccessCapability(user, "pages.delete") }
func canExportPages(user *auth.User) bool     { return canAccessCapability(user, "pages.export") }
func canSendPageEmails(user *auth.User) bool  { return canAccessCapability(user, "pages.sendEmails") }
func canReadDocuments(user *auth.User) bool   { return canAccessCapability(user, "documents.read") }
func canEditDocuments(user *auth.User) bool   { return canAccessCapability(user, "documents.edit") }
func canDeleteDocuments(user *auth.User) bool { return canAccessCapability(user, "documents.delete") }
func canExportDocuments(user *auth.User) bool { return canAccessCapability(user, "documents.export") }
func canReadForms(user *auth.User) bool       { return canAccessCapability(user, "forms.read") }
func canEditForms(user *auth.User) bool       { return canAccessCapability(user, "forms.edit") }
func canDeleteForms(user *auth.User) bool     { return canAccessCapability(user, "forms.delete") }
func canExportForms(user *auth.User) bool     { return canAccessCapability(user, "forms.export") }
func canDuplicateForms(user *auth.User) bool  { return canAccessCapability(user, "forms.duplicate") }
func canReadFormAnswers(user *auth.User) bool { return canAccessCapability(user, "formAnswers.read") }
func canEditFormAnswers(user *auth.User) bool { return canAccessCapability(user, "formAnswers.edit") }
func canDeleteFormAnswers(user *auth.User) bool {
	return canAccessCapability(user, "formAnswers.delete")
}
func canExportFormAnswers(user *auth.User) bool {
	return canAccessCapability(user, "formAnswers.export")
}
func canReadTags(user *auth.User) bool     { return canAccessCapability(user, "tags.read") }
func canEditTags(user *auth.User) bool     { return canAccessCapability(user, "tags.edit") }
func canDeleteTags(user *auth.User) bool   { return canAccessCapability(user, "tags.delete") }
func canReadPlaces(user *auth.User) bool   { return canAccessCapability(user, "places.read") }
func canEditPlaces(user *auth.User) bool   { return canAccessCapability(user, "places.edit") }
func canDeletePlaces(user *auth.User) bool { return canAccessCapability(user, "places.delete") }
func canReadContactCategories(user *auth.User) bool {
	return canAccessCapability(user, "contactCategories.read")
}
func canEditContactCategories(user *auth.User) bool {
	return canAccessCapability(user, "contactCategories.edit")
}
func canDeleteContactCategories(user *auth.User) bool {
	return canAccessCapability(user, "contactCategories.delete")
}
func canUseMailQueue(user *auth.User) bool     { return canAccessCapability(user, "mailQueue.use") }
func canUseStaffExports(user *auth.User) bool  { return canAccessCapability(user, "exports.use") }
func canViewActivityLogs(user *auth.User) bool { return canAccessCapability(user, "activityLogs.read") }
func canListManagedCircles(user *auth.User) bool {
	return canReadCircles(user) ||
		canReadPages(user) ||
		canReadDocuments(user) ||
		canReadForms(user) ||
		canUseMailQueue(user) ||
		canUseStaffExports(user)
}

func (s *sharedDeps) requireStaffCapability(c *echo.Context, allowed func(*auth.User) bool) (string, session.Session, int, bool) {
	sessionID, currentSession, status, ok := s.requireStaffMode(c)
	if !ok {
		return "", session.Session{}, status, false
	}
	if currentSession.User == nil || !allowed(currentSession.User) {
		return "", session.Session{}, http.StatusForbidden, false
	}
	return sessionID, currentSession, http.StatusOK, true
}

func userHasAnyRole(user *auth.User, roles ...string) bool {
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

func userHasAnyPermission(user *auth.User, permissions ...string) bool {
	if user == nil {
		return false
	}
	return staffpermission.HasAny(user.Permissions, permissions...)
}

func RequireCapability(allowed func(*auth.User) bool) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			_, currentSession, ok := middlewares.SessionFromContext(c)
			if !ok || currentSession.User == nil {
				return c.JSON(http.StatusUnauthorized, map[string]string{"message": "unauthenticated"})
			}
			if !allowed(currentSession.User) {
				return c.JSON(http.StatusForbidden, map[string]string{"message": "staff_forbidden"})
			}
			return next(c)
		}
	}
}
