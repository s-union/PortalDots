//go:build ignore

package workspacehttp

import (
	"strings"

	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
)

const (
	workspaceHiddenQuestionNameApplicationPage       = "申請ページ"
	workspaceHiddenQuestionNameApplicationCircleName = "申請企画名"
	workspaceCircleNotApprovedMessage                = "企画が受理されていないため申請できません。"
)

func filterWorkspaceFormQuestions(questions []formquestion.Question) []formquestion.Question {
	filtered := make([]formquestion.Question, 0, len(questions))
	for _, question := range questions {
		if isWorkspaceHiddenQuestion(question.Name) {
			continue
		}
		filtered = append(filtered, question)
	}

	return filtered
}

func isWorkspaceCircleApprovedStatus(status string) bool {
	return strings.EqualFold(strings.TrimSpace(status), "approved")
}

func isWorkspaceHiddenQuestion(name string) bool {
	trimmed := strings.TrimSpace(name)
	return trimmed == workspaceHiddenQuestionNameApplicationPage ||
		trimmed == workspaceHiddenQuestionNameApplicationCircleName
}
