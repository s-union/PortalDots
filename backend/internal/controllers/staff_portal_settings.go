package controllers

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/portalsetting"
)

type staffPortalSettingsResponse struct {
	AppName                   string `json:"appName"`
	PortalDescription         string `json:"portalDescription"`
	AppURL                    string `json:"appUrl"`
	AppForceHTTPS             bool   `json:"appForceHttps"`
	PortalAdminName           string `json:"portalAdminName"`
	PortalContactEmail        string `json:"portalContactEmail"`
	PortalUnivemailLocalPart  string `json:"portalUnivemailLocalPart"`
	PortalUnivemailDomainPart string `json:"portalUnivemailDomainPart"`
	PortalStudentIDName       string `json:"portalStudentIdName"`
	PortalUnivemailName       string `json:"portalUnivemailName"`
	PortalPrimaryColorH       int    `json:"portalPrimaryColorH"`
	PortalPrimaryColorS       int    `json:"portalPrimaryColorS"`
	PortalPrimaryColorL       int    `json:"portalPrimaryColorL"`
}

type updateStaffPortalSettingsRequest struct {
	AppName                   string `json:"appName"`
	PortalDescription         string `json:"portalDescription"`
	AppURL                    string `json:"appUrl"`
	AppForceHTTPS             bool   `json:"appForceHttps"`
	PortalAdminName           string `json:"portalAdminName"`
	PortalContactEmail        string `json:"portalContactEmail"`
	PortalUnivemailLocalPart  string `json:"portalUnivemailLocalPart"`
	PortalUnivemailDomainPart string `json:"portalUnivemailDomainPart"`
	PortalStudentIDName       string `json:"portalStudentIdName"`
	PortalUnivemailName       string `json:"portalUnivemailName"`
	PortalPrimaryColorH       int    `json:"portalPrimaryColorH"`
	PortalPrimaryColorS       int    `json:"portalPrimaryColorS"`
	PortalPrimaryColorL       int    `json:"portalPrimaryColorL"`
}

func (h *staffAdminHandlers) getStaffPortalSettings(c echo.Context) error {
	_, _, status, ok := h.requireStaffCapability(c, canManagePortalSettings)
	if !ok {
		return statusError(c, status)
	}

	settings, err := h.portal.Get()
	if err != nil {
		return internalError(c)
	}

	return c.JSON(http.StatusOK, mapStaffPortalSettings(settings))
}

