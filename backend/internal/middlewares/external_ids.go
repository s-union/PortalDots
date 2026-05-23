package middlewares

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/shared/externalid"
)

var uuidParamNames = map[string]struct{}{
	"answerID":   {},
	"categoryID": {},
	"circleID":   {},
	"documentID": {},
	"formID":     {},
	"pageID":     {},
	"placeID":    {},
	"questionID": {},
	"tagID":      {},
	"typeID":     {},
	"uploadID":   {},
	"userID":     {},
}

var externalIDJSONKeys = map[string]struct{}{
	"actorUserId":           {},
	"categoryId":            {},
	"circleId":              {},
	"documentId":            {},
	"existingAnswerId":      {},
	"formId":                {},
	"id":                    {},
	"pageId":                {},
	"participationTypeId":   {},
	"pendingRegistrationId": {},
	"placeId":               {},
	"questionId":            {},
	"statusSetById":         {},
	"targetId":              {},
	"typeId":                {},
	"uploadId":              {},
	"userId":                {},
}

var externalIDJSONArrayKeys = map[string]struct{}{
	"documentIds": {},
	"placeIds":    {},
	"questionIds": {},
}

var externalIDMapKeyParents = map[string]struct{}{
	"details": {},
	"errors":  {},
}

func TransformExternalIDs() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			if err := decodeExternalIDParams(c); err != nil {
				return invalidRequest(c)
			}
			if err := decodeExternalIDRequest(c); err != nil {
				return invalidRequest(c)
			}

			response, err := echo.UnwrapResponse(c.Response())
			if err != nil {
				return err
			}
			originalWriter := response.ResponseWriter
			transformingWriter := newExternalIDResponseWriter(originalWriter)
			response.ResponseWriter = transformingWriter

			err = next(c)
			response.ResponseWriter = originalWriter
			if err != nil {
				return err
			}

			return transformingWriter.Finalize()
		}
	}
}

type externalIDResponseMode int

const (
	externalIDResponseModeUndecided externalIDResponseMode = iota
	externalIDResponseModeBufferedJSON
	externalIDResponseModePassthrough
)

type externalIDResponseWriter struct {
	original    http.ResponseWriter
	header      http.Header
	statusCode  int
	wroteHeader bool
	mode        externalIDResponseMode
	body        bytes.Buffer
}

func newExternalIDResponseWriter(original http.ResponseWriter) *externalIDResponseWriter {
	return &externalIDResponseWriter{
		original: original,
		header:   make(http.Header),
	}
}

func (w *externalIDResponseWriter) Header() http.Header {
	return w.header
}

func (w *externalIDResponseWriter) WriteHeader(statusCode int) {
	if w.wroteHeader {
		return
	}

	w.wroteHeader = true
	w.statusCode = statusCode
	if w.shouldBufferJSON() {
		w.mode = externalIDResponseModeBufferedJSON
		return
	}

	w.mode = externalIDResponseModePassthrough
	w.commitPassthroughHeaders()
	w.original.WriteHeader(statusCode)
}

func (w *externalIDResponseWriter) Write(body []byte) (int, error) {
	switch w.mode {
	case externalIDResponseModeBufferedJSON:
		if !w.wroteHeader {
			w.wroteHeader = true
			w.statusCode = http.StatusOK
		}
		return w.body.Write(body)
	case externalIDResponseModePassthrough:
		if !w.wroteHeader {
			w.WriteHeader(http.StatusOK)
		}
		return w.original.Write(body)
	default:
		if w.shouldBufferJSON() {
			w.mode = externalIDResponseModeBufferedJSON
			if !w.wroteHeader {
				w.wroteHeader = true
				w.statusCode = http.StatusOK
			}
			return w.body.Write(body)
		}

		w.mode = externalIDResponseModePassthrough
		if !w.wroteHeader {
			w.wroteHeader = true
			w.statusCode = http.StatusOK
			w.commitPassthroughHeaders()
			w.original.WriteHeader(http.StatusOK)
		}
		return w.original.Write(body)
	}
}

