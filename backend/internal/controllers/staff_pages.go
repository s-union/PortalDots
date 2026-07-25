package controllers

import (
	"context"
	"log/slog"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/labstack/echo/v5"
	backendpage "github.com/s-union/PortalDots/backend/internal/domain/page"
	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

type staffPageSummaryResponse struct {
	ID           string                 `json:"id"`
	Title        string                 `json:"title"`
	Body         string                 `json:"body"`
	Notes        string                 `json:"notes"`
	CreatedAt    string                 `json:"createdAt"`
	UpdatedAt    string                 `json:"updatedAt"`
	PublishedAt  string                 `json:"publishedAt"`
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
	PublishedAt  *string  `json:"publishedAt"`
}

type patchStaffPagePinRequest struct {
	IsPinned bool `json:"isPinned"`
}

func (h *staffPageHandlers) listStaffPages(c *echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canReadPages)
	if !ok {
		return statusError(c, status)
	}
	filterQueries, filterMode, err := parseStaffListFilters(c.QueryParam("queries"), c.QueryParam("mode"), staffPageFilterableFields)
	if err != nil {
		return validationError(c, map[string][]string{"queries": {"絞り込み条件が正しくありません"}})
	}

	pages := h.pages.ListForStaff(c.Request().Context(), c.QueryParam("query"))
	response := make([]staffPageSummaryResponse, 0, len(pages))
	for _, currentPage := range pages {
		item := mapStaffPageSummary(currentPage, h.pageDocuments(currentPage.DocumentIDs, true))
		if !matchesStaffListFilters(staffPageSummaryFilterResolver(item), filterQueries, filterMode) {
			continue
		}
		response = append(response, item)
	}

	return c.JSON(http.StatusOK, response)
}

var staffPageFilterableFields = map[string]staffListFilterFieldType{
	"id":          staffListFilterFieldTypeString,
	"title":       staffListFilterFieldTypeString,
	"isPinned":    staffListFilterFieldTypeBool,
	"isPublic":    staffListFilterFieldTypeBool,
	"body":        staffListFilterFieldTypeString,
	"notes":       staffListFilterFieldTypeString,
	"createdAt":   staffListFilterFieldTypeString,
	"updatedAt":   staffListFilterFieldTypeString,
	"publishedAt": staffListFilterFieldTypeString,
}

func staffPageSummaryFilterResolver(item staffPageSummaryResponse) func(string) (string, bool) {
	return func(key string) (string, bool) {
		switch key {
		case "id":
			return item.ID, true
		case "title":
			return item.Title, true
		case "isPinned":
			return boolString(item.IsPinned), true
		case "isPublic":
			return boolString(item.IsPublic), true
		case "body":
			return item.Body, true
		case "notes":
			return item.Notes, true
		case "createdAt":
			return item.CreatedAt, true
		case "updatedAt":
			return item.UpdatedAt, true
		case "publishedAt":
			return item.PublishedAt, true
		default:
			return "", false
		}
	}
}

func (h *staffPageHandlers) getStaffPage(c *echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canReadPages)
	if !ok {
		return statusError(c, status)
	}

	pageValue, found := h.pages.FindForStaff(c.Request().Context(), c.Param("pageID"))
	if !found {
		return errorJSON(c, http.StatusNotFound, "page_not_found")
	}

	response := mapStaffPageDetail(pageValue)
	response.Documents = h.pageDocuments(pageValue.DocumentIDs, true)
	return c.JSON(http.StatusOK, response)
}

