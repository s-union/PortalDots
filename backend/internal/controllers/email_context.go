package controllers

import "github.com/s-union/PortalDots/backend/internal/shared/cloudflareemail"

type EmailContext struct {
	EmailSender  cloudflareemail.Sender
	From         string
	AdminName    string
	ContactEmail string
	AppName      string
	AppURL       string
}
