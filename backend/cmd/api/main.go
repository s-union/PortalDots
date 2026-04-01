package main

import (
	"context"
	"log"

	httpserver "github.com/s-union/PortalDots/backend/internal/http/server"
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

	server := httpserver.NewWithDependencies(cfg, httpserver.Dependencies{
		Shared: httpserver.SharedDependencies{
			Activities: dependencies.Activities,
			Sessions:   dependencies.Sessions,
			Users:      dependencies.Users,
		},
		Public: httpserver.PublicDependencies{
			Authenticator:        dependencies.Authenticator,
			Circles:              dependencies.Circles,
			ContactCategories:    dependencies.ContactCategories,
			Documents:            dependencies.Documents,
			Forms:                dependencies.Forms,
			Mails:                dependencies.Mails,
			Pages:                dependencies.Pages,
			PendingRegistrations: dependencies.PendingRegistrations,
			ParticipationTypes:   dependencies.ParticipationTypes,
			Portal:               dependencies.Portal,
		},
		Workspace: httpserver.WorkspaceDependencies{
			Answers:            dependencies.Answers,
			Circles:            dependencies.Circles,
			ContactCategories:  dependencies.ContactCategories,
			Documents:          dependencies.Documents,
			Forms:              dependencies.Forms,
			FormQuestions:      dependencies.FormQuestions,
			Pages:              dependencies.Pages,
			ParticipationTypes: dependencies.ParticipationTypes,
			Users:              dependencies.Users,
		},
		Staff: httpserver.StaffDependencies{
			Answers:            dependencies.Answers,
			Booths:             dependencies.Booths,
			Circles:            dependencies.Circles,
			ContactCategories:  dependencies.ContactCategories,
			Documents:          dependencies.Documents,
			Forms:              dependencies.Forms,
			FormQuestions:      dependencies.FormQuestions,
			Mails:              dependencies.Mails,
			Pages:              dependencies.Pages,
			ParticipationTypes: dependencies.ParticipationTypes,
			Places:             dependencies.Places,
			Portal:             dependencies.Portal,
			Tags:               dependencies.Tags,
			Users:              dependencies.Users,
		},
	})

	log.Printf("starting api server on %s", cfg.BindAddress)
	if err := server.Start(cfg.BindAddress); err != nil {
		log.Fatal(err)
	}
}
