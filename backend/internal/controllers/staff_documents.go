package controllers

import (
	"encoding/json"
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
	Circle       staffManagedCircleResponse `json:"circle"`
	ID           string                     `json:"id"`
	Name         string                     `json:"name"`
	Description  string                     `json:"description"`
	Notes        string                     `json:"notes"`
	IsImportant  bool                       `json:"isImportant"`
	Filename     string                     `json:"filename"`
	Extension    string                     `json:"extension"`
	MimeType     string                     `json:"mimeType"`
	SizeBytes    int64                      `json:"sizeBytes"`
	IsPublic     bool                       `json:"isPublic"`
	ViewableTags []string                   `json:"viewableTags"`
	CreatedAt    string                     `json:"createdAt"`
	UpdatedAt    string                     `json:"updatedAt"`
	DownloadURL  string                     `json:"downloadUrl"`
}

type staffDocumentDetailResponse = staffDocumentSummaryResponse

type mutateStaffDocumentRequest struct {
	Name         string
	Description  string
	Notes        string
	IsPublic     bool
	IsImportant  bool
	ViewableTags []string
}

func (h *staffDocumentHandlers) listStaffDocuments(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canReadDocuments)
	if !ok {
		return statusError(c, status)
	}
	filterQueries, filterMode, err := parseStaffListFilters(c.QueryParam("queries"), c.QueryParam("mode"), staffDocumentFilterableFields)
	if err != nil {
		return validationError(c, map[string][]string{"queries": {"絞り込み条件が正しくありません"}})
	}

	documents, err := h.listManagedStaffDocuments()
	if err != nil {
		return internalError(c)
	}
	response := make([]staffDocumentSummaryResponse, 0, len(documents))
	for _, currentDocument := range documents {
		item := mapStaffDocumentSummary(currentDocument, staffManagedCircleResponse{})
		if !matchesStaffDocumentSummarySearch(item, c.QueryParam("query")) || !matchesStaffListFilters(staffDocumentSummaryFilterResolver(item), filterQueries, filterMode) {
			continue
		}
		response = append(response, item)
	}

	return c.JSON(http.StatusOK, response)
}

var staffDocumentFilterableFields = map[string]staffListFilterFieldType{
	"id":          staffListFilterFieldTypeString,
	"name":        staffListFilterFieldTypeString,
	"extension":   staffListFilterFieldTypeString,
	"description": staffListFilterFieldTypeString,
	"isPublic":    staffListFilterFieldTypeBool,
	"isImportant": staffListFilterFieldTypeBool,
	"createdAt":   staffListFilterFieldTypeString,
	"updatedAt":   staffListFilterFieldTypeString,
	"notes":       staffListFilterFieldTypeString,
}

func matchesStaffDocumentSummarySearch(item staffDocumentSummaryResponse, query string) bool {
	return matchesStaffListSearch([]string{item.ID, item.Name, item.Description, item.Extension, item.Notes}, query)
}

func staffDocumentSummaryFilterResolver(item staffDocumentSummaryResponse) func(string) (string, bool) {
	return func(key string) (string, bool) {
		switch key {
		case "id":
			return item.ID, true
		case "name":
			return item.Name, true
		case "extension":
			return item.Extension, true
		case "description":
			return item.Description, true
		case "isPublic":
			return boolString(item.IsPublic), true
		case "isImportant":
			return boolString(item.IsImportant), true
		case "createdAt":
			return item.CreatedAt, true
		case "updatedAt":
			return item.UpdatedAt, true
		case "notes":
			return item.Notes, true
		default:
			return "", false
		}
	}
}

func (h *staffDocumentHandlers) getStaffDocument(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canReadDocuments)
	if !ok {
		return statusError(c, status)
	}

	documentValue, found := h.findManagedStaffDocument(c.Param("documentID"))
	if !found {
		return errorJSON(c, http.StatusNotFound, "document_not_found")
	}

	return c.JSON(http.StatusOK, mapStaffDocumentDetail(documentValue, staffManagedCircleResponse{}))
}

func (h *staffDocumentHandlers) createStaffDocument(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditDocuments)
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
		request.Name,
		request.Description,
		request.Notes,
		request.IsPublic,
		request.IsImportant,
		request.ViewableTags,
		filename,
		mimeType,
		content,
	)
	if !createdOK {
		return internalError(c)
	}

	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.document.created",
		"document",
		created.ID,
		"",
		buildActivitySummary("staff が配布資料を作成しました", created.Name),
	)

	return c.JSON(http.StatusCreated, mapStaffDocumentSummary(created, staffManagedCircleResponse{}))
}

func (h *staffDocumentHandlers) updateStaffDocument(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditDocuments)
	if !ok {
		return statusError(c, status)
	}

	documentID := c.Param("documentID")
	currentDocument, found := h.findManagedStaffDocument(documentID)
	if !found {
		return errorJSON(c, http.StatusNotFound, "document_not_found")
	}

	request, fileHeader, validationErrors, valid := bindStaffDocumentRequest(c)
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
		documentID,
		request.Name,
		request.Description,
		request.Notes,
		request.IsPublic,
		request.IsImportant,
		request.ViewableTags,
		filename,
		mimeType,
		content,
	)
	if !updatedOK {
		return errorJSON(c, http.StatusNotFound, "document_not_found")
	}

	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.document.updated",
		"document",
		updated.ID,
		"",
		buildActivitySummary("staff が配布資料を更新しました", updated.Name),
	)

	return c.JSON(http.StatusOK, mapStaffDocumentSummary(updated, staffManagedCircleResponse{}))
}

