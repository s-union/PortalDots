package circle

import (
	"errors"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

var ErrNotFound = errors.New("circle not found")
var ErrForbidden = errors.New("circle forbidden")
var ErrAlreadyMember = errors.New("already a member")
var ErrAlreadySubmitted = errors.New("circle already submitted")
var ErrInviteeNotFound = errors.New("invitee not found")
var ErrInviteeUnverified = errors.New("invitee unverified")

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
	UpdatedAt             time.Time
	Notes                 string
	CanChangeGroupName    bool
	Status                string
	StatusReason          string
	StatusSetAt           *time.Time
	StatusSetByID         *string
	Places                []string
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
	CanChangeGroupName    bool
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
	Create(name, nameYomi, groupName, groupNameYomi, participationTypeID, participationTypeName, notes string, tags []string, status, statusReason, setByUserID string, placeIDs []string) (Circle, error)
	Update(circleID, name, nameYomi, groupName, groupNameYomi, participationTypeID, participationTypeName, notes string, tags []string, status, statusReason, setByUserID string, placeIDs []string) (Circle, error)
	Delete(circleID string) error

	// Workspace user-facing methods
	GetUserCircle(user *auth.User, circleID string) (Circle, error)
	CreateForUser(user *auth.User, params CreateCircleParams) (Circle, error)
	UpdateForUser(user *auth.User, circleID string, params UpdateCircleParams) (Circle, error)
	DeleteForUser(user *auth.User, circleID string) error
	Submit(user *auth.User, circleID string) (Circle, error)
	ListMembers(circleID string) ([]CircleMember, error)
	AddMemberAsStaff(circleID, targetUserID, targetDisplayName string) error
	RemoveMemberAsStaff(circleID, targetUserID string) error
	AddMember(requester *auth.User, circleID, targetUserID, targetDisplayName string, verified bool) error
	RemoveMember(requester *auth.User, circleID, targetUserID string) error
	RegenerateInvitationToken(user *auth.User, circleID string) (Circle, error)
	JoinByToken(user *auth.User, token string) (Circle, error)
	FindByInvitationToken(token string) (Circle, error)
}

type StaticCatalog struct {
	mu      sync.RWMutex
	circles []Circle
	members map[string][]CircleMember
	nextID  int
}

func NewStaticCatalog(cfg []config.Circle, authUser config.AuthUser, users []config.User) *StaticCatalog {
	circles := make([]Circle, 0, len(cfg))
	members := map[string][]CircleMember{}
	for _, item := range cfg {
		circles = append(circles, Circle{
			ID:                    item.ID,
			Name:                  item.Name,
			NameYomi:              item.NameYomi,
			GroupName:             item.GroupName,
			GroupNameYomi:         item.GroupNameYomi,
			ParticipationTypeID:   item.ParticipationTypeID,
			ParticipationTypeName: item.ParticipationTypeName,
			Tags:                  slices.Clone(item.Tags),
			InvitationToken:       item.ID + "-invite-token",
			UpdatedAt:             time.Now().UTC(),
			CanChangeGroupName:    true,
			Status: func() string {
				if item.Status == "" {
					return "pending"
				}
				return item.Status
			}(),
			Places: []string{},
		})
		members[item.ID] = []CircleMember{}
	}

	appendMember := func(circleID, userID, displayName string, isLeader bool) {
		members[circleID] = append(members[circleID], CircleMember{
			UserID:      userID,
			DisplayName: displayName,
			IsLeader:    isLeader,
		})
	}

	for _, user := range users {
		for _, circleID := range user.CircleIDs {
			appendMember(circleID, user.ID, user.DisplayName, slices.Contains(user.LeaderCircleIDs, circleID))
		}
	}
	return &StaticCatalog{
		circles: circles,
		members: members,
		nextID:  len(circles) + 1,
	}
}

