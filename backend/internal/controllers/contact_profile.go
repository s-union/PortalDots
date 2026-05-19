package controllers

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/contactcategory"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/shared/cloudflareemail"
	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

type participantContactCategoryResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type submitContactRequest struct {
	CategoryID string `json:"categoryId"`
	Subject    string `json:"subject"`
	Body       string `json:"body"`
}

type submitContactResponse struct {
	ID           string `json:"id"`
	CategoryID   string `json:"categoryId"`
	CategoryName string `json:"categoryName"`
	Subject      string `json:"subject"`
	Status       string `json:"status"`
	CreatedAt    string `json:"createdAt"`
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

func (h *authHandlers) listContactHistory(c echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return statusError(c, http.StatusUnauthorized)
	}

	entries, err := h.mailHistory.List(c.Request().Context())
	if err != nil {
		return internalError(c)
	}

	response := make([]submitContactResponse, 0)
	for _, entry := range entries {
		if !contactHistoryMatches(entry.Body, "", currentSession.User.ID) {
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

	return c.JSON(http.StatusOK, response)
}

func contactHistoryMatches(body, circleID, userID string) bool {
	return strings.Contains(body, circleID) && strings.Contains(body, userID)
}

func extractContactMetadata(body string) (string, string) {
	categoryID := ""
	categoryName := ""
	for _, line := range strings.Split(body, "\n") {
		if strings.HasPrefix(line, "category_id: ") {
			categoryID = strings.TrimPrefix(line, "category_id: ")
		}
		if strings.HasPrefix(line, "category_name: ") {
			categoryName = strings.TrimPrefix(line, "category_name: ")
		}
	}
	return categoryID, categoryName
}

func (h *authHandlers) listContactCategories(c echo.Context) error {
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

func (h *authHandlers) submitContact(c echo.Context) error {
	sessionID, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return statusError(c, http.StatusUnauthorized)
	}

	selectedCircle, err := resolveCurrentCircle(c.Request().Context(), sessionID, currentSession, h.circles, h.sessions)
	if err != nil {
		return internalError(c)
	}

	var request submitContactRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	request.CategoryID = strings.TrimSpace(request.CategoryID)
	request.Subject = strings.TrimSpace(request.Subject)
	request.Body = strings.TrimSpace(request.Body)

	validationErrors := map[string][]string{}
	if request.CategoryID == "" {
		validationErrors["categoryId"] = []string{"問い合わせカテゴリを選択してください"}
	}
	if request.Subject == "" {
		validationErrors["subject"] = []string{"件名を入力してください"}
	}
	if request.Body == "" {
		validationErrors["body"] = []string{"本文を入力してください"}
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
		selectedCircleID(selectedCircle),
		selectedCircleName(selectedCircle),
		selectedCircleID(selectedCircle),
		request.Subject,
		request.Body,
	)

	confirmationRecipients, err := h.contactConfirmationRecipients(selectedCircleID(selectedCircle), currentSession.User.ID)
	if err != nil {
		return internalError(c)
	}
	if len(confirmationRecipients) > 0 {
		confirmationSubject := "お問い合わせを承りました"
		confirmationBody := fmt.Sprintf(
			"お問い合わせを受け付けました。\n\nカテゴリ: %s\n件名: %s\n\n%s",
			category.Name,
			request.Subject,
			request.Body,
		)
		confirmationJobID := "contact-confirm-" + uuidv7.MustString()
		if err := h.emailSender.Enqueue(c.Request().Context(), cloudflareemail.EmailJob{
			JobId:    confirmationJobID,
			Template: "markdown-notice",
			Priority: cloudflareemail.PriorityNormal,
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
			return internalError(c)
		}
		logQueuedMail("contact_confirmation", confirmationJobID, "", currentSession.User.ID, confirmationSubject, confirmationBody, confirmationRecipients, h.allowDangerously)
	}

	jobID := "contact-" + uuidv7.MustString()
	if err := h.emailSender.Enqueue(c.Request().Context(), cloudflareemail.EmailJob{
		JobId:    jobID,
		Template: "markdown-notice",
		Priority: cloudflareemail.PriorityNormal,
		From:     h.from,
		To:       []string{category.Email},
		Subject:  request.Subject,
		Body:     staffBody,
		Variables: map[string]string{
			"subject":      request.Subject,
			"body":         staffBody,
			"appName":      h.appName,
			"appURL":       h.appURL,
			"adminName":    h.adminName,
			"contactEmail": h.contactEmail,
			"preview":      request.Subject,
		},
	}); err != nil {
		return internalError(c)
	}
	logQueuedMail("contact", jobID, selectedCircleID(selectedCircle), currentSession.User.ID, request.Subject, staffBody, []string{category.Email}, h.allowDangerously)
	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"contact.submitted",
		"contact_category",
		category.ID,
		selectedCircleID(selectedCircle),
		buildActivitySummary("利用者がお問い合わせを送信しました", request.Subject),
	)

	return c.JSON(http.StatusCreated, submitContactResponse{
		ID:           jobID,
		CategoryID:   category.ID,
		CategoryName: category.Name,
		Subject:      request.Subject,
		Status:       "sent",
		CreatedAt:    time.Now().UTC().Format(time.RFC3339),
	})
}

func (h *authHandlers) contactConfirmationRecipients(circleID, senderUserID string) ([]string, error) {
	if strings.TrimSpace(circleID) != "" {
		users, err := h.users.ListByCircleIDs([]string{circleID})
		if err != nil {
			return nil, err
		}
		recipients := collectUsersEmailRecipients(users)
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
	recipients := collectUsersEmailRecipients([]useradmin.User{senderUser})
	if len(recipients) > 0 {
		return recipients, nil
	}
	if contactEmail := strings.TrimSpace(senderUser.ContactEmail); contactEmail != "" {
		return []string{contactEmail}, nil
	}

	return nil, nil
}

func selectedCircleID(selectedCircle *circleInfo) string {
	if selectedCircle == nil {
		return ""
	}
	return selectedCircle.ID
}

func selectedCircleName(selectedCircle *circleInfo) string {
	if selectedCircle == nil {
		return "未選択"
	}
	return selectedCircle.Name
}

func (h *authHandlers) updateProfile(c echo.Context) error {
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

func (h *authHandlers) updatePassword(c echo.Context) error {
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

	if err := h.enqueuePasswordChangedMail(c.Request().Context(), currentSession.User.ID, collectUserEmailRecipients(managedUser)); err != nil {
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

func (h *authHandlers) deleteAccount(c echo.Context) error {
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
