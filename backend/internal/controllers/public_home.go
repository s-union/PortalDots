package controllers

import (
	"net/http"
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	backenddocument "github.com/s-union/PortalDots/backend/internal/domain/document"
	backendform "github.com/s-union/PortalDots/backend/internal/domain/form"
	"github.com/s-union/PortalDots/backend/internal/domain/page"
	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
	"github.com/s-union/PortalDots/backend/internal/domain/portalsetting"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

type publicHomeHandlers struct {
	sharedDeps
	circles            circle.Catalog
	documents          backenddocument.Repository
	forms              backendform.Repository
	pages              page.Repository
	participationTypes participationtype.Repository
	portal             portalsetting.Repository
	allowDangerously   bool
	authUser           config.AuthUser
	users              []config.User
}

type publicHomeResponse struct {
	AppName            string                          `json:"appName"`
	PortalDescription  string                          `json:"portalDescription"`
	PortalAdminName    string                          `json:"portalAdminName"`
	PortalContactEmail string                          `json:"portalContactEmail"`
	LoginMethods       []publicHomeLoginMethodResponse `json:"loginMethods"`
	PinnedPages        []publicPinnedPageResponse      `json:"pinnedPages"`
	ParticipationTypes []participationTypeResponse     `json:"participationTypes"`
	Pages              []publicHomePageResponse        `json:"pages"`
	Documents          []publicHomeDocumentResponse    `json:"documents"`
}

type publicConfigResponse struct {
	IsDemo                    bool   `json:"isDemo"`
	AppName                   string `json:"appName"`
	PortalStudentIDName       string `json:"portalStudentIdName"`
	PortalUnivemailName       string `json:"portalUnivemailName"`
	PortalUnivemailDomainPart string `json:"portalUnivemailDomainPart"`
}

type publicHomeLoginMethodResponse struct {
	RoleLabel string `json:"roleLabel"`
	LoginID   string `json:"loginId"`
	Password  string `json:"password"`
}

type publicHomePageResponse struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Summary   string `json:"summary"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
	IsLimited bool   `json:"isLimited"`
	IsNew     bool   `json:"isNew"`
}

type publicPinnedPageResponse struct {
	ID        string                 `json:"id"`
	Title     string                 `json:"title"`
	Body      string                 `json:"body"`
	CreatedAt string                 `json:"createdAt"`
	UpdatedAt string                 `json:"updatedAt"`
	IsLimited bool                   `json:"isLimited"`
	IsNew     bool                   `json:"isNew"`
	Documents []pageDocumentResponse `json:"documents"`
}

type publicHomeDocumentResponse struct {
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

func (h *publicHomeHandlers) getPublicHome(c echo.Context) error {
	settings, err := h.portal.Get()
	if err != nil {
		return internalError(c)
	}

	participationTypes, err := h.listPublicParticipationTypes()
	if err != nil {
		return internalError(c)
	}

	selectableCircles, err := h.circles.ListSelectable(nil)
	if err != nil {
		return internalError(c)
	}

	circleTags := h.currentPublicHomeCircleTags(c)

	return c.JSON(http.StatusOK, publicHomeResponse{
		AppName:            settings.AppName,
		PortalDescription:  settings.PortalDescription,
		PortalAdminName:    settings.PortalAdminName,
		PortalContactEmail: settings.PortalContactEmail,
		LoginMethods:       h.buildPublicHomeLoginMethods(),
		PinnedPages:        h.collectPinnedPublicPages(circleTags),
		ParticipationTypes: participationTypes,
		Pages:              h.collectPublicPages(circleTags, 5),
		Documents:          h.collectPublicDocuments(selectableCircles, 3),
	})
}

func (h *publicHomeHandlers) getPublicConfig(c echo.Context) error {
	settings, err := h.portal.Get()
	if err != nil {
		return internalError(c)
	}
	return c.JSON(http.StatusOK, publicConfigResponse{
		IsDemo:                    h.allowDangerously,
		AppName:                   settings.AppName,
		PortalStudentIDName:       settings.PortalStudentIDName,
		PortalUnivemailName:       settings.PortalUnivemailName,
		PortalUnivemailDomainPart: settings.PortalUnivemailDomainPart,
	})
}

func (h *publicHomeHandlers) listPublicPages(c echo.Context) error {
	pages := h.pages.ListGuest(c.QueryParam("query"))
	response := make([]pageSummaryResponse, 0, len(pages))
	for _, currentPage := range pages {
		response = append(response, pageSummaryResponse{
			ID:        currentPage.ID,
			Title:     currentPage.Title,
			Summary:   summarizePublicHomeText(currentPage.Body, 120),
			IsLimited: false,
			IsNew:     isPageNew(currentPage),
			IsUnread:  false,
			CreatedAt: currentPage.CreatedAt,
			UpdatedAt: currentPage.UpdatedAt,
		})
	}

	return c.JSON(http.StatusOK, paginatePages(response, readPagesPagination(c)))
}

func (h *publicHomeHandlers) getPublicPage(c echo.Context) error {
	pageValue, found := h.pages.FindGuest(c.Param("pageID"))
	if found {
		return c.JSON(http.StatusOK, pageDetailResponse{
			ID:        pageValue.ID,
			Title:     pageValue.Title,
			Body:      pageValue.Body,
			IsLimited: false,
			CreatedAt: pageValue.CreatedAt,
			UpdatedAt: pageValue.UpdatedAt,
			Documents: pageDocuments(h.documents, pageValue.DocumentIDs, false, true, nil),
		})
	}

	return errorJSON(c, http.StatusNotFound, "page_not_found")
}

func (h *publicHomeHandlers) listPublicDocuments(c echo.Context) error {
	selectableCircles, err := h.circles.ListSelectable(nil)
	if err != nil {
		return internalError(c)
	}

	return c.JSON(http.StatusOK, h.collectPublicDocuments(selectableCircles, 0))
}

func (h *publicHomeHandlers) getPublicDocument(c echo.Context) error {
	documentID := c.Param("documentID")
	documentValue, found := h.documents.FindPublic(documentID)
	if found {
		c.Response().Header().Set(echo.HeaderContentType, documentValue.MimeType)
		c.Response().Header().Set(echo.HeaderContentDisposition, publicInlineContentDisposition(documentValue))
		return c.Blob(http.StatusOK, documentValue.MimeType, documentValue.Content)
	}

	return errorJSON(c, http.StatusNotFound, "document_not_found")
}

func (h *publicHomeHandlers) listPublicParticipationTypes() ([]participationTypeResponse, error) {
	items, err := h.participationTypes.List()
	if err != nil {
		return nil, err
	}

	response := make([]participationTypeResponse, 0, len(items))
	for _, item := range items {
		formValue, found := h.forms.FindByIDForStaff(item.FormID)
		if !found || !formValue.IsPublic || !formValue.IsOpen {
			continue
		}
		response = append(response, mapParticipationType(item, formValue))
	}

	slices.SortFunc(response, func(left, right participationTypeResponse) int {
		return strings.Compare(left.Name, right.Name)
	})

	return response, nil
}

func (h *publicHomeHandlers) collectPublicPages(circleTags []string, limit int) []publicHomePageResponse {
	visiblePages := h.pages.ListGuest("")
	if len(circleTags) > 0 {
		visiblePages = h.pages.ListForCircle(circleTags, "")
	}

	pages := make([]publicHomePageResponse, 0, len(visiblePages))
	for _, currentPage := range visiblePages {
		pages = append(pages, publicHomePageResponse{
			ID:        currentPage.ID,
			Title:     currentPage.Title,
			Summary:   summarizePublicHomeText(currentPage.Body, 120),
			CreatedAt: currentPage.CreatedAt,
			UpdatedAt: currentPage.UpdatedAt,
			IsLimited: len(currentPage.ViewableTags) > 0,
			IsNew:     isPageNew(currentPage),
		})
	}

	if limit > 0 && len(pages) > limit {
		return slices.Clone(pages[:limit])
	}

	return pages
}

func (h *publicHomeHandlers) collectPinnedPublicPages(circleTags []string) []publicPinnedPageResponse {
	allPages := h.pages.ListForStaff("")
	pages := make([]publicPinnedPageResponse, 0, len(allPages))
	for _, currentPage := range allPages {
		if !currentPage.IsPinned || !currentPage.IsPublic {
			continue
		}
		if len(circleTags) == 0 {
			if len(currentPage.ViewableTags) > 0 {
				continue
			}
		} else if !pageVisibleToCircleTags(currentPage.ViewableTags, circleTags) {
			continue
		}
		pages = append(pages, publicPinnedPageResponse{
			ID:        currentPage.ID,
			Title:     currentPage.Title,
			Body:      currentPage.Body,
			CreatedAt: currentPage.CreatedAt,
			UpdatedAt: currentPage.UpdatedAt,
			IsLimited: len(currentPage.ViewableTags) > 0,
			IsNew:     isPageNew(currentPage),
			Documents: pageDocuments(h.documents, currentPage.DocumentIDs, false, true, nil),
		})
	}

	slices.SortFunc(pages, func(left, right publicPinnedPageResponse) int {
		if left.UpdatedAt == right.UpdatedAt {
			return strings.Compare(right.ID, left.ID)
		}
		return strings.Compare(right.UpdatedAt, left.UpdatedAt)
	})

	return pages
}

func (h *publicHomeHandlers) currentPublicHomeCircleTags(c echo.Context) []string {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil || currentSession.CurrentCircleID == "" {
		return nil
	}

	currentCircle, err := h.circles.FindSelectable(currentSession.User, currentSession.CurrentCircleID)
	if err != nil {
		return nil
	}

	return effectiveCircleTags(currentCircle, h.participationTypes)
}

func (h *publicHomeHandlers) collectPublicDocuments(circles []circle.Circle, limit int) []publicHomeDocumentResponse {
	documents := make([]publicHomeDocumentResponse, 0)
	seen := map[string]struct{}{}

	for _, currentCircle := range circles {
		visibleDocuments := h.documents.ListByCircle(currentCircle.ID)
		for _, currentDocument := range visibleDocuments {
			if _, ok := seen[currentDocument.ID]; ok {
				continue
			}
			seen[currentDocument.ID] = struct{}{}
			documents = append(documents, publicHomeDocumentResponse{
				ID:          currentDocument.ID,
				Name:        currentDocument.Name,
				Description: currentDocument.Description,
				IsImportant: currentDocument.IsImportant,
				IsNew:       isDocumentNew(currentDocument),
				Extension:   currentDocument.Extension,
				SizeBytes:   currentDocument.SizeBytes,
				UpdatedAt:   currentDocument.UpdatedAt,
				DownloadURL: "/v1/public/documents/" + currentDocument.ID,
			})
		}
	}

	slices.SortFunc(documents, func(left, right publicHomeDocumentResponse) int {
		if left.UpdatedAt == right.UpdatedAt {
			return strings.Compare(right.ID, left.ID)
		}
		return strings.Compare(right.UpdatedAt, left.UpdatedAt)
	})

	if limit > 0 && len(documents) > limit {
		return slices.Clone(documents[:limit])
	}

	return documents
}

func summarizePublicHomeText(value string, maxRunes int) string {
	normalized := normalizePublicHomeSummary(value)
	if normalized == "" {
		return ""
	}
	if utf8.RuneCountInString(normalized) <= maxRunes {
		return normalized
	}

	runes := []rune(normalized)
	return strings.TrimSpace(string(runes[:maxRunes])) + "..."
}

func normalizePublicHomeSummary(value string) string {
	normalized := strings.Join(strings.Fields(strings.TrimSpace(value)), " ")
	if normalized == "" {
		return ""
	}

	replacer := strings.NewReplacer(
		"### ", "",
		"## ", "",
		"# ", "",
		"|", " ",
		" - ", " ",
		"- ", "",
		"* ", "",
		"`", "",
	)

	return strings.Join(strings.Fields(replacer.Replace(normalized)), " ")
}