func (c *StaticCatalog) ListSelectable(user *auth.User) ([]Circle, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if canAccessAllSelectableCircles(user) {
		return cloneCircles(c.circles), nil
	}
	if user == nil {
		return cloneCircles(c.circles), nil
	}

	selectable := make([]Circle, 0, len(c.circles))
	for _, circle := range c.circles {
		if !c.isCircleMemberLocked(circle.ID, user.ID) {
			continue
		}
		selectable = append(selectable, cloneCircle(circle))
	}

	return selectable, nil
}

func (c *StaticCatalog) FindSelectable(user *auth.User, circleID string) (Circle, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if canAccessAllSelectableCircles(user) {
		return c.findCircleLocked(circleID)
	}
	if user == nil {
		return c.findCircleLocked(circleID)
	}
	if !c.isCircleMemberLocked(circleID, user.ID) {
		return Circle{}, ErrNotFound
	}

	return c.findCircleLocked(circleID)
}

func (c *StaticCatalog) ListForStaff() ([]Circle, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	return cloneCircles(c.circles), nil
}

func (c *StaticCatalog) Find(circleID string) (Circle, error) {
	return c.FindSelectable(nil, circleID)
}

func (c *StaticCatalog) Create(name, nameYomi, groupName, groupNameYomi, participationTypeID, participationTypeName, notes string, tags []string, status, statusReason, _ string, placeIDs []string) (Circle, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if status == "" {
		status = "pending"
	}
	circle := Circle{
		ID:                    uuidv7.MustString(),
		Name:                  name,
		NameYomi:              nameYomi,
		GroupName:             groupName,
		GroupNameYomi:         groupNameYomi,
		ParticipationTypeID:   participationTypeID,
		ParticipationTypeName: participationTypeName,
		Tags:                  slices.Clone(tags),
		Notes:                 notes,
		UpdatedAt:             time.Now().UTC(),
		CanChangeGroupName:    true,
		Status:                status,
		StatusReason:          statusReason,
		Places:                slices.Clone(placeIDs),
	}
	c.nextID++
	c.circles = append(c.circles, circle)
	return cloneCircle(circle), nil
}

func (c *StaticCatalog) Update(circleID, name, nameYomi, groupName, groupNameYomi, participationTypeID, participationTypeName, notes string, tags []string, status, statusReason, _ string, placeIDs []string) (Circle, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if status == "" {
		status = "pending"
	}
	for index := range c.circles {
		if c.circles[index].ID != circleID {
			continue
		}
		c.circles[index].Name = name
		c.circles[index].NameYomi = nameYomi
		c.circles[index].GroupName = groupName
		c.circles[index].GroupNameYomi = groupNameYomi
		c.circles[index].ParticipationTypeID = participationTypeID
		c.circles[index].ParticipationTypeName = participationTypeName
		c.circles[index].Tags = slices.Clone(tags)
		c.circles[index].Notes = notes
		c.circles[index].Status = status
		c.circles[index].StatusReason = statusReason
		c.circles[index].Places = slices.Clone(placeIDs)
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
		delete(c.members, circleID)
		return nil
	}

	return ErrNotFound
}

func (c *StaticCatalog) GetUserCircle(user *auth.User, circleID string) (Circle, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if canAccessAllSelectableCircles(user) {
		return c.findCircleLocked(circleID)
	}
	if user == nil || !c.isCircleMemberLocked(circleID, user.ID) {
		return Circle{}, ErrNotFound
	}

	return c.findCircleLocked(circleID)
}

func (c *StaticCatalog) CreateForUser(user *auth.User, params CreateCircleParams) (Circle, error) {
	created, err := c.Create(params.Name, params.NameYomi, params.GroupName, params.GroupNameYomi, params.ParticipationTypeID, params.ParticipationTypeName, params.Notes, nil, "pending", "", "", nil)
	if err != nil {
		return Circle{}, err
	}

	created.CanChangeGroupName = params.CanChangeGroupName
	c.mu.Lock()
	defer c.mu.Unlock()
	for index := range c.circles {
		if c.circles[index].ID == created.ID {
			c.circles[index].CanChangeGroupName = params.CanChangeGroupName
			if user != nil && !c.isCircleMemberLocked(created.ID, user.ID) {
				c.members[created.ID] = append(c.members[created.ID], CircleMember{
					UserID:      user.ID,
					DisplayName: user.DisplayName,
					IsLeader:    true,
				})
				sortMembersForDisplay(c.members[created.ID])
			}
			return cloneCircle(c.circles[index]), nil
		}
	}

	return created, nil
}

