package page

import (
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
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
	ListGuest(query string) []Page
	ListForCircle(circleTags []string, query string) []Page
	ListForStaff(query string) []Page
	FindGuest(pageID string) (Page, bool)
	FindForCircle(circleTags []string, pageID string) (Page, bool)
	FindForStaff(pageID string) (Page, bool)
	Create(title, body, notes string, isPublic bool, isPinned bool, viewableTags []string, documentIDs []string) Page
	Update(pageID, title, body, notes string, isPublic bool, isPinned bool, viewableTags []string, documentIDs []string) (Page, bool)
	SetPinned(pageID string, isPinned bool) (Page, bool)
	Delete(pageID string) bool
	ListReadPageIDs(userID string, pageIDs []string) []string
	MarkRead(pageID, userID string)
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

func (r *StaticRepository) ListGuest(query string) []Page {
	return r.listPages(query, []string{}, true)
}

func (r *StaticRepository) ListForCircle(circleTags []string, query string) []Page {
	return r.listPages(query, circleTags, false)
}

func (r *StaticRepository) ListForStaff(query string) []Page {
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

func (r *StaticRepository) FindGuest(pageID string) (Page, bool) {
	return r.findPage(pageID, []string{}, true)
}

func (r *StaticRepository) FindForCircle(circleTags []string, pageID string) (Page, bool) {
	return r.findPage(pageID, circleTags, false)
}

func (r *StaticRepository) FindForStaff(pageID string) (Page, bool) {
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
		ID:           "page-generated-" + strconv.Itoa(r.nextID),
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

func (r *StaticRepository) SetPinned(pageID string, isPinned bool) (Page, bool) {
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

func (r *StaticRepository) Delete(pageID string) bool {
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

func (r *StaticRepository) ListReadPageIDs(userID string, pageIDs []string) []string {
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

func (r *StaticRepository) MarkRead(pageID, userID string) {
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
		return
	}
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
