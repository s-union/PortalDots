package registrationmail

import (
	"crypto/tls"
	"fmt"
	"mime"
	"net/smtp"
	"strings"
)

type DeliveryResult struct {
	DeliveryMode string
	VerifyURL    string
}

type Message struct {
	AppName   string
	To        string
	VerifyURL string
}

type Sender interface {
	SendVerificationMail(message Message) (DeliveryResult, error)
}

type MockSender struct{}

func NewMockSender() *MockSender {
	return &MockSender{}
}

func (s *MockSender) SendVerificationMail(message Message) (DeliveryResult, error) {
	return DeliveryResult{
		DeliveryMode: "mock",
		VerifyURL:    message.VerifyURL,
	}, nil
}

type SMTPSender struct {
	addr     string
	from     string
	host     string
	username string
	password string
}

func NewSMTPSender(host string, port int, username, password, from string) *SMTPSender {
	return &SMTPSender{
		addr:     fmt.Sprintf("%s:%d", strings.TrimSpace(host), port),
		from:     strings.TrimSpace(from),
		host:     strings.TrimSpace(host),
		username: strings.TrimSpace(username),
		password: password,
	}
}

func (s *SMTPSender) SendVerificationMail(message Message) (DeliveryResult, error) {
	client, err := smtp.Dial(s.addr)
	if err != nil {
		return DeliveryResult{}, err
	}
	defer client.Close()

	if ok, _ := client.Extension("STARTTLS"); !ok {
		return DeliveryResult{}, fmt.Errorf("smtp server %s does not support STARTTLS", s.addr)
	}
	if err := client.StartTLS(&tls.Config{
		ServerName: s.host,
		MinVersion: tls.VersionTLS12,
	}); err != nil {
		return DeliveryResult{}, err
	}

	if err := client.Auth(smtp.PlainAuth("", s.username, s.password, s.host)); err != nil {
		return DeliveryResult{}, err
	}

	body := buildVerificationMailBody(s.from, message)
	if err := client.Mail(s.from); err != nil {
		return DeliveryResult{}, err
	}
	if err := client.Rcpt(message.To); err != nil {
		return DeliveryResult{}, err
	}
	writer, err := client.Data()
	if err != nil {
		return DeliveryResult{}, err
	}
	if _, err := writer.Write([]byte(body)); err != nil {
		_ = writer.Close()
		return DeliveryResult{}, err
	}
	if err := writer.Close(); err != nil {
		return DeliveryResult{}, err
	}
	if err := client.Quit(); err != nil {
		return DeliveryResult{}, err
	}

	return DeliveryResult{DeliveryMode: "email"}, nil
}

func buildVerificationMailBody(from string, message Message) string {
	subject := fmt.Sprintf("%s ユーザー登録の確認", strings.TrimSpace(message.AppName))
	encodedSubject := mime.BEncoding.Encode("UTF-8", subject)
	lines := []string{
		fmt.Sprintf("From: %s", strings.TrimSpace(from)),
		fmt.Sprintf("To: %s", message.To),
		fmt.Sprintf("Subject: %s", encodedSubject),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		fmt.Sprintf("%s のユーザー登録を続けるには、以下のURLを開いてください。", strings.TrimSpace(message.AppName)),
		"",
		message.VerifyURL,
		"",
		"このURLに覚えがない場合は、このメールを破棄してください。",
	}

	return strings.Join(lines, "\r\n")
}
