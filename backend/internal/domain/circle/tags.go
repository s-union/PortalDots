package circle

import (
	"context"
	"strings"

	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
)

// EffectiveTags returns the tags of a circle merged with the tags of its participation type.
func EffectiveTags(ctx context.Context, currentCircle Circle, participationTypes participationtype.Repository) []string {
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

// EffectiveTagsForCircles returns the union of the effective tags of every given circle.
func EffectiveTagsForCircles(ctx context.Context, circles []Circle, participationTypes participationtype.Repository) []string {
	tags := make([]string, 0)
	seen := map[string]struct{}{}

	for _, currentCircle := range circles {
		for _, tag := range EffectiveTags(ctx, currentCircle, participationTypes) {
			key := strings.ToLower(tag)
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}
			tags = append(tags, tag)
		}
	}

	return tags
}
