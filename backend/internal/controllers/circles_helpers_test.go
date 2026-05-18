package controllers

import (
	"testing"

	"github.com/s-union/PortalDots/backend/internal/domain/circle"
)

func TestMapCircleDetailUsesEmptyPlacesSlice(t *testing.T) {
	t.Parallel()

	got := mapCircleDetail(circle.Circle{})
	if got.Places == nil {
		t.Fatal("expected places to be an empty slice, got nil")
	}
	if len(got.Places) != 0 {
		t.Fatalf("expected no places, got %#v", got.Places)
	}
}
