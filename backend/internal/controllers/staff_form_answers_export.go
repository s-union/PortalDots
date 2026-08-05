package controllers

import (
	"archive/zip"
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/domain/answer"
	backendform "github.com/s-union/PortalDots/backend/internal/domain/form"
	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/shared/emailqueue"
	"github.com/s-union/PortalDots/backend/internal/shared/externalid"
	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

func (h *staffFormHandlers) downloadStaffFormAnswersCSV(c *echo.Context) error {
	_, _, formValue, _, questions, status, ok := h.staffFormContext(c, canExportFormAnswers)
	if !ok {
		return statusError(c, status)
	}

	circles, err := h.circles.ListForStaff(c.Request().Context())
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

	for _, currentAnswer := range h.answers.ListByForm(c.Request().Context(), formValue.ID) {
		currentCircle := circleMap[currentAnswer.CircleID]
		row := []string{
			currentAnswer.ID,
			currentCircle.ID,
			currentCircle.Name,
			"",
			currentCircle.GroupName,
			"",
		}
		uploads := h.answers.ListUploadsByAnswer(c.Request().Context(), currentAnswer.ID)
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

	filename := fmt.Sprintf("%s-answers.csv", externalid.MustEncodeUUIDString(formValue.ID))
	return csvResponse(c, filename, csvBytes)
}

func (h *staffFormHandlers) downloadStaffFormAnswerUploadsZIP(c *echo.Context) error {
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

	circles, err := h.circles.ListForStaff(c.Request().Context())
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}
	circleNames := make(map[string]string, len(circles))
	for _, currentCircle := range circles {
		circleNames[currentCircle.ID] = currentCircle.Name
	}

	tempFile, err := os.CreateTemp("", "staff-form-answer-uploads-*.zip")
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}
	defer func() {
		_ = tempFile.Close()
		_ = os.Remove(tempFile.Name())
	}()

	archive := zip.NewWriter(tempFile)
	created := 0
	usedEntryNames := make(map[string]int)
	usedCircleDirs := make(map[string]bool)
	for _, currentAnswer := range h.answers.ListByForm(c.Request().Context(), formValue.ID) {
		circleName := circleNames[currentAnswer.CircleID]
		circleDir := uniqueArchiveCircleDirectory(circleName, externalid.MustEncodeUUIDString(currentAnswer.CircleID), usedCircleDirs)
		for _, upload := range h.answers.ListUploadsByAnswer(c.Request().Context(), currentAnswer.ID) {
			if _, ok := uploadQuestions[upload.QuestionID]; !ok {
				continue
			}
			fileUpload, found := h.answers.FindUploadByAnswerAndQuestion(c.Request().Context(), currentAnswer.ID, upload.QuestionID)
			if !found {
				continue
			}

			entryName := uniqueArchiveEntryName(usedEntryNames, archiveEntryPath(
				circleDir,
				circleName,
				uploadQuestions[upload.QuestionID].Name,
				fileUpload.Filename,
			))
			writer, err := archive.Create(entryName)
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
	if _, err := tempFile.Seek(0, 0); err != nil {
		return errorJSON(c, http.StatusInternalServerError, "export_failed")
	}

	filename := fmt.Sprintf("%s-answer-uploads.zip", sanitizeArchiveFilename(formValue.Name))
	c.Response().Header().Set(echo.HeaderContentType, "application/zip")
	c.Response().Header().Set(echo.HeaderContentDisposition, attachmentContentDisposition(filename))
	return c.Stream(http.StatusOK, "application/zip", tempFile)
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
	base := strings.TrimSpace(filepath.Base(filepath.Clean(filename)))
	if base == "" || base == "." || base == ".." {
		return "upload.bin"
	}
	replacer := strings.NewReplacer("/", "_", "\\", "_")
	sanitized := strings.Map(func(r rune) rune {
		switch r {
		case '\r', '\n', 0:
			return -1
		default:
			return r
		}
	}, base)
	sanitized = strings.TrimSpace(replacer.Replace(sanitized))
	if sanitized == "" || sanitized == "." || sanitized == ".." {
		return "upload.bin"
	}
	return sanitized
}

// uniqueArchiveCircleDirectory returns a single ZIP path segment for a circle.
// It keeps the sanitised circle name when possible and falls back to the
// encoded circle ID for blank names; duplicate names are disambiguated with the
// encoded circle ID so two circles can share a name without colliding.
func uniqueArchiveCircleDirectory(circleName, encodedCircleID string, used map[string]bool) string {
	dir := sanitizeArchiveFilename(circleName)
	if strings.TrimSpace(circleName) == "" {
		dir = encodedCircleID
	}
	for used[dir] {
		dir = dir + "_" + encodedCircleID
	}
	used[dir] = true
	return dir
}

// archiveEntryPath builds the ZIP entry name for one uploaded file so it is
// readable after unzipping: <circleName>_<questionName>_<originalFilename>.
func archiveEntryPath(circleDir, circleName, questionName, originalFilename string) string {
	return fmt.Sprintf(
		"%s/%s_%s_%s",
		circleDir,
		sanitizeArchiveFilename(circleName),
		sanitizeArchiveFilename(questionName),
		sanitizeArchiveFilename(originalFilename),
	)
}

// uniqueArchiveEntryName deduplicates ZIP entry names with a counter kept
// before the file extension, preserving the extension on every duplicate.
func uniqueArchiveEntryName(used map[string]int, name string) string {
	count := used[name]
	used[name] = count + 1
	if count == 0 {
		return name
	}
	ext := filepath.Ext(name)
	return fmt.Sprintf("%s-%d%s", strings.TrimSuffix(name, ext), count, ext)
}

func (h *staffFormHandlers) shouldNotifyStaffFormAnswer(formID string, isPublic bool) bool {
	return isPublic && !h.isParticipationForm(formID)
}

func (h *staffFormHandlers) enqueueStaffFormAnswerMail(ctx context.Context, createdByUserID string, formValue backendform.Form, answerValue answer.Answer) {
	recipients := h.staffFormAnswerMailRecipients(createdByUserID, answerValue.CircleID)
	if len(recipients) == 0 {
		return
	}

	subject := fmt.Sprintf("申請「%s」がスタッフにより更新されました", formValue.Name)
	body := answerValue.Body
	if formValue.ConfirmationMessage != "" {
		body = strings.TrimSpace(body + "\n\n" + formValue.ConfirmationMessage)
	}

	jobID := "staff-form-answer-" + uuidv7.MustString()
	if err := h.email.EmailSender.Enqueue(ctx, emailqueue.EmailJob{
		JobId:    jobID,
		Template: "markdown-notice",
		Priority: emailqueue.PriorityNormal,
		From:     h.email.From,
		To:       recipients,
		Subject:  subject,
		Body:     body,
		Variables: map[string]string{
			"subject":      subject,
			"body":         body,
			"appName":      h.email.AppName,
			"appURL":       h.email.AppURL,
			"adminName":    h.email.AdminName,
			"contactEmail": h.email.ContactEmail,
			"preview":      subject,
		},
	}); err != nil {
		return
	}
	logQueuedMail("staff_form_answer", jobID, formValue.CircleID, createdByUserID, subject, body, recipients, h.allowDangerously)
	recordActivity(
		ctx,
		h.activities,
		createdByUserID,
		"staff.mail.queued",
		"mail_job",
		jobID,
		formValue.CircleID,
		buildActivitySummary("staff がフォーム回答通知メールをキューに追加しました", formValue.Name),
	)
}

func (h *staffFormHandlers) staffFormAnswerMailRecipients(createdByUserID, targetCircleID string) []string {
	users, err := h.users.ListVerifiedByCircleIDs([]string{targetCircleID})
	if err != nil {
		return nil
	}

	recipients := useradmin.MailRecipients(users...)

	creator, err := h.users.Find(createdByUserID)
	if err == nil {
		recipients = append(recipients, useradmin.MailRecipients(creator)...)
	}

	return normalizeRecipients(recipients)
}
