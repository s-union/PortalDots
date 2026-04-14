package worker

import (
	"crypto/tls"
	"io"
	"net/smtp"
	"strings"
	"testing"
)

type smtpClientStub struct {
	supportsStartTLS bool
	startTLSCalled   bool
	authCalled       bool
	mailFrom         string
	recipient        string
	writtenMessage   string
	quitCalled       bool
	closeCalled      bool
}

func (c *smtpClientStub) Extension(ext string) (bool, string) {
	if ext != "STARTTLS" || !c.supportsStartTLS {
		return false, ""
	}
	return true, ""
}

func (c *smtpClientStub) StartTLS(_ *tls.Config) error {
	c.startTLSCalled = true
	return nil
}

func (c *smtpClientStub) Auth(_ smtp.Auth) error {
	c.authCalled = true
	return nil
}

func (c *smtpClientStub) Mail(from string) error {
	c.mailFrom = from
	return nil
}

func (c *smtpClientStub) Rcpt(to string) error {
	c.recipient = to
	return nil
}

func (c *smtpClientStub) Data() (io.WriteCloser, error) {
	return &captureWriteCloser{
		onClose: func(value string) {
			c.writtenMessage = value
		},
	}, nil
}

func (c *smtpClientStub) Quit() error {
	c.quitCalled = true
	return nil
}

func (c *smtpClientStub) Close() error {
	c.closeCalled = true
	return nil
}

type captureWriteCloser struct {
	builder strings.Builder
	onClose func(string)
}

func (w *captureWriteCloser) Write(p []byte) (int, error) {
	return w.builder.Write(p)
}

func (w *captureWriteCloser) Close() error {
	if w.onClose != nil {
		w.onClose(w.builder.String())
	}
	return nil
}

func TestSMTPMailSenderRequiresStartTLSWhenAuthIsEnabled(t *testing.T) {
	t.Parallel()

	client := &smtpClientStub{supportsStartTLS: false}
	sender := NewSMTPMailSender("smtp.example.com", 587, "staff@example.com", "password", "noreply@example.com")
	sender.dial = func(addr string) (smtpClient, error) {
		if addr != "smtp.example.com:587" {
			t.Fatalf("unexpected smtp address: %s", addr)
		}
		return client, nil
	}

	err := sender.Send("user@example.com", "subject", "body")
	if err == nil {
		t.Fatal("expected error when STARTTLS is unavailable with authentication")
	}
	if !strings.Contains(err.Error(), "STARTTLS") {
		t.Fatalf("expected STARTTLS error, got %v", err)
	}
	if client.authCalled {
		t.Fatal("did not expect SMTP AUTH when STARTTLS is unavailable")
	}
}

func TestSMTPMailSenderRequiresStartTLSWithoutAuth(t *testing.T) {
	t.Parallel()

	client := &smtpClientStub{supportsStartTLS: false}
	sender := NewSMTPMailSender("smtp.example.com", 587, "", "", "noreply@example.com")
	sender.dial = func(addr string) (smtpClient, error) {
		if addr != "smtp.example.com:587" {
			t.Fatalf("unexpected smtp address: %s", addr)
		}
		return client, nil
	}

	err := sender.Send("user@example.com", "subject", "body")
	if err == nil {
		t.Fatal("expected error when STARTTLS is unavailable")
	}
	if !strings.Contains(err.Error(), "STARTTLS") {
		t.Fatalf("expected STARTTLS error, got %v", err)
	}
	if client.authCalled {
		t.Fatal("did not expect SMTP AUTH without credentials")
	}
}

func TestSMTPMailSenderUsesStartTLSBeforeAuth(t *testing.T) {
	t.Parallel()

	client := &smtpClientStub{supportsStartTLS: true}
	sender := NewSMTPMailSender("smtp.example.com", 587, "staff@example.com", "password", "")
	sender.dial = func(addr string) (smtpClient, error) {
		if addr != "smtp.example.com:587" {
			t.Fatalf("unexpected smtp address: %s", addr)
		}
		return client, nil
	}

	if err := sender.Send("user@example.com", "subject", "body"); err != nil {
		t.Fatalf("send failed: %v", err)
	}
	if !client.startTLSCalled {
		t.Fatal("expected STARTTLS to be used")
	}
	if !client.authCalled {
		t.Fatal("expected SMTP AUTH to be used")
	}
	if client.mailFrom != "staff@example.com" {
		t.Fatalf("expected from fallback to username, got %q", client.mailFrom)
	}
	if client.recipient != "user@example.com" {
		t.Fatalf("expected recipient to be set, got %q", client.recipient)
	}
	if client.writtenMessage == "" {
		t.Fatal("expected message body to be written")
	}
	if !client.quitCalled {
		t.Fatal("expected SMTP QUIT to be called")
	}
}
