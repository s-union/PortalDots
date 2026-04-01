//go:build ignore

package publichttp

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/http/shared"
	workspacehttp "github.com/s-union/PortalDots/backend/internal/http/workspace"
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

func hasStaffAccess(roles []string, permissions []string) bool {
	return workspacehttp.HasStaffAccessForTests(roles, permissions)
}

type participationTypeResponse = workspacehttp.ParticipationTypeResponse
type pageSummaryResponse = workspacehttp.PageSummaryResponse
type pageDetailResponse = workspacehttp.PageDetailResponse
type pageDocumentResponse = workspacehttp.PageDocumentResponse

func mapParticipationType(item workspacehttp.ParticipationTypeLike, form workspacehttp.FormLike) participationTypeResponse {
	return workspacehttp.MapParticipationTypeForPublic(item, form)
}

func paginatePages(items []pageSummaryResponse, pagination workspacehttp.PagesPagination) any {
	return workspacehttp.PaginatePagesForPublic(items, pagination)
}

func readPagesPagination(c echo.Context) workspacehttp.PagesPagination {
	return workspacehttp.ReadPagesPaginationForPublic(c)
}

func pageDocuments(documents workspacehttp.DocumentRepositoryLike, documentIDs []string, forStaff bool, allowGuest bool) []pageDocumentResponse {
	return workspacehttp.PageDocumentsForPublic(documents, documentIDs, forStaff, allowGuest)
}

var _ = http.StatusOK
