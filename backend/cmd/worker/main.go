package main

import (
	"context"
	"log"

	"github.com/s-union/PortalDots/backend/internal/app/worker"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/platform/database"
)

func main() {
	cfg := config.FromEnv()
	if err := cfg.ValidateForAPI(); err != nil {
		log.Fatal(err)
	}

	dependencies, err := database.BuildDependencies(context.Background(), cfg)
	if err != nil {
		log.Fatal(err)
	}
	defer dependencies.Close()

	processed := worker.ProcessMailJobsOnce(dependencies.Mails, 50)
	log.Printf("processed %d mail job(s)", processed)
}
