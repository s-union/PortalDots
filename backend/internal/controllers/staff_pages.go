package controllers

import (
	"context"
	"net/http"
	"slices"
	"strings"

	"github.com/labstack/echo/v4"
	backendpage "github.com/s-union/PortalDots/backend/internal/domain/page"
)

type staffPageSummaryResponse struct {
	ID           string                 `json:"id"`
	Title        string                 `json:"title"`
	Body         string                 `json:"body"`
	Notes        string                 `json:"notes"`
	CreatedAt    string                 `json:"createdAt"`
	UpdatedAt    string                 `json:"updatedAt"`
	IsPinned     bool                   `json:"isPinned"`
	IsPublic     bool                   `json:"isPublic"`
	ViewableTags []string               `json:"viewableTags"`
	DocumentIDs  []string               `json:"documentIds"`
	Documents    []pageDocumentResponse `json:"documents"`
}

type staffPageDetailResponse = staffPageSummaryResponse

type mutateStaffPageRequest struct {
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

	pages := h.pages.ListForStaff(c.QueryParam("query"))
	response := make([]staffPageSummaryResponse, 0, len(pages))
	for _, currentPage := range pages {
		response = append(response, mapStaffPageSummary(currentPage, h.pageDocuments(currentPage.DocumentIDs, true)))
	}

	return c.JSON(http.StatusOK, response)
}

func (h *staffPageHandlers) getStaffPage(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canReadPages)
	if !ok {
		return statusError(c, status)
	}

	pageValue, found := h.pages.FindForStaff(c.Param("pageID"))
	if !found {
		return errorJSON(c, http.StatusNotFound, "page_not_found")
	}

	response := mapStaffPageDetail(pageValue)
	response.Documents = h.pageDocuments(pageValue.DocumentIDs, true)
	return c.JSON(http.StatusOK, response)
}

func (h *staffPageHandlers) createStaffPage(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditPages)
	if !ok {
		return statusError(c, status)
	}

	request, validationErrors, valid := bindStaffPageRequest(c)
	if !valid {
		return validationError(c, validationErrors)
	}
	if request.SendEmails && !canSendPageEmails(currentSession.User) {
		return errorJSON(c, http.StatusForbidden, "forbidden")
	}
	if documentErrors := h.validateStaffPageDocumentIDs(request.DocumentIDs, nil); len(documentErrors) > 0 {
		return validationError(c, documentErrors)
	}

	created := h.pages.Create(
		request.Title,
		request.Body,
		request.Notes,
		request.IsPublic,
		request.IsPinned,
		request.ViewableTags,
		request.DocumentIDs,
	)
	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.page.created",
		"page",
		created.ID,
		"",
		buildActivitySummary("staff がページを作成しました", created.Title),
	)
	if request.SendEmails {
		h.enqueuePageMail(c.Request().Context(), currentSession.User.ID, created)
	}
	return c.JSON(http.StatusCreated, mapStaffPageSummary(created, h.pageDocuments(created.DocumentIDs, true)))
}

func (h *staffPageHandlers) updateStaffPage(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditPages)
	if !ok {
		return statusError(c, status)
	}

	pageValue, found := h.pages.FindForStaff(c.Param("pageID"))
	if !found {
		return errorJSON(c, http.StatusNotFound, "page_not_found")
	}

	request, validationErrors, valid := bindStaffPageRequest(c)
	if !valid {
		return validationError(c, validationErrors)
	}
	if request.SendEmails && !canSendPageEmails(currentSession.User) {
		return errorJSON(c, http.StatusForbidden, "forbidden")
	}
	if documentErrors := h.validateStaffPageDocumentIDs(request.DocumentIDs, pageValue.DocumentIDs); len(documentErrors) > 0 {
		return validationError(c, documentErrors)
	}

	updated, found := h.pages.Update(
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
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.page.updated",
		"page",
		updated.ID,
		"",
		buildActivitySummary("staff がページを更新しました", updated.Title),
	)
	if request.SendEmails {
		h.enqueuePageMail(c.Request().Context(), currentSession.User.ID, updated)
	}

	return c.JSON(http.StatusOK, mapStaffPageSummary(updated, h.pageDocuments(updated.DocumentIDs, true)))
}

func (h *staffPageHandlers) deleteStaffPage(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canDeletePages)
	if !ok {
		return statusError(c, status)
	}

	pageID := c.Param("pageID")
	currentPage, found := h.pages.FindForStaff(pageID)
	if !found {
		return errorJSON(c, http.StatusNotFound, "page_not_found")
	}

	if deleted := h.pages.Delete(pageID); !deleted {
		return errorJSON(c, http.StatusNotFound, "page_not_found")
	}

	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.page.deleted",
		"page",
		pageID,
		"",
		buildActivitySummary("staff がページを削除しました", currentPage.Title),
	)

	return c.NoContent(http.StatusNoContent)
}

