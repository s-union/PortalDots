package controllers

import "github.com/s-union/PortalDots/backend/internal/shared/emailqueue"

type EmailContext struct {
	EmailSender  emailqueue.Sender
	From         string
	AdminName    string
	ContactEmail string
	AppName      string
	AppURL       string
}