func (w *externalIDResponseWriter) Flush() {
	switch w.mode {
	case externalIDResponseModeBufferedJSON:
		return
	case externalIDResponseModePassthrough:
		if flusher, ok := w.original.(http.Flusher); ok {
			flusher.Flush()
		}
	default:
		w.mode = externalIDResponseModePassthrough
		if !w.wroteHeader {
			w.wroteHeader = true
			w.statusCode = http.StatusOK
			w.commitPassthroughHeaders()
			w.original.WriteHeader(http.StatusOK)
		}
		if flusher, ok := w.original.(http.Flusher); ok {
			flusher.Flush()
		}
	}
}

func (w *externalIDResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	hijacker, ok := w.original.(http.Hijacker)
	if !ok {
		return nil, nil, errors.New("response writer does not support hijacking")
	}
	return hijacker.Hijack()
}

func (w *externalIDResponseWriter) Push(target string, opts *http.PushOptions) error {
	pusher, ok := w.original.(http.Pusher)
	if !ok {
		return http.ErrNotSupported
	}
	return pusher.Push(target, opts)
}

func (w *externalIDResponseWriter) Finalize() error {
	switch w.mode {
	case externalIDResponseModeBufferedJSON:
		return w.flushBufferedJSON()
	case externalIDResponseModePassthrough:
		return nil
	default:
		if w.shouldBufferJSON() {
			w.mode = externalIDResponseModeBufferedJSON
			return w.flushBufferedJSON()
		}
		if !w.wroteHeader && len(w.header) == 0 {
			return nil
		}
		if !w.wroteHeader {
			w.statusCode = http.StatusOK
		}
		w.commitPassthroughHeaders()
		w.original.WriteHeader(w.statusCode)
		return nil
	}
}

func (w *externalIDResponseWriter) flushBufferedJSON() error {
	body := w.body.Bytes()
	if len(body) > 0 {
		encodedBody, err := encodeExternalIDResponse(body)
		if err != nil {
			return invalidExternalIDResponseWrite(w.original)
		}
		body = encodedBody
	}

	if w.statusCode == 0 {
		w.statusCode = http.StatusOK
	}
	mergeHeaders(w.original.Header(), w.header, len(body))
	w.original.WriteHeader(w.statusCode)
	if len(body) == 0 {
		return nil
	}
	_, err := w.original.Write(body)
	return err
}

func (w *externalIDResponseWriter) commitPassthroughHeaders() {
	mergeHeaders(w.original.Header(), w.header, -1)
}

func (w *externalIDResponseWriter) shouldBufferJSON() bool {
	return isJSONContentType(w.header.Get(echo.HeaderContentType))
}

func decodeExternalIDParams(c *echo.Context) error {
	pathValues := c.PathValues()
	if len(pathValues) == 0 {
		return nil
	}

	for index, pathValue := range pathValues {
		name := pathValue.Name
		value := pathValue.Value
		if _, ok := uuidParamNames[name]; !ok || value == "" {
			continue
		}

		decoded, err := externalid.DecodeToUUIDString(value)
		if err != nil {
			return err
		}
		pathValues[index].Value = decoded
	}

	c.SetPathValues(pathValues)
	return nil
}

func decodeExternalIDRequest(c *echo.Context) error {
	contentType, _, _ := mime.ParseMediaType(c.Request().Header.Get(echo.HeaderContentType))

	switch contentType {
	case echo.MIMEApplicationJSON:
		return decodeExternalIDJSONBody(c)
	case echo.MIMEMultipartForm:
		return decodeExternalIDForm(c, true)
	case echo.MIMEApplicationForm:
		return decodeExternalIDForm(c, false)
	default:
		return nil
	}
}

const maxExternalIDBodyBytes = 1 << 20

