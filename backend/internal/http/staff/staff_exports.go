//go:build ignore

package staffhttp

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
)

func (h *staffAdminHandlers) downloadStaffSummaryCSV(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canUseStaffExports)
	if !ok {
		return statusError(c, status)
	}

	csvBytes, err := h.buildStaffSummaryCSV()
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	filename := "staff-summary.csv"
	c.Response().Header().Set(echo.HeaderContentType, "text/csv; charset=utf-8")
	c.Response().Header().Set(echo.HeaderContentDisposition, fmt.Sprintf("attachment; filename=%q", filename))
	return c.Blob(http.StatusOK, "text/csv; charset=utf-8", csvBytes)
}

func (h *staffAdminHandlers) downloadStaffBundleZIP(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canUseStaffExports)
	if !ok {
		return statusError(c, status)
	}

	zipBytes, err := h.buildStaffBundleZIP()
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	filename := "staff-bundle.zip"
	c.Response().Header().Set(echo.HeaderContentType, "application/zip")
	c.Response().Header().Set(echo.HeaderContentDisposition, fmt.Sprintf("attachment; filename=%q", filename))
	return c.Blob(http.StatusOK, "application/zip", zipBytes)
}

func (h *staffAdminHandlers) buildStaffSummaryCSV() ([]byte, error) {
	circles, _, err := listStaffManagedCircles(h.circles)
	if err != nil {
		return nil, err
	}

	rows := [][]string{{
		"resource_type",
		"circle_id",
		"circle_name",
		"id",
		"name",
		"visibility",
		"status",
		"detail",
	}}

	for _, currentPage := range h.pages.ListForStaff("") {
		rows = append(rows, []string{
			"page",
			"",
			"",
			currentPage.ID,
			currentPage.Title,
			visibilityLabel(currentPage.IsPublic),
			pageStatus(currentPage.IsPinned),
			currentPage.UpdatedAt,
		})
	}
	for _, currentCircle := range circles {
		for _, currentDocument := range h.documents.ListByCircleForStaff(currentCircle.ID) {
			rows = append(rows, []string{
				"document",
				currentCircle.ID,
				currentCircle.Name,
				currentDocument.ID,
				currentDocument.Name,
				visibilityLabel(currentDocument.IsPublic),
				currentDocument.Filename,
				currentDocument.MimeType,
			})
		}
		for _, currentForm := range h.forms.ListByCircleForStaff(currentCircle.ID) {
			rows = append(rows, []string{
				"form",
				currentCircle.ID,
				currentCircle.Name,
				currentForm.ID,
				currentForm.Name,
				visibilityLabel(currentForm.IsPublic),
				formStatus(currentForm.IsOpen),
				currentForm.CloseAt,
			})
		}
		for _, currentAnswer := range h.answers.ListByCircle(currentCircle.ID) {
			rows = append(rows, []string{
				"answer",
				currentCircle.ID,
				currentCircle.Name,
				currentAnswer.ID,
				currentAnswer.FormID,
				"submitted",
				currentAnswer.UpdatedAt,
				singleLine(currentAnswer.Body),
			})
		}
	}

	return writeCSV(rows)
}

func (h *staffAdminHandlers) buildStaffBundleZIP() ([]byte, error) {
	circles, _, err := listStaffManagedCircles(h.circles)
	if err != nil {
		return nil, err
	}
	circleNames := make(map[string]string, len(circles))
	pages := h.pages.ListForStaff("")
	documents := make([]document.Document, 0)
	forms := make([]form.Form, 0)
	answers := make([]answer.Answer, 0)
	for _, currentCircle := range circles {
		circleNames[currentCircle.ID] = currentCircle.Name
		documents = append(documents, h.documents.ListByCircleForStaff(currentCircle.ID)...)
		forms = append(forms, h.forms.ListByCircleForStaff(currentCircle.ID)...)
		answers = append(answers, h.answers.ListByCircle(currentCircle.ID)...)
	}

	var buffer bytes.Buffer
	writer := zip.NewWriter(&buffer)

	pagesCSV, err := writeCSV(append([][]string{
		{"お知らせID", "タイトル", "閲覧可能なタグ", "本文", "固定", "公開", "スタッフ用メモ", "作成日時", "更新日時"},
	}, staffPageRows(pages)...))
	if err != nil {
		return nil, err
	}
	documentsCSV, err := writeCSV(append([][]string{
		{"circle_id", "circle_name", "id", "name", "filename", "size_bytes", "extension", "description", "visibility", "is_important", "notes", "created_at", "updated_at"},
	}, staffDocumentRowsWithCircles(documents, circleNames)...))
	if err != nil {
		return nil, err
	}
	formsCSV, err := writeCSV(append([][]string{
		{"circle_id", "circle_name", "id", "name", "visibility", "status", "open_at", "close_at"},
	}, staffFormRowsWithCircles(forms, circleNames)...))
	if err != nil {
		return nil, err
	}
	answersCSV, err := writeCSV(append([][]string{
		{"circle_id", "circle_name", "id", "form_id", "updated_at", "body"},
	}, answerRowsWithCircles(answers, circleNames)...))
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
			content: []byte("PortalDots export bundle\nscope=all_managed_circles\n"),
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

// UTF-8 BOM for Excel compatibility with Japanese characters
var utf8BOM = []byte{0xEF, 0xBB, 0xBF}

func writeCSV(rows [][]string) ([]byte, error) {
	var buffer bytes.Buffer
	// Write UTF-8 BOM so that Excel correctly interprets the CSV as UTF-8
	buffer.Write(utf8BOM)

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

func staffFormRowsWithCircles(forms []form.Form, circleNames map[string]string) [][]string {
	rows := make([][]string, 0, len(forms))
	for _, currentForm := range forms {
		rows = append(rows, []string{
			currentForm.CircleID,
			circleNames[currentForm.CircleID],
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

func answerRowsWithCircles(answers []answer.Answer, circleNames map[string]string) [][]string {
	rows := make([][]string, 0, len(answers))
	for _, currentAnswer := range answers {
		rows = append(rows, []string{
			currentAnswer.CircleID,
			circleNames[currentAnswer.CircleID],
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
