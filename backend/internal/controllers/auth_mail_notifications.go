package controllers

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/s-union/PortalDots/backend/internal/shared/cloudflareemail"
)

func (h *authHandlers) enqueueRegistrationVerifyMail(ctx context.Context, recipientEmail, verifyURL string) error {
	recipients := normalizeRecipients([]string{recipientEmail})
	if len(recipients) == 0 {
		return fmt.Errorf("registration verify mail recipient not found")
	}

	subject := "【重要】メール認証のお願い"
	body := strings.TrimSpace(fmt.Sprintf(
		`メール認証のお願い

以下のURLを開いて、%s のメール認証を完了してください。
%s

このメールに心当たりがない場合、そのまま破棄してください。`,
		h.appName,
		verifyURL,
	))

	jobID := fmt.Sprintf("reg-%d", time.Now().UnixNano())
	return h.emailSender.Enqueue(ctx, cloudflareemail.EmailJob{
		JobId:    jobID,
		Template: "registration-verify",
		Priority: cloudflareemail.PriorityHigh,
		From:     h.from,
		To:       recipients,
		Subject:  subject,
		Body:     body,
		Variables: map[string]string{
			"appName":      h.appName,
			"appURL":       h.appURL,
			"subject":      subject,
			"verifyURL":    verifyURL,
			"adminName":    h.adminName,
			"contactEmail": h.contactEmail,
			"preview":      subject,
		},
	})
}

func (h *authHandlers) enqueueParticipantVerifyLinkMail(
	ctx context.Context,
	createdByUserID,
	verificationType,
	recipientEmail,
	verifyURL string,
) error {
	recipients := normalizeRecipients([]string{recipientEmail})
	if len(recipients) == 0 {
		return fmt.Errorf("participant verify recipient not found")
	}

	verificationLabel := "連絡先メールアドレス"
	if verificationType == "univemail" {
		verificationLabel = "大学メールアドレス"
	}
	subject := "メール認証のお願い"
	body := strings.TrimSpace(fmt.Sprintf(
		`%s のメール認証を完了してください。

以下のURLを開いて認証を完了してください。
%s

認証URLの有効期限は %d 分です。`,
		verificationLabel,
		verifyURL,
		int(participantVerifyTTL/time.Minute),
	))

	jobID := fmt.Sprintf("verify-%d", time.Now().UnixNano())
	return h.emailSender.Enqueue(ctx, cloudflareemail.EmailJob{
		JobId:    jobID,
		Template: "markdown-notice",
		Priority: cloudflareemail.PriorityHigh,
		From:     h.from,
		To:       recipients,
		Subject:  subject,
		Body:     body,
		Variables: map[string]string{
			"appName":      h.appName,
			"appURL":       h.appURL,
			"subject":      subject,
			"body":         body,
			"verifyURL":    verifyURL,
			"adminName":    h.adminName,
			"contactEmail": h.contactEmail,
			"preview":      subject,
		},
	})
}

func (h *authHandlers) enqueuePasswordChangedMail(ctx context.Context, userID string, recipientEmails []string) error {
	recipients := normalizeRecipients(recipientEmails)
	if len(recipients) == 0 {
		return nil
	}

	subject := "パスワードが変更されました"
	body := strings.TrimSpace(fmt.Sprintf(
		`パスワードが変更されました。

最近、%s にログインするためのパスワードが変更されました。この変更がご自身によるものである場合、このメールは無視してください。
もし、このパスワード変更に心当たりがない場合、ログイン画面の「パスワードを忘れた場合」からパスワードを再設定してください。`,
		h.appName,
	))

	jobID := fmt.Sprintf("pwd-chg-%d", time.Now().UnixNano())
	return h.emailSender.Enqueue(ctx, cloudflareemail.EmailJob{
		JobId:    jobID,
		Template: "markdown-notice",
		Priority: cloudflareemail.PriorityNormal,
		From:     h.from,
		To:       recipients,
		Subject:  subject,
		Body:     body,
		Variables: map[string]string{
			"appName":      h.appName,
			"appURL":       h.appURL,
			"subject":      subject,
			"body":         body,
			"adminName":    h.adminName,
			"contactEmail": h.contactEmail,
			"preview":      subject,
		},
	})
}

func (h *authHandlers) enqueuePasswordResetStartMail(
	ctx context.Context,
	userID,
	displayName,
	recipientEmail,
	resetURL string,
) error {
	recipients := normalizeRecipients([]string{recipientEmail})
	if len(recipients) == 0 {
		return fmt.Errorf("password reset start recipient not found")
	}

	subject := "パスワードの再設定"
	body := strings.TrimSpace(fmt.Sprintf(
		`パスワードの再設定

%s 様

%s のパスワードを再設定するには、以下のURLを開いてください。
%s

このメールに心当たりがない場合、このメールはそのまま破棄してください。`,
		displayName,
		h.appName,
		resetURL,
	))

	jobID := fmt.Sprintf("pwd-rst-%d", time.Now().UnixNano())
	return h.emailSender.Enqueue(ctx, cloudflareemail.EmailJob{
		JobId:    jobID,
		Template: "markdown-notice",
		Priority: cloudflareemail.PriorityHigh,
		From:     h.from,
		To:       recipients,
		Subject:  subject,
		Body:     body,
		Variables: map[string]string{
			"appName":      h.appName,
			"appURL":       h.appURL,
			"subject":      subject,
			"body":         body,
			"adminName":    h.adminName,
			"contactEmail": h.contactEmail,
			"preview":      subject,
		},
	})
}
