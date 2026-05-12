package controllers

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	backenddocument "github.com/s-union/PortalDots/backend/internal/domain/document"
	"github.com/s-union/PortalDots/backend/internal/models"
)

type documentSummaryResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsImportant bool   `json:"isImportant"`
	IsNew       bool   `json:"isNew"`
	IsUnread    bool   `json:"isUnread"`
	Extension   string `json:"extension"`
	SizeBytes   int64  `json:"sizeBytes"`
	UpdatedAt   string `json:"updatedAt"`
	DownloadURL string `json:"downloadUrl"`
}

func (h *workspaceHandlers) listDocuments(c echo.Context) error {
	currentSession, currentCircle, status, ok := h.currentWorkspaceSessionAndCircle(c)
	if !ok {
		return statusError(c, status)
	}

	documents := h.documents.ListPublic(effectiveCircleTags(currentCircle, h.participationTypes))
	docIDs := make([]string, len(documents))
	for i, doc := range documents {
		docIDs[i] = doc.ID
	}
	readDocIDs := h.documents.ListReadDocumentIDs(currentSession.User.ID, docIDs)
	readSet := make(map[string]bool, len(readDocIDs))
	for _, id := range readDocIDs {
		readSet[id] = true
	}

	response := make([]documentSummaryResponse, 0, len(documents))
	for _, document := range documents {
		response = append(response, documentSummaryResponse{
			ID:          document.ID,
			Name:        document.Name,
			Description: document.Description,
			IsImportant: document.IsImportant,
			IsNew:       isDocumentNew(document),
			IsUnread:    !readSet[document.ID],
			Extension:   document.Extension,
			SizeBytes:   document.SizeBytes,
			UpdatedAt:   document.UpdatedAt,
			DownloadURL: "/v1/documents/" + document.ID,
		})
	}

	pagination := readDocumentsPagination(c)
	return c.JSON(http.StatusOK, paginateItems(response, pagination))
}

func (h *workspaceHandlers) getDocument(c echo.Context) error {
	currentSession, currentCircle, status, ok := h.currentWorkspaceSessionAndCircle(c)
	if !ok {
		return statusError(c, status)
	}

	document, found := h.documents.FindPublic(c.Param("documentID"), effectiveCircleTags(currentCircle, h.participationTypes))
	if !found {
		return errorJSON(c, http.StatusNotFound, "document_not_found")
	}

	if currentSession.User != nil {
		_ = h.documents.MarkRead(document.ID, currentSession.User.ID)
	}

	c.Response().Header().Set(echo.HeaderContentType, document.MimeType)
	return c.Blob(http.StatusOK, document.MimeType, document.Content)
}

func readDocumentsPagination(c echo.Context) models.PaginationParams {
	pagination := readPagination(c)
	if c.QueryParam("pageSize") == "" {
		pagination.PageSize = 10
	}
	return pagination
}

func isDocumentNew(document backenddocument.Document) bool {
	createdAt, err := time.Parse(time.RFC3339, document.CreatedAt)
	if err != nil {
		return false
	}

	return !createdAt.Add(72 * time.Hour).Before(time.Now().UTC())
}