func (h *staffPageHandlers) patchStaffPagePin(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditPages)
	if !ok {
		return statusError(c, status)
	}

	currentPage, found := h.pages.FindForStaff(c.Param("pageID"))
	if !found {
		return errorJSON(c, http.StatusNotFound, "page_not_found")
	}

	var request patchStaffPagePinRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	updated, found := h.pages.SetPinned(c.Param("pageID"), request.IsPinned)
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
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		action,
		"page",
		updated.ID,
		"",
		buildActivitySummary(summary, updated.Title),
	)

	if currentPage.ID == "" {
		return errorJSON(c, http.StatusNotFound, "page_not_found")
	}

	return c.JSON(http.StatusOK, mapStaffPageSummary(updated, h.pageDocuments(updated.DocumentIDs, true)))
}

func (h *staffPageHandlers) downloadStaffPagesCSV(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canExportPages)
	if !ok {
		return statusError(c, status)
	}

	pages := h.pages.ListForStaff("")
	csvBytes, err := writeCSV(append([][]string{
		{"お知らせID", "タイトル", "閲覧可能なタグ", "本文", "固定", "公開", "スタッフ用メモ", "作成日時", "更新日時"},
	}, staffPageRows(pages)...))
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	filename := "staff-pages.csv"
	return csvResponse(c, filename, csvBytes)
}

func bindStaffPageRequest(c echo.Context) (mutateStaffPageRequest, map[string][]string, bool) {
	var request mutateStaffPageRequest
	if err := c.Bind(&request); err != nil {
		return mutateStaffPageRequest{}, map[string][]string{
			"request": {"お知らせ情報が不正です"},
		}, false
	}

	request.Title = strings.TrimSpace(request.Title)
	request.Body = strings.TrimSpace(request.Body)
	request.Notes = strings.TrimSpace(request.Notes)
	request.ViewableTags = normalizeTags(request.ViewableTags)
	request.DocumentIDs = normalizePageDocumentIDs(request.DocumentIDs)

	errors := map[string][]string{}
	if request.Title == "" {
		errors["title"] = []string{"タイトルを入力してください"}
	}
	if request.Body == "" {
		errors["body"] = []string{"本文を入力してください"}
	}
	if len(errors) > 0 {
		return mutateStaffPageRequest{}, errors, false
	}

	return request, nil, true
}

func mapStaffPageSummary(currentPage backendpage.Page, documents []pageDocumentResponse) staffPageSummaryResponse {
	return staffPageSummaryResponse{
		ID:           currentPage.ID,
		Title:        currentPage.Title,
		Body:         currentPage.Body,
		Notes:        currentPage.Notes,
		CreatedAt:    currentPage.CreatedAt,
		UpdatedAt:    currentPage.UpdatedAt,
		IsPinned:     currentPage.IsPinned,
		IsPublic:     currentPage.IsPublic,
		ViewableTags: slices.Clone(currentPage.ViewableTags),
		DocumentIDs:  slices.Clone(currentPage.DocumentIDs),
		Documents:    slices.Clone(documents),
	}
}

func mapStaffPageDetail(currentPage backendpage.Page) staffPageDetailResponse {
	return staffPageDetailResponse{
		ID:           currentPage.ID,
		Title:        currentPage.Title,
		Body:         currentPage.Body,
		Notes:        currentPage.Notes,
		CreatedAt:    currentPage.CreatedAt,
		UpdatedAt:    currentPage.UpdatedAt,
		IsPinned:     currentPage.IsPinned,
		IsPublic:     currentPage.IsPublic,
		ViewableTags: slices.Clone(currentPage.ViewableTags),
		DocumentIDs:  slices.Clone(currentPage.DocumentIDs),
		Documents:    nil,
	}
}

func staffPageRows(pages []backendpage.Page) [][]string {
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
			currentPage.CreatedAt,
			currentPage.UpdatedAt,
		})
	}
	return rows
}

func (h *staffPageHandlers) pageDocuments(documentIDs []string, forStaff bool) []pageDocumentResponse {
	return pageDocuments(h.documents, documentIDs, forStaff, false)
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

func (h *staffPageHandlers) validateStaffPageDocumentIDs(documentIDs []string, existingDocumentIDs []string) map[string][]string {
	for _, documentID := range documentIDs {
		if slices.Contains(existingDocumentIDs, documentID) {
			continue
		}
		if _, found := h.documents.FindForStaff(documentID); !found {
			return map[string][]string{
				"documentIds": {"存在しない配布資料は選択できません"},
			}
		}
	}

	return nil
}

func (h *staffPageHandlers) enqueuePageMail(ctx context.Context, createdByUserID string, currentPage backendpage.Page) {
	recipients := h.pageMailRecipients(currentPage.ViewableTags)
	if len(recipients) == 0 {
		return
	}

	body := currentPage.Body
	documents := h.pageDocuments(currentPage.DocumentIDs, false)
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

	job, err := h.mails.Enqueue(ctx, "", createdByUserID, currentPage.Title, body, recipients)
	if err != nil {
		return
	}
	logQueuedMail("staff_page", job.ID, "", createdByUserID, job.Subject, job.Body, job.Recipients, h.allowInsecureDefaults)
	recordActivity(
		ctx,
		h.activities,
		createdByUserID,
		"staff.mail.queued",
		"mail_job",
		job.ID,
		"",
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
			if pageVisibleToCircleTags(viewableTags, effectiveCircleTags(currentCircle, h.participationTypes)) {
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

	return collectUsersEmailRecipients(users)
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
