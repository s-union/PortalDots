package controllers

import (
	"context"

	"github.com/s-union/PortalDots/backend/internal/domain/circle"
)

type staffManagedCircleResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func mapStaffManagedCircle(circleValue circle.Circle) staffManagedCircleResponse {
	return staffManagedCircleResponse{
		ID:   circleValue.ID,
		Name: circleValue.Name,
	}
}

func listStaffManagedCircles(circles circle.Catalog) ([]circle.Circle, map[string]staffManagedCircleResponse, error) {
	items, err := circles.ListForStaff(context.Background())
	if err != nil {
		return nil, nil, err
	}

	responseByID := make(map[string]staffManagedCircleResponse, len(items))
	for _, item := range items {
		responseByID[item.ID] = mapStaffManagedCircle(item)
	}

	return items, responseByID, nil
}
