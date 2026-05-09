package controllers

import (
	"context"
	"fmt"
	"strings"

	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/shared/cloudflareemail"
	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

func enqueueCircleNotificationMail(
	ctx context.Context,
	emailSender cloudflareemail.Sender,
	users useradmin.Repository,
	members []circle.CircleMember,
	circleID string,
	createdByUserID string,
	source string,
	allowDangerously bool,
	subject string,
	body string,
	from string,
	appName string,
	appURL string,
	adminName string,
	contactEmail string,
) (string, bool, error) {
	memberUsers := listCircleMemberUsers(users, members)
	recipients := collectUsersEmailRecipients(memberUsers)
	if len(recipients) == 0 {
		return "", false, nil
	}

	priority := cloudflareemail.PriorityHigh
	if source == "circle_status" {
		priority = cloudflareemail.PriorityNormal
	}
	jobID := source + "-" + uuidv7.MustString()
	if err := emailSender.Enqueue(ctx, cloudflareemail.EmailJob{
		JobId:    jobID,
		Template: "markdown-notice",
		Priority: priority,
		From:     from,
		To:       recipients,
		Subject:  subject,
		Body:     body,
		Variables: map[string]string{
			"subject":      subject,
			"body":         body,
			"appName":      appName,
			"appURL":       appURL,
			"adminName":    adminName,
			"contactEmail": contactEmail,
			"preview":      subject,
		},
	}); err != nil {
		return "", false, err
	}
	logQueuedMail(source, jobID, circleID, createdByUserID, subject, body, recipients, allowDangerously)
	return jobID, true, nil
}

func buildCircleSubmittedMailBody(
	circleValue circle.Circle,
	members []circle.CircleMember,
	confirmationMessage string,
	answerSummary string,
) string {
	lines := []string{
		"企画参加登録を提出しました。",
		"",
		fmt.Sprintf("企画名: %s", circleValue.Name),
		fmt.Sprintf("企画名(よみ): %s", circleValue.NameYomi),
		fmt.Sprintf("団体名: %s", circleValue.GroupName),
		fmt.Sprintf("団体名(よみ): %s", circleValue.GroupNameYomi),
	}
	lines = append(lines, buildCircleMemberLines(members)...)

	if message := strings.TrimSpace(confirmationMessage); message != "" {
		lines = append(lines, "", message)
	}
	if summary := strings.TrimSpace(answerSummary); summary != "" {
		lines = append(lines, "", "提出内容", summary)
	}

	return strings.Join(lines, "\n")
}

func buildCircleApprovedMailBody(circleValue circle.Circle, members []circle.CircleMember) string {
	lines := []string{
		"企画参加登録が受理されました。",
		"",
		fmt.Sprintf("企画名: %s", circleValue.Name),
		fmt.Sprintf("企画名(よみ): %s", circleValue.NameYomi),
		fmt.Sprintf("団体名: %s", circleValue.GroupName),
		fmt.Sprintf("団体名(よみ): %s", circleValue.GroupNameYomi),
	}
	lines = append(lines, buildCircleMemberLines(members)...)
	return strings.Join(lines, "\n")
}

func buildCircleRejectedMailBody(circleValue circle.Circle, members []circle.CircleMember, statusReason string) string {
	lines := []string{
		"企画参加登録が不受理となりました。",
		"",
		fmt.Sprintf("企画名: %s", circleValue.Name),
		fmt.Sprintf("企画名(よみ): %s", circleValue.NameYomi),
		fmt.Sprintf("団体名: %s", circleValue.GroupName),
		fmt.Sprintf("団体名(よみ): %s", circleValue.GroupNameYomi),
	}
	lines = append(lines, buildCircleMemberLines(members)...)
	if reason := strings.TrimSpace(statusReason); reason != "" {
		lines = append(lines, "", "不受理理由", reason)
	}
	return strings.Join(lines, "\n")
}

func listCircleMemberUsers(users useradmin.Repository, members []circle.CircleMember) []useradmin.User {
	memberUsers := make([]useradmin.User, 0, len(members))
	for _, member := range members {
		userValue, err := users.Find(member.UserID)
		if err != nil {
			continue
		}
		memberUsers = append(memberUsers, userValue)
	}

	return memberUsers
}

func buildCircleMemberLines(members []circle.CircleMember) []string {
	if len(members) == 0 {
		return nil
	}
	lines := []string{"", "メンバー:"}
	for _, member := range members {
		label := strings.TrimSpace(member.DisplayName)
		if label == "" {
			label = member.UserID
		}
		if member.IsLeader {
			label += " (代表者)"
		}
		lines = append(lines, "- "+label)
	}
	return lines
}
