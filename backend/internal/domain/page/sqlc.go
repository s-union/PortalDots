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

func (r *SQLCRepository) ListGuest(query string) []Page {
	rows, err := r.queries.ListGuestPages(context.Background(), query)
	if err != nil {
		return nil
	}

	pages := make([]Page, 0, len(rows))
	for _, row := range rows {
		pages = append(pages, mapGuestPage(row))
	}

	return pages
}

func (r *SQLCRepository) CountGuest(query string) int {
	total, err := r.queries.CountGuestPages(context.Background(), query)
	if err != nil {
		return 0
	}
	return int(total)
}

func (r *SQLCRepository) ListGuestPaginated(query string, limit, offset int) []Page {
	rows, err := r.queries.ListGuestPagesPaginated(context.Background(), dbgen.ListGuestPagesPaginatedParams{
		Column1: query,
		Limit:   int32(limit),
		Offset:  int32(offset),
	})
	if err != nil {
		return nil
	}

	pages := make([]Page, 0, len(rows))
	for _, row := range rows {
		pages = append(pages, mapGuestPagePaginated(row))
	}

	return pages
}

func (r *SQLCRepository) ListForCircle(circleTags []string, query string) []Page {
	rows, err := r.queries.ListPagesForCircle(context.Background(), dbgen.ListPagesForCircleParams{
		Column1: circleTags,
		Column2: query,
	})
	if err != nil {
		return nil
	}

	pages := make([]Page, 0, len(rows))
	for _, row := range rows {
		pages = append(pages, mapCirclePage(row))
	}

	return pages
}

func (r *SQLCRepository) CountForCircle(circleTags []string, query string) int {
	total, err := r.queries.CountPagesForCircle(context.Background(), dbgen.CountPagesForCircleParams{
		Column1: circleTags,
		Column2: query,
	})
	if err != nil {
		return 0
	}
	return int(total)
}

func (r *SQLCRepository) ListForCirclePaginated(circleTags []string, query string, limit, offset int) []Page {
	rows, err := r.queries.ListPagesForCirclePaginated(context.Background(), dbgen.ListPagesForCirclePaginatedParams{
		Column1: circleTags,
		Column2: query,
		Limit:   int32(limit),
		Offset:  int32(offset),
	})
	if err != nil {
		return nil
	}

	pages := make([]Page, 0, len(rows))
	for _, row := range rows {
		pages = append(pages, mapCirclePagePaginated(row))
	}

	return pages
}

func (r *SQLCRepository) ListForStaff(query string) []Page {
	rows, err := r.queries.ListStaffPages(context.Background(), query)
	if err != nil {
		return nil
	}

	pages := make([]Page, 0, len(rows))
	for _, row := range rows {
		pages = append(pages, mapStaffPageRow(row))
	}

	return pages
}

func (r *SQLCRepository) SupportsPagination() bool {
	return true
}

func (r *SQLCRepository) FindGuest(pageID string) (Page, bool) {
	row, err := r.queries.GetGuestPageByID(context.Background(), pageID)
	if err != nil {
		return Page{}, false
	}

	return mapGuestPageDetail(row), true
}

func (r *SQLCRepository) FindForCircle(circleTags []string, pageID string) (Page, bool) {
	row, err := r.queries.GetPageByIDForCircle(context.Background(), dbgen.GetPageByIDForCircleParams{
		Column1: circleTags,
		ID:      pageID,
	})
	if err != nil {
		return Page{}, false
	}

	return mapCirclePageDetail(row), true
}

func (r *SQLCRepository) FindForStaff(pageID string) (Page, bool) {
	row, err := r.queries.GetStaffPageByID(context.Background(), pageID)
	if err != nil {
		return Page{}, false
	}

	return mapStaffPage(row), true
}

