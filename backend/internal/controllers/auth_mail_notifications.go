package controllers

import (
	"context"
	"fmt"
	"strings"
	"time"
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

	job, err := h.mails.Enqueue(ctx, "", "", subject, body, recipients)
	if err != nil {
		return err
	}
	logQueuedMail("registration_verify", job.ID, job.CircleID, job.CreatedByUserID, job.Subject, job.Body, job.Recipients, h.allowInsecureDefaults)

	return nil
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

	job, err := h.mails.Enqueue(ctx, "", createdByUserID, subject, body, recipients)
	if err != nil {
		return err
	}
	logQueuedMail("participant_verify_url", job.ID, job.CircleID, job.CreatedByUserID, job.Subject, job.Body, job.Recipients, h.allowInsecureDefaults)

	return nil
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

	job, err := h.mails.Enqueue(ctx, "", userID, subject, body, recipients)
	if err != nil {
		return err
	}
	logQueuedMail("password_changed", job.ID, job.CircleID, job.CreatedByUserID, job.Subject, job.Body, job.Recipients, h.allowInsecureDefaults)

	return nil
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

	job, err := h.mails.Enqueue(ctx, "", userID, subject, body, recipients)
	if err != nil {
		return err
	}
	logQueuedMail("password_reset_start", job.ID, job.CircleID, job.CreatedByUserID, job.Subject, job.Body, job.Recipients, h.allowInsecureDefaults)

	return nil
}