func (h *staffPageHandlers) createStaffPage(c *echo.Context) error {
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
	publishedAt, publishedAtErrors, validPublishedAt := parseStaffPagePublishedAt(request.PublishedAt)
	if !validPublishedAt {
		return validationError(c, publishedAtErrors)
	}

	created := h.pages.Create(c.Request().Context(),
		request.Title,
		request.Body,
		request.Notes,
		request.IsPublic,
		request.IsPinned,
		request.ViewableTags,
		request.DocumentIDs,
		publishedAt,
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
	if canSendPageEmails(currentSession.User) {
		h.schedulePageMail(c.Request().Context(), currentSession.User.ID, created.ID, request.SendEmails)
	}

	return c.JSON(http.StatusCreated, mapStaffPageSummary(created, h.pageDocuments(created.DocumentIDs, true)))
}

func (h *staffPageHandlers) updateStaffPage(c *echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditPages)
	if !ok {
		return statusError(c, status)
	}

	pageValue, found := h.pages.FindForStaff(c.Request().Context(), c.Param("pageID"))
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
	publishedAt, publishedAtErrors, validPublishedAt := parseStaffPagePublishedAt(request.PublishedAt)
	if !validPublishedAt {
		return validationError(c, publishedAtErrors)
	}

	updated, found := h.pages.Update(c.Request().Context(),
		c.Param("pageID"),
		request.Title,
		request.Body,
		request.Notes,
		request.IsPublic,
		request.IsPinned,
		request.ViewableTags,
		request.DocumentIDs,
		publishedAt,
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
	// An operator without the mail capability must not be able to create,
	// retarget or silence a pending announcement mail by editing the page.
	if canSendPageEmails(currentSession.User) {
		h.schedulePageMail(c.Request().Context(), currentSession.User.ID, updated.ID, request.SendEmails)
	}

	return c.JSON(http.StatusOK, mapStaffPageSummary(updated, h.pageDocuments(updated.DocumentIDs, true)))
}

func (h *staffPageHandlers) deleteStaffPage(c *echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canDeletePages)
	if !ok {
		return statusError(c, status)
	}

	pageID := c.Param("pageID")
	currentPage, found := h.pages.FindForStaff(c.Request().Context(), pageID)
	if !found {
		return errorJSON(c, http.StatusNotFound, "page_not_found")
	}

	if deleted := h.pages.Delete(c.Request().Context(), pageID); !deleted {
		return errorJSON(c, http.StatusNotFound, "page_not_found")
	}

	// Any pending announcement mail goes with the page: the scheduled mail row
	// references it with ON DELETE CASCADE, and the dispatcher refuses to send
	// mail for a page it cannot read back.

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

func (h *staffPageHandlers) patchStaffPagePin(c *echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canEditPages)
	if !ok {
		return statusError(c, status)
	}

	currentPage, found := h.pages.FindForStaff(c.Request().Context(), c.Param("pageID"))
	if !found {
		return errorJSON(c, http.StatusNotFound, "page_not_found")
	}

	var request patchStaffPagePinRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	updated, found := h.pages.SetPinned(c.Request().Context(), c.Param("pageID"), request.IsPinned)
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

func (h *staffPageHandlers) downloadStaffPagesCSV(c *echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canExportPages)
	if !ok {
		return statusError(c, status)
	}

	pages := h.pages.ListForStaff(c.Request().Context(), "")
	csvBytes, err := writeCSV(append([][]string{
		{"お知らせID", "タイトル", "閲覧可能なタグ", "本文", "固定", "公開", "スタッフ用メモ", "作成日時", "更新日時"},
	}, staffPageRows(pages)...))
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	filename := "staff-pages.csv"
	return csvResponse(c, filename, csvBytes)
}

func bindStaffPageRequest(c *echo.Context) (mutateStaffPageRequest, map[string][]string, bool) {
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

// parseStaffPagePublishedAt reads the requested publish time: a null publishes
// the page immediately, an RFC 3339 timestamp schedules it for that time.
func parseStaffPagePublishedAt(value *string) (time.Time, map[string][]string, bool) {
	if value == nil {
		return time.Now().UTC(), nil, true
	}
	parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(*value))
	if err != nil || parsed.IsZero() {
		return time.Time{}, map[string][]string{"publishedAt": {"公開日時が正しくありません"}}, false
	}
	return parsed.UTC(), nil, true
}

func mapStaffPageSummary(currentPage backendpage.Page, documents []pageDocumentResponse) staffPageSummaryResponse {
	return staffPageSummaryResponse{
		ID:           currentPage.ID,
		Title:        currentPage.Title,
		Body:         currentPage.Body,
		Notes:        currentPage.Notes,
		CreatedAt:    currentPage.CreatedAt,
		UpdatedAt:    currentPage.UpdatedAt,
		PublishedAt:  currentPage.PublishedAt,
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
		PublishedAt:  currentPage.PublishedAt,
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
	return pageDocuments(h.documents, documentIDs, forStaff, false, nil)
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

// schedulePageMail records or clears the intent to send the announcement email
// of a page.
//
// Only the intent is stored: the recipients, the body and the send time are all
// derived from the live page when the mail is dispatched. Unpublishing,
// rescheduling or deleting the page therefore needs no counterpart here.
//
// Callers must already have checked that the operator may send page mail; an
// operator without that capability must leave an existing intent untouched.
func (h *staffPageHandlers) schedulePageMail(ctx context.Context, actorUserID, pageID string, sendEmails bool) {
	var err error
	if sendEmails {
		// The job ID is only used when no intent exists yet: an already
		// scheduled page keeps its original one so that a retried dispatch
		// stays idempotent.
		err = h.scheduledPageMails.Schedule(ctx, pageID, "staff-page-"+uuidv7.MustString(), actorUserID)
	} else {
		err = h.scheduledPageMails.Unschedule(ctx, pageID)
	}
	if err != nil {
		slog.Error("failed to record scheduled page mail intent",
			"page_id", pageID, "send_emails", sendEmails, "error", err)
	}
}
