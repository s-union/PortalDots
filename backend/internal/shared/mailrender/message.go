package mailrender

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"mime"
	"mime/quotedprintable"
	"strings"
)

func BuildMultipartAlternativeMessage(from, recipient string, rendered RenderedMail) string {
	boundary := newMultipartBoundary(rendered.Text, rendered.HTML)
	encodedFrom := mime.BEncoding.Encode("UTF-8", sanitizeMailHeaderValue(from))
	encodedRecipient := mime.BEncoding.Encode("UTF-8", sanitizeMailHeaderValue(recipient))
	encodedSubject := mime.BEncoding.Encode("UTF-8", sanitizeMailHeaderValue(rendered.Subject))

	lines := []string{
		fmt.Sprintf("From: %s", encodedFrom),
		fmt.Sprintf("To: %s", encodedRecipient),
		fmt.Sprintf("Subject: %s", encodedSubject),
		"MIME-Version: 1.0",
		fmt.Sprintf(`Content-Type: multipart/alternative; boundary="%s"`, boundary),
		"",
		"--" + boundary,
		"Content-Type: text/plain; charset=UTF-8",
		"Content-Transfer-Encoding: quoted-printable",
		"",
		encodeQuotedPrintable(toCRLF(rendered.Text)),
		"--" + boundary,
		"Content-Type: text/html; charset=UTF-8",
		"Content-Transfer-Encoding: quoted-printable",
		"",
		encodeQuotedPrintable(toCRLF(rendered.HTML)),
		"--" + boundary + "--",
	}

	return strings.Join(lines, "\r\n")
}

func newMultipartBoundary(parts ...string) string {
	for {
		token := make([]byte, 16)
		_, _ = rand.Read(token)

		boundary := "PortalDots_" + hex.EncodeToString(token)
		delimiter := "--" + boundary
		if !containsAny(parts, delimiter) {
			return boundary
		}
	}
}

func sanitizeMailHeaderValue(value string) string {
	trimmed := strings.TrimSpace(value)
	trimmed = strings.ReplaceAll(trimmed, "\r", " ")
	trimmed = strings.ReplaceAll(trimmed, "\n", " ")
	trimmed = strings.ReplaceAll(trimmed, "\t", " ")
	return strings.TrimSpace(trimmed)
}

func encodeQuotedPrintable(value string) string {
	var buffer bytes.Buffer
	writer := quotedprintable.NewWriter(&buffer)
	_, _ = writer.Write([]byte(strings.TrimSpace(value)))
	_ = writer.Close()
	return strings.TrimSpace(buffer.String())
}

func containsAny(values []string, needle string) bool {
	for _, value := range values {
		if strings.Contains(value, needle) {
			return true
		}
	}
	return false
}

func toCRLF(value string) string {
	normalized := strings.ReplaceAll(value, "\r\n", "\n")
	normalized = strings.ReplaceAll(normalized, "\r", "\n")
	return strings.ReplaceAll(normalized, "\n", "\r\n")
}
