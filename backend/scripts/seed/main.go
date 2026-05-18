package main

import (
	"context"
	"log"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/platform/database"
)

func main() {
	cfg := config.FromEnv()
	if err := cfg.Validate(); err != nil {
		log.Fatal(err)
	}

	store, err := database.Open(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer store.Close()

	if err := database.EnsureSeedData(context.Background(), store, cfg); err != nil {
		log.Fatal(err)
	}
}
