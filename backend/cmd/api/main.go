package main

import (
	"context"
	"log"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/platform/database"
	httpserver "github.com/s-union/PortalDots/backend/internal/presentation/httpapi"
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

	server := httpserver.NewServerWithDependencies(
		cfg,
		dependencies.Activities,
		dependencies.Answers,
		dependencies.Authenticator,
		dependencies.Circles,
		dependencies.ContactCategories,
		dependencies.Documents,
		dependencies.Forms,
		dependencies.FormQuestions,
		dependencies.Mails,
		dependencies.Pages,
		dependencies.ParticipationTypes,
		dependencies.Portal,
		dependencies.Places,
		dependencies.Sessions,
		dependencies.Tags,
		dependencies.Users,
	)

	log.Printf("starting api server on %s", cfg.BindAddress)
	if err := server.Start(cfg.BindAddress); err != nil {
		log.Fatal(err)
	}
}
