package httpapi

import (
	"archive/zip"
	"bytes"
	"encoding/csv"
	"fmt"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/answer"
	"github.com/s-union/PortalDots/backend/internal/domain/document"
	"github.com/s-union/PortalDots/backend/internal/domain/form"
	"github.com/s-union/PortalDots/backend/internal/domain/page"
)

func (h *staffAdminHandlers) downloadStaffSummaryCSV(c echo.Context) error {
	_, _, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canUseStaffExports)
	if !ok {
		return statusError(c, status)
	}

	csvBytes, err := h.buildStaffSummaryCSV(selectedCircle.ID)
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	filename := fmt.Sprintf("%s-summary.csv", selectedCircle.ID)
	c.Response().Header().Set(echo.HeaderContentType, "text/csv; charset=utf-8")
	c.Response().Header().Set(echo.HeaderContentDisposition, fmt.Sprintf("attachment; filename=%q", filename))
	return c.Blob(http.StatusOK, "text/csv; charset=utf-8", csvBytes)
}

func (h *staffAdminHandlers) downloadStaffBundleZIP(c echo.Context) error {
	_, _, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, canUseStaffExports)
	if !ok {
		return statusError(c, status)
	}

	zipBytes, err := h.buildStaffBundleZIP(selectedCircle.ID, selectedCircle.Name)
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	filename := fmt.Sprintf("%s-bundle.zip", selectedCircle.ID)
	c.Response().Header().Set(echo.HeaderContentType, "application/zip")
	c.Response().Header().Set(echo.HeaderContentDisposition, fmt.Sprintf("attachment; filename=%q", filename))
	return c.Blob(http.StatusOK, "application/zip", zipBytes)
}

func (h *staffAdminHandlers) buildStaffSummaryCSV(circleID string) ([]byte, error) {
	rows := [][]string{{
		"resource_type",
		"id",
		"name",
		"visibility",
		"status",
		"detail",
	}}

	for _, currentPage := range h.pages.ListByCircleForStaff(circleID, "") {
		rows = append(rows, []string{
			"page",
			currentPage.ID,
			currentPage.Title,
			visibilityLabel(currentPage.IsPublic),
			pageStatus(currentPage.IsPinned),
			currentPage.PublishedAt,
		})
	}
	for _, currentDocument := range h.documents.ListByCircleForStaff(circleID) {
		rows = append(rows, []string{
			"document",
			currentDocument.ID,
			currentDocument.Name,
			visibilityLabel(currentDocument.IsPublic),
			currentDocument.Filename,
			currentDocument.MimeType,
		})
	}
	for _, currentForm := range h.forms.ListByCircleForStaff(circleID) {
		rows = append(rows, []string{
			"form",
			currentForm.ID,
			currentForm.Name,
			visibilityLabel(currentForm.IsPublic),
			formStatus(currentForm.IsOpen),
			currentForm.CloseAt,
		})
	}
	for _, currentAnswer := range h.answers.ListByCircle(circleID) {
		rows = append(rows, []string{
			"answer",
			currentAnswer.ID,
			currentAnswer.FormID,
			"submitted",
			currentAnswer.UpdatedAt,
			singleLine(currentAnswer.Body),
		})
	}

	return writeCSV(rows)
}

func (h *staffAdminHandlers) buildStaffBundleZIP(circleID string, circleName string) ([]byte, error) {
	var buffer bytes.Buffer
	writer := zip.NewWriter(&buffer)

	pagesCSV, err := writeCSV(append([][]string{
		{"id", "title", "viewable_tags", "body", "is_pinned", "is_public", "notes", "published_at"},
	}, staffPageRows(h.pages.ListByCircleForStaff(circleID, ""))...))
	if err != nil {
		return nil, err
	}
	documentsCSV, err := writeCSV(append([][]string{
		{"id", "name", "filename", "size_bytes", "extension", "description", "visibility", "is_important", "notes", "created_at", "updated_at"},
	}, staffDocumentRows(h.documents.ListByCircleForStaff(circleID))...))
	if err != nil {
		return nil, err
	}
	formsCSV, err := writeCSV(append([][]string{
		{"id", "name", "visibility", "status", "open_at", "close_at"},
	}, staffFormRows(h.forms.ListByCircleForStaff(circleID))...))
	if err != nil {
		return nil, err
	}
	answersCSV, err := writeCSV(append([][]string{
		{"id", "form_id", "updated_at", "body"},
	}, answerRows(h.answers.ListByCircle(circleID))...))
	if err != nil {
		return nil, err
	}

	files := []struct {
		name    string
		content []byte
	}{
		{
			name:    "pages.csv",
			content: pagesCSV,
		},
		{
			name:    "documents.csv",
			content: documentsCSV,
		},
		{
			name:    "forms.csv",
			content: formsCSV,
		},
		{
			name:    "answers.csv",
			content: answersCSV,
		},
		{
			name:    "README.txt",
			content: []byte(fmt.Sprintf("PortalDots export bundle\ncircle_id=%s\ncircle_name=%s\n", circleID, circleName)),
		},
	}

	for _, file := range files {
		entry, err := writer.Create(file.name)
		if err != nil {
			return nil, err
		}
		if _, err := entry.Write(file.content); err != nil {
			return nil, err
		}
	}

	if err := writer.Close(); err != nil {
		return nil, err
	}

	return buffer.Bytes(), nil
}

func writeCSV(rows [][]string) ([]byte, error) {
	var buffer bytes.Buffer
	writer := csv.NewWriter(&buffer)

	for _, row := range rows {
		if err := writer.Write(row); err != nil {
			return nil, err
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}

	return buffer.Bytes(), nil
}

func staffPageRows(pages []page.Page) [][]string {
	rows := make([][]string, 0, len(pages))
	for _, currentPage := range pages {
		rows = append(rows, []string{
			currentPage.ID,
			currentPage.Title,
			strings.Join(currentPage.ViewableTags, ","),
			singleLine(currentPage.Body),
			boolString(currentPage.IsPinned),
			visibilityLabel(currentPage.IsPublic),
			singleLine(currentPage.Notes),
			currentPage.PublishedAt,
		})
	}
	return rows
}

func staffDocumentRows(documents []document.Document) [][]string {
	rows := make([][]string, 0, len(documents))
	for _, currentDocument := range documents {
		rows = append(rows, []string{
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

func staffFormRows(forms []form.Form) [][]string {
	rows := make([][]string, 0, len(forms))
	for _, currentForm := range forms {
		rows = append(rows, []string{
			currentForm.ID,
			currentForm.Name,
			visibilityLabel(currentForm.IsPublic),
			formStatus(currentForm.IsOpen),
			currentForm.OpenAt,
			currentForm.CloseAt,
		})
	}
	return rows
}

func answerRows(answers []answer.Answer) [][]string {
	rows := make([][]string, 0, len(answers))
	for _, currentAnswer := range answers {
		rows = append(rows, []string{
			currentAnswer.ID,
			currentAnswer.FormID,
			currentAnswer.UpdatedAt,
			singleLine(currentAnswer.Body),
		})
	}
	return rows
}

func visibilityLabel(isPublic bool) string {
	if isPublic {
		return "public"
	}
	return "private"
}

func formStatus(isOpen bool) string {
	if isOpen {
		return "open"
	}
	return "closed"
}

func pageStatus(isPinned bool) string {
	if isPinned {
		return "pinned"
	}
	return "regular"
}

func boolString(value bool) string {
	if value {
		return "true"
	}
	return "false"
}

func singleLine(value string) string {
	return strings.ReplaceAll(value, "\n", " ")
}
