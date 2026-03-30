package controllers

import (
	"archive/zip"
	"bytes"
	"fmt"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/answer"
	backendform "github.com/s-union/PortalDots/backend/internal/domain/form"
	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
)

func (h *staffFormHandlers) downloadStaffFormAnswersCSV(c echo.Context) error {
	_, _, formValue, _, questions, status, ok := h.staffFormContext(c, canExportFormAnswers)
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
	_, _, formValue, _, questions, status, ok := h.staffFormContext(c, canExportFormAnswers)
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

func (h *staffFormHandlers) shouldNotifyStaffFormAnswer(formID string, isPublic bool) bool {
	return isPublic && !h.isParticipationForm(formID)
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
