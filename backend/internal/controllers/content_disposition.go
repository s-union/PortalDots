package controllers

import (
	"mime"
	"strings"
)

const (
	defaultAttachmentFilename = "download"
	defaultInlineFilename     = "document"
)

func attachmentContentDisposition(filename string) string {
	return buildContentDisposition("attachment", filename, defaultAttachmentFilename)
}

func inlineContentDisposition(filename string) string {
	return buildContentDisposition("inline", filename, defaultInlineFilename)
}

func buildContentDisposition(dispositionType, filename, fallback string) string {
	normalized := strings.TrimSpace(filename)
	if normalized == "" {
		normalized = fallback
	}
	normalized = strings.Map(func(r rune) rune {
		switch r {
		case '\r', '\n', 0:
			return -1
		default:
			return r
		}
	}, normalized)
	if normalized == "" {
		normalized = fallback
	}

	value := mime.FormatMediaType(dispositionType, map[string]string{
		"filename": normalized,
	})
	if strings.TrimSpace(value) == "" {
		return dispositionType + `; filename="` + fallback + `"`
	}

	return value
}