func (h *staffDocumentHandlers) deleteStaffDocument(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canDeleteDocuments)
	if !ok {
		return statusError(c, status)
	}

	documentID := c.Param("documentID")
	currentDocument, found := h.findManagedStaffDocument(documentID)
	if !found {
		return errorJSON(c, http.StatusNotFound, "document_not_found")
	}

	if deleted := h.documents.Delete(documentID); !deleted {
		return errorJSON(c, http.StatusNotFound, "document_not_found")
	}

	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.document.deleted",
		"document",
		documentID,
		"",
		buildActivitySummary("staff が配布資料を削除しました", currentDocument.Name),
	)

	return c.NoContent(http.StatusNoContent)
}

func (h *staffDocumentHandlers) downloadStaffDocumentFile(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canReadDocuments)
	if !ok {
		return statusError(c, status)
	}

	documentValue, found := h.findManagedStaffDocument(c.Param("documentID"))
	if !found {
		return errorJSON(c, http.StatusNotFound, "document_not_found")
	}

	c.Response().Header().Set(echo.HeaderContentDisposition, attachmentContentDisposition(documentValue.Filename))
	return c.Blob(http.StatusOK, documentValue.MimeType, documentValue.Content)
}

func (h *staffDocumentHandlers) downloadStaffDocumentsCSV(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canExportDocuments)
	if !ok {
		return statusError(c, status)
	}

	documents, err := h.listManagedStaffDocuments()
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	csvBytes, err := writeCSV(append([][]string{
		{"id", "name", "filename", "size_bytes", "extension", "description", "is_public", "is_important", "viewable_tags", "notes", "created_at", "updated_at"},
	}, staffDocumentRows(documents)...))
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	filename := "staff-documents.csv"
	return csvResponse(c, filename, csvBytes)
}

func mapStaffDocumentSummary(document backenddocument.Document, circleValue staffManagedCircleResponse) staffDocumentSummaryResponse {
	return staffDocumentSummaryResponse{
		Circle:       circleValue,
		ID:           document.ID,
		Name:         document.Name,
		Description:  document.Description,
		Notes:        document.Notes,
		IsImportant:  document.IsImportant,
		Filename:     document.Filename,
		Extension:    document.Extension,
		MimeType:     document.MimeType,
		SizeBytes:    document.SizeBytes,
		IsPublic:     document.IsPublic,
		ViewableTags: append([]string{}, document.ViewableTags...),
		CreatedAt:    document.CreatedAt,
		UpdatedAt:    document.UpdatedAt,
		DownloadURL:  "/v1/staff/documents/" + document.ID,
	}
}

func mapStaffDocumentDetail(document backenddocument.Document, circleValue staffManagedCircleResponse) staffDocumentDetailResponse {
	return staffDocumentDetailResponse{
		Circle:       circleValue,
		ID:           document.ID,
		Name:         document.Name,
		Description:  document.Description,
		Notes:        document.Notes,
		IsImportant:  document.IsImportant,
		Filename:     document.Filename,
		Extension:    document.Extension,
		MimeType:     document.MimeType,
		SizeBytes:    document.SizeBytes,
		IsPublic:     document.IsPublic,
		ViewableTags: append([]string{}, document.ViewableTags...),
		CreatedAt:    document.CreatedAt,
		UpdatedAt:    document.UpdatedAt,
		DownloadURL:  "/v1/staff/documents/" + document.ID,
	}
}

func bindStaffDocumentRequest(
	c echo.Context,
	fileRequired ...bool,
) (mutateStaffDocumentRequest, *multipart.FileHeader, map[string][]string, bool) {
	required := len(fileRequired) > 0 && fileRequired[0]
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

	viewableTagsValue := strings.TrimSpace(c.FormValue("viewableTags"))
	if viewableTagsValue != "" {
		if err := json.Unmarshal([]byte(viewableTagsValue), &request.ViewableTags); err != nil {
			return mutateStaffDocumentRequest{}, nil, map[string][]string{
				"viewableTags": {"閲覧可能なタグの形式が不正です"},
			}, false
		}
	}

	validationErrors := map[string][]string{}
	if request.Name == "" {
		validationErrors["name"] = []string{"配布資料名を入力してください"}
	}

	var fileHeader *multipart.FileHeader
	formFile, err := c.FormFile("file")
	switch {
	case err == nil:
		fileHeader = formFile
	case required:
		validationErrors["file"] = []string{"ファイルを選択してください"}
	}

	if len(validationErrors) > 0 {
		return mutateStaffDocumentRequest{}, nil, validationErrors, false
	}

	return request, fileHeader, nil, true
}

func (h *staffDocumentHandlers) listManagedStaffDocuments() ([]backenddocument.Document, error) {
	return h.documents.ListForStaff(), nil
}

func (h *staffDocumentHandlers) findManagedStaffDocument(documentID string) (backenddocument.Document, bool) {
	return h.documents.FindForStaff(documentID)
}

func staffDocumentRows(documents []backenddocument.Document) [][]string {
	rows := make([][]string, 0, len(documents))
	for _, currentDocument := range documents {
		rows = append(rows, []string{
			currentDocument.ID,
			currentDocument.Name,
			currentDocument.Description,
			currentDocument.Notes,
			currentDocument.Filename,
			currentDocument.Extension,
			currentDocument.MimeType,
			strconv.FormatInt(currentDocument.SizeBytes, 10),
			currentDocument.CreatedAt,
			currentDocument.UpdatedAt,
			visibilityLabel(currentDocument.IsPublic),
			strings.Join(currentDocument.ViewableTags, ","),
		})
	}
	return rows
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

	mimeType := http.DetectContentType(content)

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
