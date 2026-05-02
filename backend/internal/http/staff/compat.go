//go:build ignore

package staffhttp

import (
	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/http/shared"
)

func errorJSON(c echo.Context, status int, message string) error {
	return shared.ErrorJSON(c, status, message)
}

func internalError(c echo.Context) error {
	return shared.InternalError(c)
}

func validationError(c echo.Context, errors map[string][]string) error {
	return shared.ValidationError(c, errors)
}

func statusError(c echo.Context, status int) error {
	return shared.StatusError(c, status)
}

func readPagination(c echo.Context) PagesPagination {
	return shared.ReadPagination(c)
}

func paginateItems[T any](items []T, pagination PagesPagination) any {
	return shared.PaginateItems(items, pagination)
}

func hasStaffAccess(roles []string, permissions []string) bool {
	return HasStaffAccess(roles, permissions)
}

func canReadUsers(user *auth.User) bool                { return CanReadUsers(user) }
func canEditUsers(user *auth.User) bool                { return CanEditUsers(user) }
func canExportUsers(user *auth.User) bool              { return CanExportUsers(user) }
func canReadPermissions(user *auth.User) bool          { return CanReadPermissions(user) }
func canEditPermissions(user *auth.User) bool          { return CanEditPermissions(user) }
func canReadCircles(user *auth.User) bool              { return CanReadCircles(user) }
func canEditCircles(user *auth.User) bool              { return CanEditCircles(user) }
func canDeleteCircles(user *auth.User) bool            { return CanDeleteCircles(user) }
func canExportCircles(user *auth.User) bool            { return CanExportCircles(user) }
func canAccessCircleMail(user *auth.User) bool         { return CanAccessCircleMail(user) }
func canReadParticipationTypes(user *auth.User) bool   { return CanReadParticipationTypes(user) }
func canManageParticipationTypes(user *auth.User) bool { return CanManageParticipationTypes(user) }
func canReadPages(user *auth.User) bool                { return CanReadPages(user) }
func canEditPages(user *auth.User) bool                { return CanEditPages(user) }
func canDeletePages(user *auth.User) bool              { return CanDeletePages(user) }
func canExportPages(user *auth.User) bool              { return CanExportPages(user) }
func canSendPageEmails(user *auth.User) bool           { return CanSendPageEmails(user) }
func canReadDocuments(user *auth.User) bool            { return CanReadDocuments(user) }
func canEditDocuments(user *auth.User) bool            { return CanEditDocuments(user) }
func canDeleteDocuments(user *auth.User) bool          { return CanDeleteDocuments(user) }
func canExportDocuments(user *auth.User) bool          { return CanExportDocuments(user) }
func canReadForms(user *auth.User) bool                { return CanReadForms(user) }
func canEditForms(user *auth.User) bool                { return CanEditForms(user) }
func canDeleteForms(user *auth.User) bool              { return CanDeleteForms(user) }
func canExportForms(user *auth.User) bool              { return CanExportForms(user) }
func canDuplicateForms(user *auth.User) bool           { return CanDuplicateForms(user) }
func canReadFormAnswers(user *auth.User) bool          { return CanReadFormAnswers(user) }
func canEditFormAnswers(user *auth.User) bool          { return CanEditFormAnswers(user) }
func canDeleteFormAnswers(user *auth.User) bool        { return CanDeleteFormAnswers(user) }
func canExportFormAnswers(user *auth.User) bool        { return CanExportFormAnswers(user) }
func canReadTags(user *auth.User) bool                 { return CanReadTags(user) }
func canEditTags(user *auth.User) bool                 { return CanEditTags(user) }
func canDeleteTags(user *auth.User) bool               { return CanDeleteTags(user) }
func canReadPlaces(user *auth.User) bool               { return CanReadPlaces(user) }
func canEditPlaces(user *auth.User) bool               { return CanEditPlaces(user) }
func canDeletePlaces(user *auth.User) bool             { return CanDeletePlaces(user) }
func canReadContactCategories(user *auth.User) bool    { return CanReadContactCategories(user) }
func canEditContactCategories(user *auth.User) bool    { return CanEditContactCategories(user) }
func canDeleteContactCategories(user *auth.User) bool  { return CanDeleteContactCategories(user) }
func canUseMailQueue(user *auth.User) bool             { return CanUseMailQueue(user) }
func canUseStaffExports(user *auth.User) bool          { return CanUseStaffExports(user) }
func canViewActivityLogs(user *auth.User) bool         { return CanViewActivityLogs(user) }
func canListManagedCircles(user *auth.User) bool       { return CanListManagedCircles(user) }
func canManagePortalSettings(user *auth.User) bool     { return CanManagePortalSettings(user) }
