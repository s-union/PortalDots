package worker

import (
	"crypto/tls"
	"fmt"
	"log/slog"
	"mime"
	"net/smtp"
	"strings"
)

type LogMailSender struct{}

func NewLogMailSender() *LogMailSender {
	return &LogMailSender{}
}

func (s *LogMailSender) Send(recipient, subject, body string) error {
	slog.Info(
		"mock mail delivered",
		"kind", "mail_delivery",
		"recipient", strings.TrimSpace(recipient),
		"subject", strings.TrimSpace(subject),
		"body", body,
	)
	return nil
}

type SMTPMailSender struct {
	addr     string
	from     string
	host     string
	username string
	password string
}

func NewSMTPMailSender(host string, port int, username, password, from string) *SMTPMailSender {
	return &SMTPMailSender{
		addr:     fmt.Sprintf("%s:%d", strings.TrimSpace(host), port),
		from:     strings.TrimSpace(from),
		host:     strings.TrimSpace(host),
		username: strings.TrimSpace(username),
		password: password,
	}
}

func (s *SMTPMailSender) Send(recipient, subject, body string) error {
	trimmedRecipient := strings.TrimSpace(recipient)
	if trimmedRecipient == "" {
		return fmt.Errorf("recipient is required")
	}
	if s.host == "" {
		return fmt.Errorf("smtp host is required")
	}
	if s.addr == "" {
		return fmt.Errorf("smtp address is required")
	}
	from := strings.TrimSpace(s.from)
	if from == "" {
		from = s.username
	}
	if strings.TrimSpace(from) == "" {
		return fmt.Errorf("smtp from address is required")
	}

	client, err := smtp.Dial(s.addr)
	if err != nil {
		return err
	}
	defer client.Close()

	if ok, _ := client.Extension("STARTTLS"); ok {
		if err := client.StartTLS(&tls.Config{
			ServerName: s.host,
			MinVersion: tls.VersionTLS12,
		}); err != nil {
			return err
		}
	}

	if s.username != "" {
		if err := client.Auth(smtp.PlainAuth("", s.username, s.password, s.host)); err != nil {
			return err
		}
	}

	if err := client.Mail(from); err != nil {
		return err
	}
	if err := client.Rcpt(trimmedRecipient); err != nil {
		return err
	}

	writer, err := client.Data()
	if err != nil {
		return err
	}
	message := buildPlainMailMessage(from, trimmedRecipient, subject, body)
	if _, err := writer.Write([]byte(message)); err != nil {
		_ = writer.Close()
		return err
	}
	if err := writer.Close(); err != nil {
		return err
	}
	if err := client.Quit(); err != nil {
		return err
	}

	return nil
}

func buildPlainMailMessage(from, recipient, subject, body string) string {
	safeFrom := sanitizeMailHeaderValue(from)
	safeRecipient := sanitizeMailHeaderValue(recipient)
	safeSubject := sanitizeMailHeaderValue(subject)
	encodedSubject := mime.BEncoding.Encode("UTF-8", safeSubject)
	lines := []string{
		fmt.Sprintf("From: %s", safeFrom),
		fmt.Sprintf("To: %s", safeRecipient),
		fmt.Sprintf("Subject: %s", encodedSubject),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		body,
	}

	return strings.Join(lines, "\r\n")
}

func sanitizeMailHeaderValue(value string) string {
	trimmed := strings.TrimSpace(value)
	trimmed = strings.ReplaceAll(trimmed, "\r", " ")
	trimmed = strings.ReplaceAll(trimmed, "\n", " ")
	return strings.TrimSpace(trimmed)
}
