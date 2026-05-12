package controllers

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/activitylog"
)

type staffActivityLogResponse struct {
	ID          string `json:"id"`
	ActorUserID string `json:"actorUserId"`
	Action      string `json:"action"`
	TargetType  string `json:"targetType"`
	TargetID    string `json:"targetId"`
	CircleID    string `json:"circleId"`
	Summary     string `json:"summary"`
	CreatedAt   string `json:"createdAt"`
}

func (h *staffAdminHandlers) listStaffActivityLogs(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canViewActivityLogs)
	if !ok {
		return statusError(c, status)
	}

	logs, err := h.activities.List(c.Request().Context())
	if err != nil {
		return internalError(c)
	}

	pagination := readPagination(c)
	response := make([]staffActivityLogResponse, 0, len(logs))
	for _, entry := range logs {
		item := mapStaffActivityLog(entry)
		if !matchesStaffActivityLogSearch(item, c.QueryParam("query")) {
			continue
		}
		response = append(response, item)
	}

	return c.JSON(http.StatusOK, paginateItems(response, pagination))
}

func matchesStaffActivityLogSearch(item staffActivityLogResponse, query string) bool {
	return matchesStaffListSearch([]string{
		item.Action,
		item.Summary,
		item.ActorUserID,
		item.TargetType,
		item.TargetID,
		item.CircleID,
	}, query)
}

func recordActivity(
	ctx context.Context,
	activities activitylog.Repository,
	actorUserID string,
	action string,
	targetType string,
	targetID string,
	circleID string,
	summary string,
) {
	if activities == nil {
		return
	}

	if err := activities.Record(ctx, actorUserID, action, targetType, targetID, circleID, summary); err != nil {
		slog.Error(
			"failed to record activity log",
			"actorUserID", actorUserID,
			"action", action,
			"targetType", targetType,
			"targetID", targetID,
			"circleID", circleID,
			"error", err.Error(),
		)
	}
}

func mapStaffActivityLog(entry activitylog.Entry) staffActivityLogResponse {
	return staffActivityLogResponse{
		ID:          entry.ID,
		ActorUserID: entry.ActorUserID,
		Action:      entry.Action,
		TargetType:  entry.TargetType,
		TargetID:    entry.TargetID,
		CircleID:    entry.CircleID,
		Summary:     entry.Summary,
		CreatedAt:   entry.CreatedAt,
	}
}

func buildActivitySummary(prefix string, targetName string) string {
	if targetName == "" {
		return prefix
	}

	return fmt.Sprintf("%s: %s", prefix, targetName)
}
