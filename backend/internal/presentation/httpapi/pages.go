package httpapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/document"
)

type pageSummaryResponse struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	PublishedAt string `json:"publishedAt"`
}

type pageDetailResponse struct {
	ID          string                 `json:"id"`
	Title       string                 `json:"title"`
	Body        string                 `json:"body"`
	PublishedAt string                 `json:"publishedAt"`
	Documents   []pageDocumentResponse `json:"documents"`
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
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"message": "unauthenticated",
		})
	}
	if currentSession.CurrentCircleID == "" {
		return c.JSON(http.StatusConflict, map[string]string{
			"message": "current_circle_required",
		})
	}

	selectedCircle, err := h.circles.Find(currentSession.CurrentCircleID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"message": "internal_error",
		})
	}

	pages := h.pages.ListByCircle(currentSession.CurrentCircleID, selectedCircle.Tags, c.QueryParam("query"))
	response := make([]pageSummaryResponse, 0, len(pages))
	for _, page := range pages {
		response = append(response, pageSummaryResponse{
			ID:          page.ID,
			Title:       page.Title,
			PublishedAt: page.PublishedAt,
		})
	}

	return c.JSON(http.StatusOK, response)
}

func (h *workspaceHandlers) getPage(c echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"message": "unauthenticated",
		})
	}
	if currentSession.CurrentCircleID == "" {
		return c.JSON(http.StatusConflict, map[string]string{
			"message": "current_circle_required",
		})
	}

	selectedCircle, err := h.circles.Find(currentSession.CurrentCircleID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"message": "internal_error",
		})
	}

	page, found := h.pages.FindByCircle(currentSession.CurrentCircleID, selectedCircle.Tags, c.Param("pageID"))
	if !found {
		return c.JSON(http.StatusNotFound, map[string]string{
			"message": "page_not_found",
		})
	}

	return c.JSON(http.StatusOK, pageDetailResponse{
		ID:          page.ID,
		Title:       page.Title,
		Body:        page.Body,
		PublishedAt: page.PublishedAt,
		Documents:   pageDocuments(h.documents, page.CircleID, page.DocumentIDs, false),
	})
}

func pageDocuments(docs document.Repository, circleID string, documentIDs []string, forStaff bool) []pageDocumentResponse {
	documents := make([]pageDocumentResponse, 0, len(documentIDs))
	for _, documentID := range documentIDs {
		var (
			documentFound bool
			documentValue pageDocumentResponse
		)

		if forStaff {
			if doc, found := docs.FindByCircleForStaff(circleID, documentID); found {
				documentFound = true
				documentValue = pageDocumentResponse{
					ID:          doc.ID,
					Name:        doc.Name,
					Description: doc.Description,
					IsImportant: doc.IsImportant,
					Extension:   doc.Extension,
					SizeBytes:   doc.SizeBytes,
					UpdatedAt:   doc.UpdatedAt,
					DownloadURL: "/v1/documents/" + doc.ID,
				}
			}
		} else {
			if doc, found := docs.FindByCircle(circleID, documentID); found {
				documentFound = true
				documentValue = pageDocumentResponse{
					ID:          doc.ID,
					Name:        doc.Name,
					Description: doc.Description,
					IsImportant: doc.IsImportant,
					Extension:   doc.Extension,
					SizeBytes:   doc.SizeBytes,
					UpdatedAt:   doc.UpdatedAt,
					DownloadURL: "/v1/documents/" + doc.ID,
				}
			}
		}

		if documentFound {
			documents = append(documents, documentValue)
		}
	}

	return documents
}
