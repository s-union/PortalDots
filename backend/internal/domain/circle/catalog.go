package circle

import (
	"errors"
	"slices"
	"strconv"
	"sync"

	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

var ErrNotFound = errors.New("circle not found")

type Circle struct {
	ID                    string
	Name                  string
	GroupName             string
	ParticipationTypeID   string
	ParticipationTypeName string
	Tags                  []string
}

type Catalog interface {
	ListSelectable(user *auth.User) ([]Circle, error)
	FindSelectable(user *auth.User, circleID string) (Circle, error)
	ListForStaff() ([]Circle, error)
	Find(circleID string) (Circle, error)
	Create(name, groupName, participationTypeID, participationTypeName string, tags []string) (Circle, error)
	Update(circleID, name, groupName, participationTypeID, participationTypeName string, tags []string) (Circle, error)
	Delete(circleID string) error
}

type StaticCatalog struct {
	mu      sync.RWMutex
	circles []Circle
	nextID  int
}

func NewStaticCatalog(cfg []config.Circle) *StaticCatalog {
	circles := make([]Circle, 0, len(cfg))
	for _, item := range cfg {
		circles = append(circles, Circle{
			ID:                    item.ID,
			Name:                  item.Name,
			GroupName:             item.GroupName,
			ParticipationTypeID:   item.ParticipationTypeID,
			ParticipationTypeName: item.ParticipationTypeName,
			Tags:                  slices.Clone(item.Tags),
		})
	}
	return &StaticCatalog{
		circles: circles,
		nextID:  len(circles) + 1,
	}
}

func (c *StaticCatalog) ListSelectable(_ *auth.User) ([]Circle, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	return cloneCircles(c.circles), nil
}

func (c *StaticCatalog) FindSelectable(_ *auth.User, circleID string) (Circle, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	for _, circle := range c.circles {
		if circle.ID == circleID {
			return cloneCircle(circle), nil
		}
	}
	return Circle{}, ErrNotFound
}

func (c *StaticCatalog) ListForStaff() ([]Circle, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	return cloneCircles(c.circles), nil
}

func (c *StaticCatalog) Find(circleID string) (Circle, error) {
	return c.FindSelectable(nil, circleID)
}

func (c *StaticCatalog) Create(name, groupName, participationTypeID, participationTypeName string, tags []string) (Circle, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	circle := Circle{
		ID:                    "circle-generated-" + strconv.Itoa(c.nextID),
		Name:                  name,
		GroupName:             groupName,
		ParticipationTypeID:   participationTypeID,
		ParticipationTypeName: participationTypeName,
		Tags:                  slices.Clone(tags),
	}
	c.nextID++
	c.circles = append(c.circles, circle)
	return cloneCircle(circle), nil
}

func (c *StaticCatalog) Update(circleID, name, groupName, participationTypeID, participationTypeName string, tags []string) (Circle, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	for index := range c.circles {
		if c.circles[index].ID != circleID {
			continue
		}
		c.circles[index].Name = name
		c.circles[index].GroupName = groupName
		c.circles[index].ParticipationTypeID = participationTypeID
		c.circles[index].ParticipationTypeName = participationTypeName
		c.circles[index].Tags = slices.Clone(tags)
		return cloneCircle(c.circles[index]), nil
	}

	return Circle{}, ErrNotFound
}

func (c *StaticCatalog) Delete(circleID string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	for index := range c.circles {
		if c.circles[index].ID != circleID {
			continue
		}
		c.circles = append(c.circles[:index], c.circles[index+1:]...)
		return nil
	}

	return ErrNotFound
}

func cloneCircles(values []Circle) []Circle {
	cloned := make([]Circle, 0, len(values))
	for _, value := range values {
		cloned = append(cloned, cloneCircle(value))
	}

	return cloned
}

func cloneCircle(value Circle) Circle {
	value.Tags = slices.Clone(value.Tags)
	return value
}
