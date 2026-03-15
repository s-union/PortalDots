package httpapi

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
	backenddocument "github.com/s-union/PortalDots/backend/internal/domain/document"
)

const maxStaffDocumentUploadBytes = 10 * 1024 * 1024

type staffDocumentSummaryResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Notes       string `json:"notes"`
	IsImportant bool   `json:"isImportant"`
	Filename    string `json:"filename"`
	Extension   string `json:"extension"`
	MimeType    string `json:"mimeType"`
	SizeBytes   int64  `json:"sizeBytes"`
	IsPublic    bool   `json:"isPublic"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
	DownloadURL string `json:"downloadUrl"`
}

type staffDocumentDetailResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Notes       string `json:"notes"`
	IsImportant bool   `json:"isImportant"`
	Filename    string `json:"filename"`
	Extension   string `json:"extension"`
	MimeType    string `json:"mimeType"`
	SizeBytes   int64  `json:"sizeBytes"`
	IsPublic    bool   `json:"isPublic"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
	DownloadURL string `json:"downloadUrl"`
}

type mutateStaffDocumentRequest struct {
	Name        string
	Description string
	Notes       string
	IsPublic    bool
	IsImportant bool
}

func (h *staffDocumentHandlers) listStaffDocuments(c echo.Context) error {
	_, _, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canReadDocuments)
	if !ok {
		return statusError(c, status)
	}

	documents := h.documents.ListByCircleForStaff(selectedCircle.ID)
	response := make([]staffDocumentSummaryResponse, 0, len(documents))
	for _, currentDocument := range documents {
		response = append(response, mapStaffDocumentSummary(currentDocument))
	}

	return c.JSON(http.StatusOK, response)
}

func (h *staffDocumentHandlers) getStaffDocument(c echo.Context) error {
	_, _, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canReadDocuments)
	if !ok {
		return statusError(c, status)
	}

	document, found := h.documents.FindByCircleForStaff(selectedCircle.ID, c.Param("documentID"))
	if !found {
		return errorJSON(c, http.StatusNotFound, "document_not_found")
	}

	return c.JSON(http.StatusOK, mapStaffDocumentDetail(document))
}

func (h *staffDocumentHandlers) createStaffDocument(c echo.Context) error {
	_, currentSession, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canEditDocuments)
	if !ok {
		return statusError(c, status)
	}

	request, fileHeader, validationErrors, valid := bindStaffDocumentRequest(c, true)
	if !valid {
		return validationError(c, validationErrors)
	}

	filename, mimeType, content, readErrors, ok := readStaffDocumentUpload(fileHeader)
	if !ok {
		return validationError(c, readErrors)
	}

	created, createdOK := h.documents.Create(
		selectedCircle.ID,
		request.Name,
		request.Description,
		request.Notes,
		request.IsPublic,
		request.IsImportant,
		filename,
		mimeType,
		content,
	)
	if !createdOK {
		return internalError(c)
	}

	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.document.created",
		"document",
		created.ID,
		selectedCircle.ID,
		buildActivitySummary("staff が配布資料を作成しました", created.Name),
	)

	return c.JSON(http.StatusCreated, mapStaffDocumentSummary(created))
}

func (h *staffDocumentHandlers) updateStaffDocument(c echo.Context) error {
	_, currentSession, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canEditDocuments)
	if !ok {
		return statusError(c, status)
	}

	documentID := c.Param("documentID")
	currentDocument, found := h.documents.FindByCircleForStaff(selectedCircle.ID, documentID)
	if !found {
		return errorJSON(c, http.StatusNotFound, "document_not_found")
	}

	request, fileHeader, validationErrors, valid := bindStaffDocumentRequest(c, false)
	if !valid {
		return validationError(c, validationErrors)
	}

	filename := currentDocument.Filename
	mimeType := currentDocument.MimeType
	content := append([]byte(nil), currentDocument.Content...)
	if fileHeader != nil {
		var readErrors map[string][]string
		var ok bool
		filename, mimeType, content, readErrors, ok = readStaffDocumentUpload(fileHeader)
		if !ok {
			return validationError(c, readErrors)
		}
	}

	updated, updatedOK := h.documents.Update(
		selectedCircle.ID,
		documentID,
		request.Name,
		request.Description,
		request.Notes,
		request.IsPublic,
		request.IsImportant,
		filename,
		mimeType,
		content,
	)
	if !updatedOK {
		return errorJSON(c, http.StatusNotFound, "document_not_found")
	}

	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.document.updated",
		"document",
		updated.ID,
		selectedCircle.ID,
		buildActivitySummary("staff が配布資料を更新しました", updated.Name),
	)

	return c.JSON(http.StatusOK, mapStaffDocumentSummary(updated))
}

func (h *staffDocumentHandlers) deleteStaffDocument(c echo.Context) error {
	_, currentSession, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canDeleteDocuments)
	if !ok {
		return statusError(c, status)
	}

	documentID := c.Param("documentID")
	currentDocument, found := h.documents.FindByCircleForStaff(selectedCircle.ID, documentID)
	if !found {
		return errorJSON(c, http.StatusNotFound, "document_not_found")
	}

	if deleted := h.documents.Delete(selectedCircle.ID, documentID); !deleted {
		return errorJSON(c, http.StatusNotFound, "document_not_found")
	}

	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.document.deleted",
		"document",
		documentID,
		selectedCircle.ID,
		buildActivitySummary("staff が配布資料を削除しました", currentDocument.Name),
	)

	return c.NoContent(http.StatusNoContent)
}

