package main

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/s-union/PortalDots/backend/internal/app/worker"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/platform/database"
)

func main() {
	if err := config.LoadDotEnv(".env"); err != nil {
		log.Fatal(err)
	}

	cfg := config.FromEnv()
	if err := cfg.ValidateForAPI(); err != nil {
		log.Fatal(err)
	}

	dependencies, err := database.BuildDependencies(context.Background(), cfg)
	if err != nil {
		log.Fatal(err)
	}
	defer dependencies.Close()

	sender, err := buildMailSender(cfg)
	if err != nil {
		log.Fatal(err)
	}

	processed := worker.ProcessMailJobsOnce(dependencies.Mails, sender, 50)
	log.Printf("processed %d mail job(s)", processed)
}

func buildMailSender(cfg config.Config) (worker.MailSender, error) {
	if cfg.AllowInsecureDefaults {
		return worker.NewLogMailSender(), nil
	}

	var issues []string
	if strings.TrimSpace(cfg.SMTPHost) == "" {
		issues = append(issues, "PORTALDOTS_SMTP_HOST")
	}
	if cfg.SMTPPort <= 0 {
		issues = append(issues, "PORTALDOTS_SMTP_PORT")
	}
	if strings.TrimSpace(cfg.SMTPUsername) == "" {
		issues = append(issues, "PORTALDOTS_SMTP_USERNAME")
	}
	if strings.TrimSpace(cfg.SMTPPassword) == "" {
		issues = append(issues, "PORTALDOTS_SMTP_PASSWORD")
	}
	if strings.TrimSpace(cfg.SMTPFrom) == "" {
		issues = append(issues, "PORTALDOTS_SMTP_FROM")
	}
	if len(issues) > 0 {
		return nil, fmt.Errorf(
			"smtp configuration is required when PORTALDOTS_ALLOW_INSECURE_DEFAULTS=false: missing or invalid %s",
			strings.Join(issues, ", "),
		)
	}

	return worker.NewSMTPMailSender(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUsername, cfg.SMTPPassword, cfg.SMTPFrom), nil
}
