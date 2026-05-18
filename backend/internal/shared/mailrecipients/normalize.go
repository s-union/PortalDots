package mailrecipients

import "strings"

func Normalize(recipients []string) []string {
	normalized := make([]string, 0, len(recipients))
	seen := map[string]struct{}{}
	for _, recipient := range recipients {
		trimmed := strings.TrimSpace(recipient)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		normalized = append(normalized, trimmed)
	}

	return normalized
}
