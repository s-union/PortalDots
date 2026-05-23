package controllers

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
)

const passwordResetTokenTTL = 5 * time.Minute

type passwordResetStartRequest struct {
	LoginID string `json:"loginId"`
}

type passwordResetVerifyRequest struct {
	UserID string `json:"userId"`
	Token  string `json:"token"`
}

type passwordResetVerifyResponse struct {
	UserID string `json:"userId"`
	Valid  bool   `json:"valid"`
}

type passwordResetCompleteRequest struct {
	UserID               string `json:"userId"`
	Token                string `json:"token"`
	Password             string `json:"password"`
	PasswordConfirmation string `json:"passwordConfirmation"`
}

func (h *authHandlers) startPasswordReset(c *echo.Context) error {
	var request passwordResetStartRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	request.LoginID = strings.TrimSpace(request.LoginID)
	if request.LoginID == "" {
		return validationError(c, map[string][]string{
			"loginId": {"学籍番号または連絡先メールアドレスを入力してください"},
		})
	}

	targetUser, found, err := h.findPasswordResetTargetUser(request.LoginID)
	if err != nil {
		return internalError(c)
	}
	if recipients := collectUserEmailRecipients(targetUser); found && len(recipients) > 0 {
		token, err := generateRegistrationToken()
		if err != nil {
			return errorJSON(c, http.StatusInternalServerError, "failed_to_generate_password_reset_token")
		}
		h.passwordResetTokens.Put(targetUser.ID, token, time.Now().UTC().Add(passwordResetTokenTTL))
		resetURL := buildPasswordResetURL(h.appURL, targetUser.ID, token)
		if err := h.enqueuePasswordResetStartMail(
			c.Request().Context(),
			targetUser.ID,
			targetUser.DisplayName,
			recipients[0],
			resetURL,
		); err != nil {
			return internalError(c)
		}
	}

	return c.JSON(http.StatusOK, messageResponse{
		Message: "再設定URLを送信しました。メールをご確認ください。",
	})
}

func (h *authHandlers) verifyPasswordReset(c *echo.Context) error {
	var request passwordResetVerifyRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	request.UserID = strings.TrimSpace(request.UserID)
	request.Token = strings.TrimSpace(request.Token)

	validationErrors := map[string][]string{}
	if request.UserID == "" {
		validationErrors["userId"] = []string{"ユーザーIDが不正です"}
	}
	if request.Token == "" {
		validationErrors["token"] = []string{"再設定URLが無効か期限切れです。もう一度お試しください。"}
	}
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}
	if !h.passwordResetTokens.Match(request.UserID, request.Token, time.Now().UTC()) {
		return validationError(c, map[string][]string{
			"token": {"再設定URLが無効か期限切れです。もう一度お試しください。"},
		})
	}

	return c.JSON(http.StatusOK, passwordResetVerifyResponse{
		UserID: request.UserID,
		Valid:  true,
	})
}

func (h *authHandlers) completePasswordReset(c *echo.Context) error {
	if h.passwordResetter == nil {
		return internalError(c)
	}

	var request passwordResetCompleteRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	request.UserID = strings.TrimSpace(request.UserID)
	request.Token = strings.TrimSpace(request.Token)
	request.Password = strings.TrimSpace(request.Password)
	request.PasswordConfirmation = strings.TrimSpace(request.PasswordConfirmation)

	validationErrors := map[string][]string{}
	if request.UserID == "" {
		validationErrors["userId"] = []string{"ユーザーIDが不正です"}
	}
	if request.Token == "" {
		validationErrors["token"] = []string{"再設定URLが無効か期限切れです。もう一度お試しください。"}
	}
	if request.Password == "" {
		validationErrors["password"] = []string{"新しいパスワードを入力してください"}
	} else {
		if len(request.Password) < 8 {
			validationErrors["password"] = []string{"新しいパスワードは8文字以上で入力してください"}
		} else if !passwordHasLetterAndDigit(request.Password) {
			validationErrors["password"] = []string{"新しいパスワードは英字と数字をそれぞれ1文字以上含めてください"}
		}
	}
	if request.Password != request.PasswordConfirmation {
		validationErrors["passwordConfirmation"] = []string{"確認用パスワードが一致しません"}
	}
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}
	if !h.passwordResetTokens.Match(request.UserID, request.Token, time.Now().UTC()) {
		return validationError(c, map[string][]string{
			"token": {"再設定URLが無効か期限切れです。もう一度お試しください。"},
		})
	}

	targetUser, err := h.users.Find(request.UserID)
	if errors.Is(err, useradmin.ErrNotFound) {
		return validationError(c, map[string][]string{
			"token": {"再設定URLが無効か期限切れです。もう一度お試しください。"},
		})
	}
	if err != nil {
		return internalError(c)
	}

	if err := h.passwordResetter.ResetPassword(c.Request().Context(), request.UserID, request.Password); err != nil {
		if errors.Is(err, auth.ErrInvalidPassword) {
			return validationError(c, map[string][]string{
				"token": {"再設定URLが無効か期限切れです。もう一度お試しください。"},
			})
		}
		return internalError(c)
	}
	if err := h.enqueuePasswordChangedMail(c.Request().Context(), request.UserID, collectUserEmailRecipients(targetUser)); err != nil {
		return internalError(c)
	}

	h.passwordResetTokens.Delete(request.UserID)
	_ = h.sessions.DeleteByUserID(c.Request().Context(), request.UserID)
	recordActivity(
		c.Request().Context(),
		h.activities,
		request.UserID,
		"user.password.reset",
		"user",
		request.UserID,
		"",
		"利用者がパスワードを再設定しました",
	)

	return c.NoContent(http.StatusNoContent)
}

func (h *authHandlers) findPasswordResetTargetUser(loginID string) (useradmin.User, bool, error) {
	normalizedLoginID := strings.TrimSpace(loginID)
	if normalizedLoginID == "" {
		return useradmin.User{}, false, nil
	}

	userValue, err := h.users.FindByLoginID(normalizedLoginID)
	if err == nil {
		return userValue, true, nil
	}
	if err != nil && !errors.Is(err, useradmin.ErrNotFound) {
		return useradmin.User{}, false, err
	}

	userValue, err = h.users.FindByNormalizedLoginID(normalizedLoginID)
	if err == nil {
		return userValue, true, nil
	}
	if err != nil && !errors.Is(err, useradmin.ErrNotFound) {
		return useradmin.User{}, false, err
	}

	userValue, err = h.users.FindByContactEmail(normalizedLoginID)
	if err == nil {
		return userValue, true, nil
	}
	if err != nil && !errors.Is(err, useradmin.ErrNotFound) {
		return useradmin.User{}, false, err
	}

	return useradmin.User{}, false, nil
}