func (c *StaticCatalog) UpdateForUser(user *auth.User, circleID string, params UpdateCircleParams) (Circle, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if user == nil || !c.isCircleLeaderLocked(circleID, user.ID) {
		return Circle{}, ErrForbidden
	}

	for index := range c.circles {
		if c.circles[index].ID != circleID {
			continue
		}
		c.circles[index].Name = params.Name
		c.circles[index].NameYomi = params.NameYomi
		c.circles[index].GroupName = params.GroupName
		c.circles[index].GroupNameYomi = params.GroupNameYomi
		c.circles[index].Notes = params.Notes
		c.circles[index].UpdatedAt = time.Now().UTC()
		return cloneCircle(c.circles[index]), nil
	}

	return Circle{}, ErrNotFound
}

func (c *StaticCatalog) DeleteForUser(user *auth.User, circleID string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if user == nil || !c.isCircleLeaderLocked(circleID, user.ID) {
		return ErrForbidden
	}

	for index := range c.circles {
		if c.circles[index].ID != circleID {
			continue
		}
		c.circles = append(c.circles[:index], c.circles[index+1:]...)
		delete(c.members, circleID)
		return nil
	}

	return ErrNotFound
}

func (c *StaticCatalog) Submit(user *auth.User, circleID string) (Circle, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if user == nil || !c.isCircleLeaderLocked(circleID, user.ID) {
		return Circle{}, ErrForbidden
	}

	now := time.Now()
	for index := range c.circles {
		if c.circles[index].ID != circleID {
			continue
		}
		if c.circles[index].SubmittedAt != nil {
			return Circle{}, ErrAlreadySubmitted
		}
		c.circles[index].SubmittedAt = &now
		return cloneCircle(c.circles[index]), nil
	}

	return Circle{}, ErrNotFound
}

func (c *StaticCatalog) ListMembers(circleID string) ([]CircleMember, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	return cloneMembers(c.members[circleID]), nil
}

func sortMembersForDisplay(members []CircleMember) {
	slices.SortFunc(members, func(left, right CircleMember) int {
		if left.IsLeader != right.IsLeader {
			if left.IsLeader {
				return -1
			}
			return 1
		}
		if left.DisplayName < right.DisplayName {
			return -1
		}
		if left.DisplayName > right.DisplayName {
			return 1
		}
		return 0
	})
}

func (c *StaticCatalog) AddMemberAsStaff(circleID, targetUserID, targetDisplayName string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	for _, member := range c.members[circleID] {
		if member.UserID == targetUserID {
			return ErrAlreadyMember
		}
	}

	c.members[circleID] = append(c.members[circleID], CircleMember{
		UserID:      targetUserID,
		DisplayName: targetDisplayName,
		IsLeader:    false,
	})
	sortMembersForDisplay(c.members[circleID])
	return nil
}

func (c *StaticCatalog) RemoveMemberAsStaff(circleID, targetUserID string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	for index, member := range c.members[circleID] {
		if member.UserID != targetUserID {
			continue
		}
		if member.IsLeader {
			return ErrForbidden
		}
		c.members[circleID] = append(c.members[circleID][:index], c.members[circleID][index+1:]...)
		return nil
	}
	return nil
}

