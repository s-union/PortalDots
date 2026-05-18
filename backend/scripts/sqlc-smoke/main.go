package main

import (
	"context"
	"errors"
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
	if errors.Is(err, database.ErrDisabled) {
		log.Fatal("PORTAL_DATABASE_URL is required")
	}
	if err != nil {
		log.Fatal(err)
	}
	defer store.Close()

	count, err := store.CountUsers(context.Background())
	if err != nil {
		log.Fatal(err)
	}

	log.Printf("users rows: %d", count)
}
