package httpapi

import (
	"fmt"
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

	logs, err := h.activities.List()
	if err != nil {
		return internalError(c)
	}

	pagination := readPagination(c)
	response := make([]staffActivityLogResponse, 0, len(logs))
	for _, entry := range logs {
		response = append(response, mapStaffActivityLog(entry))
	}

	return c.JSON(http.StatusOK, paginateItems(response, pagination))
}

func recordActivity(
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

	_ = activities.Record(actorUserID, action, targetType, targetID, circleID, summary)
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