func (r *SQLCRepository) Create(
	title,
	body,
	notes string,
	isPublic bool,
	isPinned bool,
	viewableTags []string,
	documentIDs []string,
) Page {
	row, err := r.queries.CreatePage(context.Background(), dbgen.CreatePageParams{
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
	if err := r.queries.DeletePageReads(context.Background(), pageID); err != nil {
		return Page{}, false
	}

	return mapUpdatedPage(row), true
}

func (r *SQLCRepository) SetPinned(pageID string, isPinned bool) (Page, bool) {
	row, err := r.queries.PatchPagePin(context.Background(), dbgen.PatchPagePinParams{
		ID:       pageID,
		IsPinned: isPinned,
	})
	if err != nil {
		return Page{}, false
	}

	return mapPinnedPage(row), true
}

func (r *SQLCRepository) Delete(pageID string) bool {
	rows, err := r.queries.DeletePage(context.Background(), pageID)
	if err != nil {
		return false
	}

	return rows > 0
}

func (r *SQLCRepository) ListReadPageIDs(userID string, pageIDs []string) []string {
	if len(pageIDs) == 0 {
		return []string{}
	}

	rows, err := r.queries.ListReadPageIDsByUser(context.Background(), dbgen.ListReadPageIDsByUserParams{
		UserID:  userID,
		Column2: pageIDs,
	})
	if err != nil {
		return nil
	}

	return rows
}

func (r *SQLCRepository) MarkRead(pageID, userID string) error {
	_ = r.queries.UpsertPageRead(context.Background(), dbgen.UpsertPageReadParams{
		PageID: pageID,
		UserID: userID,
	})
	return nil
}

func mapGuestPage(row dbgen.ListGuestPagesRow) Page {
	return Page{
		ID:           row.ID,
		Title:        row.Title,
		Body:         row.Body,
		Notes:        row.Notes,
		IsPinned:     row.IsPinned,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		DocumentIDs:  append([]string{}, row.DocumentIds...),
		CreatedAt:    pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt:    pgutil.FormatTimestamptz(row.UpdatedAt),
	}
}

func mapCirclePage(row dbgen.ListPagesForCircleRow) Page {
	return Page{
		ID:           row.ID,
		Title:        row.Title,
		Body:         row.Body,
		Notes:        row.Notes,
		IsPinned:     row.IsPinned,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		DocumentIDs:  append([]string{}, row.DocumentIds...),
		CreatedAt:    pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt:    pgutil.FormatTimestamptz(row.UpdatedAt),
	}
}

func mapGuestPagePaginated(row dbgen.ListGuestPagesPaginatedRow) Page {
	return Page{
		ID:           row.ID,
		Title:        row.Title,
		Body:         row.Body,
		Notes:        row.Notes,
		IsPinned:     row.IsPinned,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		DocumentIDs:  append([]string{}, row.DocumentIds...),
		CreatedAt:    pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt:    pgutil.FormatTimestamptz(row.UpdatedAt),
	}
}

func mapCirclePagePaginated(row dbgen.ListPagesForCirclePaginatedRow) Page {
	return Page{
		ID:           row.ID,
		Title:        row.Title,
		Body:         row.Body,
		Notes:        row.Notes,
		IsPinned:     row.IsPinned,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		DocumentIDs:  append([]string{}, row.DocumentIds...),
		CreatedAt:    pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt:    pgutil.FormatTimestamptz(row.UpdatedAt),
	}
}

func mapStaffPageRow(row dbgen.ListStaffPagesRow) Page {
	return Page{
		ID:           row.ID,
		Title:        row.Title,
		Body:         row.Body,
		Notes:        row.Notes,
		IsPinned:     row.IsPinned,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		DocumentIDs:  append([]string{}, row.DocumentIds...),
		CreatedAt:    pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt:    pgutil.FormatTimestamptz(row.UpdatedAt),
	}
}

func mapGuestPageDetail(row dbgen.GetGuestPageByIDRow) Page {
	return Page{
		ID:           row.ID,
		Title:        row.Title,
		Body:         row.Body,
		Notes:        row.Notes,
		IsPinned:     row.IsPinned,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		DocumentIDs:  append([]string{}, row.DocumentIds...),
		CreatedAt:    pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt:    pgutil.FormatTimestamptz(row.UpdatedAt),
	}
}

func mapCirclePageDetail(row dbgen.GetPageByIDForCircleRow) Page {
	return Page{
		ID:           row.ID,
		Title:        row.Title,
		Body:         row.Body,
		Notes:        row.Notes,
		IsPinned:     row.IsPinned,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		DocumentIDs:  append([]string{}, row.DocumentIds...),
		CreatedAt:    pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt:    pgutil.FormatTimestamptz(row.UpdatedAt),
	}
}

func mapStaffPage(row dbgen.GetStaffPageByIDRow) Page {
	return Page{
		ID:           row.ID,
		Title:        row.Title,
		Body:         row.Body,
		Notes:        row.Notes,
		IsPinned:     row.IsPinned,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		DocumentIDs:  append([]string{}, row.DocumentIds...),
		CreatedAt:    pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt:    pgutil.FormatTimestamptz(row.UpdatedAt),
	}
}

func mapCreatedPage(row dbgen.CreatePageRow) Page {
	return Page{
		ID:           row.ID,
		Title:        row.Title,
		Body:         row.Body,
		Notes:        row.Notes,
		IsPinned:     row.IsPinned,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		DocumentIDs:  append([]string{}, row.DocumentIds...),
		CreatedAt:    pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt:    pgutil.FormatTimestamptz(row.UpdatedAt),
	}
}

func mapUpdatedPage(row dbgen.UpdatePageRow) Page {
	return Page{
		ID:           row.ID,
		Title:        row.Title,
		Body:         row.Body,
		Notes:        row.Notes,
		IsPinned:     row.IsPinned,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		DocumentIDs:  append([]string{}, row.DocumentIds...),
		CreatedAt:    pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt:    pgutil.FormatTimestamptz(row.UpdatedAt),
	}
}

func mapPinnedPage(row dbgen.PatchPagePinRow) Page {
	return Page{
		ID:           row.ID,
		Title:        row.Title,
		Body:         row.Body,
		Notes:        row.Notes,
		IsPinned:     row.IsPinned,
		IsPublic:     row.IsPublic,
		ViewableTags: append([]string{}, row.ViewableTags...),
		DocumentIDs:  append([]string{}, row.DocumentIds...),
		CreatedAt:    pgutil.FormatTimestamptz(row.CreatedAt),
		UpdatedAt:    pgutil.FormatTimestamptz(row.UpdatedAt),
	}
}
