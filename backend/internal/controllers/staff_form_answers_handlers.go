package controllers

import (
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

func (h *staffFormHandlers) listStaffFormAnswers(c echo.Context) error {
	_, _, formValue, currentCircle, questions, status, ok := h.staffFormContext(c, canReadFormAnswers)
	if !ok {
		return statusError(c, status)
	}
	filterQueries, filterMode, err := parseStaffListFilters(c.QueryParam("queries"), c.QueryParam("mode"), staffFormAnswerFilterableFields)
	if err != nil {
		return validationError(c, map[string][]string{"queries": {"絞り込み条件が正しくありません"}})
	}

	circles, err := h.circles.ListForStaff()
	if err != nil {
		return internalError(c)
	}
	circleMap := make(map[string]staffAnswerCircleResponse, len(circles))
	for _, currentCircle := range circles {
		circleMap[currentCircle.ID] = mapStaffAnswerCircle(currentCircle)
	}

	answerValues := h.answers.ListByForm(c.Request().Context(), formValue.ID)
	answerCircles := map[string]struct{}{}
	answerResponse := make([]staffManagedFormAnswerSummaryResponse, 0, len(answerValues))
	for _, currentAnswer := range answerValues {
		answerCircles[currentAnswer.CircleID] = struct{}{}
		item := mapStaffManagedFormAnswerSummary(currentAnswer, circleMap[currentAnswer.CircleID], h.answers.ListUploadsByAnswer(c.Request().Context(), currentAnswer.ID))
		if !matchesStaffFormAnswerSearch(item, c.QueryParam("query")) || !matchesStaffListFilters(staffFormAnswerFilterResolver(item), filterQueries, filterMode) {
			continue
		}
		answerResponse = append(answerResponse, item)
	}

	notAnswered := make([]staffAnswerCircleResponse, 0, len(circles))
	allCircles := make([]staffAnswerCircleResponse, 0, len(circles))
	for _, currentCircle := range circles {
		mapped := mapStaffAnswerCircle(currentCircle)
		allCircles = append(allCircles, mapped)
		if _, answered := answerCircles[currentCircle.ID]; !answered {
			notAnswered = append(notAnswered, mapped)
		}
	}

	return c.JSON(http.StatusOK, staffFormAnswersIndexResponse{
		Form:               h.buildStaffFormDetailResponse(formValue, mapStaffManagedCircle(currentCircle), mapStaffFormQuestions(questions), nil),
		Answers:            answerResponse,
		Circles:            allCircles,
		NotAnsweredCircles: notAnswered,
	})
}

var staffFormAnswerFilterableFields = map[string]staffListFilterFieldType{
	"circle":    staffListFilterFieldTypeString,
	"createdAt": staffListFilterFieldTypeString,
	"updatedAt": staffListFilterFieldTypeString,
}

func matchesStaffFormAnswerSearch(item staffManagedFormAnswerSummaryResponse, query string) bool {
	return matchesStaffListSearch([]string{
		item.Circle.Name,
		item.Circle.GroupName,
		item.Circle.ParticipationTypeName,
	}, query)
}

func staffFormAnswerFilterResolver(item staffManagedFormAnswerSummaryResponse) func(string) (string, bool) {
	return func(key string) (string, bool) {
		switch key {
		case "circle":
			return item.Circle.Name, true
		case "createdAt":
			return item.CreatedAt, true
		case "updatedAt":
			return item.UpdatedAt, true
		default:
			return "", false
		}
	}
}

func (h *staffFormHandlers) getStaffFormAnswer(c echo.Context) error {
	_, _, formValue, currentFormCircle, questions, status, ok := h.staffFormContext(c, canReadFormAnswers)
	if !ok {
		return statusError(c, status)
	}

	answerValue, found := h.answers.Find(c.Request().Context(), c.Param("answerID"))
	if !found || answerValue.FormID != formValue.ID {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	currentCircle, err := h.circles.Find(answerValue.CircleID)
	if err != nil {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}

	siblings := h.answers.ListByFormAndCircle(c.Request().Context(), formValue.ID, answerValue.CircleID)
	siblingResponse := make([]staffManagedFormAnswerSummaryResponse, 0, len(siblings))
	for _, sibling := range siblings {
		siblingResponse = append(siblingResponse, mapStaffManagedFormAnswerSummary(sibling, mapStaffAnswerCircle(currentCircle), h.answers.ListUploadsByAnswer(c.Request().Context(), sibling.ID)))
	}

	return c.JSON(http.StatusOK, staffManagedFormAnswerDetailResponse{
		Form:           h.buildStaffFormDetailResponse(formValue, mapStaffManagedCircle(currentFormCircle), mapStaffFormQuestions(questions), nil),
		Circle:         mapStaffAnswerCircle(currentCircle),
		Answer:         buildStaffFormAnswerResponse(answerValue, h.answers.ListUploadsByAnswer(c.Request().Context(), answerValue.ID)),
		SiblingAnswers: siblingResponse,
	})
}

func (h *staffFormHandlers) createStaffFormAnswer(c echo.Context) error {
	_, currentSession, formValue, _, questions, status, ok := h.staffFormContext(c, canEditFormAnswers)
	if !ok {
		return statusError(c, status)
	}

	var request mutateStaffFormAnswerRequest
	if err := c.Bind(&request); err != nil {
		return validationError(c, map[string][]string{
			"body": {"invalid_request"},
		})
	}

	validationErrors := map[string][]string{}
	request.CircleID = strings.TrimSpace(request.CircleID)
	if request.CircleID == "" {
		validationErrors["circleId"] = []string{"circle_id_required"}
	}

	targetCircle, err := h.circles.Find(request.CircleID)
	if request.CircleID != "" && err != nil {
		validationErrors["circleId"] = []string{"circle_not_found"}
	}

	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	existingAnswers := h.answers.ListByFormAndCircle(c.Request().Context(), formValue.ID, request.CircleID)
	if formValue.MaxAnswers > 0 && int32(len(existingAnswers)) >= formValue.MaxAnswers {
		if formValue.MaxAnswers == 1 && len(existingAnswers) == 1 {
			return c.JSON(http.StatusConflict, existingStaffFormAnswerResponse{
				Message:          "answer_already_exists",
				ExistingAnswerID: existingAnswers[0].ID,
			})
		}
		return validationError(c, map[string][]string{
			"circleId": {"max_answers_exceeded"},
		})
	}

	normalizedDetails, fieldErrors := normalizeAnswerDetails(request.Details, questions, nil)
	if len(fieldErrors) > 0 {
		return validationError(c, fieldErrors)
	}

	body := strings.TrimSpace(request.Body)
	if len(questions) > 0 {
		body = buildAnswerSummary(questions, normalizedDetails, nil)
	}

	created := h.answers.Create(c.Request().Context(), formValue.ID, request.CircleID, body, normalizedDetails)
	if h.shouldNotifyStaffFormAnswer(formValue.ID, formValue.IsPublic) {
		h.enqueueStaffFormAnswerMail(c.Request().Context(), currentSession.User.ID, formValue, created)
	}
	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.form_answer.created",
		"answer",
		created.ID,
		request.CircleID,
		buildActivitySummary("staff が回答を作成しました", formValue.Name),
	)

	return c.JSON(http.StatusCreated, createStaffFormAnswerResponse{
		Answer: mapStaffManagedFormAnswerSummary(created, mapStaffAnswerCircle(targetCircle), nil),
	})
}

func (h *staffFormHandlers) updateStaffFormAnswer(c echo.Context) error {
	_, currentSession, formValue, _, questions, status, ok := h.staffFormContext(c, canEditFormAnswers)
	if !ok {
		return statusError(c, status)
	}

	answerValue, found := h.answers.Find(c.Request().Context(), c.Param("answerID"))
	if !found || answerValue.FormID != formValue.ID {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	var request mutateStaffFormAnswerRequest
	if err := c.Bind(&request); err != nil {
		return validationError(c, map[string][]string{
			"body": {"invalid_request"},
		})
	}

	uploads := h.answers.ListUploadsByAnswer(c.Request().Context(), answerValue.ID)
	normalizedDetails, fieldErrors := normalizeAnswerDetails(request.Details, questions, uploads)
	if len(fieldErrors) > 0 {
		return validationError(c, fieldErrors)
	}

	body := strings.TrimSpace(request.Body)
	if len(questions) > 0 {
		body = buildAnswerSummary(questions, normalizedDetails, uploads)
	}

	updated, ok := h.answers.Update(c.Request().Context(), answerValue.ID, body, normalizedDetails)
	if !ok {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}
	if h.shouldNotifyStaffFormAnswer(formValue.ID, formValue.IsPublic) {
		h.enqueueStaffFormAnswerMail(c.Request().Context(), currentSession.User.ID, formValue, updated)
	}

	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.form_answer.updated",
		"answer",
		updated.ID,
		updated.CircleID,
		buildActivitySummary("staff が回答を更新しました", formValue.Name),
	)

	return c.JSON(http.StatusOK, buildStaffFormAnswerResponse(updated, uploads))
}

func (h *staffFormHandlers) deleteStaffFormAnswer(c echo.Context) error {
	_, currentSession, formValue, _, _, status, ok := h.staffFormContext(c, canDeleteFormAnswers)
	if !ok {
		return statusError(c, status)
	}

	answerValue, found := h.answers.Find(c.Request().Context(), c.Param("answerID"))
	if !found || answerValue.FormID != formValue.ID {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	if !h.answers.Delete(c.Request().Context(), answerValue.ID) {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.form_answer.deleted",
		"answer",
		answerValue.ID,
		answerValue.CircleID,
		buildActivitySummary("staff が回答を削除しました", formValue.Name),
	)

	return c.NoContent(http.StatusNoContent)
}

func (h *staffFormHandlers) uploadStaffFormAnswerFile(c echo.Context) error {
	_, currentSession, formValue, _, questions, status, ok := h.staffFormContext(c, canEditFormAnswers)
	if !ok {
		return statusError(c, status)
	}

	answerValue, found := h.answers.Find(c.Request().Context(), c.Param("answerID"))
	if !found || answerValue.FormID != formValue.ID {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return validationError(c, map[string][]string{
			"file": {"file_required"},
		})
	}

	questionID := strings.TrimSpace(c.FormValue("questionId"))
	if questionID == "" {
		return validationError(c, map[string][]string{
			"questionId": {"question_id_required"},
		})
	}
	uploadQuestion, found := findUploadQuestion(questions, questionID)
	if !found {
		return validationError(c, map[string][]string{
			"questionId": {"アップロード先の設問が不正です"},
		})
	}

	filename := strings.TrimSpace(fileHeader.Filename)
	if filename == "" {
		return validationError(c, map[string][]string{
			"file": {"ファイル名が不正です"},
		})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "upload_failed")
	}
	defer file.Close()

	content, err := io.ReadAll(io.LimitReader(file, maxAnswerUploadBytes+1))
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "upload_failed")
	}
	if len(content) == 0 {
		return validationError(c, map[string][]string{
			"file": {"空のファイルはアップロードできません"},
		})
	}
	if len(content) > maxAnswerUploadBytes {
		return validationError(c, map[string][]string{
			"file": {"ファイルサイズは 5MB 以下にしてください"},
		})
	}
	if uploadValidationMessage := validateUploadExtension(uploadQuestion, filename); uploadValidationMessage != "" {
		return validationError(c, map[string][]string{
			"file": {uploadValidationMessage},
		})
	}

	mimeType := http.DetectContentType(content)

	upload, ok := h.answers.AddUploadToAnswer(c.Request().Context(), answerValue.ID, questionID, filename, mimeType, content)
	if !ok {
		return errorJSON(c, http.StatusInternalServerError, "upload_failed")
	}

	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.form_answer.uploaded",
		"answer",
		answerValue.ID,
		answerValue.CircleID,
		buildActivitySummary("staff が回答添付を更新しました", formValue.Name),
	)

	return c.JSON(http.StatusCreated, mapFormAnswerUpload(upload))
}

