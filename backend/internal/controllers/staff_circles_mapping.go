package controllers

import (
	"slices"

	"github.com/s-union/PortalDots/backend/internal/domain/circle"
)

func mapStaffCircle(circleValue circle.Circle) staffCircleResponse {
	var submittedAt *string
	if circleValue.SubmittedAt != nil {
		t := circleValue.SubmittedAt.UTC().Format("2006-01-02T15:04:05Z07:00")
		submittedAt = &t
	}
	var statusSetAt *string
	if circleValue.StatusSetAt != nil {
		t := circleValue.StatusSetAt.UTC().Format("2006-01-02T15:04:05Z07:00")
		statusSetAt = &t
	}
	tags := circleValue.Tags
	if tags == nil {
		tags = []string{}
	}
	places := circleValue.Places
	if places == nil {
		places = []string{}
	}
	return staffCircleResponse{
		ID:                    circleValue.ID,
		Name:                  circleValue.Name,
		NameYomi:              circleValue.NameYomi,
		GroupName:             circleValue.GroupName,
		GroupNameYomi:         circleValue.GroupNameYomi,
		ParticipationTypeID:   circleValue.ParticipationTypeID,
		ParticipationTypeName: circleValue.ParticipationTypeName,
		Tags:                  tags,
		Notes:                 circleValue.Notes,
		SubmittedAt:           submittedAt,
		Status:                circleValue.Status,
		StatusReason:          circleValue.StatusReason,
		StatusSetAt:           statusSetAt,
		StatusSetByID:         circleValue.StatusSetByID,
		Places:                places,
	}
}

func mapStaffCircleMailRecipient(recipient staffCircleMailRecipient) staffCircleMailRecipientResponse {
	return staffCircleMailRecipientResponse{
		ID:          recipient.User.ID,
		DisplayName: recipient.User.DisplayName,
		LoginIDs:    slices.Clone(recipient.User.LoginIDs),
		IsLeader:    recipient.IsLeader,
	}
}
