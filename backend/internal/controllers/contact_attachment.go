package controllers

import (
	"archive/zip"
	"bytes"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/domain/contact"
)

const (
	maxContactAttachmentBytes = 5 * 1024 * 1024
	maxContactRequestBytes    = maxContactAttachmentBytes + 1024*1024
)

var contactAttachmentTypes = map[string]string{
	".pdf":  "application/pdf",
	".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	".png":  "image/png",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
}

var openXMLContentTypes = map[string]string{
	".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
	".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
	".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml",
}

func contactRequestBodyLimit() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			request := c.Request()
			if request.Method != http.MethodPost || request.URL.Path != "/v1/contact" {
				return next(c)
			}
			if request.ContentLength > maxContactRequestBytes {
				return errorJSON(c, http.StatusRequestEntityTooLarge, "request_too_large")
			}
			request.Body = http.MaxBytesReader(c.Response(), request.Body, maxContactRequestBytes)
			err := next(c)
			var maxBytesError *http.MaxBytesError
			if errors.As(err, &maxBytesError) {
				return errorJSON(c, http.StatusRequestEntityTooLarge, "request_too_large")
			}
			return err
		}
	}
}

func parseContactAttachment(fileHeader *multipart.FileHeader) (*contact.NewAttachment, map[string][]string) {
	if fileHeader == nil {
		return nil, nil
	}

	filename := strings.TrimSpace(fileHeader.Filename)
	if !validContactFilename(filename) {
		return nil, map[string][]string{"file": {"ファイル名が不正です"}}
	}
	if fileHeader.Size > maxContactAttachmentBytes {
		return nil, map[string][]string{"file": {"ファイルサイズは 5MB 以下にしてください"}}
	}

	file, err := fileHeader.Open()
	if err != nil {
		return nil, map[string][]string{"file": {"ファイルを読み込めませんでした"}}
	}
	defer file.Close()

	content, err := io.ReadAll(io.LimitReader(file, maxContactAttachmentBytes+1))
	if err != nil {
		return nil, map[string][]string{"file": {"ファイルを読み込めませんでした"}}
	}
	if len(content) == 0 {
		return nil, map[string][]string{"file": {"空のファイルはアップロードできません"}}
	}
	if len(content) > maxContactAttachmentBytes {
		return nil, map[string][]string{"file": {"ファイルサイズは 5MB 以下にしてください"}}
	}

	mimeType, ok := detectAllowedContactAttachment(filename, content)
	if !ok {
		return nil, map[string][]string{"file": {"PDF、Word、Excel、PowerPoint、PNG、JPEG ファイルを選択してください"}}
	}
	return &contact.NewAttachment{Filename: filename, MimeType: mimeType, Content: content}, nil
}

func validContactFilename(filename string) bool {
	if filename == "" || !utf8.ValidString(filename) || utf8.RuneCountInString(filename) > 255 {
		return false
	}
	if filename == "." || filename == ".." || strings.ContainsAny(filename, "\x00\r\n/\\") {
		return false
	}
	return filepath.Base(filename) == filename
}

func detectAllowedContactAttachment(filename string, content []byte) (string, bool) {
	extension := strings.ToLower(filepath.Ext(filename))
	mimeType, allowed := contactAttachmentTypes[extension]
	if !allowed {
		return "", false
	}

	detected := http.DetectContentType(content)
	if expected, openXML := openXMLContentTypes[extension]; openXML {
		if detected != "application/zip" || !hasOpenXMLContentType(content, expected) {
			return "", false
		}
		return mimeType, true
	}
	if detected != mimeType {
		return "", false
	}
	return mimeType, true
}

func hasOpenXMLContentType(content []byte, expected string) bool {
	reader, err := zip.NewReader(bytes.NewReader(content), int64(len(content)))
	if err != nil {
		return false
	}
	for _, file := range reader.File {
		if file.Name != "[Content_Types].xml" || file.UncompressedSize64 > 256*1024 {
			continue
		}
		value, err := file.Open()
		if err != nil {
			return false
		}
		body, readErr := io.ReadAll(io.LimitReader(value, 256*1024+1))
		closeErr := value.Close()
		if readErr != nil || closeErr != nil || len(body) > 256*1024 {
			return false
		}
		return bytes.Contains(body, []byte(expected))
	}
	return false
}

func parseContactCCSubleader(raw string) (*bool, map[string][]string) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}
	value, err := strconv.ParseBool(raw)
	if err != nil {
		return nil, map[string][]string{"ccSubleader": {"共有先の指定が不正です"}}
	}
	return &value, nil
}

func contactAttachmentDescription(attachment *contact.NewAttachment) string {
	if attachment == nil {
		return ""
	}
	return fmt.Sprintf("\n\n添付ファイル: %s", attachment.Filename)
}
