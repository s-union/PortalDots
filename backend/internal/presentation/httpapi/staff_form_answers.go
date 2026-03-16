package httpapi

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/answer"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	backendform "github.com/s-union/PortalDots/backend/internal/domain/form"
	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
)

type staffAnswerCircleResponse struct {
	ID                    string `json:"id"`
	Name                  string `json:"name"`
	GroupName             string `json:"groupName"`
	ParticipationTypeName string `json:"participationTypeName"`
}

type staffManagedFormAnswerSummaryResponse struct {
	ID          string                    `json:"id"`
	Circle      staffAnswerCircleResponse `json:"circle"`
	Body        string                    `json:"body"`
	CreatedAt   string                    `json:"createdAt"`
	UpdatedAt   string                    `json:"updatedAt"`
	UploadCount int                       `json:"uploadCount"`
}

type staffFormAnswersIndexResponse struct {
	Form               staffFormSummaryResponse                `json:"form"`
	Answers            []staffManagedFormAnswerSummaryResponse `json:"answers"`
	Circles            []staffAnswerCircleResponse             `json:"circles"`
	NotAnsweredCircles []staffAnswerCircleResponse             `json:"notAnsweredCircles"`
}

type staffManagedFormAnswerDetailResponse struct {
	Form           staffFormDetailResponse                 `json:"form"`
	Circle         staffAnswerCircleResponse               `json:"circle"`
	Answer         staffFormAnswerResponse                 `json:"answer"`
	SiblingAnswers []staffManagedFormAnswerSummaryResponse `json:"siblingAnswers"`
}

type createStaffFormAnswerResponse struct {
	Answer staffManagedFormAnswerSummaryResponse `json:"answer"`
}

type mutateStaffFormAnswerRequest struct {
	CircleID string         `json:"circleId"`
	Body     string         `json:"body"`
	Details  map[string]any `json:"details"`
}

type existingStaffFormAnswerResponse struct {
	Message          string `json:"message"`
	ExistingAnswerID string `json:"existingAnswerId"`
}

func (h *staffFormHandlers) listStaffFormAnswers(c echo.Context) error {
	_, _, formValue, _, status, ok := h.staffFormContext(c, canReadFormAnswers)
	if !ok {
		return statusError(c, status)
	}

	circles, err := h.circles.ListForStaff()
	if err != nil {
		return internalError(c)
	}
	circleMap := make(map[string]staffAnswerCircleResponse, len(circles))
	for _, currentCircle := range circles {
		circleMap[currentCircle.ID] = mapStaffAnswerCircle(currentCircle)
	}

	answerValues := h.answers.ListByForm(formValue.ID)
	answerCircles := map[string]struct{}{}
	answerResponse := make([]staffManagedFormAnswerSummaryResponse, 0, len(answerValues))
	for _, currentAnswer := range answerValues {
		answerCircles[currentAnswer.CircleID] = struct{}{}
		answerResponse = append(answerResponse, mapStaffManagedFormAnswerSummary(currentAnswer, circleMap[currentAnswer.CircleID], h.answers.ListUploadsByAnswer(currentAnswer.ID)))
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
		Form:               h.mapStaffFormSummary(formValue),
		Answers:            answerResponse,
		Circles:            allCircles,
		NotAnsweredCircles: notAnswered,
	})
}

