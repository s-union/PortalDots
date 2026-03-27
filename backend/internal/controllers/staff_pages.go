package controllers

import (
	"fmt"
	"net/http"
	"slices"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	backendpage "github.com/s-union/PortalDots/backend/internal/domain/page"
)

type staffPageSummaryResponse struct {
	Circle      staffManagedCircleResponse `json:"circle"`
	ID          string                     `json:"id"`
	Title       string                     `json:"title"`
	PublishedAt string                     `json:"publishedAt"`
	IsPinned    bool                       `json:"isPinned"`
	IsPublic    bool                       `json:"isPublic"`
}

type staffPageDetailResponse struct {
	Circle       staffManagedCircleResponse `json:"circle"`
	ID           string                     `json:"id"`
	Title        string                     `json:"title"`
	Body         string                     `json:"body"`
	Notes        string                     `json:"notes"`
	PublishedAt  string                     `json:"publishedAt"`
	IsPinned     bool                       `json:"isPinned"`
	IsPublic     bool                       `json:"isPublic"`
	ViewableTags []string                   `json:"viewableTags"`
	DocumentIDs  []string                   `json:"documentIds"`
	Documents    []pageDocumentResponse     `json:"documents"`
}

type mutateStaffPageRequest struct {
	CircleID     string   `json:"circleId"`
	Title        string   `json:"title"`
	Body         string   `json:"body"`
	Notes        string   `json:"notes"`
	IsPinned     bool     `json:"isPinned"`
	IsPublic     bool     `json:"isPublic"`
	ViewableTags []string `json:"viewableTags"`
	DocumentIDs  []string `json:"documentIds"`
	SendEmails   bool     `json:"sendEmails"`
}

type patchStaffPagePinRequest struct {
	IsPinned bool `json:"isPinned"`
}

func (h *staffPageHandlers) listStaffPages(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canReadPages)
	if !ok {
		return statusError(c, status)
	}

	_, circlesByID, pages, err := h.listManagedStaffPages(c.QueryParam("query"))
	if err != nil {
		return internalError(c)
	}
	response := make([]staffPageSummaryResponse, 0, len(pages))
	for _, currentPage := range pages {
		response = append(response, mapStaffPageSummary(currentPage, circlesByID[currentPage.CircleID]))
	}

	return c.JSON(http.StatusOK, response)
}

func (h *staffPageHandlers) getStaffPage(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canReadPages)
	if !ok {
		return statusError(c, status)
	}

	pageValue, circleValue, err := h.findManagedStaffPage(c.Param("pageID"))
	if err != nil {
		return internalError(c)
	}
	if pageValue.ID == "" {
		return errorJSON(c, http.StatusNotFound, "page_not_found")
	}

	response := mapStaffPageDetail(pageValue, mapStaffManagedCircle(circleValue))
	response.Documents = h.pageDocuments(pageValue.CircleID, pageValue.DocumentIDs, true)
	return c.JSON(http.StatusOK, response)
}

func (h *staffPageHandlers) createStaffPage(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditPages)
	if !ok {
		return statusError(c, status)
	}

	request, validationErrors, valid := bindStaffPageRequest(c, true)
	if !valid {
		return validationError(c, validationErrors)
	}
	if request.SendEmails && !canSendPageEmails(currentSession.User) {
		return errorJSON(c, http.StatusForbidden, "forbidden")
	}
	if _, err := h.circles.Find(request.CircleID); err != nil {
		return validationError(c, map[string][]string{
			"circleId": {"企画を選択してください"},
		})
	}

	created := h.pages.Create(
		request.CircleID,
		request.Title,
		request.Body,
		request.Notes,
		request.IsPublic,
		request.IsPinned,
		request.ViewableTags,
		request.DocumentIDs,
	)
	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.page.created",
		"page",
		created.ID,
		created.CircleID,
		buildActivitySummary("staff がページを作成しました", created.Title),
	)
	if request.SendEmails {
		h.enqueuePageMail(created.CircleID, currentSession.User.ID, created)
	}
	return c.JSON(http.StatusCreated, mapStaffPageSummary(created, staffManagedCircleResponse{ID: created.CircleID}))
}

func (h *staffPageHandlers) updateStaffPage(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditPages)
	if !ok {
		return statusError(c, status)
	}

	pageValue, circleValue, err := h.findManagedStaffPage(c.Param("pageID"))
	if err != nil {
		return internalError(c)
	}
	if pageValue.ID == "" {
		return errorJSON(c, http.StatusNotFound, "page_not_found")
	}

	request, validationErrors, valid := bindStaffPageRequest(c, false)
	if !valid {
		return validationError(c, validationErrors)
	}
	if request.SendEmails && !canSendPageEmails(currentSession.User) {
		return errorJSON(c, http.StatusForbidden, "forbidden")
	}

	updated, found := h.pages.Update(
		pageValue.CircleID,
		c.Param("pageID"),
		request.Title,
		request.Body,
		request.Notes,
		request.IsPublic,
		request.IsPinned,
		request.ViewableTags,
		request.DocumentIDs,
	)
	if !found {
		return errorJSON(c, http.StatusNotFound, "page_not_found")
	}

	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.page.updated",
		"page",
		updated.ID,
		updated.CircleID,
		buildActivitySummary("staff がページを更新しました", updated.Title),
	)
	if request.SendEmails {
		h.enqueuePageMail(updated.CircleID, currentSession.User.ID, updated)
	}

	return c.JSON(http.StatusOK, mapStaffPageSummary(updated, mapStaffManagedCircle(circleValue)))
}

