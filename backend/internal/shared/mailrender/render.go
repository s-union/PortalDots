package mailrender

import (
	"bytes"
	"embed"
	"fmt"
	htmltemplate "html/template"
	"strings"
	texttemplate "text/template"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
)

//go:embed generated/*.tmpl
var generatedTemplates embed.FS

type Branding struct {
	AppName      string
	AppURL       string
	AdminName    string
	ContactEmail string
}

type RenderedMail struct {
	Subject string
	Text    string
	HTML    string
}

type markdownNoticeTemplateData struct {
	AppName      string
	AppURL       string
	AdminName    string
	ContactEmail string
	Preview      string
	Subject      string
	BodyText     string
	BodyHTML     htmltemplate.HTML
}

type registrationVerifyTemplateData struct {
	AppName      string
	AppURL       string
	AdminName    string
	ContactEmail string
	Preview      string
	Subject      string
	VerifyURL    string
}

var markdownRenderer = goldmark.New(
	goldmark.WithExtensions(extension.GFM),
	goldmark.WithParserOptions(parser.WithAutoHeadingID()),
	goldmark.WithRendererOptions(
		html.WithHardWraps(),
	),
)

func RenderMarkdownNotice(brand Branding, subject, markdown string) (RenderedMail, error) {
	normalizedBrand := normalizeBranding(brand)
	normalizedSubject := strings.TrimSpace(subject)
	normalizedMarkdown := strings.TrimSpace(markdown)

	bodyHTML, err := renderMarkdownHTML(normalizedMarkdown)
	if err != nil {
		return RenderedMail{}, err
	}

	data := markdownNoticeTemplateData{
		AppName:      normalizedBrand.AppName,
		AppURL:       normalizedBrand.AppURL,
		AdminName:    normalizedBrand.AdminName,
		ContactEmail: normalizedBrand.ContactEmail,
		Preview:      previewText(normalizedSubject, normalizedMarkdown),
		Subject:      normalizedSubject,
		BodyText:     normalizedMarkdown,
		// This cast is only safe while goldmark keeps raw HTML disabled.
		// TestRenderMarkdownNoticeEscapesRawHTML protects that assumption.
		BodyHTML: htmltemplate.HTML(bodyHTML),
	}

	renderedHTML, err := executeHTMLTemplate("generated/markdown_notice.html.tmpl", data)
	if err != nil {
		return RenderedMail{}, err
	}
	renderedText, err := executeTextTemplate("generated/markdown_notice.txt.tmpl", data)
	if err != nil {
		return RenderedMail{}, err
	}

	return RenderedMail{
		Subject: normalizedSubject,
		Text:    renderedText,
		HTML:    renderedHTML,
	}, nil
}

func RenderRegistrationVerify(brand Branding, subject, verifyURL string) (RenderedMail, error) {
	normalizedBrand := normalizeBranding(brand)
	normalizedSubject := strings.TrimSpace(subject)
	normalizedVerifyURL := strings.TrimSpace(verifyURL)

	data := registrationVerifyTemplateData{
		AppName:      normalizedBrand.AppName,
		AppURL:       normalizedBrand.AppURL,
		AdminName:    normalizedBrand.AdminName,
		ContactEmail: normalizedBrand.ContactEmail,
		Preview:      previewText(normalizedSubject, normalizedVerifyURL),
		Subject:      normalizedSubject,
		VerifyURL:    normalizedVerifyURL,
	}

	renderedHTML, err := executeHTMLTemplate("generated/registration_verify.html.tmpl", data)
	if err != nil {
		return RenderedMail{}, err
	}
	renderedText, err := executeTextTemplate("generated/registration_verify.txt.tmpl", data)
	if err != nil {
		return RenderedMail{}, err
	}

	return RenderedMail{
		Subject: normalizedSubject,
		Text:    renderedText,
		HTML:    renderedHTML,
	}, nil
}

func executeHTMLTemplate(name string, data any) (string, error) {
	tmpl, err := htmltemplate.ParseFS(generatedTemplates, name)
	if err != nil {
		return "", fmt.Errorf("parse html template %s: %w", name, err)
	}

	var buffer bytes.Buffer
	if err := tmpl.Execute(&buffer, data); err != nil {
		return "", fmt.Errorf("render html template %s: %w", name, err)
	}

	return strings.TrimSpace(buffer.String()), nil
}

func executeTextTemplate(name string, data any) (string, error) {
	tmpl, err := texttemplate.ParseFS(generatedTemplates, name)
	if err != nil {
		return "", fmt.Errorf("parse text template %s: %w", name, err)
	}

	var buffer bytes.Buffer
	if err := tmpl.Execute(&buffer, data); err != nil {
		return "", fmt.Errorf("render text template %s: %w", name, err)
	}

	return strings.TrimSpace(buffer.String()), nil
}

func renderMarkdownHTML(markdown string) (string, error) {
	if strings.TrimSpace(markdown) == "" {
		return "<p></p>", nil
	}

	var buffer bytes.Buffer
	if err := markdownRenderer.Convert([]byte(markdown), &buffer); err != nil {
		return "", fmt.Errorf("render markdown html: %w", err)
	}

	return strings.TrimSpace(buffer.String()), nil
}

func normalizeBranding(brand Branding) Branding {
	appName := strings.TrimSpace(brand.AppName)
	if appName == "" {
		appName = "PortalDots"
	}

	adminName := strings.TrimSpace(brand.AdminName)
	if adminName == "" {
		adminName = appName
	}

	return Branding{
		AppName:      appName,
		AppURL:       strings.TrimSpace(brand.AppURL),
		AdminName:    adminName,
		ContactEmail: strings.TrimSpace(brand.ContactEmail),
	}
}

func previewText(subject, fallback string) string {
	if strings.TrimSpace(subject) != "" {
		return strings.TrimSpace(subject)
	}
	return strings.TrimSpace(fallback)
}