func (h *staffAdminHandlers) updateStaffPortalSettings(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffCapability(c, canManagePortalSettings)
	if !ok {
		return statusError(c, status)
	}

	var request updateStaffPortalSettingsRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	request.AppName = strings.TrimSpace(request.AppName)
	request.PortalDescription = strings.TrimSpace(request.PortalDescription)
	request.AppURL = strings.TrimSpace(request.AppURL)
	request.PortalAdminName = strings.TrimSpace(request.PortalAdminName)
	request.PortalContactEmail = strings.TrimSpace(request.PortalContactEmail)
	request.PortalUnivemailLocalPart = strings.TrimSpace(request.PortalUnivemailLocalPart)
	request.PortalUnivemailDomainPart = strings.TrimSpace(request.PortalUnivemailDomainPart)
	request.PortalStudentIDName = strings.TrimSpace(request.PortalStudentIDName)
	request.PortalUnivemailName = strings.TrimSpace(request.PortalUnivemailName)

	validationErrors := map[string][]string{}
	if request.AppName == "" {
		validationErrors["appName"] = []string{"ポータルの名前を入力してください"}
	}
	if request.AppURL == "" {
		validationErrors["appUrl"] = []string{"ポータルの URL を入力してください"}
	}
	if request.PortalAdminName == "" {
		validationErrors["portalAdminName"] = []string{"実行委員会の名称を入力してください"}
	}
	if request.PortalContactEmail == "" {
		validationErrors["portalContactEmail"] = []string{"実行委員会のメールアドレスを入力してください"}
	}
	if request.PortalUnivemailLocalPart == "" {
		validationErrors["portalUnivemailLocalPart"] = []string{"学校発行メールアドレスのローカルパート種別を入力してください"}
	}
	if request.PortalUnivemailDomainPart == "" {
		validationErrors["portalUnivemailDomainPart"] = []string{"学校発行メールアドレスのドメインを入力してください"}
	}
	if request.PortalStudentIDName == "" {
		validationErrors["portalStudentIdName"] = []string{"学籍番号の呼び方を入力してください"}
	}
	if request.PortalUnivemailName == "" {
		validationErrors["portalUnivemailName"] = []string{"学校発行メールアドレスの呼び方を入力してください"}
	}
	if request.PortalUnivemailLocalPart != "student_id" {
		validationErrors["portalUnivemailLocalPart"] = append(validationErrors["portalUnivemailLocalPart"], "ローカルパート種別は student_id を指定してください")
	}
	if request.PortalPrimaryColorH < 0 || request.PortalPrimaryColorH > 360 {
		validationErrors["portalPrimaryColorH"] = []string{"アクセントカラー(H) は 0 から 360 の範囲で入力してください"}
	}
	if request.PortalPrimaryColorS < 0 || request.PortalPrimaryColorS > 100 {
		validationErrors["portalPrimaryColorS"] = []string{"アクセントカラー(S) は 0 から 100 の範囲で入力してください"}
	}
	if request.PortalPrimaryColorL < 0 || request.PortalPrimaryColorL > 100 {
		validationErrors["portalPrimaryColorL"] = []string{"アクセントカラー(L) は 0 から 100 の範囲で入力してください"}
	}
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	updated, err := h.portal.Update(portalsetting.UpdateParams{
		AppName:                   request.AppName,
		PortalDescription:         request.PortalDescription,
		AppURL:                    request.AppURL,
		AppForceHTTPS:             request.AppForceHTTPS,
		PortalAdminName:           request.PortalAdminName,
		PortalContactEmail:        request.PortalContactEmail,
		PortalUnivemailLocalPart:  request.PortalUnivemailLocalPart,
		PortalUnivemailDomainPart: request.PortalUnivemailDomainPart,
		PortalStudentIDName:       request.PortalStudentIDName,
		PortalUnivemailName:       request.PortalUnivemailName,
		PortalPrimaryColorH:       request.PortalPrimaryColorH,
		PortalPrimaryColorS:       request.PortalPrimaryColorS,
		PortalPrimaryColorL:       request.PortalPrimaryColorL,
	})
	if err != nil {
		return internalError(c)
	}

	recordActivity(
		c.Request().Context(),
		h.activities,
		currentSession.User.ID,
		"staff.portal.updated",
		"portal_settings",
		"portal",
		"",
		buildActivitySummary("staff が Portal 設定を更新しました", updated.AppName),
	)

	return c.JSON(http.StatusOK, mapStaffPortalSettings(updated))
}

func mapStaffPortalSettings(settings portalsetting.Settings) staffPortalSettingsResponse {
	return staffPortalSettingsResponse{
		AppName:                   settings.AppName,
		PortalDescription:         settings.PortalDescription,
		AppURL:                    settings.AppURL,
		AppForceHTTPS:             settings.AppForceHTTPS,
		PortalAdminName:           settings.PortalAdminName,
		PortalContactEmail:        settings.PortalContactEmail,
		PortalUnivemailLocalPart:  settings.PortalUnivemailLocalPart,
		PortalUnivemailDomainPart: settings.PortalUnivemailDomainPart,
		PortalStudentIDName:       settings.PortalStudentIDName,
		PortalUnivemailName:       settings.PortalUnivemailName,
		PortalPrimaryColorH:       settings.PortalPrimaryColorH,
		PortalPrimaryColorS:       settings.PortalPrimaryColorS,
		PortalPrimaryColorL:       settings.PortalPrimaryColorL,
	}
}
