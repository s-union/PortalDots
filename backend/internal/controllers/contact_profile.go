package controllers

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"mime"
	"mime/multipart"
	"net/http"
	"net/url"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/contact"
	"github.com/s-union/PortalDots/backend/internal/domain/contactcategory"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/shared/emailqueue"
	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

type participantContactCategoryResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type submitContactRequest struct {
	CategoryID  string `json:"categoryId"`
	Subject     string `json:"subject"`
	Body        string `json:"body"`
	CCSubleader *bool  `json:"ccSubleader"`
}

type submitContactResponse struct {
	ID           string                     `json:"id"`
	CategoryID   string                     `json:"categoryId"`
	CategoryName string                     `json:"categoryName"`
	Subject      string                     `json:"subject"`
	Status       string                     `json:"status"`
	CreatedAt    string                     `json:"createdAt"`
	Attachment   *contactAttachmentResponse `json:"attachment,omitempty"`
}

type contactAttachmentResponse struct {
	Filename  string `json:"filename"`
	MimeType  string `json:"mimeType"`
	SizeBytes int64  `json:"sizeBytes"`
}

type updateProfileRequest struct {
	DisplayName     string `json:"displayName"`
	Name            string `json:"name"`
	NameYomi        string `json:"nameYomi"`
	ContactEmail    string `json:"contactEmail"`
	PhoneNumber     string `json:"phoneNumber"`
	CurrentPassword string `json:"currentPassword"`
}

type updatePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

type updatedProfileResponse struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
}

func (h *authHandlers) listContactHistory(c *echo.Context) error {
	sessionID, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return statusError(c, http.StatusUnauthorized)
	}
	selectedCircle, err := resolveCurrentCircle(c.Request().Context(), sessionID, currentSession, h.circles, h.sessions)
	if err != nil {
		return internalError(c)
	}
	if selectedCircle == nil {
		return statusError(c, http.StatusConflict)
	}

	contacts, err := h.contacts.ListByOwner(c.Request().Context(), currentSession.User.ID, selectedCircle.ID)
	if err != nil {
		return internalError(c)
	}
	response := make([]submitContactResponse, 0, len(contacts))
	knownMailJobs := make(map[string]struct{}, len(contacts))
	for _, item := range contacts {
		knownMailJobs[item.StaffMailJobID] = struct{}{}
		response = append(response, mapContactResponse(item))
	}

	entries, err := h.mailHistory.List(c.Request().Context())
	if err != nil {
		return internalError(c)
	}

	for _, entry := range entries {
		if _, exists := knownMailJobs[entry.JobID]; exists || strings.HasPrefix(entry.JobID, "contact-confirm-") || !contactHistoryMatches(entry.Body, selectedCircle.ID, currentSession.User.ID) {
			continue
		}
		categoryID, categoryName := extractContactMetadata(entry.Body)
		response = append(response, submitContactResponse{
			ID:           entry.JobID,
			CategoryID:   categoryID,
			CategoryName: categoryName,
			Subject:      entry.Subject,
			Status:       "sent",
			CreatedAt:    entry.CreatedAt,
		})
	}
	sort.SliceStable(response, func(i, j int) bool { return response[i].CreatedAt > response[j].CreatedAt })

	return c.JSON(http.StatusOK, response)
}

func mapContactResponse(item contact.Contact) submitContactResponse {
	response := submitContactResponse{
		ID:           item.StaffMailJobID,
		CategoryID:   item.CategoryID,
		CategoryName: item.CategoryName,
		Subject:      item.Subject,
		Status:       item.Status,
		CreatedAt:    item.CreatedAt,
	}
	if item.Attachment != nil {
		response.Attachment = &contactAttachmentResponse{
			Filename:  item.Attachment.Filename,
			MimeType:  item.Attachment.MimeType,
			SizeBytes: item.Attachment.SizeBytes,
		}
	}
	return response
}

func contactHistoryHeader(body string) string {
	if idx := strings.Index(body, "\n\n"); idx >= 0 {
		return body[:idx]
	}
	return body
}

func contactHistoryMatches(body, circleID, userID string) bool {
	header := contactHistoryHeader(body)
	var matchedCircle, matchedUser bool
	for _, line := range strings.Split(header, "\n") {
		switch {
		case line == "from_user_id: "+userID:
			matchedUser = true
		case strings.HasPrefix(line, "from: ") && strings.HasSuffix(line, "("+userID+")"):
			matchedUser = true
		case line == "circle_id: "+circleID:
			matchedCircle = true
		case strings.HasPrefix(line, "circle: ") && strings.HasSuffix(line, "("+circleID+")"):
			matchedCircle = true
		}
	}
	return matchedCircle && matchedUser
}

