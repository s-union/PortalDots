package controllers

import (
	"github.com/s-union/PortalDots/backend/internal/domain/answer"
	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
)

func normalizeAnswerDetails(raw map[string]any, questions []formquestion.Question, uploads []answer.Upload) (map[string][]string, map[string][]string) {
	return formquestion.NormalizeAnswerDetails(raw, questions, uploads)
}

func normalizeAnswerValues(question formquestion.Question, rawValue any, hasValue bool) ([]string, []string) {
	return formquestion.NormalizeAnswerValues(question, rawValue, hasValue)
}

func buildAnswerSummary(questions []formquestion.Question, details map[string][]string, uploads []answer.Upload) string {
	return formquestion.BuildAnswerSummary(questions, details, uploads)
}

func validateUploadExtension(question formquestion.Question, filename string) string {
	return formquestion.ValidateUploadExtension(question, filename)
}

func normalizeAllowedTypes(value string) []string {
	return formquestion.NormalizeAllowedTypes(value)
}

func findUploadQuestion(questions []formquestion.Question, questionID string) (formquestion.Question, bool) {
	return formquestion.FindUploadQuestion(questions, questionID)
}

func cloneAnswerDetails(details map[string][]string) map[string][]string {
	return formquestion.CloneAnswerDetails(details)
}
