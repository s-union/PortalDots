package circle

import (
	"context"
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
	ListSelectable(ctx context.Context, user *auth.User) ([]Circle, error)
	FindSelectable(ctx context.Context, user *auth.User, circleID string) (Circle, error)
	ListForStaff(ctx context.Context) ([]Circle, error)
	Find(ctx context.Context, circleID string) (Circle, error)
	Create(ctx context.Context, name, nameYomi, groupName, groupNameYomi, participationTypeID, participationTypeName, notes string, tags []string, status, statusReason, setByUserID string, placeIDs []string) (Circle, error)
	Update(ctx context.Context, circleID, name, nameYomi, groupName, groupNameYomi, participationTypeID, participationTypeName, notes string, tags []string, status, statusReason, setByUserID string, placeIDs []string) (Circle, error)
	UpdateTags(ctx context.Context, circleID string, tags []string) (Circle, error)
	Delete(ctx context.Context, circleID string) error

	// Workspace user-facing methods
	GetUserCircle(ctx context.Context, user *auth.User, circleID string) (Circle, error)
	CreateForUser(ctx context.Context, user *auth.User, params CreateCircleParams) (Circle, error)
	UpdateForUser(ctx context.Context, user *auth.User, circleID string, params UpdateCircleParams) (Circle, error)
	DeleteForUser(ctx context.Context, user *auth.User, circleID string) error
	Submit(ctx context.Context, user *auth.User, circleID string) (Circle, error)
	SubmitByStaff(ctx context.Context, circleID string) error
	ListMembers(ctx context.Context, circleID string) ([]CircleMember, error)
	AddMemberAsStaff(ctx context.Context, circleID, targetUserID, targetDisplayName string) error
	RemoveMemberAsStaff(ctx context.Context, circleID, targetUserID string) error
	AddMember(ctx context.Context, requester *auth.User, circleID, targetUserID, targetDisplayName string, verified bool) error
	RemoveMember(ctx context.Context, requester *auth.User, circleID, targetUserID string) error
	RegenerateInvitationToken(ctx context.Context, user *auth.User, circleID string) (Circle, error)
	JoinByToken(ctx context.Context, user *auth.User, token string) (Circle, error)
	FindByInvitationToken(ctx context.Context, token string) (Circle, error)
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

func (c *StaticCatalog) ListSelectable(_ context.Context, user *auth.User) ([]Circle, error) {
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

func (c *StaticCatalog) FindSelectable(_ context.Context, user *auth.User, circleID string) (Circle, error) {
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

func (c *StaticCatalog) ListForStaff(_ context.Context) ([]Circle, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	return cloneCircles(c.circles), nil
}

func (c *StaticCatalog) Find(ctx context.Context, circleID string) (Circle, error) {
	return c.FindSelectable(ctx, nil, circleID)
}

func (c *StaticCatalog) Create(_ context.Context, name, nameYomi, groupName, groupNameYomi, participationTypeID, participationTypeName, notes string, tags []string, status, statusReason, _ string, placeIDs []string) (Circle, error) {
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

func (c *StaticCatalog) Update(_ context.Context, circleID, name, nameYomi, groupName, groupNameYomi, participationTypeID, participationTypeName, notes string, tags []string, status, statusReason, _ string, placeIDs []string) (Circle, error) {
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

func (c *StaticCatalog) UpdateTags(_ context.Context, circleID string, tags []string) (Circle, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	for index := range c.circles {
		if c.circles[index].ID != circleID {
			continue
		}
		c.circles[index].Tags = slices.Clone(tags)
		return cloneCircle(c.circles[index]), nil
	}

	return Circle{}, ErrNotFound
}

func (c *StaticCatalog) Delete(_ context.Context, circleID string) error {
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

func (c *StaticCatalog) GetUserCircle(_ context.Context, user *auth.User, circleID string) (Circle, error) {
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

func (c *StaticCatalog) CreateForUser(_ context.Context, user *auth.User, params CreateCircleParams) (Circle, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	circle := Circle{
		ID:                    uuidv7.MustString(),
		Name:                  params.Name,
		NameYomi:              params.NameYomi,
		GroupName:             params.GroupName,
		GroupNameYomi:         params.GroupNameYomi,
		ParticipationTypeID:   params.ParticipationTypeID,
		ParticipationTypeName: params.ParticipationTypeName,
		Notes:                 params.Notes,
		UpdatedAt:             time.Now().UTC(),
		CanChangeGroupName:    params.CanChangeGroupName,
		Status:                "pending",
	}
	c.nextID++
	c.circles = append(c.circles, circle)

	if user != nil {
		c.members[circle.ID] = []CircleMember{{
			UserID:      user.ID,
			DisplayName: user.DisplayName,
			IsLeader:    true,
		}}
	}

	return cloneCircle(circle), nil
}

func (c *StaticCatalog) UpdateForUser(_ context.Context, user *auth.User, circleID string, params UpdateCircleParams) (Circle, error) {
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

func (c *StaticCatalog) DeleteForUser(_ context.Context, user *auth.User, circleID string) error {
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

func (c *StaticCatalog) Submit(_ context.Context, user *auth.User, circleID string) (Circle, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if user == nil || !c.isCircleLeaderLocked(circleID, user.ID) {
		return Circle{}, ErrForbidden
	}

	now := time.Now().UTC()
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

func (c *StaticCatalog) SubmitByStaff(_ context.Context, circleID string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now().UTC()
	for index := range c.circles {
		if c.circles[index].ID != circleID {
			continue
		}
		if c.circles[index].SubmittedAt != nil {
			return nil
		}
		c.circles[index].SubmittedAt = &now
		return nil
	}

	return ErrNotFound
}

func (c *StaticCatalog) ListMembers(_ context.Context, circleID string) ([]CircleMember, error) {
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

func (c *StaticCatalog) AddMemberAsStaff(_ context.Context, circleID, targetUserID, targetDisplayName string) error {
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

func (c *StaticCatalog) RemoveMemberAsStaff(_ context.Context, circleID, targetUserID string) error {
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

func (c *StaticCatalog) AddMember(_ context.Context, requester *auth.User, circleID, targetUserID, targetDisplayName string, verified bool) error {
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

func (c *StaticCatalog) RemoveMember(_ context.Context, requester *auth.User, circleID, targetUserID string) error {
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

func (c *StaticCatalog) RegenerateInvitationToken(_ context.Context, user *auth.User, circleID string) (Circle, error) {
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

func (c *StaticCatalog) JoinByToken(_ context.Context, user *auth.User, token string) (Circle, error) {
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

func (c *StaticCatalog) FindByInvitationToken(_ context.Context, token string) (Circle, error) {
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
