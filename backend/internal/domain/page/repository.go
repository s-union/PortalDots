package page

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

type Page struct {
	ID           string
	Title        string
	Body         string
	Notes        string
	IsPinned     bool
	IsPublic     bool
	ViewableTags []string
	DocumentIDs  []string
	CreatedAt    string
	UpdatedAt    string
}

type Repository interface {
	ListGuest(ctx context.Context, query string) []Page
	CountGuest(ctx context.Context, query string) int
	ListGuestPaginated(ctx context.Context, query string, limit, offset int) []Page
	ListForCircle(ctx context.Context, circleTags []string, query string) []Page
	CountForCircle(ctx context.Context, circleTags []string, query string) int
	ListForCirclePaginated(ctx context.Context, circleTags []string, query string, limit, offset int) []Page
	ListForStaff(ctx context.Context, query string) []Page
	FindGuest(ctx context.Context, pageID string) (Page, bool)
	FindForCircle(ctx context.Context, circleTags []string, pageID string) (Page, bool)
	FindForStaff(ctx context.Context, pageID string) (Page, bool)
	Create(ctx context.Context, title, body, notes string, isPublic bool, isPinned bool, viewableTags []string, documentIDs []string) Page
	Update(ctx context.Context, pageID, title, body, notes string, isPublic bool, isPinned bool, viewableTags []string, documentIDs []string) (Page, bool)
	SetPinned(ctx context.Context, pageID string, isPinned bool) (Page, bool)
	Delete(ctx context.Context, pageID string) bool
	ListReadPageIDs(ctx context.Context, userID string, pageIDs []string) []string
	MarkRead(ctx context.Context, pageID, userID string) error
	SupportsPagination(ctx context.Context) bool
}

type StaticRepository struct {
	mu     sync.RWMutex
	nextID int
	pages  []Page
	reads  map[string]map[string]struct{}
}

func NewStaticRepository(cfg []config.Page) *StaticRepository {
	pages := make([]Page, 0, len(cfg))
	for _, item := range cfg {
		pages = append(pages, Page{
			ID:           item.ID,
			Title:        item.Title,
			Body:         item.Body,
			Notes:        item.Notes,
			IsPinned:     item.IsPinned,
			IsPublic:     item.IsPublic,
			ViewableTags: append([]string{}, item.ViewableTags...),
			DocumentIDs:  append([]string{}, item.DocumentIDs...),
			CreatedAt:    item.CreatedAt,
			UpdatedAt:    item.UpdatedAt,
		})
	}

	return &StaticRepository{
		nextID: len(pages) + 1,
		pages:  pages,
		reads:  map[string]map[string]struct{}{},
	}
}

func (r *StaticRepository) ListGuest(_ context.Context, query string) []Page {
	return r.listPages(query, []string{}, true)
}

func (r *StaticRepository) CountGuest(_ context.Context, query string) int {
	return len(r.listPages(query, []string{}, true))
}

func (r *StaticRepository) ListGuestPaginated(_ context.Context, query string, limit, offset int) []Page {
	return paginateStaticPages(r.listPages(query, []string{}, true), limit, offset)
}

func (r *StaticRepository) ListForCircle(_ context.Context, circleTags []string, query string) []Page {
	return r.listPages(query, circleTags, false)
}

func (r *StaticRepository) CountForCircle(_ context.Context, circleTags []string, query string) int {
	return len(r.listPages(query, circleTags, false))
}

func (r *StaticRepository) ListForCirclePaginated(_ context.Context, circleTags []string, query string, limit, offset int) []Page {
	return paginateStaticPages(r.listPages(query, circleTags, false), limit, offset)
}

func (r *StaticRepository) ListForStaff(_ context.Context, query string) []Page {
	r.mu.RLock()
	defer r.mu.RUnlock()

	filtered := make([]Page, 0, len(r.pages))
	normalizedQuery := normalizePageQuery(query)
	for _, currentPage := range r.pages {
		if !matchesPageQuery(currentPage, normalizedQuery) {
			continue
		}
		filtered = append(filtered, clonePage(currentPage))
	}

	sortPages(filtered)
	return filtered
}

func (r *StaticRepository) SupportsPagination(_ context.Context) bool {
	return false
}

func (r *StaticRepository) FindGuest(_ context.Context, pageID string) (Page, bool) {
	return r.findPage(pageID, []string{}, true)
}

func (r *StaticRepository) FindForCircle(_ context.Context, circleTags []string, pageID string) (Page, bool) {
	return r.findPage(pageID, circleTags, false)
}

func (r *StaticRepository) FindForStaff(_ context.Context, pageID string) (Page, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, currentPage := range r.pages {
		if currentPage.ID == pageID {
			return clonePage(currentPage), true
		}
	}

	return Page{}, false
}

