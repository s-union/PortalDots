package controllers

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	backenddocument "github.com/s-union/PortalDots/backend/internal/domain/document"
)

const maxStaffDocumentUploadBytes = 10 * 1024 * 1024

type staffDocumentSummaryResponse struct {
	Circle      staffManagedCircleResponse `json:"circle"`
	ID          string                     `json:"id"`
	Name        string                     `json:"name"`
	Description string                     `json:"description"`
	Notes       string                     `json:"notes"`
	IsImportant bool                       `json:"isImportant"`
	Filename    string                     `json:"filename"`
	Extension   string                     `json:"extension"`
	MimeType    string                     `json:"mimeType"`
	SizeBytes   int64                      `json:"sizeBytes"`
	IsPublic    bool                       `json:"isPublic"`
	CreatedAt   string                     `json:"createdAt"`
	UpdatedAt   string                     `json:"updatedAt"`
	DownloadURL string                     `json:"downloadUrl"`
}

type staffDocumentDetailResponse struct {
	Circle      staffManagedCircleResponse `json:"circle"`
	ID          string                     `json:"id"`
	Name        string                     `json:"name"`
	Description string                     `json:"description"`
	Notes       string                     `json:"notes"`
	IsImportant bool                       `json:"isImportant"`
	Filename    string                     `json:"filename"`
	Extension   string                     `json:"extension"`
	MimeType    string                     `json:"mimeType"`
	SizeBytes   int64                      `json:"sizeBytes"`
	IsPublic    bool                       `json:"isPublic"`
	CreatedAt   string                     `json:"createdAt"`
	UpdatedAt   string                     `json:"updatedAt"`
	DownloadURL string                     `json:"downloadUrl"`
}

type mutateStaffDocumentRequest struct {
	CircleID    string
	Name        string
	Description string
	Notes       string
	IsPublic    bool
	IsImportant bool
}

func (h *staffDocumentHandlers) listStaffDocuments(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canReadDocuments)
	if !ok {
		return statusError(c, status)
	}

	_, circlesByID, documents, err := h.listManagedStaffDocuments()
	if err != nil {
		return internalError(c)
	}
	response := make([]staffDocumentSummaryResponse, 0, len(documents))
	for _, currentDocument := range documents {
		response = append(response, mapStaffDocumentSummary(currentDocument, circlesByID[currentDocument.CircleID]))
	}

	return c.JSON(http.StatusOK, response)
}

func (h *staffDocumentHandlers) getStaffDocument(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canReadDocuments)
	if !ok {
		return statusError(c, status)
	}

	documentValue, circleValue, err := h.findManagedStaffDocument(c.Param("documentID"))
	if err != nil {
		return internalError(c)
	}
	if documentValue.ID == "" {
		return errorJSON(c, http.StatusNotFound, "document_not_found")
	}

	return c.JSON(http.StatusOK, mapStaffDocumentDetail(documentValue, mapStaffManagedCircle(circleValue)))
}

func (h *staffDocumentHandlers) createStaffDocument(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditDocuments)
	if !ok {
		return statusError(c, status)
	}

	request, fileHeader, validationErrors, valid := bindStaffDocumentRequest(c, true, true)
	if !valid {
		return validationError(c, validationErrors)
	}
	if _, err := h.circles.Find(request.CircleID); err != nil {
		return validationError(c, map[string][]string{
			"circleId": {"企画を選択してください"},
		})
	}

	filename, mimeType, content, readErrors, ok := readStaffDocumentUpload(fileHeader)
	if !ok {
		return validationError(c, readErrors)
	}

	created, createdOK := h.documents.Create(
		request.CircleID,
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
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.document.created",
		"document",
		created.ID,
		created.CircleID,
		buildActivitySummary("staff が配布資料を作成しました", created.Name),
	)

	return c.JSON(http.StatusCreated, mapStaffDocumentSummary(created, staffManagedCircleResponse{ID: created.CircleID}))
}

func (h *staffDocumentHandlers) updateStaffDocument(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditDocuments)
	if !ok {
		return statusError(c, status)
	}

	documentID := c.Param("documentID")
	currentDocument, circleValue, err := h.findManagedStaffDocument(documentID)
	if err != nil {
		return internalError(c)
	}
	if currentDocument.ID == "" {
		return errorJSON(c, http.StatusNotFound, "document_not_found")
	}

	request, fileHeader, validationErrors, valid := bindStaffDocumentRequest(c, false, false)
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
		currentDocument.CircleID,
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
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.document.updated",
		"document",
		updated.ID,
		updated.CircleID,
		buildActivitySummary("staff が配布資料を更新しました", updated.Name),
	)

	return c.JSON(http.StatusOK, mapStaffDocumentSummary(updated, mapStaffManagedCircle(circleValue)))
}

