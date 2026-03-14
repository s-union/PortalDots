package page

import (
	"context"

	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
	"github.com/s-union/PortalDots/backend/internal/platform/postgres/pgutil"
)

type SQLCRepository struct {
	queries *dbgen.Queries
}

func NewSQLCRepository(queries *dbgen.Queries) *SQLCRepository {
	return &SQLCRepository{queries: queries}
}

func (r *SQLCRepository) ListByCircle(circleID string, circleTags []string, query string) []Page {
	rows, err := r.queries.ListPublicPagesByCircle(context.Background(), dbgen.ListPublicPagesByCircleParams{
		CircleID: circleID,
		Column2:  circleTags,
		Column3:  query,
	})
	if err != nil {
		return nil
	}

	pages := make([]Page, 0, len(rows))
	for _, row := range rows {
		pages = append(pages, mapListPublicPage(row))
	}

	return pages
}

func (r *SQLCRepository) ListByCircleForStaff(circleID string, query string) []Page {
	rows, err := r.queries.ListStaffPagesByCircle(context.Background(), dbgen.ListStaffPagesByCircleParams{
		CircleID: circleID,
		Column2:  query,
	})
	if err != nil {
		return nil
	}

	pages := make([]Page, 0, len(rows))
	for _, row := range rows {
		pages = append(pages, mapListStaffPage(row))
	}

	return pages
}

func (r *SQLCRepository) FindByCircle(circleID string, circleTags []string, pageID string) (Page, bool) {
	row, err := r.queries.GetPublicPageByID(context.Background(), dbgen.GetPublicPageByIDParams{
		CircleID: circleID,
		Column2:  circleTags,
		ID:       pageID,
	})
	if err != nil {
		return Page{}, false
	}

	return mapPublicPage(row), true
}

func (r *SQLCRepository) FindByCircleForStaff(circleID, pageID string) (Page, bool) {
	row, err := r.queries.GetStaffPageByID(context.Background(), dbgen.GetStaffPageByIDParams{
		CircleID: circleID,
		ID:       pageID,
	})
	if err != nil {
		return Page{}, false
	}

	return mapStaffPage(row), true
}

func (r *SQLCRepository) Create(
	circleID,
	title,
	body,
	notes string,
	isPublic bool,
	isPinned bool,
	viewableTags []string,
	documentIDs []string,
) Page {
	row, err := r.queries.CreatePage(context.Background(), dbgen.CreatePageParams{
		CircleID:     circleID,
		Title:        title,
		Body:         body,
		Notes:        notes,
		IsPinned:     isPinned,
		IsPublic:     isPublic,
		ViewableTags: viewableTags,
		DocumentIds:  documentIDs,
	})
	if err != nil {
		return Page{}
	}

	return mapCreatedPage(row)
}

func (r *SQLCRepository) Update(
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
	row, err := r.queries.UpdatePage(context.Background(), dbgen.UpdatePageParams{
		CircleID:     circleID,
		ID:           pageID,
		Title:        title,
		Body:         body,
		Notes:        notes,
		IsPinned:     isPinned,
		IsPublic:     isPublic,
		ViewableTags: viewableTags,
		DocumentIds:  documentIDs,
	})
	if err != nil {
		return Page{}, false
	}

	return mapUpdatedPage(row), true
}

func (r *SQLCRepository) SetPinned(circleID, pageID string, isPinned bool) (Page, bool) {
	row, err := r.queries.PatchPagePin(context.Background(), dbgen.PatchPagePinParams{
		CircleID: circleID,
		ID:       pageID,
		IsPinned: isPinned,
	})
	if err != nil {
		return Page{}, false
	}

	return mapPinnedPage(row), true
}

func (r *SQLCRepository) Delete(circleID, pageID string) bool {
	rows, err := r.queries.DeletePage(context.Background(), dbgen.DeletePageParams{
		CircleID: circleID,
		ID:       pageID,
	})
	if err != nil {
		return false
	}

	return rows > 0
}

func mapListPublicPage(row dbgen.ListPublicPagesByCircleRow) Page {
	return Page{
		ID:           row.ID,
		CircleID:     row.CircleID,
		Title:        row.Title,
		Body:         row.Body,
		Notes:        row.Notes,
		IsPinned:     row.IsPinned,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		DocumentIDs:  append([]string{}, row.DocumentIds...),
		PublishedAt:  pgutil.FormatTimestamptz(row.PublishedAt),
	}
}

func mapListStaffPage(row dbgen.ListStaffPagesByCircleRow) Page {
	return Page{
		ID:           row.ID,
		CircleID:     row.CircleID,
		Title:        row.Title,
		Body:         row.Body,
		Notes:        row.Notes,
		IsPinned:     row.IsPinned,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		DocumentIDs:  append([]string{}, row.DocumentIds...),
		PublishedAt:  pgutil.FormatTimestamptz(row.PublishedAt),
	}
}

func mapPublicPage(row dbgen.GetPublicPageByIDRow) Page {
	return Page{
		ID:           row.ID,
		CircleID:     row.CircleID,
		Title:        row.Title,
		Body:         row.Body,
		Notes:        row.Notes,
		IsPinned:     row.IsPinned,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		DocumentIDs:  append([]string{}, row.DocumentIds...),
		PublishedAt:  pgutil.FormatTimestamptz(row.PublishedAt),
	}
}

func mapStaffPage(row dbgen.GetStaffPageByIDRow) Page {
	return Page{
		ID:           row.ID,
		CircleID:     row.CircleID,
		Title:        row.Title,
		Body:         row.Body,
		Notes:        row.Notes,
		IsPinned:     row.IsPinned,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		DocumentIDs:  append([]string{}, row.DocumentIds...),
		PublishedAt:  pgutil.FormatTimestamptz(row.PublishedAt),
	}
}

func mapCreatedPage(row dbgen.CreatePageRow) Page {
	return Page{
		ID:           row.ID,
		CircleID:     row.CircleID,
		Title:        row.Title,
		Body:         row.Body,
		Notes:        row.Notes,
		IsPinned:     row.IsPinned,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		DocumentIDs:  append([]string{}, row.DocumentIds...),
		PublishedAt:  pgutil.FormatTimestamptz(row.PublishedAt),
	}
}

func mapUpdatedPage(row dbgen.UpdatePageRow) Page {
	return Page{
		ID:           row.ID,
		CircleID:     row.CircleID,
		Title:        row.Title,
		Body:         row.Body,
		Notes:        row.Notes,
		IsPinned:     row.IsPinned,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		DocumentIDs:  append([]string{}, row.DocumentIds...),
		PublishedAt:  pgutil.FormatTimestamptz(row.PublishedAt),
	}
}

func mapPinnedPage(row dbgen.PatchPagePinRow) Page {
	return Page{
		ID:           row.ID,
		CircleID:     row.CircleID,
		Title:        row.Title,
		Body:         row.Body,
		Notes:        row.Notes,
		IsPinned:     row.IsPinned,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		DocumentIDs:  append([]string{}, row.DocumentIds...),
		PublishedAt:  pgutil.FormatTimestamptz(row.PublishedAt),
	}
}
