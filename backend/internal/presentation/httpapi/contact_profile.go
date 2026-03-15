package httpapi

import (
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/contactcategory"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
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
	DisplayName string `json:"displayName"`
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
	sessionID, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return statusError(c, http.StatusUnauthorized)
	}

	selectedCircle, err := resolveCurrentCircle(sessionID, currentSession, h.circles, h.sessions)
	if err != nil {
		return internalError(c)
	}
	if selectedCircle == nil {
		return statusError(c, http.StatusConflict)
	}

	jobs := h.mails.ListByCircle(selectedCircle.ID)
	response := make([]submitContactResponse, 0, len(jobs))
	for _, job := range jobs {
		if job.CreatedByUserID != currentSession.User.ID {
			continue
		}

		categoryID, categoryName := extractContactMetadata(job.Body)
		response = append(response, submitContactResponse{
			ID:           job.ID,
			CategoryID:   categoryID,
			CategoryName: categoryName,
			Subject:      job.Subject,
			Status:       job.Status,
			CreatedAt:    job.CreatedAt,
		})
	}

	return c.JSON(http.StatusOK, response)
}

func (h *authHandlers) listContactCategories(c echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return statusError(c, http.StatusUnauthorized)
	}

	items, err := h.contactCategories.List()
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

	selectedCircle, err := resolveCurrentCircle(sessionID, currentSession, h.circles, h.sessions)
	if err != nil {
		return internalError(c)
	}
	if selectedCircle == nil {
		return statusError(c, http.StatusConflict)
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

	category, err := findContactCategory(h.contactCategories, request.CategoryID)
	if errors.Is(err, contactcategory.ErrNotFound) {
		return validationError(c, map[string][]string{"categoryId": {"存在しない問い合わせカテゴリです"}})
	}
	if err != nil {
		return internalError(c)
	}

	body := fmt.Sprintf(
		"PortalDots contact request\ncategory_id: %s\ncategory_name: %s\nfrom: %s (%s)\ncircle: %s (%s)\n\n%s",
		category.ID,
		category.Name,
		currentSession.User.DisplayName,
		currentSession.User.ID,
		selectedCircle.Name,
		selectedCircle.ID,
		request.Body,
	)
	job := h.mails.Enqueue(
		selectedCircle.ID,
		currentSession.User.ID,
		request.Subject,
		body,
		[]string{category.Email},
	)
	recordActivity(
		h.activities,
		currentSession.User.ID,
		"contact.submitted",
		"contact_category",
		category.ID,
		selectedCircle.ID,
		buildActivitySummary("利用者がお問い合わせを送信しました", request.Subject),
	)

	return c.JSON(http.StatusCreated, submitContactResponse{
		ID:           job.ID,
		CategoryID:   category.ID,
		CategoryName: category.Name,
		Subject:      job.Subject,
		Status:       job.Status,
		CreatedAt:    job.CreatedAt,
	})
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

func (h *authHandlers) updateProfile(c echo.Context) error {
	sessionID, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return statusError(c, http.StatusUnauthorized)
	}

	var request updateProfileRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	request.DisplayName = strings.TrimSpace(request.DisplayName)
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

	h.sessions.Update(sessionID, func(next *session.Session) {
		if next.User == nil {
			return
		}
		next.User.DisplayName = updatedUser.DisplayName
	})
	recordActivity(
		h.activities,
		updatedUser.ID,
		"user.profile.updated",
		"user",
		updatedUser.ID,
		"",
		buildActivitySummary("利用者が表示名を更新しました", updatedUser.DisplayName),
	)

	return c.JSON(http.StatusOK, updatedProfileResponse{
		ID:          updatedUser.ID,
		DisplayName: updatedUser.DisplayName,
	})
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

	h.sessions.Update(sessionID, func(next *session.Session) {
		if next.User == nil {
			return
		}
		next.StaffAuthorized = false
		next.StaffVerifyCode = ""
		next.StaffVerifyExpires = time.Time{}
	})
	recordActivity(
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

	h.sessions.DeleteByUserID(currentUser.ID)
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

func findContactCategory(repository contactcategory.Repository, categoryID string) (contactcategory.Category, error) {
	items, err := repository.List()
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