func (h *staffDocumentHandlers) downloadStaffDocumentFile(c echo.Context) error {
	_, _, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canReadDocuments)
	if !ok {
		return statusError(c, status)
	}

	document, found := h.documents.FindByCircleForStaff(selectedCircle.ID, c.Param("documentID"))
	if !found {
		return errorJSON(c, http.StatusNotFound, "document_not_found")
	}

	c.Response().Header().Set(echo.HeaderContentDisposition, `attachment; filename="`+document.Filename+`"`)
	return c.Blob(http.StatusOK, document.MimeType, document.Content)
}

func (h *staffDocumentHandlers) downloadStaffDocumentsCSV(c echo.Context) error {
	_, _, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canExportDocuments)
	if !ok {
		return statusError(c, status)
	}

	csvBytes, err := writeCSV(append([][]string{
		{"id", "name", "filename", "size_bytes", "extension", "description", "is_public", "is_important", "notes", "created_at", "updated_at"},
	}, staffDocumentRows(h.documents.ListByCircleForStaff(selectedCircle.ID))...))
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	filename := fmt.Sprintf("%s-documents.csv", selectedCircle.ID)
	c.Response().Header().Set(echo.HeaderContentType, "text/csv; charset=utf-8")
	c.Response().Header().Set(echo.HeaderContentDisposition, fmt.Sprintf("attachment; filename=%q", filename))
	return c.Blob(http.StatusOK, "text/csv; charset=utf-8", csvBytes)
}

func mapStaffDocumentSummary(document backenddocument.Document) staffDocumentSummaryResponse {
	return staffDocumentSummaryResponse{
		ID:          document.ID,
		Name:        document.Name,
		Description: document.Description,
		Notes:       document.Notes,
		IsImportant: document.IsImportant,
		Filename:    document.Filename,
		Extension:   document.Extension,
		MimeType:    document.MimeType,
		SizeBytes:   document.SizeBytes,
		IsPublic:    document.IsPublic,
		CreatedAt:   document.CreatedAt,
		UpdatedAt:   document.UpdatedAt,
		DownloadURL: "/v1/staff/documents/" + document.ID,
	}
}

func mapStaffDocumentDetail(document backenddocument.Document) staffDocumentDetailResponse {
	return staffDocumentDetailResponse{
		ID:          document.ID,
		Name:        document.Name,
		Description: document.Description,
		Notes:       document.Notes,
		IsImportant: document.IsImportant,
		Filename:    document.Filename,
		Extension:   document.Extension,
		MimeType:    document.MimeType,
		SizeBytes:   document.SizeBytes,
		IsPublic:    document.IsPublic,
		CreatedAt:   document.CreatedAt,
		UpdatedAt:   document.UpdatedAt,
		DownloadURL: "/v1/staff/documents/" + document.ID,
	}
}

func bindStaffDocumentRequest(
	c echo.Context,
	fileRequired bool,
) (mutateStaffDocumentRequest, *multipart.FileHeader, map[string][]string, bool) {
	request := mutateStaffDocumentRequest{
		Name:        strings.TrimSpace(c.FormValue("name")),
		Description: strings.TrimSpace(c.FormValue("description")),
		Notes:       strings.TrimSpace(c.FormValue("notes")),
	}

	isPublic, valid := parseMultipartRequiredBool(c.FormValue("isPublic"))
	if !valid {
		return mutateStaffDocumentRequest{}, nil, map[string][]string{
			"isPublic": {"公開設定が不正です"},
		}, false
	}
	request.IsPublic = isPublic

	isImportant, valid := parseMultipartRequiredBool(c.FormValue("isImportant"))
	if !valid {
		return mutateStaffDocumentRequest{}, nil, map[string][]string{
			"isImportant": {"重要資料設定が不正です"},
		}, false
	}
	request.IsImportant = isImportant

	validationErrors := map[string][]string{}
	if request.Name == "" {
		validationErrors["name"] = []string{"配布資料名を入力してください"}
	}

	var fileHeader *multipart.FileHeader
	formFile, err := c.FormFile("file")
	switch {
	case err == nil:
		fileHeader = formFile
	case fileRequired:
		validationErrors["file"] = []string{"ファイルを選択してください"}
	}

	if len(validationErrors) > 0 {
		return mutateStaffDocumentRequest{}, nil, validationErrors, false
	}

	return request, fileHeader, nil, true
}

func readStaffDocumentUpload(
	fileHeader *multipart.FileHeader,
) (string, string, []byte, map[string][]string, bool) {
	filename := strings.TrimSpace(fileHeader.Filename)
	if filename == "" {
		return "", "", nil, map[string][]string{
			"file": {"ファイル名が不正です"},
		}, false
	}

	file, err := fileHeader.Open()
	if err != nil {
		return "", "", nil, map[string][]string{
			"file": {"ファイルを読み込めませんでした"},
		}, false
	}
	defer file.Close()

	content, err := io.ReadAll(io.LimitReader(file, maxStaffDocumentUploadBytes+1))
	if err != nil {
		return "", "", nil, map[string][]string{
			"file": {"ファイルを読み込めませんでした"},
		}, false
	}
	if len(content) == 0 {
		return "", "", nil, map[string][]string{
			"file": {"空のファイルはアップロードできません"},
		}, false
	}
	if len(content) > maxStaffDocumentUploadBytes {
		return "", "", nil, map[string][]string{
			"file": {"ファイルサイズは 10MB 以下にしてください"},
		}, false
	}

	mimeType := strings.TrimSpace(fileHeader.Header.Get(echo.HeaderContentType))
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	return filename, mimeType, content, nil, true
}

func parseMultipartRequiredBool(value string) (bool, bool) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return false, false
	}

	parsed, err := strconv.ParseBool(trimmed)
	if err != nil {
		return false, false
	}

	return parsed, true
}
