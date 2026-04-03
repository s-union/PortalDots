package middlewares

import (
	"bytes"
	"encoding/json"
	"io"
	"mime"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
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
		return func(c echo.Context) error {
			if err := decodeExternalIDParams(c); err != nil {
				return invalidRequest(c)
			}
			if err := decodeExternalIDRequest(c); err != nil {
				return invalidRequest(c)
			}

			originalWriter := c.Response().Writer
			bufferedWriter := httptest.NewRecorder()
			c.Response().Writer = bufferedWriter

			err := next(c)
			c.Response().Writer = originalWriter
			if err != nil {
				return err
			}

			statusCode := bufferedWriter.Code
			if statusCode == 0 {
				statusCode = http.StatusOK
			}

			body := bufferedWriter.Body.Bytes()
			contentType := bufferedWriter.Header().Get(echo.HeaderContentType)
			if isJSONContentType(contentType) && len(body) > 0 {
				encodedBody, encodeErr := encodeExternalIDResponse(body)
				if encodeErr != nil {
					return invalidRequest(c)
				}
				body = encodedBody
			}

			copyHeaders(originalWriter.Header(), bufferedWriter.Header(), len(body))
			originalWriter.WriteHeader(statusCode)
			if len(body) > 0 {
				if _, writeErr := originalWriter.Write(body); writeErr != nil {
					return writeErr
				}
			}
			return nil
		}
	}
}

func decodeExternalIDParams(c echo.Context) error {
	paramNames := c.ParamNames()
	if len(paramNames) == 0 {
		return nil
	}

	paramValues := make([]string, len(paramNames))
	for index, name := range paramNames {
		value := c.Param(name)
		if _, ok := uuidParamNames[name]; !ok || value == "" {
			paramValues[index] = value
			continue
		}

		decoded, err := externalid.DecodeToUUIDString(value)
		if err != nil {
			return err
		}
		paramValues[index] = decoded
	}

	c.SetParamValues(paramValues...)
	return nil
}

func decodeExternalIDRequest(c echo.Context) error {
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

func decodeExternalIDJSONBody(c echo.Context) error {
	if c.Request().Body == nil {
		return nil
	}

	body, err := io.ReadAll(c.Request().Body)
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

func decodeExternalIDForm(c echo.Context, multipart bool) error {
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
			return externalid.DecodeToUUIDString(typed)
		}
		return typed, nil
	default:
		return value, nil
	}
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

func invalidRequest(c echo.Context) error {
	return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid_request"})
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

func copyHeaders(target http.Header, source http.Header, bodyLength int) {
	target.Del(echo.HeaderContentLength)
	for key := range target {
		target.Del(key)
	}
	for key, values := range source {
		if strings.EqualFold(key, echo.HeaderContentLength) {
			continue
		}
		for _, value := range values {
			target.Add(key, value)
		}
	}
	if bodyLength > 0 {
		target.Set(echo.HeaderContentLength, strconv.Itoa(bodyLength))
	}
}
