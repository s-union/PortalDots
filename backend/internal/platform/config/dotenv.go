package config

import (
	"errors"
	"os"

	"github.com/joho/godotenv"
)

// LoadDotEnv loads key-value pairs from a local .env file without overriding
// variables that are already present in the process environment.
func LoadDotEnv(path string) error {
	_, err := os.Stat(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return err
	}

	return godotenv.Overload(path)
}