func (h *staffFormHandlers) downloadStaffFormAnswerUpload(c echo.Context) error {
	_, _, formValue, _, _, status, ok := h.staffFormContext(c, canReadFormAnswers)
	if !ok {
		return statusError(c, status)
	}

	answerValue, found := h.answers.Find(c.Request().Context(), c.Param("answerID"))
	if !found || answerValue.FormID != formValue.ID {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	upload, found := h.answers.FindUploadByAnswerAndQuestion(c.Request().Context(), answerValue.ID, c.Param("questionID"))
	if !found {
		return errorJSON(c, http.StatusNotFound, "upload_not_found")
	}

	c.Response().Header().Set(echo.HeaderContentDisposition, fmt.Sprintf("attachment; filename=%q", upload.Filename))
	return c.Blob(http.StatusOK, upload.MimeType, upload.Content)
}

func (h *staffFormHandlers) listStaffFormNotAnsweredCircles(c echo.Context) error {
	_, _, formValue, _, _, status, ok := h.staffFormContext(c, canReadFormAnswers)
	if !ok {
		return statusError(c, status)
	}

	circles, err := h.circles.ListForStaff()
	if err != nil {
		return internalError(c)
	}

	answered := map[string]struct{}{}
	for _, currentAnswer := range h.answers.ListByForm(c.Request().Context(), formValue.ID) {
		answered[currentAnswer.CircleID] = struct{}{}
	}

	response := make([]staffAnswerCircleResponse, 0, len(circles))
	for _, currentCircle := range circles {
		if _, ok := answered[currentCircle.ID]; ok {
			continue
		}
		response = append(response, mapStaffAnswerCircle(currentCircle))
	}

	return c.JSON(http.StatusOK, response)
}