func (r *StaticRepository) Create(
	_ context.Context,
	title,
	body,
	notes string,
	isPublic bool,
	isPinned bool,
	viewableTags []string,
	documentIDs []string,
) Page {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now().UTC().Format(time.RFC3339)
	page := Page{
		ID:           uuidv7.MustString(),
		Title:        title,
		Body:         body,
		Notes:        notes,
		IsPinned:     isPinned,
		IsPublic:     isPublic,
		ViewableTags: append([]string{}, viewableTags...),
		DocumentIDs:  append([]string{}, documentIDs...),
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	r.nextID++
	r.pages = append(r.pages, page)

	return clonePage(page)
}

func (r *StaticRepository) Update(
	_ context.Context,
	pageID,
	title,
	body,
	notes string,
	isPublic bool,
	isPinned bool,
	viewableTags []string,
	documentIDs []string,
) (Page, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.pages {
		if r.pages[index].ID != pageID {
			continue
		}

		r.pages[index].Title = title
		r.pages[index].Body = body
		r.pages[index].Notes = notes
		r.pages[index].IsPublic = isPublic
		r.pages[index].IsPinned = isPinned
		r.pages[index].ViewableTags = append([]string{}, viewableTags...)
		r.pages[index].DocumentIDs = append([]string{}, documentIDs...)
		r.pages[index].UpdatedAt = time.Now().UTC().Format(time.RFC3339)
		delete(r.reads, pageID)
		return clonePage(r.pages[index]), true
	}

	return Page{}, false
}

func (r *StaticRepository) SetPinned(_ context.Context, pageID string, isPinned bool) (Page, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.pages {
		if r.pages[index].ID != pageID {
			continue
		}

		r.pages[index].IsPinned = isPinned
		return clonePage(r.pages[index]), true
	}

	return Page{}, false
}

func (r *StaticRepository) Delete(_ context.Context, pageID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.pages {
		if r.pages[index].ID != pageID {
			continue
		}

		r.pages = append(r.pages[:index], r.pages[index+1:]...)
		delete(r.reads, pageID)
		return true
	}

	return false
}

func (r *StaticRepository) ListReadPageIDs(_ context.Context, userID string, pageIDs []string) []string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	readPageIDs := make([]string, 0, len(pageIDs))
	for _, pageID := range pageIDs {
		if users, ok := r.reads[pageID]; ok {
			if _, read := users[userID]; read {
				readPageIDs = append(readPageIDs, pageID)
			}
		}
	}

	return readPageIDs
}

func (r *StaticRepository) MarkRead(_ context.Context, pageID, userID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, currentPage := range r.pages {
		if currentPage.ID != pageID {
			continue
		}
		if _, ok := r.reads[pageID]; !ok {
			r.reads[pageID] = map[string]struct{}{}
		}
		r.reads[pageID][userID] = struct{}{}
		return nil
	}
	return nil
}

func (r *StaticRepository) listPages(query string, circleTags []string, guestOnly bool) []Page {
	r.mu.RLock()
	defer r.mu.RUnlock()

	filtered := make([]Page, 0, len(r.pages))
	normalizedQuery := normalizePageQuery(query)
	for _, currentPage := range r.pages {
		if currentPage.IsPinned || !currentPage.IsPublic {
			continue
		}
		if guestOnly {
			if len(currentPage.ViewableTags) > 0 {
				continue
			}
		} else if !canViewPage(currentPage.ViewableTags, circleTags) {
			continue
		}
		if !matchesPageQuery(currentPage, normalizedQuery) {
			continue
		}
		filtered = append(filtered, clonePage(currentPage))
	}

	sortPages(filtered)
	return filtered
}

func (r *StaticRepository) findPage(pageID string, circleTags []string, guestOnly bool) (Page, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, currentPage := range r.pages {
		if currentPage.ID != pageID {
			continue
		}
		if currentPage.IsPinned || !currentPage.IsPublic {
			return Page{}, false
		}
		if guestOnly {
			if len(currentPage.ViewableTags) > 0 {
				return Page{}, false
			}
		} else if !canViewPage(currentPage.ViewableTags, circleTags) {
			return Page{}, false
		}

		return clonePage(currentPage), true
	}

	return Page{}, false
}

func clonePage(page Page) Page {
	page.ViewableTags = append([]string{}, page.ViewableTags...)
	page.DocumentIDs = append([]string{}, page.DocumentIDs...)
	return page
}

func paginateStaticPages(pages []Page, limit, offset int) []Page {
	if limit <= 0 || offset >= len(pages) {
		return []Page{}
	}
	if offset < 0 {
		offset = 0
	}
	end := offset + limit
	if end > len(pages) {
		end = len(pages)
	}
	return slicesClonePages(pages[offset:end])
}

func slicesClonePages(pages []Page) []Page {
	cloned := make([]Page, 0, len(pages))
	for _, currentPage := range pages {
		cloned = append(cloned, clonePage(currentPage))
	}
	return cloned
}

func normalizePageQuery(query string) string {
	return strings.TrimSpace(strings.ToLower(query))
}

func matchesPageQuery(page Page, query string) bool {
	if query == "" {
		return true
	}

	searchTarget := strings.ToLower(page.Title + "\n" + page.Body)
	return strings.Contains(searchTarget, query)
}

func sortPages(pages []Page) {
	sort.SliceStable(pages, func(i, j int) bool {
		if pages[i].UpdatedAt == pages[j].UpdatedAt {
			return pages[i].ID > pages[j].ID
		}
		return pages[i].UpdatedAt > pages[j].UpdatedAt
	})
}

func canViewPage(viewableTags []string, circleTags []string) bool {
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
