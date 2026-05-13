package controllers

import (
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
)

func mapCircleDetail(c circle.Circle) circleDetailResponse {
	var submittedAt *string
	if c.SubmittedAt != nil {
		s := c.SubmittedAt.Format(time.RFC3339)
		submittedAt = &s
	}
	places := slices.Clone(c.Places)
	if places == nil {
		places = []string{}
	}
	return circleDetailResponse{
		ID:                    c.ID,
		Name:                  c.Name,
		NameYomi:              c.NameYomi,
		GroupName:             c.GroupName,
		GroupNameYomi:         c.GroupNameYomi,
		ParticipationTypeID:   c.ParticipationTypeID,
		ParticipationTypeName: c.ParticipationTypeName,
		Notes:                 c.Notes,
		CanChangeGroupName:    c.CanChangeGroupName,
		LastUpdatedAt:         c.UpdatedAt.Format(time.RFC3339),
		Questions:             []staffFormQuestion{},
		InvitationToken:       c.InvitationToken,
		SubmittedAt:           submittedAt,
		Status:                c.Status,
		StatusReason:          c.StatusReason,
		Places:                places,
	}
}

func leaderSummary(members []circle.CircleMember, currentUserID string) (string, bool) {
	leaderDisplayName := ""
	isLeader := false
	for _, member := range members {
		if !member.IsLeader {
			continue
		}
		if leaderDisplayName == "" {
			leaderDisplayName = member.DisplayName
		}
		if member.UserID == currentUserID {
			isLeader = true
			leaderDisplayName = member.DisplayName
		}
	}
	return leaderDisplayName, isLeader
}

func (h *workspaceHandlers) defaultGroupForUser(userValue useradmin.User) (string, string, bool) {
	if len(userValue.LeaderCircleIDs) == 0 {
		return "", "", true
	}
	existingCircle, err := h.circles.Find(userValue.LeaderCircleIDs[0])
	if err != nil {
		return "", "", true
	}
	return existingCircle.GroupName, existingCircle.GroupNameYomi, false
}

func (h *workspaceHandlers) copyExistingMembersToCircle(requester *auth.User, sourceCircleID, destinationCircleID string) error {
	members, err := h.circles.ListMembers(sourceCircleID)
	if err != nil {
		return err
	}
	for _, member := range members {
		if member.IsLeader {
			continue
		}
		if err := h.circles.AddMember(requester, destinationCircleID, member.UserID, member.DisplayName, true); err != nil {
			return err
		}
	}
	return nil
}

func (h *workspaceHandlers) validateCircleMemberCount(pt participationtype.ParticipationType, members []circle.CircleMember) map[string][]string {
	memberCount := int32(len(members))
	if memberCount < pt.UsersCountMin {
		return map[string][]string{
			"members": {fmt.Sprintf("参加登録に必要な人数が不足しています。あと%d人必要です", pt.UsersCountMin-memberCount)},
		}
	}
	if pt.UsersCountMax > 0 && memberCount > pt.UsersCountMax {
		return map[string][]string{
			"members": {fmt.Sprintf("参加登録の最大人数を超えています。%d人減らしてください", memberCount-pt.UsersCountMax)},
		}
	}
	return map[string][]string{}
}

func (h *workspaceHandlers) canSubmitCircle(pt participationtype.ParticipationType, members []circle.CircleMember) bool {
	return len(h.validateCircleMemberCount(pt, members)) == 0
}

func answerDetailsToAny(details map[string][]string) map[string]any {
	if len(details) == 0 {
		return map[string]any{}
	}
	converted := make(map[string]any, len(details))
	for questionID, values := range details {
		cloned := append([]string{}, values...)
		converted[questionID] = cloned
	}
	return converted
}

func questionsWithoutRequiredUploads(questions []formquestion.Question) []formquestion.Question {
	filtered := make([]formquestion.Question, 0, len(questions))
	for _, question := range questions {
		if question.Type == "upload" {
			question.IsRequired = false
		}
		filtered = append(filtered, question)
	}
	return filtered
}

func slicesSortParticipationTypes(items []participationtype.ParticipationType) {
	slices.SortFunc(items, func(left, right participationtype.ParticipationType) int {
		return strings.Compare(left.Name, right.Name)
	})
}
