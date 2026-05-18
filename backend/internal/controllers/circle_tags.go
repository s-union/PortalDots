package controllers

import (
	"context"
	"strings"

	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
)

func effectiveCircleTags(ctx context.Context, currentCircle circle.Circle, participationTypes participationtype.Repository) []string {
	tags := make([]string, 0, len(currentCircle.Tags)+4)
	seen := map[string]struct{}{}

	appendTag := func(tag string) {
		normalized := strings.TrimSpace(tag)
		if normalized == "" {
			return
		}
		key := strings.ToLower(normalized)
		if _, ok := seen[key]; ok {
			return
		}
		seen[key] = struct{}{}
		tags = append(tags, normalized)
	}

	for _, tag := range currentCircle.Tags {
		appendTag(tag)
	}

	if participationTypes == nil || currentCircle.ParticipationTypeID == "" {
		return tags
	}

	participationType, err := participationTypes.Find(ctx, currentCircle.ParticipationTypeID)
	if err != nil {
		return tags
	}

	for _, tag := range participationType.Tags {
		appendTag(tag)
	}

	return tags
}