func extractContactMetadata(body string) (string, string) {
	categoryID := ""
	categoryName := ""
	for _, line := range strings.Split(contactHistoryHeader(body), "\n") {
		if strings.HasPrefix(line, "category_id: ") {
			categoryID = strings.TrimPrefix(line, "category_id: ")
		}
		if strings.HasPrefix(line, "category_name: ") {
			categoryName = strings.TrimPrefix(line, "category_name: ")
		}
	}
	return categoryID, categoryName
}

func (h *authHandlers) listContactCategories(c *echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return statusError(c, http.StatusUnauthorized)
	}

	items, err := h.contactCategories.List(c.Request().Context())
	if err != nil {
		return internalError(c)
	}

	response := make([]participantContactCategoryResponse, 0, len(items))
	for _, item := range items {
		response = append(response, participantContactCategoryResponse{
			ID:   item.ID,
			Name: item.Name,
		})
	}

	return c.JSON(http.StatusOK, response)
}

func (h *authHandlers) submitContact(c *echo.Context) error {
	sessionID, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return statusError(c, http.StatusUnauthorized)
	}

	selectedCircle, err := resolveCurrentCircle(c.Request().Context(), sessionID, currentSession, h.circles, h.sessions)
	if err != nil {
		return internalError(c)
	}
	if selectedCircle == nil {
		return statusError(c, http.StatusConflict)
	}

	contentType, _, err := mime.ParseMediaType(c.Request().Header.Get(echo.HeaderContentType))
	if err != nil || contentType != echo.MIMEMultipartForm {
		return errorJSON(c, http.StatusUnsupportedMediaType, "multipart_form_required")
	}
	ccSubleader, ccErrors := parseContactCCSubleader(c.FormValue("ccSubleader"))
	request := submitContactRequest{
		CategoryID:  c.FormValue("categoryId"),
		Subject:     c.FormValue("subject"),
		Body:        c.FormValue("body"),
		CCSubleader: ccSubleader,
	}

	request.CategoryID = strings.TrimSpace(request.CategoryID)
	request.Subject = strings.TrimSpace(request.Subject)
	request.Body = strings.TrimSpace(request.Body)

	validationErrors := map[string][]string{}
	for key, messages := range ccErrors {
		validationErrors[key] = messages
	}
	if request.CategoryID == "" {
		validationErrors["categoryId"] = []string{"問い合わせカテゴリを選択してください"}
	}
	if request.Subject == "" {
		validationErrors["subject"] = []string{"件名を入力してください"}
	}
	if request.Body == "" {
		validationErrors["body"] = []string{"本文を入力してください"}
	}

	var fileHeader *multipart.FileHeader
	fileHeader, err = c.FormFile("file")
	if err != nil && !errors.Is(err, http.ErrMissingFile) {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}
	attachment, attachmentErrors := parseContactAttachment(fileHeader)
	for key, messages := range attachmentErrors {
		validationErrors[key] = messages
	}
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	category, err := findContactCategory(c.Request().Context(), h.contactCategories, request.CategoryID)
	if errors.Is(err, contactcategory.ErrNotFound) {
		return validationError(c, map[string][]string{"categoryId": {"存在しない問い合わせカテゴリです"}})
	}
	if err != nil {
		return internalError(c)
	}

	staffBody := fmt.Sprintf(
		"PortalDots contact request\ncategory_id: %s\ncategory_name: %s\nfrom_user_id: %s\nfrom: %s (%s)\ncircle_id: %s\ncircle: %s (%s)\nsubject: %s\n\n%s",
		category.ID,
		category.Name,
		currentSession.User.ID,
		currentSession.User.DisplayName,
		currentSession.User.ID,
		selectedCircle.ID,
		selectedCircle.Name,
		selectedCircle.ID,
		request.Subject,
		request.Body,
	)

	jobID := "contact-" + uuidv7.MustString()
	created, rawToken, err := h.contacts.Create(c.Request().Context(), contact.NewContact{
		UserID:         currentSession.User.ID,
		CircleID:       selectedCircle.ID,
		CategoryID:     category.ID,
		CategoryName:   category.Name,
		Subject:        request.Subject,
		Body:           request.Body,
		Status:         "sent",
		StaffMailJobID: jobID,
	}, attachment)
	if err != nil {
		return internalError(c)
	}
	cleanupContact := func() {
		if err := h.contacts.Delete(c.Request().Context(), created.ID); err != nil && !errors.Is(err, contact.ErrNotFound) {
			slog.Error("failed to clean up contact after mail enqueue failure", "contactID", created.ID, "error", err)
		}
		if err := h.mailHistory.Delete(c.Request().Context(), jobID); err != nil {
			slog.Error("failed to clean up mail history after mail enqueue failure", "jobID", jobID, "error", err)
		}
	}

	confirmationRecipients, err := h.contactConfirmationRecipients(
		selectedCircle.ID,
		currentSession.User.ID,
		contactShouldCCSubleader(request.CCSubleader),
	)
	if err != nil {
		cleanupContact()
		return internalError(c)
	}
	if len(confirmationRecipients) > 0 {
		confirmationSubject := "お問い合わせを承りました"
		confirmationBody := fmt.Sprintf(
			"お問い合わせを受け付けました。\n\nカテゴリ: %s\n件名: %s\n\n%s%s",
			category.Name,
			request.Subject,
			request.Body,
			contactAttachmentDescription(attachment),
		)
		confirmationJobID := "contact-confirm-" + uuidv7.MustString()
		if err := h.emailSender.Enqueue(c.Request().Context(), emailqueue.EmailJob{
			JobId:    confirmationJobID,
			Template: "markdown-notice",
			Priority: emailqueue.PriorityNormal,
			From:     h.from,
			To:       confirmationRecipients,
			Subject:  confirmationSubject,
			Body:     confirmationBody,
			Variables: map[string]string{
				"subject":      confirmationSubject,
				"body":         confirmationBody,
				"appName":      h.appName,
				"appURL":       h.appURL,
				"adminName":    h.adminName,
				"contactEmail": h.contactEmail,
				"preview":      confirmationSubject,
			},
		}); err != nil {
			cleanupContact()
			return internalError(c)
		}
		logQueuedMail("contact_confirmation", confirmationJobID, "", currentSession.User.ID, confirmationSubject, confirmationBody, confirmationRecipients, h.allowDangerously)
	}

	staffMailBody := staffBody
	staffHistoryBody := staffBody + contactAttachmentDescription(attachment)
	if attachment != nil {
		downloadURL := strings.TrimRight(h.appURL, "/") + "/v1/contact/attachments/" + url.PathEscape(rawToken)
		staffMailBody += fmt.Sprintf("\n\n添付ファイル: %s\nダウンロード: %s", attachment.Filename, downloadURL)
	}
	if err := h.emailSender.Enqueue(c.Request().Context(), emailqueue.EmailJob{
		JobId:       jobID,
		Template:    "markdown-notice",
		Priority:    emailqueue.PriorityNormal,
		From:        h.from,
		To:          []string{category.Email},
		Subject:     request.Subject,
		Body:        staffMailBody,
		HistoryBody: staffHistoryBody,
		Variables: map[string]string{
			"subject":      request.Subject,
			"body":         staffMailBody,
			"appName":      h.appName,
			"appURL":       h.appURL,
			"adminName":    h.adminName,
			"contactEmail": h.contactEmail,
			"preview":      request.Subject,
		},
	}); err != nil {
		cleanupContact()
		return internalError(c)
	}
	// The mail body contains a bearer token, so it must stay redacted even in demo mode.
	logQueuedMail("contact", jobID, selectedCircle.ID, currentSession.User.ID, request.Subject, staffMailBody, []string{category.Email}, false)
	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"contact.submitted",
		"contact_category",
		category.ID,
		selectedCircle.ID,
		buildActivitySummary("利用者がお問い合わせを送信しました", request.Subject),
	)

	return c.JSON(http.StatusCreated, submitContactResponse{
		ID:           jobID,
		CategoryID:   category.ID,
		CategoryName: category.Name,
		Subject:      request.Subject,
		Status:       "sent",
		CreatedAt:    created.CreatedAt,
		Attachment:   mapContactResponse(created).Attachment,
	})
}

