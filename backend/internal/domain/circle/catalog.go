package circle

import (
	"errors"
	"slices"
	"strconv"
	"sync"
	"time"

	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

var ErrNotFound = errors.New("circle not found")
var ErrForbidden = errors.New("circle forbidden")
var ErrAlreadyMember = errors.New("already a member")
var ErrAlreadySubmitted = errors.New("circle already submitted")

type Circle struct {
	ID                    string
	Name                  string
	NameYomi              string
	GroupName             string
	GroupNameYomi         string
	ParticipationTypeID   string
	ParticipationTypeName string
	Tags                  []string
	InvitationToken       string
	SubmittedAt           *time.Time
	Notes                 string
}

type CircleMember struct {
	UserID      string
	DisplayName string
	IsLeader    bool
}

type CreateCircleParams struct {
	Name                  string
	NameYomi              string
	GroupName             string
	GroupNameYomi         string
	ParticipationTypeID   string
	ParticipationTypeName string
	Notes                 string
}

type UpdateCircleParams struct {
	Name          string
	NameYomi      string
	GroupName     string
	GroupNameYomi string
	Notes         string
}

type Catalog interface {
	ListSelectable(user *auth.User) ([]Circle, error)
	FindSelectable(user *auth.User, circleID string) (Circle, error)
	ListForStaff() ([]Circle, error)
	Find(circleID string) (Circle, error)
	Create(name, groupName, participationTypeID, participationTypeName string, tags []string) (Circle, error)
	Update(circleID, name, groupName, participationTypeID, participationTypeName string, tags []string) (Circle, error)
	Delete(circleID string) error

	// Workspace user-facing methods
	GetUserCircle(user *auth.User, circleID string) (Circle, error)
	CreateForUser(user *auth.User, params CreateCircleParams) (Circle, error)
	UpdateForUser(user *auth.User, circleID string, params UpdateCircleParams) (Circle, error)
	DeleteForUser(user *auth.User, circleID string) error
	Submit(user *auth.User, circleID string) (Circle, error)
	ListMembers(circleID string) ([]CircleMember, error)
	RemoveMember(requester *auth.User, circleID, targetUserID string) error
	RegenerateInvitationToken(user *auth.User, circleID string) (Circle, error)
	JoinByToken(user *auth.User, token string) (Circle, error)
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

func (c *StaticCatalog) GetUserCircle(_ *auth.User, circleID string) (Circle, error) {
	return c.Find(circleID)
}

func (c *StaticCatalog) CreateForUser(_ *auth.User, params CreateCircleParams) (Circle, error) {
	return c.Create(params.Name, params.GroupName, params.ParticipationTypeID, params.ParticipationTypeName, nil)
}

func (c *StaticCatalog) UpdateForUser(_ *auth.User, circleID string, params UpdateCircleParams) (Circle, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	for index := range c.circles {
		if c.circles[index].ID != circleID {
			continue
		}
		c.circles[index].Name = params.Name
		c.circles[index].NameYomi = params.NameYomi
		c.circles[index].GroupName = params.GroupName
		c.circles[index].GroupNameYomi = params.GroupNameYomi
		c.circles[index].Notes = params.Notes
		return cloneCircle(c.circles[index]), nil
	}

	return Circle{}, ErrNotFound
}

func (c *StaticCatalog) DeleteForUser(_ *auth.User, circleID string) error {
	return c.Delete(circleID)
}

func (c *StaticCatalog) Submit(_ *auth.User, circleID string) (Circle, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()
	for index := range c.circles {
		if c.circles[index].ID != circleID {
			continue
		}
		c.circles[index].SubmittedAt = &now
		return cloneCircle(c.circles[index]), nil
	}

	return Circle{}, ErrNotFound
}

func (c *StaticCatalog) ListMembers(_ string) ([]CircleMember, error) {
	return []CircleMember{}, nil
}

func (c *StaticCatalog) RemoveMember(_ *auth.User, _, _ string) error {
	return nil
}

func (c *StaticCatalog) RegenerateInvitationToken(_ *auth.User, circleID string) (Circle, error) {
	return c.Find(circleID)
}

func (c *StaticCatalog) JoinByToken(_ *auth.User, token string) (Circle, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	for _, circle := range c.circles {
		if circle.InvitationToken == token {
			return cloneCircle(circle), nil
		}
	}
	return Circle{}, ErrNotFound
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