func decodeExternalIDJSONBody(c *echo.Context) error {
	if c.Request().Body == nil {
		return nil
	}

	body, err := io.ReadAll(io.LimitReader(c.Request().Body, maxExternalIDBodyBytes))
	if err != nil {
		return err
	}
	defer c.Request().Body.Close()

	if len(bytes.TrimSpace(body)) == 0 {
		c.Request().Body = io.NopCloser(bytes.NewReader(body))
		return nil
	}

	var payload any
	if err := json.Unmarshal(body, &payload); err != nil {
		c.Request().Body = io.NopCloser(bytes.NewReader(body))
		return nil
	}

	decoded, err := transformRequestJSON("", payload)
	if err != nil {
		return err
	}

	rewritten, err := json.Marshal(decoded)
	if err != nil {
		return err
	}

	c.Request().Body = io.NopCloser(bytes.NewReader(rewritten))
	c.Request().ContentLength = int64(len(rewritten))
	c.Request().Header.Set(echo.HeaderContentLength, strconv.Itoa(len(rewritten)))
	return nil
}

func decodeExternalIDForm(c *echo.Context, multipart bool) error {
	var err error
	if multipart {
		err = c.Request().ParseMultipartForm(32 << 20)
	} else {
		err = c.Request().ParseForm()
	}
	if err != nil {
		return err
	}

	for key := range c.Request().PostForm {
		switch {
		case isSingleExternalIDKey(key):
			for index, value := range c.Request().PostForm[key] {
				if strings.TrimSpace(value) == "" {
					continue
				}
				decoded, decodeErr := externalid.DecodeToUUIDString(value)
				if decodeErr != nil {
					return decodeErr
				}
				c.Request().PostForm[key][index] = decoded
			}
		case key == "details":
			// details is only sent as JSON, not form encoded.
			continue
		}
	}
	for key, values := range c.Request().PostForm {
		c.Request().Form[key] = values
	}

	if multipart && c.Request().MultipartForm != nil {
		for key, values := range c.Request().MultipartForm.Value {
			if !isSingleExternalIDKey(key) {
				continue
			}
			for index, value := range values {
				if strings.TrimSpace(value) == "" {
					continue
				}
				decoded, decodeErr := externalid.DecodeToUUIDString(value)
				if decodeErr != nil {
					return decodeErr
				}
				values[index] = decoded
			}
			c.Request().MultipartForm.Value[key] = values
		}
	}

	return nil
}

func encodeExternalIDResponse(body []byte) ([]byte, error) {
	var payload any
	if err := json.Unmarshal(body, &payload); err != nil {
		return body, nil
	}

	encoded, err := transformResponseJSON("", payload)
	if err != nil {
		return nil, err
	}
	return json.Marshal(encoded)
}

func transformRequestJSON(parentKey string, value any) (any, error) {
	switch typed := value.(type) {
	case map[string]any:
		if shouldTransformMapKeys(parentKey) {
			decodedMap := make(map[string]any, len(typed))
			for key, nested := range typed {
				decodedKey := key
				if decoded, err := externalid.DecodeToUUIDString(key); err == nil {
					decodedKey = decoded
				}
				decodedValue, err := transformRequestJSON("", nested)
				if err != nil {
					return nil, err
				}
				decodedMap[decodedKey] = decodedValue
			}
			return decodedMap, nil
		}

		decodedMap := make(map[string]any, len(typed))
		for key, nested := range typed {
			decodedValue, err := transformRequestJSON(key, nested)
			if err != nil {
				return nil, err
			}
			decodedMap[key] = decodedValue
		}
		return decodedMap, nil
	case []any:
		if _, ok := externalIDJSONArrayKeys[parentKey]; ok {
			decoded := make([]any, 0, len(typed))
			for _, item := range typed {
				text, ok := item.(string)
				if !ok || strings.TrimSpace(text) == "" {
					decoded = append(decoded, item)
					continue
				}
				internal, err := externalid.DecodeToUUIDString(text)
				if err != nil {
					return nil, err
				}
				decoded = append(decoded, internal)
			}
			return decoded, nil
		}

		decoded := make([]any, 0, len(typed))
		for _, nested := range typed {
			decodedValue, err := transformRequestJSON("", nested)
			if err != nil {
				return nil, err
			}
			decoded = append(decoded, decodedValue)
		}
		return decoded, nil
	case string:
		if _, ok := externalIDJSONKeys[parentKey]; ok && strings.TrimSpace(typed) != "" {
			return decodeExternalIDRequestValue(parentKey, typed)
		}
		return typed, nil
	default:
		return value, nil
	}
}