func (h *staffPageHandlers) deleteStaffPage(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canDeletePages)
	if !ok {
		return statusError(c, status)
	}

	pageID := c.Param("pageID")
	currentPage, _, err := h.findManagedStaffPage(pageID)
	if err != nil {
		return internalError(c)
	}
	if currentPage.ID == "" {
		return errorJSON(c, http.StatusNotFound, "page_not_found")
	}

	if deleted := h.pages.Delete(currentPage.CircleID, pageID); !deleted {
		return errorJSON(c, http.StatusNotFound, "page_not_found")
	}

	recordActivity(
		h.activities,
		currentSession.User.ID,
		"staff.page.deleted",
		"page",
		pageID,
		currentPage.CircleID,
		buildActivitySummary("staff がページを削除しました", currentPage.Title),
	)

	return c.NoContent(http.StatusNoContent)
}

func (h *staffPageHandlers) patchStaffPagePin(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditPages)
	if !ok {
		return statusError(c, status)
	}

	currentPage, circleValue, err := h.findManagedStaffPage(c.Param("pageID"))
	if err != nil {
		return internalError(c)
	}
	if currentPage.ID == "" {
		return errorJSON(c, http.StatusNotFound, "page_not_found")
	}

	var request patchStaffPagePinRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	updated, found := h.pages.SetPinned(currentPage.CircleID, c.Param("pageID"), request.IsPinned)
	if !found {
		return errorJSON(c, http.StatusNotFound, "page_not_found")
	}

	action := "staff.page.unpinned"
	summary := "staff がお知らせの固定表示を解除しました"
	if updated.IsPinned {
		action = "staff.page.pinned"
		summary = "staff がお知らせを固定表示しました"
	}

	recordActivity(
		h.activities,
		currentSession.User.ID,
		action,
		"page",
		updated.ID,
		updated.CircleID,
		buildActivitySummary(summary, updated.Title),
	)

	return c.JSON(http.StatusOK, mapStaffPageSummary(updated, mapStaffManagedCircle(circleValue)))
}

func (h *staffPageHandlers) downloadStaffPagesCSV(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canExportPages)
	if !ok {
		return statusError(c, status)
	}

	circles, _, pages, err := h.listManagedStaffPages("")
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	circleNames := make(map[string]string, len(circles))
	for _, currentCircle := range circles {
		circleNames[currentCircle.ID] = currentCircle.Name
	}

	csvBytes, err := writeCSV(append([][]string{
		{"circle_id", "circle_name", "id", "title", "viewable_tags", "body", "is_pinned", "is_public", "notes", "published_at"},
	}, staffPageRowsWithCircles(pages, circleNames)...))
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	filename := "staff-pages.csv"
	c.Response().Header().Set(echo.HeaderContentType, "text/csv; charset=utf-8")
	c.Response().Header().Set(echo.HeaderContentDisposition, fmt.Sprintf("attachment; filename=%q", filename))
	return c.Blob(http.StatusOK, "text/csv; charset=utf-8", csvBytes)
}

func bindStaffPageRequest(c echo.Context, circleRequired bool) (mutateStaffPageRequest, map[string][]string, bool) {
	var request mutateStaffPageRequest
	if err := c.Bind(&request); err != nil {
		return mutateStaffPageRequest{}, map[string][]string{
			"request": {"お知らせ情報が不正です"},
		}, false
	}

	request.CircleID = strings.TrimSpace(request.CircleID)
	request.Title = strings.TrimSpace(request.Title)
	request.Body = strings.TrimSpace(request.Body)
	request.Notes = strings.TrimSpace(request.Notes)
	request.ViewableTags = normalizeTags(request.ViewableTags)
	request.DocumentIDs = normalizePageDocumentIDs(request.DocumentIDs)

	errors := map[string][]string{}
	if request.Title == "" {
		errors["title"] = []string{"タイトルを入力してください"}
	}
	if circleRequired && request.CircleID == "" {
		errors["circleId"] = []string{"企画を選択してください"}
	}
	if request.Body == "" {
		errors["body"] = []string{"本文を入力してください"}
	}
	if len(errors) > 0 {
		return mutateStaffPageRequest{}, errors, false
	}

	return request, nil, true
}

func mapStaffPageSummary(currentPage backendpage.Page, circleValue staffManagedCircleResponse) staffPageSummaryResponse {
	return staffPageSummaryResponse{
		Circle:      circleValue,
		ID:          currentPage.ID,
		Title:       currentPage.Title,
		PublishedAt: currentPage.PublishedAt,
		IsPinned:    currentPage.IsPinned,
		IsPublic:    currentPage.IsPublic,
	}
}

