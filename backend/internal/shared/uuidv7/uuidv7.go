package uuidv7

import "github.com/google/uuid"

// NewString returns an RFC 9562 UUIDv7 string.
func NewString() (string, error) {
	value, err := uuid.NewV7()
	if err != nil {
		return "", err
	}
	return value.String(), nil
}

// MustString returns a UUIDv7 string or panics if generation fails.
func MustString() string {
	value, err := NewString()
	if err != nil {
		panic(err)
	}
	return value
}