func (h *staffDocumentHandlers) deleteStaffDocument(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canDeleteDocuments)
	if !ok {
		return statusError(c, status)
	}

	documentID := c.Param("documentID")
	currentDocument, _, err := h.findManagedStaffDocument(documentID)
	if err != nil {
		return internalError(c)
	}
	if currentDocument.ID == "" {
		return errorJSON(c, http.StatusNotFound, "document_not_found")
	}

	if deleted := h.documents.Delete(currentDocument.CircleID, documentID); !deleted {
		return errorJSON(c, http.StatusNotFound, "document_not_found")
	}

	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.document.deleted",
		"document",
		documentID,
		currentDocument.CircleID,
		buildActivitySummary("staff が配布資料を削除しました", currentDocument.Name),
	)

	return c.NoContent(http.StatusNoContent)
}

func (h *staffDocumentHandlers) downloadStaffDocumentFile(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canReadDocuments)
	if !ok {
		return statusError(c, status)
	}

	documentValue, _, err := h.findManagedStaffDocument(c.Param("documentID"))
	if err != nil {
		return internalError(c)
	}
	if documentValue.ID == "" {
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

	circles, _, documents, err := h.listManagedStaffDocuments()
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	circleNames := make(map[string]string, len(circles))
	for _, currentCircle := range circles {
		circleNames[currentCircle.ID] = currentCircle.Name
	}

	csvBytes, err := writeCSV(append([][]string{
		{"circle_id", "circle_name", "id", "name", "filename", "size_bytes", "extension", "description", "is_public", "is_important", "notes", "created_at", "updated_at"},
	}, staffDocumentRowsWithCircles(documents, circleNames)...))
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	filename := "staff-documents.csv"
	c.Response().Header().Set(echo.HeaderContentType, "text/csv; charset=utf-8")
	c.Response().Header().Set(echo.HeaderContentDisposition, fmt.Sprintf("attachment; filename=%q", filename))
	return c.Blob(http.StatusOK, "text/csv; charset=utf-8", csvBytes)
}

func mapStaffDocumentSummary(document backenddocument.Document, circleValue staffManagedCircleResponse) staffDocumentSummaryResponse {
	return staffDocumentSummaryResponse{
		Circle:      circleValue,
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

func mapStaffDocumentDetail(document backenddocument.Document, circleValue staffManagedCircleResponse) staffDocumentDetailResponse {
	return staffDocumentDetailResponse{
		Circle:      circleValue,
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
	circleRequired bool,
) (mutateStaffDocumentRequest, *multipart.FileHeader, map[string][]string, bool) {
	request := mutateStaffDocumentRequest{
		CircleID:    strings.TrimSpace(c.FormValue("circleId")),
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
	if circleRequired && request.CircleID == "" {
		validationErrors["circleId"] = []string{"企画を選択してください"}
	}
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

func (h *staffDocumentHandlers) listManagedStaffDocuments() ([]circle.Circle, map[string]staffManagedCircleResponse, []backenddocument.Document, error) {
	circles, circlesByID, err := listStaffManagedCircles(h.circles)
	if err != nil {
		return nil, nil, nil, err
	}

	documents := make([]backenddocument.Document, 0)
	for _, currentCircle := range circles {
		documents = append(documents, h.documents.ListByCircleForStaff(currentCircle.ID)...)
	}

	return circles, circlesByID, documents, nil
}

func (h *staffDocumentHandlers) findManagedStaffDocument(documentID string) (backenddocument.Document, circle.Circle, error) {
	circles, _, err := listStaffManagedCircles(h.circles)
	if err != nil {
		return backenddocument.Document{}, circle.Circle{}, err
	}

	for _, currentCircle := range circles {
		if currentDocument, found := h.documents.FindByCircleForStaff(currentCircle.ID, documentID); found {
			return currentDocument, currentCircle, nil
		}
	}

	return backenddocument.Document{}, circle.Circle{}, nil
}

func staffDocumentRowsWithCircles(documents []backenddocument.Document, circleNames map[string]string) [][]string {
	rows := make([][]string, 0, len(documents))
	for _, currentDocument := range documents {
		rows = append(rows, []string{
			currentDocument.CircleID,
			circleNames[currentDocument.CircleID],
			currentDocument.ID,
			currentDocument.Name,
			currentDocument.Filename,
			fmt.Sprintf("%d", currentDocument.SizeBytes),
			currentDocument.Extension,
			singleLine(currentDocument.Description),
			visibilityLabel(currentDocument.IsPublic),
			boolString(currentDocument.IsImportant),
			singleLine(currentDocument.Notes),
			currentDocument.CreatedAt,
			currentDocument.UpdatedAt,
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
