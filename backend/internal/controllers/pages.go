package controllers

import (
	"math"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	backenddocument "github.com/s-union/PortalDots/backend/internal/domain/document"
	backendpage "github.com/s-union/PortalDots/backend/internal/domain/page"
	"github.com/s-union/PortalDots/backend/internal/models"
)

type pageSummaryResponse struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Summary   string `json:"summary"`
	IsLimited bool   `json:"isLimited"`
	IsNew     bool   `json:"isNew"`
	IsUnread  bool   `json:"isUnread"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type pageDetailResponse struct {
	ID        string                 `json:"id"`
	Title     string                 `json:"title"`
	Body      string                 `json:"body"`
	IsLimited bool                   `json:"isLimited"`
	CreatedAt string                 `json:"createdAt"`
	UpdatedAt string                 `json:"updatedAt"`
	Documents []pageDocumentResponse `json:"documents"`
}

type pageDocumentResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsImportant bool   `json:"isImportant"`
	Extension   string `json:"extension"`
	SizeBytes   int64  `json:"sizeBytes"`
	UpdatedAt   string `json:"updatedAt"`
	DownloadURL string `json:"downloadUrl"`
}

func (h *workspaceHandlers) listPages(c echo.Context) error {
	currentSession, currentCircle, status, ok := h.currentWorkspaceSessionAndCircle(c)
	if !ok {
		return statusError(c, status)
	}

	pages := h.pages.ListForCircle(effectiveCircleTags(currentCircle, h.participationTypes), c.QueryParam("query"))
	readPageIDs := listReadPageIDSet(h.pages, currentSession.User.ID, pages)

	response := make([]pageSummaryResponse, 0, len(pages))
	for _, currentPage := range pages {
		response = append(response, mapPageSummary(currentPage, readPageIDs))
	}

	return c.JSON(http.StatusOK, paginatePages(response, readPagesPagination(c)))
}

func (h *workspaceHandlers) getPage(c echo.Context) error {
	currentSession, currentCircle, status, ok := h.currentWorkspaceSessionAndCircle(c)
	if !ok {
		return statusError(c, status)
	}

	pageValue, found := h.pages.FindForCircle(effectiveCircleTags(currentCircle, h.participationTypes), c.Param("pageID"))
	if !found {
		return errorJSON(c, http.StatusNotFound, "page_not_found")
	}

	_ = h.pages.MarkRead(pageValue.ID, currentSession.User.ID)

	return c.JSON(http.StatusOK, pageDetailResponse{
		ID:        pageValue.ID,
		Title:     pageValue.Title,
		Body:      pageValue.Body,
		IsLimited: len(pageValue.ViewableTags) > 0,
		CreatedAt: pageValue.CreatedAt,
		UpdatedAt: pageValue.UpdatedAt,
		Documents: pageDocuments(h.documents, pageValue.DocumentIDs, false, false),
	})
}

func pageDocuments(
	docs backenddocument.Repository,
	documentIDs []string,
	forStaff bool,
	publicDownload bool,
) []pageDocumentResponse {
	documents := make([]pageDocumentResponse, 0, len(documentIDs))
	for _, documentID := range documentIDs {
		var (
			docValue    backenddocument.Document
			found       bool
			downloadURL string
		)

		if forStaff {
			docValue, found = docs.FindForStaff(documentID)
			downloadURL = "/v1/staff/documents/" + documentID
		} else {
			docValue, found = docs.FindPublic(documentID)
			if publicDownload {
				downloadURL = "/v1/public/documents/" + documentID
			} else {
				downloadURL = "/v1/documents/" + documentID
			}
		}
		if !found {
			continue
		}

		documents = append(documents, pageDocumentResponse{
			ID:          docValue.ID,
			Name:        docValue.Name,
			Description: docValue.Description,
			IsImportant: docValue.IsImportant,
			Extension:   docValue.Extension,
			SizeBytes:   docValue.SizeBytes,
			UpdatedAt:   docValue.UpdatedAt,
			DownloadURL: downloadURL,
		})
	}

	return documents
}

func mapPageSummary(currentPage backendpage.Page, readPageIDs map[string]struct{}) pageSummaryResponse {
	_, isRead := readPageIDs[currentPage.ID]
	return pageSummaryResponse{
		ID:        currentPage.ID,
		Title:     currentPage.Title,
		Summary:   summarizePublicHomeText(currentPage.Body, 120),
		IsLimited: len(currentPage.ViewableTags) > 0,
		IsNew:     isPageNew(currentPage),
		IsUnread:  !isRead,
		CreatedAt: currentPage.CreatedAt,
		UpdatedAt: currentPage.UpdatedAt,
	}
}

func isPageNew(currentPage backendpage.Page) bool {
	createdAt, err := time.Parse(time.RFC3339, currentPage.CreatedAt)
	if err != nil {
		return false
	}

	return !createdAt.Add(72 * time.Hour).Before(time.Now().UTC())
}

func readPagesPagination(c echo.Context) models.PaginationParams {
	pagination := readPagination(c)
	if c.QueryParam("pageSize") == "" {
		pagination.PageSize = 10
	}
	return pagination
}

func paginatePages(items []pageSummaryResponse, pagination models.PaginationParams) models.PaginatedResponse[pageSummaryResponse] {
	total := len(items)
	if total == 0 {
		return models.PaginatedResponse[pageSummaryResponse]{
			Items:    []pageSummaryResponse{},
			Page:     1,
			PageSize: pagination.PageSize,
			Total:    0,
		}
	}

	totalPages := int(math.Ceil(float64(total) / float64(pagination.PageSize)))
	if pagination.Page > totalPages {
		pagination.Page = totalPages
	}

	return paginateItems(items, pagination)
}

func listReadPageIDSet(repo backendpage.Repository, userID string, pages []backendpage.Page) map[string]struct{} {
	pageIDs := make([]string, 0, len(pages))
	for _, currentPage := range pages {
		pageIDs = append(pageIDs, currentPage.ID)
	}

	readPageIDs := repo.ListReadPageIDs(userID, pageIDs)
	readPageIDSet := make(map[string]struct{}, len(readPageIDs))
	for _, pageID := range readPageIDs {
		readPageIDSet[pageID] = struct{}{}
	}

	return readPageIDSet
}