func (h *authHandlers) downloadContactAttachment(c *echo.Context) error {
	tokenHash, err := contact.HashDownloadToken(c.Param("token"))
	if err != nil {
		return statusError(c, http.StatusNotFound)
	}
	attachment, err := h.contacts.FindAttachment(c.Request().Context(), tokenHash)
	if errors.Is(err, contact.ErrNotFound) {
		return statusError(c, http.StatusNotFound)
	}
	if err != nil {
		return internalError(c)
	}

	c.Response().Header().Set(echo.HeaderCacheControl, "no-store")
	c.Response().Header().Set("X-Content-Type-Options", "nosniff")
	c.Response().Header().Set(echo.HeaderContentDisposition, attachmentContentDisposition(attachment.Filename))
	return c.Blob(http.StatusOK, attachment.MimeType, attachment.Content)
}

func (h *authHandlers) contactConfirmationRecipients(circleID, senderUserID string, ccSubleader bool) ([]string, error) {
	if strings.TrimSpace(circleID) != "" {
		users, err := h.users.ListByCircleIDs([]string{circleID})
		if err != nil {
			return nil, err
		}
		recipients := contactCircleConfirmationRecipients(users, circleID, senderUserID, ccSubleader)
		if len(recipients) > 0 {
			return recipients, nil
		}
	}

	senderUser, err := h.users.Find(senderUserID)
	if errors.Is(err, useradmin.ErrNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	recipients := useradmin.MailRecipients(senderUser)
	if len(recipients) > 0 {
		return recipients, nil
	}
	if contactEmail := strings.TrimSpace(senderUser.ContactEmail); contactEmail != "" {
		return []string{contactEmail}, nil
	}

	return nil, nil
}

func contactShouldCCSubleader(value *bool) bool {
	if value == nil {
		return true
	}
	return *value
}

func contactCircleConfirmationRecipients(users []useradmin.User, circleID, senderUserID string, ccSubleader bool) []string {
	leaders := make([]useradmin.User, 0, len(users))
	subleaders := make([]useradmin.User, 0, len(users))
	var senderUser *useradmin.User

	for index := range users {
		userValue := users[index]
		if userValue.ID == senderUserID {
			senderUser = &users[index]
		}
		if slices.Contains(userValue.LeaderCircleIDs, circleID) {
			leaders = append(leaders, userValue)
			continue
		}
		subleaders = append(subleaders, userValue)
	}

	if ccSubleader {
		return useradmin.MailRecipients(append(leaders, subleaders...)...)
	}
	if senderUser != nil {
		return useradmin.MailRecipients(*senderUser)
	}

	return useradmin.MailRecipients(leaders...)
}

func (h *authHandlers) updateProfile(c *echo.Context) error {
	sessionID, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return statusError(c, http.StatusUnauthorized)
	}

	var request updateProfileRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	managedUser, err := h.users.Find(currentSession.User.ID)
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "user_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	request.DisplayName = strings.TrimSpace(request.DisplayName)
	request.Name = strings.TrimSpace(request.Name)
	request.NameYomi = strings.TrimSpace(request.NameYomi)
	request.ContactEmail = strings.TrimSpace(strings.ToLower(request.ContactEmail))
	request.PhoneNumber = strings.TrimSpace(request.PhoneNumber)
	request.CurrentPassword = strings.TrimSpace(request.CurrentPassword)

	if request.Name != "" || request.NameYomi != "" || request.ContactEmail != "" || request.PhoneNumber != "" || request.CurrentPassword != "" {
		validationErrors := map[string][]string{}
		lastName, firstName, normalizedName, ok := splitFullName(request.Name)
		if request.Name == "" {
			validationErrors["name"] = []string{"名前を入力してください"}
		} else if !ok {
			validationErrors["name"] = []string{"名前は姓と名の両方を入力してください"}
		}
		lastNameReading, firstNameReading, _, yomiOK := splitFullName(request.NameYomi)
		if request.NameYomi == "" {
			validationErrors["nameYomi"] = []string{"名前(よみ)を入力してください"}
		} else if !yomiOK {
			validationErrors["nameYomi"] = []string{"名前(よみ)は姓と名の両方を入力してください"}
		} else if !isValidYomi(lastNameReading) || !isValidYomi(firstNameReading) {
			validationErrors["nameYomi"] = []string{"ひらがなで入力してください"}
		}
		if request.ContactEmail == "" || !isValidEmail(request.ContactEmail) {
			validationErrors["contactEmail"] = []string{"連絡先メールアドレスを正しく入力してください"}
		}
		if request.PhoneNumber == "" {
			validationErrors["phoneNumber"] = []string{"連絡先電話番号を入力してください"}
		} else if !isValidPhoneNumber(request.PhoneNumber) {
			validationErrors["phoneNumber"] = []string{"電話番号の形式が正しくありません（例: 090-1234-5678）"}
		}
		if request.CurrentPassword == "" {
			validationErrors["currentPassword"] = []string{"現在のパスワードを入力してください"}
		}
		if len(validationErrors) > 0 {
			return validationError(c, validationErrors)
		}

		authenticated := false
		for _, loginID := range managedUser.LoginIDs {
			if _, ok := h.authenticator.Authenticate(c.Request().Context(), loginID, request.CurrentPassword); ok {
				authenticated = true
				break
			}
		}
		if !authenticated && managedUser.ContactEmail != "" {
			if _, ok := h.authenticator.Authenticate(c.Request().Context(), managedUser.ContactEmail, request.CurrentPassword); ok {
				authenticated = true
			}
		}
		if !authenticated {
			return validationError(c, map[string][]string{"currentPassword": {"現在のパスワードが正しくありません"}})
		}

		previousContactEmail := strings.TrimSpace(strings.ToLower(managedUser.ContactEmail))
		updatedUser, err := h.users.UpdateFull(
			currentSession.User.ID,
			normalizedName,
			managedUser.LoginIDs,
			lastName,
			lastNameReading,
			firstName,
			firstNameReading,
			request.ContactEmail,
			request.PhoneNumber,
		)
		if errors.Is(err, useradmin.ErrNotFound) {
			return errorJSON(c, http.StatusNotFound, "user_not_found")
		}
		if errors.Is(err, useradmin.ErrConflict) {
			return validationError(c, map[string][]string{"contactEmail": {"入力されたメールアドレスはすでに登録されています"}})
		}
		if err != nil {
			return internalError(c)
		}
		contactEmailChanged := !strings.EqualFold(previousContactEmail, updatedUser.ContactEmail)
		univemail := deriveUnivemail(updatedUser, h.portalUnivemailDomainPart)
		emailMatchesUnivemail := strings.EqualFold(strings.TrimSpace(updatedUser.ContactEmail), strings.TrimSpace(univemail))
		emailVerified := emailMatchesUnivemail && updatedUser.IsUnivemailVerified
		if contactEmailChanged {
			updatedUser, err = h.users.UpdateEmailVerified(updatedUser.ID, emailVerified)
			if err != nil {
				return internalError(c)
			}
			updatedUser, err = h.users.UpdateVerified(updatedUser.ID, updatedUser.IsUnivemailVerified)
			if err != nil {
				return internalError(c)
			}
			if updatedUser.ContactEmail != "" && !emailMatchesUnivemail {
				if err := h.sendParticipantVerificationLink(c.Request().Context(), updatedUser.ID, "email", updatedUser.ContactEmail); err != nil {
					return internalError(c)
				}
			}
		}

		h.sessions.InvalidateUser(updatedUser.ID)
		h.sessions.Update(c.Request().Context(), sessionID, func(next *session.Session) {
			if next.User == nil {
				return
			}
			next.User.DisplayName = updatedUser.DisplayName
		})
		recordActivity(
			c.Request().Context(),
			h.activities,
			updatedUser.ID,
			"user.profile.updated",
			"user",
			updatedUser.ID,
			"",
			buildActivitySummary("利用者がプロフィールを更新しました", updatedUser.DisplayName),
		)

		return c.JSON(http.StatusOK, buildSessionBootstrapUserInfo(updatedUser, h.portalUnivemailDomainPart))
	}

	if request.DisplayName == "" {
		return validationError(c, map[string][]string{"displayName": {"表示名を入力してください"}})
	}

	updatedUser, err := h.users.UpdateDisplayName(currentSession.User.ID, request.DisplayName)
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "user_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	h.sessions.InvalidateUser(updatedUser.ID)
	h.sessions.Update(c.Request().Context(), sessionID, func(next *session.Session) {
		if next.User == nil {
			return
		}
		next.User.DisplayName = updatedUser.DisplayName
	})
	recordActivity(
		c.Request().Context(),
		h.activities,
		updatedUser.ID,
		"user.profile.updated",
		"user",
		updatedUser.ID,
		"",
		buildActivitySummary("利用者が表示名を更新しました", updatedUser.DisplayName),
	)

	return c.JSON(http.StatusOK, buildSessionBootstrapUserInfo(updatedUser, h.portalUnivemailDomainPart))
}

