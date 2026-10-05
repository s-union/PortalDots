package mailhistory

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

var ErrInvalidCursor = errors.New("invalid mail history cursor")

type Page struct {
	Entries    []Entry
	NextCursor string
}

type historyCursor struct {
	CreatedAt time.Time `json:"createdAt"`
	JobID     string    `json:"jobId"`
}

func decodeCursor(value string) (*historyCursor, error) {
	if value == "" {
		return nil, nil
	}
	if len(value) > 2048 {
		return nil, ErrInvalidCursor
	}
	data, err := base64.RawURLEncoding.DecodeString(value)
	if err != nil {
		return nil, ErrInvalidCursor
	}
	var cursor historyCursor
	if json.Unmarshal(data, &cursor) != nil || cursor.CreatedAt.IsZero() || strings.TrimSpace(cursor.JobID) == "" {
		return nil, ErrInvalidCursor
	}
	return &cursor, nil
}

func buildPage(entries []Entry, limit int) (Page, error) {
	page := Page{Entries: entries}
	if len(entries) <= limit {
		return page, nil
	}
	page.Entries = entries[:limit]
	last := page.Entries[limit-1]
	// The cursor retains database timestamp precision, independently of display formatting.
	data, err := json.Marshal(historyCursor{CreatedAt: last.createdAt, JobID: last.JobID})
	if err != nil {
		return Page{}, err
	}
	page.NextCursor = base64.RawURLEncoding.EncodeToString(data)
	return page, nil
}