func publicInlineContentDisposition(document backenddocument.Document) string {
	filename := strings.TrimSpace(document.Filename)
	if strings.TrimSpace(document.Name) != "" && strings.TrimSpace(document.Extension) != "" {
		filename = document.Name + "." + document.Extension
	}

	return inlineContentDisposition(filename)
}

func (h *publicHomeHandlers) buildPublicHomeLoginMethods() []publicHomeLoginMethodResponse {
	if !h.allowDangerously {
		return []publicHomeLoginMethodResponse{}
	}

	methods := make([]publicHomeLoginMethodResponse, 0, 1+len(h.users))

	if len(h.authUser.LoginIDs) > 0 {
		methods = append(methods, publicHomeLoginMethodResponse{
			RoleLabel: roleToLabel(h.authUser.Roles),
			LoginID:   h.authUser.LoginIDs[0],
			Password:  h.authUser.Password,
		})
	}

	for _, u := range h.users {
		if !u.IsVerified {
			continue
		}
		if len(u.LoginIDs) == 0 {
			continue
		}
		methods = append(methods, publicHomeLoginMethodResponse{
			RoleLabel: roleToLabel(u.Roles),
			LoginID:   u.LoginIDs[0],
			Password:  u.Password,
		})
	}

	return methods
}

func roleToLabel(roles []string) string {
	for _, role := range roles {
		switch role {
		case "admin":
			return "管理者"
		case "content_manager", "circle_manager":
			return "スタッフ"
		case "participant":
			return "一般ユーザー"
		}
	}
	if len(roles) > 0 {
		return roles[0]
	}
	return ""
}