func (h *authHandlers) updatePassword(c *echo.Context) error {
	sessionID, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return statusError(c, http.StatusUnauthorized)
	}
	if h.passwordChanger == nil {
		return internalError(c)
	}

	var request updatePasswordRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	request.CurrentPassword = strings.TrimSpace(request.CurrentPassword)
	request.NewPassword = strings.TrimSpace(request.NewPassword)

	validationErrors := map[string][]string{}
	if request.CurrentPassword == "" {
		validationErrors["currentPassword"] = []string{"現在のパスワードを入力してください"}
	}
	if request.NewPassword == "" {
		validationErrors["newPassword"] = []string{"新しいパスワードを入力してください"}
	} else if len(request.NewPassword) < 8 {
		validationErrors["newPassword"] = []string{"新しいパスワードは 8 文字以上で入力してください"}
	} else if request.NewPassword == request.CurrentPassword {
		validationErrors["newPassword"] = []string{"現在のパスワードとは異なる文字列を入力してください"}
	}
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	if err := h.passwordChanger.ChangePassword(
		c.Request().Context(),
		currentSession.User.ID,
		request.CurrentPassword,
		request.NewPassword,
	); err != nil {
		if errors.Is(err, auth.ErrInvalidPassword) {
			return validationError(c, map[string][]string{"currentPassword": {"現在のパスワードが正しくありません"}})
		}
		return internalError(c)
	}
	managedUser, err := h.users.Find(currentSession.User.ID)
	if err != nil {
		return internalError(c)
	}

	_ = h.sessions.DeleteOtherSessionsByUserID(c.Request().Context(), currentSession.User.ID, sessionID)

	if err := h.enqueuePasswordChangedMail(c.Request().Context(), currentSession.User.ID, useradmin.MailRecipients(managedUser)); err != nil {
		return internalError(c)
	}

	h.sessions.Update(c.Request().Context(), sessionID, func(next *session.Session) {
		if next.User == nil {
			return
		}
		next.StaffAuthorized = false
		next.StaffVerifyCode = ""
		next.StaffVerifyExpires = time.Time{}
	})
	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"user.password.updated",
		"user",
		currentSession.User.ID,
		"",
		"利用者がパスワードを更新しました",
	)

	return c.NoContent(http.StatusNoContent)
}

