package page

import (
	"slices"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

type Page struct {
	ID           string
	CircleID     string
	Title        string
	Body         string
	Notes        string
	IsPinned     bool
	IsPublic     bool
	ViewableTags []string
	DocumentIDs  []string
	PublishedAt  string
}

type Repository interface {
	ListByCircle(circleID string, circleTags []string, query string) []Page
	ListByCircleForStaff(circleID string, query string) []Page
	ListPublic(circleTags []string, query string) []Page
	FindByCircle(circleID string, circleTags []string, pageID string) (Page, bool)
	FindByCircleForStaff(circleID, pageID string) (Page, bool)
	FindPublic(circleTags []string, pageID string) (Page, bool)
	Create(circleID, title, body, notes string, isPublic bool, isPinned bool, viewableTags []string, documentIDs []string) Page
	Update(circleID, pageID, title, body, notes string, isPublic bool, isPinned bool, viewableTags []string, documentIDs []string) (Page, bool)
	SetPinned(circleID, pageID string, isPinned bool) (Page, bool)
	Delete(circleID, pageID string) bool
}

type StaticRepository struct {
	mu     sync.RWMutex
	nextID int
	pages  []Page
}

func NewStaticRepository(cfg []config.Page) *StaticRepository {
	pages := make([]Page, 0, len(cfg))
	for _, item := range cfg {
		pages = append(pages, Page{
			ID:           item.ID,
			CircleID:     item.CircleID,
			Title:        item.Title,
			Body:         item.Body,
			Notes:        item.Notes,
			IsPinned:     item.IsPinned,
			IsPublic:     item.IsPublic,
			ViewableTags: append([]string{}, item.ViewableTags...),
			DocumentIDs:  append([]string{}, item.DocumentIDs...),
			PublishedAt:  item.PublishedAt,
		})
	}
	return &StaticRepository{
		nextID: len(pages) + 1,
		pages:  pages,
	}
}

func (r *StaticRepository) ListByCircle(circleID string, circleTags []string, query string) []Page {
	r.mu.RLock()
	defer r.mu.RUnlock()

	filtered := make([]Page, 0, len(r.pages))
	normalizedQuery := strings.TrimSpace(strings.ToLower(query))
	for _, page := range r.pages {
		if page.CircleID != circleID {
			continue
		}
		if page.IsPinned || !page.IsPublic {
			continue
		}
		if !canViewPage(page.ViewableTags, circleTags) {
			continue
		}
		if normalizedQuery != "" {
			searchTarget := strings.ToLower(page.Title + "\n" + page.Body)
			if !strings.Contains(searchTarget, normalizedQuery) {
				continue
			}
		}
		filtered = append(filtered, page)
	}

	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].PublishedAt > filtered[j].PublishedAt
	})

	return slices.Clone(filtered)
}

func (r *StaticRepository) ListByCircleForStaff(circleID string, query string) []Page {
	r.mu.RLock()
	defer r.mu.RUnlock()

	filtered := make([]Page, 0, len(r.pages))
	normalizedQuery := strings.TrimSpace(strings.ToLower(query))
	for _, page := range r.pages {
		if page.CircleID != circleID {
			continue
		}
		if normalizedQuery != "" {
			searchTarget := strings.ToLower(page.Title + "\n" + page.Body)
			if !strings.Contains(searchTarget, normalizedQuery) {
				continue
			}
		}
		filtered = append(filtered, page)
	}

	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].PublishedAt > filtered[j].PublishedAt
	})

	return slices.Clone(filtered)
}

func (r *StaticRepository) ListPublic(circleTags []string, query string) []Page {
	r.mu.RLock()
	defer r.mu.RUnlock()

	filtered := make([]Page, 0, len(r.pages))
	normalizedQuery := strings.TrimSpace(strings.ToLower(query))
	for _, page := range r.pages {
		if page.IsPinned || !page.IsPublic {
			continue
		}
		if !canViewPage(page.ViewableTags, circleTags) {
			continue
		}
		if normalizedQuery != "" {
			searchTarget := strings.ToLower(page.Title + "\n" + page.Body)
			if !strings.Contains(searchTarget, normalizedQuery) {
				continue
			}
		}
		filtered = append(filtered, page)
	}

	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].PublishedAt > filtered[j].PublishedAt
	})

	return slices.Clone(filtered)
}

func (r *StaticRepository) FindByCircle(circleID string, circleTags []string, pageID string) (Page, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, page := range r.pages {
		if page.CircleID != circleID || page.ID != pageID {
			continue
		}
		if page.IsPinned || !page.IsPublic || !canViewPage(page.ViewableTags, circleTags) {
			return Page{}, false
		}
		return clonePage(page), true
	}

	return Page{}, false
}

func (r *StaticRepository) FindByCircleForStaff(circleID, pageID string) (Page, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, page := range r.pages {
		if page.CircleID == circleID && page.ID == pageID {
			return clonePage(page), true
		}
	}

	return Page{}, false
}

func (r *StaticRepository) FindPublic(circleTags []string, pageID string) (Page, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, page := range r.pages {
		if page.ID != pageID {
			continue
		}
		if page.IsPinned || !page.IsPublic || !canViewPage(page.ViewableTags, circleTags) {
			return Page{}, false
		}
		return clonePage(page), true
	}

	return Page{}, false
}

func (r *StaticRepository) Create(
	circleID,
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

	page := Page{
		ID:           "page-generated-" + strconv.Itoa(r.nextID),
		CircleID:     circleID,
		Title:        title,
		Body:         body,
		Notes:        notes,
		IsPinned:     isPinned,
		IsPublic:     isPublic,
		ViewableTags: append([]string{}, viewableTags...),
		DocumentIDs:  append([]string{}, documentIDs...),
		PublishedAt:  time.Now().UTC().Format(time.RFC3339),
	}
	r.nextID++
	r.pages = append(r.pages, page)

	return clonePage(page)
}

func (r *StaticRepository) Update(
	circleID,
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
		if r.pages[index].CircleID != circleID || r.pages[index].ID != pageID {
			continue
		}

		r.pages[index].Title = title
		r.pages[index].Body = body
		r.pages[index].Notes = notes
		r.pages[index].IsPublic = isPublic
		r.pages[index].IsPinned = isPinned
		r.pages[index].ViewableTags = append([]string{}, viewableTags...)
		r.pages[index].DocumentIDs = append([]string{}, documentIDs...)
		return clonePage(r.pages[index]), true
	}

	return Page{}, false
}

func (r *StaticRepository) SetPinned(circleID, pageID string, isPinned bool) (Page, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.pages {
		if r.pages[index].CircleID != circleID || r.pages[index].ID != pageID {
			continue
		}

		r.pages[index].IsPinned = isPinned
		return clonePage(r.pages[index]), true
	}

	return Page{}, false
}

func (r *StaticRepository) Delete(circleID, pageID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.pages {
		if r.pages[index].CircleID != circleID || r.pages[index].ID != pageID {
			continue
		}

		r.pages = append(r.pages[:index], r.pages[index+1:]...)
		return true
	}

	return false
}

func clonePage(page Page) Page {
	page.ViewableTags = append([]string{}, page.ViewableTags...)
	page.DocumentIDs = append([]string{}, page.DocumentIDs...)
	return page
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