func decodeExternalIDRequestValue(parentKey string, value string) (string, error) {
	decoded, err := externalid.DecodeToUUIDString(value)
	if err == nil {
		return decoded, nil
	}

	// Registration verify links were previously issued with raw UUIDs in the URL.
	// Accept them only for pendingRegistrationId so already-sent links keep working.
	if parentKey == "pendingRegistrationId" {
		parsed, parseErr := uuid.Parse(strings.TrimSpace(value))
		if parseErr == nil {
			return parsed.String(), nil
		}
	}

	return "", err
}

func transformResponseJSON(parentKey string, value any) (any, error) {
	switch typed := value.(type) {
	case map[string]any:
		if shouldTransformMapKeys(parentKey) {
			encodedMap := make(map[string]any, len(typed))
			for key, nested := range typed {
				encodedKey := externalid.MaybeEncodeUUIDString(key)
				encodedValue, err := transformResponseJSON("", nested)
				if err != nil {
					return nil, err
				}
				encodedMap[encodedKey] = encodedValue
			}
			return encodedMap, nil
		}

		encodedMap := make(map[string]any, len(typed))
		for key, nested := range typed {
			encodedValue, err := transformResponseJSON(key, nested)
			if err != nil {
				return nil, err
			}

			switch concrete := encodedValue.(type) {
			case string:
				if _, ok := externalIDJSONKeys[key]; ok {
					encodedValue = externalid.MaybeEncodeUUIDString(concrete)
				} else if key == "downloadUrl" {
					encodedValue = externalid.RewriteURLPathUUIDs(concrete)
				}
			case []any:
				if _, ok := externalIDJSONArrayKeys[key]; ok {
					for index, item := range concrete {
						if text, ok := item.(string); ok {
							concrete[index] = externalid.MaybeEncodeUUIDString(text)
						}
					}
					encodedValue = concrete
				}
			}

			encodedMap[key] = encodedValue
		}
		return encodedMap, nil
	case []any:
		encoded := make([]any, 0, len(typed))
		for _, nested := range typed {
			encodedValue, err := transformResponseJSON("", nested)
			if err != nil {
				return nil, err
			}
			encoded = append(encoded, encodedValue)
		}
		return encoded, nil
	default:
		return value, nil
	}
}

func invalidRequest(c *echo.Context) error {
	return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid_request"})
}

func invalidExternalIDResponseWrite(w http.ResponseWriter) error {
	mergeHeaders(w.Header(), http.Header{echo.HeaderContentType: []string{echo.MIMEApplicationJSON}}, -1)
	w.WriteHeader(http.StatusBadRequest)
	_, err := w.Write([]byte("{\"message\":\"invalid_request\"}\n"))
	return err
}

func isJSONContentType(value string) bool {
	contentType, _, err := mime.ParseMediaType(value)
	if err != nil {
		return strings.HasPrefix(value, echo.MIMEApplicationJSON)
	}
	return contentType == echo.MIMEApplicationJSON
}

func isSingleExternalIDKey(key string) bool {
	_, ok := externalIDJSONKeys[key]
	return ok
}

func shouldTransformMapKeys(parentKey string) bool {
	_, ok := externalIDMapKeyParents[parentKey]
	return ok
}

func mergeHeaders(target http.Header, source http.Header, bodyLength int) {
	target.Del(echo.HeaderContentLength)
	for key, values := range source {
		if strings.EqualFold(key, echo.HeaderContentLength) {
			continue
		}
		target.Del(key)
		for _, value := range values {
			target.Add(key, value)
		}
	}
	if bodyLength >= 0 {
		target.Set(echo.HeaderContentLength, strconv.Itoa(bodyLength))
	}
}