func (h *authHandlers) deleteAccount(c *echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return statusError(c, http.StatusUnauthorized)
	}

	currentUser, err := h.users.Find(currentSession.User.ID)
	if errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "user_not_found")
	}
	if err != nil {
		return internalError(c)
	}

	if hasStaffAccess(currentUser.Roles, currentUser.Permissions) {
		return validationError(c, map[string][]string{
			"user": {"管理者ユーザー・スタッフはアカウント削除できません"},
		})
	}
	if len(currentUser.CircleIDs) > 0 {
		return validationError(c, map[string][]string{
			"user": {"企画に所属しているため、アカウント削除はできません"},
		})
	}

	recordActivity(
		c.Request().Context(),
		h.activities,
		currentUser.ID,
		"user.deleted",
		"user",
		currentUser.ID,
		"",
		buildActivitySummary("利用者が自分のアカウントを削除しました", currentUser.DisplayName),
	)
	if err := h.users.Delete(currentUser.ID); errors.Is(err, useradmin.ErrNotFound) {
		return errorJSON(c, http.StatusNotFound, "user_not_found")
	} else if err != nil {
		return internalError(c)
	}

	if err := h.sessions.DeleteByUserID(c.Request().Context(), currentUser.ID); err != nil {
		slog.ErrorContext(c.Request().Context(), "failed to delete sessions after account deletion", "userID", currentUser.ID, "error", err)
	}
	c.SetCookie(&http.Cookie{
		Name:     h.sessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0).UTC(),
		SameSite: http.SameSiteLaxMode,
		Secure:   h.sessionCookieSecure,
	})
	return c.NoContent(http.StatusNoContent)
}

func findContactCategory(ctx context.Context, repository contactcategory.Repository, categoryID string) (contactcategory.Category, error) {
	items, err := repository.List(ctx)
	if err != nil {
		return contactcategory.Category{}, err
	}

	index := slices.IndexFunc(items, func(item contactcategory.Category) bool {
		return item.ID == categoryID
	})
	if index < 0 {
		return contactcategory.Category{}, contactcategory.ErrNotFound
	}

	return items[index], nil
}
