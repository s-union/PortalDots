package main

import (
	"context"
	"log"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/platform/database"
)

func main() {
	if err := config.LoadDotEnv(".env"); err != nil {
		log.Fatal(err)
	}

	cfg := config.FromEnv()

	store, err := database.Open(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer store.Close()

	if err := database.Migrate(context.Background(), store.Pool(), cfg.MigrationsDir); err != nil {
		log.Fatal(err)
	}
}