func (c *StaticCatalog) AddMember(requester *auth.User, circleID, targetUserID, targetDisplayName string, verified bool) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	requesterIsLeader := false
	for _, member := range c.members[circleID] {
		if member.UserID == requester.ID && member.IsLeader {
			requesterIsLeader = true
			break
		}
	}
	if !requesterIsLeader {
		return ErrForbidden
	}
	if !verified {
		return ErrInviteeUnverified
	}
	for _, member := range c.members[circleID] {
		if member.UserID == targetUserID {
			return ErrAlreadyMember
		}
	}

	c.members[circleID] = append(c.members[circleID], CircleMember{
		UserID:      targetUserID,
		DisplayName: targetDisplayName,
		IsLeader:    false,
	})
	sortMembersForDisplay(c.members[circleID])
	return nil
}

func (c *StaticCatalog) RemoveMember(requester *auth.User, circleID, targetUserID string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	requesterIsLeader := false
	for _, member := range c.members[circleID] {
		if member.UserID == requester.ID && member.IsLeader {
			requesterIsLeader = true
			break
		}
	}

	isSelf := requester.ID == targetUserID
	if !requesterIsLeader && !isSelf {
		return ErrForbidden
	}

	for index, member := range c.members[circleID] {
		if member.UserID != targetUserID {
			continue
		}
		if member.IsLeader {
			return ErrForbidden
		}
		c.members[circleID] = append(c.members[circleID][:index], c.members[circleID][index+1:]...)
		return nil
	}
	return nil
}

func (c *StaticCatalog) RegenerateInvitationToken(user *auth.User, circleID string) (Circle, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	for index := range c.circles {
		if c.circles[index].ID != circleID {
			continue
		}
		requesterIsLeader := false
		for _, member := range c.members[circleID] {
			if member.UserID == user.ID && member.IsLeader {
				requesterIsLeader = true
				break
			}
		}
		if !requesterIsLeader {
			return Circle{}, ErrForbidden
		}
		c.circles[index].InvitationToken = c.circles[index].ID + "-invite-token-regenerated"
		return cloneCircle(c.circles[index]), nil
	}

	return Circle{}, ErrNotFound
}

func (c *StaticCatalog) JoinByToken(user *auth.User, token string) (Circle, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if user == nil {
		return Circle{}, ErrForbidden
	}

	for index := range c.circles {
		if c.circles[index].InvitationToken != token {
			continue
		}
		if c.isCircleMemberLocked(c.circles[index].ID, user.ID) {
			return Circle{}, ErrAlreadyMember
		}
		c.members[c.circles[index].ID] = append(c.members[c.circles[index].ID], CircleMember{
			UserID:      user.ID,
			DisplayName: user.DisplayName,
			IsLeader:    false,
		})
		sortMembersForDisplay(c.members[c.circles[index].ID])
		return cloneCircle(c.circles[index]), nil
	}

	return Circle{}, ErrNotFound
}

func (c *StaticCatalog) FindByInvitationToken(token string) (Circle, error) {
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
	value.Places = slices.Clone(value.Places)
	return value
}

func cloneMembers(values []CircleMember) []CircleMember {
	return append([]CircleMember{}, values...)
}

func (c *StaticCatalog) findCircleLocked(circleID string) (Circle, error) {
	for _, circle := range c.circles {
		if circle.ID == circleID {
			return cloneCircle(circle), nil
		}
	}

	return Circle{}, ErrNotFound
}

func (c *StaticCatalog) isCircleMemberLocked(circleID, userID string) bool {
	for _, member := range c.members[circleID] {
		if member.UserID == userID {
			return true
		}
	}

	return false
}

func (c *StaticCatalog) isCircleLeaderLocked(circleID, userID string) bool {
	for _, member := range c.members[circleID] {
		if member.UserID == userID && member.IsLeader {
			return true
		}
	}

	return false
}

func canAccessAllSelectableCircles(user *auth.User) bool {
	if user == nil {
		return true
	}

	for _, role := range user.Roles {
		switch role {
		case "admin", "content_manager", "forms_manager", "circle_manager", "user_manager":
			return true
		}
	}

	for _, permission := range user.Permissions {
		if strings.HasPrefix(permission, "staff.") {
			return true
		}
	}

	return false
}
