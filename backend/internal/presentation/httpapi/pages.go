package httpapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
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
		return statusError(c, http.StatusUnauthorized)
	}
	if currentSession.CurrentCircleID == "" {
		return statusError(c, http.StatusConflict)
	}

	_, err := h.circles.Find(currentSession.CurrentCircleID)
	if err != nil {
		return internalError(c)
	}

	visibleTags, err := h.workspaceVisiblePageTags()
	if err != nil {
		return internalError(c)
	}

	pages := h.pages.ListPublic(visibleTags, c.QueryParam("query"))
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
		return statusError(c, http.StatusUnauthorized)
	}
	if currentSession.CurrentCircleID == "" {
		return statusError(c, http.StatusConflict)
	}

	_, err := h.circles.Find(currentSession.CurrentCircleID)
	if err != nil {
		return internalError(c)
	}

	visibleTags, err := h.workspaceVisiblePageTags()
	if err != nil {
		return internalError(c)
	}

	page, found := h.pages.FindPublic(visibleTags, c.Param("pageID"))
	if !found {
		return errorJSON(c, http.StatusNotFound, "page_not_found")
	}

	return c.JSON(http.StatusOK, pageDetailResponse{
		ID:          page.ID,
		Title:       page.Title,
		Body:        page.Body,
		PublishedAt: page.PublishedAt,
		Documents:   pageDocuments(h.documents, page.CircleID, page.DocumentIDs, false, false),
	})
}

func pageDocuments(docs document.Repository, circleID string, documentIDs []string, forStaff bool, publicDownload bool) []pageDocumentResponse {
	documents := make([]pageDocumentResponse, 0, len(documentIDs))
	for _, documentID := range documentIDs {
		var (
			documentFound bool
			documentValue pageDocumentResponse
		)

		if forStaff {
			if doc, found := docs.FindByCircleForStaff(circleID, documentID); found {
				downloadURL := "/v1/documents/" + doc.ID
				if publicDownload {
					downloadURL = "/v1/public/documents/" + doc.ID
				}
				documentFound = true
				documentValue = pageDocumentResponse{
					ID:          doc.ID,
					Name:        doc.Name,
					Description: doc.Description,
					IsImportant: doc.IsImportant,
					Extension:   doc.Extension,
					SizeBytes:   doc.SizeBytes,
					UpdatedAt:   doc.UpdatedAt,
					DownloadURL: downloadURL,
				}
			}
		} else {
			if doc, found := docs.FindByCircle(circleID, documentID); found {
				downloadURL := "/v1/documents/" + doc.ID
				if publicDownload {
					downloadURL = "/v1/public/documents/" + doc.ID
				}
				documentFound = true
				documentValue = pageDocumentResponse{
					ID:          doc.ID,
					Name:        doc.Name,
					Description: doc.Description,
					IsImportant: doc.IsImportant,
					Extension:   doc.Extension,
					SizeBytes:   doc.SizeBytes,
					UpdatedAt:   doc.UpdatedAt,
					DownloadURL: downloadURL,
				}
			}
		}

		if documentFound {
			documents = append(documents, documentValue)
		}
	}

	return documents
}

func (h *workspaceHandlers) workspaceVisiblePageTags() ([]string, error) {
	selectableCircles, err := h.circles.ListSelectable(nil)
	if err != nil {
		return nil, err
	}

	return collectUniqueCircleTags(selectableCircles), nil
}

func collectUniqueCircleTags(circles []circle.Circle) []string {
	seen := map[string]struct{}{}
	tags := make([]string, 0)

	for _, currentCircle := range circles {
		for _, tag := range currentCircle.Tags {
			if tag == "" {
				continue
			}
			if _, exists := seen[tag]; exists {
				continue
			}
			seen[tag] = struct{}{}
			tags = append(tags, tag)
		}
	}

	return tags
}
