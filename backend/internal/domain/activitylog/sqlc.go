package activitylog

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

func (r *SQLCRepository) List() ([]Entry, error) {
	rows, err := r.queries.ListActivityLogs(context.Background())
	if err != nil {
		return nil, err
	}

	entries := make([]Entry, 0, len(rows))
	for _, row := range rows {
		entries = append(entries, Entry{
			ID:          row.ID,
			ActorUserID: row.ActorUserID,
			Action:      row.Action,
			TargetType:  row.TargetType,
			TargetID:    row.TargetID,
			CircleID:    row.CircleID,
			Summary:     row.Summary,
			CreatedAt:   pgutil.FormatTimestamptz(row.CreatedAt),
		})
	}

	return entries, nil
}

func (r *SQLCRepository) Record(
	actorUserID string,
	action string,
	targetType string,
	targetID string,
	circleID string,
	summary string,
) error {
	_, err := r.queries.CreateActivityLog(context.Background(), dbgen.CreateActivityLogParams{
		ActorUserID: actorUserID,
		Action:      action,
		TargetType:  targetType,
		TargetID:    targetID,
		CircleID:    circleID,
		Summary:     summary,
	})
	return err
}
