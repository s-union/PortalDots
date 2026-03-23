package httpapi

import (
	"math"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	backenddocument "github.com/s-union/PortalDots/backend/internal/domain/document"
)

type documentSummaryResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsImportant bool   `json:"isImportant"`
	IsNew       bool   `json:"isNew"`
	Extension   string `json:"extension"`
	SizeBytes   int64  `json:"sizeBytes"`
	UpdatedAt   string `json:"updatedAt"`
	DownloadURL string `json:"downloadUrl"`
}

func (h *workspaceHandlers) listDocuments(c echo.Context) error {
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

	documents := h.documents.ListPublic()
	response := make([]documentSummaryResponse, 0, len(documents))
	for _, document := range documents {
		response = append(response, documentSummaryResponse{
			ID:          document.ID,
			Name:        document.Name,
			Description: document.Description,
			IsImportant: document.IsImportant,
			IsNew:       isDocumentNew(document),
			Extension:   document.Extension,
			SizeBytes:   document.SizeBytes,
			UpdatedAt:   document.UpdatedAt,
			DownloadURL: "/v1/documents/" + document.ID,
		})
	}

	pagination := readDocumentsPagination(c)
	return c.JSON(http.StatusOK, paginateDocuments(response, pagination))
}

func (h *workspaceHandlers) getDocument(c echo.Context) error {
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

	document, found := h.documents.FindPublic(c.Param("documentID"))
	if !found {
		return c.JSON(http.StatusNotFound, map[string]string{
			"message": "document_not_found",
		})
	}

	c.Response().Header().Set(echo.HeaderContentType, document.MimeType)
	return c.Blob(http.StatusOK, document.MimeType, document.Content)
}

func readDocumentsPagination(c echo.Context) paginationParams {
	pagination := readPagination(c)
	if c.QueryParam("pageSize") == "" {
		pagination.PageSize = 10
	}
	return pagination
}

func paginateDocuments(items []documentSummaryResponse, pagination paginationParams) paginatedResponse[documentSummaryResponse] {
	total := len(items)
	if total == 0 {
		return paginatedResponse[documentSummaryResponse]{
			Items:    []documentSummaryResponse{},
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

func isDocumentNew(document backenddocument.Document) bool {
	createdAt, err := time.Parse(time.RFC3339, document.CreatedAt)
	if err != nil {
		return false
	}

	return !createdAt.Add(72 * time.Hour).Before(time.Now().UTC())
}