func mapStaffPageDetail(currentPage backendpage.Page, circleValue staffManagedCircleResponse) staffPageDetailResponse {
	return staffPageDetailResponse{
		Circle:       circleValue,
		ID:           currentPage.ID,
		Title:        currentPage.Title,
		Body:         currentPage.Body,
		Notes:        currentPage.Notes,
		PublishedAt:  currentPage.PublishedAt,
		IsPinned:     currentPage.IsPinned,
		IsPublic:     currentPage.IsPublic,
		ViewableTags: slices.Clone(currentPage.ViewableTags),
		DocumentIDs:  slices.Clone(currentPage.DocumentIDs),
		Documents:    nil,
	}
}

func (h *staffPageHandlers) listManagedStaffPages(query string) ([]circle.Circle, map[string]staffManagedCircleResponse, []backendpage.Page, error) {
	circles, circlesByID, err := listStaffManagedCircles(h.circles)
	if err != nil {
		return nil, nil, nil, err
	}

	pages := make([]backendpage.Page, 0)
	for _, currentCircle := range circles {
		pages = append(pages, h.pages.ListByCircleForStaff(currentCircle.ID, query)...)
	}

	return circles, circlesByID, pages, nil
}

func (h *staffPageHandlers) findManagedStaffPage(pageID string) (backendpage.Page, circle.Circle, error) {
	circles, _, err := listStaffManagedCircles(h.circles)
	if err != nil {
		return backendpage.Page{}, circle.Circle{}, err
	}

	for _, currentCircle := range circles {
		if currentPage, found := h.pages.FindByCircleForStaff(currentCircle.ID, pageID); found {
			return currentPage, currentCircle, nil
		}
	}

	return backendpage.Page{}, circle.Circle{}, nil
}

func staffPageRowsWithCircles(pages []backendpage.Page, circleNames map[string]string) [][]string {
	rows := make([][]string, 0, len(pages))
	for _, currentPage := range pages {
		rows = append(rows, []string{
			currentPage.CircleID,
			circleNames[currentPage.CircleID],
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

func (h *staffPageHandlers) pageDocuments(circleID string, documentIDs []string, forStaff bool) []pageDocumentResponse {
	return pageDocuments(h.documents, circleID, documentIDs, forStaff, false)
}

func normalizePageDocumentIDs(documentIDs []string) []string {
	normalized := make([]string, 0, len(documentIDs))
	seen := map[string]struct{}{}
	for _, documentID := range documentIDs {
		trimmed := strings.TrimSpace(documentID)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		normalized = append(normalized, trimmed)
	}

	return normalized
}

func (h *staffPageHandlers) enqueuePageMail(circleID, createdByUserID string, currentPage backendpage.Page) {
	recipients := h.pageMailRecipients(currentPage.ViewableTags)
	if len(recipients) == 0 {
		return
	}

	body := currentPage.Body
	documents := h.pageDocuments(circleID, currentPage.DocumentIDs, false)
	if len(documents) > 0 {
		lines := make([]string, 0, len(documents)+2)
		lines = append(lines, "", "", "関連する配布資料")
		for _, document := range documents {
			line := "- " + document.Name
			if document.Description != "" {
				line += ": " + strings.ReplaceAll(document.Description, "\n", " ")
			}
			lines = append(lines, line)
		}
		body += strings.Join(lines, "\n")
	}

	job := h.mails.Enqueue(circleID, createdByUserID, currentPage.Title, body, recipients)
	recordActivity(
		h.activities,
		createdByUserID,
		"staff.mail.queued",
		"mail_job",
		job.ID,
		circleID,
		buildActivitySummary("staff がページのお知らせメールをキューに追加しました", currentPage.Title),
	)
}

func (h *staffPageHandlers) pageMailRecipients(viewableTags []string) []string {
	circleIDs := []string{}
	if len(viewableTags) > 0 {
		circles, err := h.circles.ListForStaff()
		if err != nil {
			return nil
		}

		for _, currentCircle := range circles {
			if pageVisibleToCircleTags(viewableTags, currentCircle.Tags) {
				circleIDs = append(circleIDs, currentCircle.ID)
			}
		}
		if len(circleIDs) == 0 {
			return nil
		}
	}

	users, err := h.users.ListVerifiedByCircleIDs(circleIDs)
	if err != nil {
		return nil
	}

	recipients := []string{}
	for _, userValue := range users {
		for _, loginID := range userValue.LoginIDs {
			if strings.Contains(loginID, "@") {
				recipients = append(recipients, loginID)
			}
		}
	}

	return normalizeRecipients(recipients)
}

func pageVisibleToCircleTags(viewableTags []string, circleTags []string) bool {
	if len(viewableTags) == 0 {
		return true
	}

	for _, viewableTag := range viewableTags {
		for _, circleTag := range circleTags {
			if strings.EqualFold(viewableTag, circleTag) {
				return true
			}
		}
	}

	return false
}