func (h *staffFormHandlers) getStaffFormAnswer(c echo.Context) error {
	_, _, formValue, questions, status, ok := h.staffFormContext(c, canReadFormAnswers)
	if !ok {
		return statusError(c, status)
	}

	answerValue, found := h.answers.Find(c.Param("answerID"))
	if !found || answerValue.FormID != formValue.ID {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	currentCircle, err := h.circles.Find(answerValue.CircleID)
	if err != nil {
		return errorJSON(c, http.StatusNotFound, "circle_not_found")
	}

	siblings := h.answers.ListByFormAndCircle(formValue.ID, answerValue.CircleID)
	siblingResponse := make([]staffManagedFormAnswerSummaryResponse, 0, len(siblings))
	for _, sibling := range siblings {
		siblingResponse = append(siblingResponse, mapStaffManagedFormAnswerSummary(sibling, mapStaffAnswerCircle(currentCircle), h.answers.ListUploadsByAnswer(sibling.ID)))
	}

	return c.JSON(http.StatusOK, staffManagedFormAnswerDetailResponse{
		Form:           h.buildStaffFormDetailResponse(formValue, questions, nil),
		Circle:         mapStaffAnswerCircle(currentCircle),
		Answer:         buildStaffFormAnswerResponse(answerValue, h.answers.ListUploadsByAnswer(answerValue.ID)),
		SiblingAnswers: siblingResponse,
	})
}

func (h *staffFormHandlers) createStaffFormAnswer(c echo.Context) error {
	_, currentSession, formValue, questions, status, ok := h.staffFormContext(c, canEditFormAnswers)
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

	existingAnswers := h.answers.ListByFormAndCircle(formValue.ID, request.CircleID)
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

	created := h.answers.Create(formValue.ID, request.CircleID, body, normalizedDetails)
	if formValue.IsPublic {
		h.enqueueStaffFormAnswerMail(currentSession.User.ID, formValue, created)
	}
	recordActivity(
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
	_, currentSession, formValue, questions, status, ok := h.staffFormContext(c, canEditFormAnswers)
	if !ok {
		return statusError(c, status)
	}

	answerValue, found := h.answers.Find(c.Param("answerID"))
	if !found || answerValue.FormID != formValue.ID {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	var request mutateStaffFormAnswerRequest
	if err := c.Bind(&request); err != nil {
		return validationError(c, map[string][]string{
			"body": {"invalid_request"},
		})
	}

	uploads := h.answers.ListUploadsByAnswer(answerValue.ID)
	normalizedDetails, fieldErrors := normalizeAnswerDetails(request.Details, questions, uploads)
	if len(fieldErrors) > 0 {
		return validationError(c, fieldErrors)
	}

	body := strings.TrimSpace(request.Body)
	if len(questions) > 0 {
		body = buildAnswerSummary(questions, normalizedDetails, uploads)
	}

	updated, ok := h.answers.Update(answerValue.ID, body, normalizedDetails)
	if !ok {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}
	if formValue.IsPublic {
		h.enqueueStaffFormAnswerMail(currentSession.User.ID, formValue, updated)
	}

	recordActivity(
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
	_, currentSession, formValue, _, status, ok := h.staffFormContext(c, canDeleteFormAnswers)
	if !ok {
		return statusError(c, status)
	}

	answerValue, found := h.answers.Find(c.Param("answerID"))
	if !found || answerValue.FormID != formValue.ID {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	if !h.answers.Delete(answerValue.ID) {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	recordActivity(
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
	_, currentSession, formValue, _, status, ok := h.staffFormContext(c, canEditFormAnswers)
	if !ok {
		return statusError(c, status)
	}

	answerValue, found := h.answers.Find(c.Param("answerID"))
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

	file, err := fileHeader.Open()
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "upload_failed")
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "upload_failed")
	}

	mimeType := strings.TrimSpace(fileHeader.Header.Get(echo.HeaderContentType))
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	upload, ok := h.answers.AddUploadToAnswer(answerValue.ID, questionID, fileHeader.Filename, mimeType, content)
	if !ok {
		return errorJSON(c, http.StatusInternalServerError, "upload_failed")
	}

	recordActivity(
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
	_, _, formValue, _, status, ok := h.staffFormContext(c, canReadFormAnswers)
	if !ok {
		return statusError(c, status)
	}

	answerValue, found := h.answers.Find(c.Param("answerID"))
	if !found || answerValue.FormID != formValue.ID {
		return errorJSON(c, http.StatusNotFound, "answer_not_found")
	}

	upload, found := h.answers.FindUploadByAnswerAndQuestion(answerValue.ID, c.Param("questionID"))
	if !found {
		return errorJSON(c, http.StatusNotFound, "upload_not_found")
	}

	c.Response().Header().Set(echo.HeaderContentDisposition, fmt.Sprintf("attachment; filename=%q", upload.Filename))
	return c.Blob(http.StatusOK, upload.MimeType, upload.Content)
}

func (h *staffFormHandlers) listStaffFormNotAnsweredCircles(c echo.Context) error {
	_, _, formValue, _, status, ok := h.staffFormContext(c, canReadFormAnswers)
	if !ok {
		return statusError(c, status)
	}

	circles, err := h.circles.ListForStaff()
	if err != nil {
		return internalError(c)
	}

	answered := map[string]struct{}{}
	for _, currentAnswer := range h.answers.ListByForm(formValue.ID) {
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

func (h *staffFormHandlers) downloadStaffFormAnswersCSV(c echo.Context) error {
	_, _, formValue, questions, status, ok := h.staffFormContext(c, canExportFormAnswers)
	if !ok {
		return statusError(c, status)
	}

	circles, err := h.circles.ListForStaff()
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}
	circleMap := make(map[string]staffAnswerCircleResponse, len(circles))
	for _, currentCircle := range circles {
		circleMap[currentCircle.ID] = mapStaffAnswerCircle(currentCircle)
	}

	rows := [][]string{{
		"回答ID",
		"企画ID",
		"企画名",
		"企画名（よみ）",
		"企画を出店する団体の名称",
		"企画を出店する団体の名称（よみ）",
	}}
	for _, question := range questions {
		if question.Type == "heading" {
			continue
		}
		rows[0] = append(rows[0], question.Name)
	}

	for _, currentAnswer := range h.answers.ListByForm(formValue.ID) {
		currentCircle := circleMap[currentAnswer.CircleID]
		row := []string{
			currentAnswer.ID,
			currentCircle.ID,
			currentCircle.Name,
			"",
			currentCircle.GroupName,
			"",
		}
		uploads := h.answers.ListUploadsByAnswer(currentAnswer.ID)
		for _, question := range questions {
			if question.Type == "heading" {
				continue
			}
			row = append(row, staffAnswerExportValue(question, currentAnswer.Details[question.ID], uploads))
		}
		rows = append(rows, row)
	}

	csvBytes, err := writeCSV(rows)
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	filename := fmt.Sprintf("%s-answers.csv", formValue.ID)
	c.Response().Header().Set(echo.HeaderContentType, "text/csv; charset=utf-8")
	c.Response().Header().Set(echo.HeaderContentDisposition, fmt.Sprintf("attachment; filename=%q", filename))
	return c.Blob(http.StatusOK, "text/csv; charset=utf-8", csvBytes)
}

func (h *staffFormHandlers) downloadStaffFormAnswerUploadsZIP(c echo.Context) error {
	_, _, formValue, questions, status, ok := h.staffFormContext(c, canExportFormAnswers)
	if !ok {
		return statusError(c, status)
	}

	uploadQuestions := make(map[string]formquestion.Question)
	for _, question := range questions {
		if question.Type == "upload" {
			uploadQuestions[question.ID] = question
		}
	}

	buffer := bytes.NewBuffer(nil)
	archive := zip.NewWriter(buffer)
	created := 0
	for _, currentAnswer := range h.answers.ListByForm(formValue.ID) {
		for _, upload := range h.answers.ListUploadsByAnswer(currentAnswer.ID) {
			if _, ok := uploadQuestions[upload.QuestionID]; !ok {
				continue
			}
			fileUpload, found := h.answers.FindUploadByAnswerAndQuestion(currentAnswer.ID, upload.QuestionID)
			if !found {
				continue
			}

			filename := fmt.Sprintf("%s/%s-%s-%s", currentAnswer.CircleID, currentAnswer.ID, upload.QuestionID, sanitizeArchiveFilename(fileUpload.Filename))
			writer, err := archive.Create(filename)
			if err != nil {
				archive.Close()
				return errorJSON(c, http.StatusInternalServerError, "export_failed")
			}
			if _, err := writer.Write(fileUpload.Content); err != nil {
				archive.Close()
				return errorJSON(c, http.StatusInternalServerError, "export_failed")
			}
			created++
		}
	}

	if err := archive.Close(); err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}
	if created == 0 {
		return errorJSON(c, http.StatusNotFound, "upload_not_found")
	}

	filename := fmt.Sprintf("%s-answer-uploads.zip", formValue.ID)
	c.Response().Header().Set(echo.HeaderContentType, "application/zip")
	c.Response().Header().Set(echo.HeaderContentDisposition, fmt.Sprintf("attachment; filename=%q", filename))
	return c.Blob(http.StatusOK, "application/zip", buffer.Bytes())
}

func (h *staffFormHandlers) staffFormContext(c echo.Context, allowed func(*auth.User) bool) (string, session.Session, backendform.Form, []formquestion.Question, int, bool) {
	sessionID, currentSession, selectedCircle, status, ok := h.requireStaffWithCircle(c, h.circles, allowed)
	if !ok {
		return "", session.Session{}, backendform.Form{}, nil, status, false
	}

	formValue, found := h.findStaffFormForManagement(selectedCircle.ID, c.Param("formID"), false)
	if !found {
		return "", session.Session{}, backendform.Form{}, nil, http.StatusNotFound, false
	}
	if h.isParticipationForm(formValue.ID) {
		return "", session.Session{}, backendform.Form{}, nil, http.StatusBadRequest, false
	}

	questions, err := h.formQuestions.List(formValue.ID)
	if err != nil {
		return "", session.Session{}, backendform.Form{}, nil, http.StatusInternalServerError, false
	}

	return sessionID, currentSession, formValue, questions, http.StatusOK, true
}

func (h *staffFormHandlers) buildStaffFormDetailResponse(
	formValue backendform.Form,
	questions []formquestion.Question,
	answerResponse *staffFormAnswerResponse,
) staffFormDetailResponse {
	return staffFormDetailResponse{
		ID:                  formValue.ID,
		Name:                formValue.Name,
		Description:         formValue.Description,
		OpenAt:              formValue.OpenAt,
		CloseAt:             formValue.CloseAt,
		IsPublic:            formValue.IsPublic,
		IsOpen:              formValue.IsOpen,
		MaxAnswers:          formValue.MaxAnswers,
		AnswerableTags:      append([]string{}, formValue.AnswerableTags...),
		ConfirmationMessage: formValue.ConfirmationMessage,
		IsParticipationForm: h.isParticipationForm(formValue.ID),
		Questions:           mapStaffFormQuestions(questions),
		Answer:              answerResponse,
	}
}

func buildStaffFormAnswerResponse(answerValue answer.Answer, uploads []answer.Upload) staffFormAnswerResponse {
	return staffFormAnswerResponse{
		ID:        answerValue.ID,
		Body:      answerValue.Body,
		CreatedAt: answerValue.CreatedAt,
		UpdatedAt: answerValue.UpdatedAt,
		Details:   cloneAnswerDetails(answerValue.Details),
		Uploads:   mapFormAnswerUploads(uploads),
	}
}

func mapStaffManagedFormAnswerSummary(
	answerValue answer.Answer,
	circleValue staffAnswerCircleResponse,
	uploads []answer.Upload,
) staffManagedFormAnswerSummaryResponse {
	return staffManagedFormAnswerSummaryResponse{
		ID:          answerValue.ID,
		Circle:      circleValue,
		Body:        answerValue.Body,
		CreatedAt:   answerValue.CreatedAt,
		UpdatedAt:   answerValue.UpdatedAt,
		UploadCount: len(uploads),
	}
}

func mapStaffAnswerCircle(circleValue circle.Circle) staffAnswerCircleResponse {
	return staffAnswerCircleResponse{
		ID:                    circleValue.ID,
		Name:                  circleValue.Name,
		GroupName:             circleValue.GroupName,
		ParticipationTypeName: circleValue.ParticipationTypeName,
	}
}

func (h *staffFormHandlers) isParticipationForm(formID string) bool {
	_, err := h.participationTypes.FindByFormID(formID)
	return err == nil
}

func (h *staffFormHandlers) enqueueStaffFormAnswerMail(createdByUserID string, formValue backendform.Form, answerValue answer.Answer) {
	recipients := h.staffFormAnswerMailRecipients(createdByUserID, answerValue.CircleID)
	if len(recipients) == 0 {
		return
	}

	subject := fmt.Sprintf("申請「%s」がスタッフにより更新されました", formValue.Name)
	body := answerValue.Body
	if formValue.ConfirmationMessage != "" {
		body = strings.TrimSpace(body + "\n\n" + formValue.ConfirmationMessage)
	}

	job := h.mails.Enqueue(formValue.CircleID, createdByUserID, subject, body, recipients)
	recordActivity(
		h.activities,
		createdByUserID,
		"staff.mail.queued",
		"mail_job",
		job.ID,
		formValue.CircleID,
		buildActivitySummary("staff がフォーム回答通知メールをキューに追加しました", formValue.Name),
	)
}

func (h *staffFormHandlers) staffFormAnswerMailRecipients(createdByUserID, targetCircleID string) []string {
	users, err := h.users.ListVerifiedByCircleIDs([]string{targetCircleID})
	if err != nil {
		return nil
	}

	recipients := make([]string, 0, len(users)+1)
	for _, userValue := range users {
		for _, loginID := range userValue.LoginIDs {
			if strings.Contains(loginID, "@") {
				recipients = append(recipients, loginID)
			}
		}
	}

	creator, err := h.users.Find(createdByUserID)
	if err == nil {
		for _, loginID := range creator.LoginIDs {
			if strings.Contains(loginID, "@") {
				recipients = append(recipients, loginID)
			}
		}
	}

	return normalizeRecipients(recipients)
}

func staffAnswerExportValue(
	question formquestion.Question,
	values []string,
	uploads []answer.Upload,
) string {
	switch question.Type {
	case "upload":
		for _, upload := range uploads {
			if upload.QuestionID == question.ID {
				return upload.Filename
			}
		}
		return ""
	case "checkbox":
		return strings.Join(values, ",")
	default:
		if len(values) == 0 {
			return ""
		}
		return values[0]
	}
}

func sanitizeArchiveFilename(filename string) string {
	replacer := strings.NewReplacer("/", "_", "\\", "_")
	return replacer.Replace(filename)
}
