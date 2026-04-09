package main

import (
	"context"
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

	sender := worker.MailSender(worker.NewLogMailSender())
	if !cfg.AllowInsecureDefaults && strings.TrimSpace(cfg.SMTPHost) != "" {
		sender = worker.NewSMTPMailSender(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUsername, cfg.SMTPPassword, cfg.SMTPFrom)
	}

	processed := worker.ProcessMailJobsOnce(dependencies.Mails, sender, 50)
	log.Printf("processed %d mail job(s)", processed)
}
