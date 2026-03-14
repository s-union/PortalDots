package useradmin

import (
	"errors"
	"slices"
	"sync"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

var ErrNotFound = errors.New("user not found")
var ErrConflict = errors.New("user conflict")

type User struct {
	ID              string
	DisplayName     string
	LoginIDs        []string
	Roles           []string
	Permissions     []string
	CircleIDs       []string
	LeaderCircleIDs []string
	IsVerified      bool
}

type Repository interface {
	List() ([]User, error)
	Find(userID string) (User, error)
	Update(userID, displayName string, loginIDs []string) (User, error)
	UpdateDisplayName(userID, displayName string) (User, error)
	UpdateRoles(userID string, roles []string) (User, error)
	UpdatePermissions(userID string, permissions []string) (User, error)
	UpdateVerified(userID string, verified bool) (User, error)
	Delete(userID string) error
	ListByCircleIDs(circleIDs []string) ([]User, error)
	ListLeadersByCircleIDs(circleIDs []string) ([]User, error)
	ListVerifiedByCircleIDs(circleIDs []string) ([]User, error)
	ListVerifiedLeadersByCircleIDs(circleIDs []string) ([]User, error)
}

type StaticRepository struct {
	mu    sync.RWMutex
	users []User
}

func NewStaticRepository(authUser config.AuthUser, users []config.User) *StaticRepository {
	built := make([]User, 0, len(users)+1)
	built = append(built, User{
		ID:              authUser.ID,
		DisplayName:     authUser.DisplayName,
		LoginIDs:        slices.Clone(authUser.LoginIDs),
		Roles:           slices.Clone(authUser.Roles),
		Permissions:     slices.Clone(authUser.Permissions),
		CircleIDs:       []string{},
		LeaderCircleIDs: []string{},
		IsVerified:      true,
	})
	for _, user := range users {
		built = append(built, User{
			ID:              user.ID,
			DisplayName:     user.DisplayName,
			LoginIDs:        slices.Clone(user.LoginIDs),
			Roles:           slices.Clone(user.Roles),
			Permissions:     slices.Clone(user.Permissions),
			CircleIDs:       slices.Clone(user.CircleIDs),
			LeaderCircleIDs: slices.Clone(user.LeaderCircleIDs),
			IsVerified:      user.IsVerified,
		})
	}

	return &StaticRepository{users: built}
}

func (r *StaticRepository) List() ([]User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	users := make([]User, 0, len(r.users))
	for _, user := range r.users {
		users = append(users, cloneUser(user))
	}

	return users, nil
}

func (r *StaticRepository) Find(userID string) (User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, user := range r.users {
		if user.ID == userID {
			return cloneUser(user), nil
		}
	}

	return User{}, ErrNotFound
}

func (r *StaticRepository) UpdateRoles(userID string, roles []string) (User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.users {
		if r.users[index].ID != userID {
			continue
		}
		r.users[index].Roles = slices.Clone(roles)
		return cloneUser(r.users[index]), nil
	}

	return User{}, ErrNotFound
}

func (r *StaticRepository) Update(userID, displayName string, loginIDs []string) (User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.users {
		if r.users[index].ID == userID {
			for otherIndex := range r.users {
				if r.users[otherIndex].ID == userID {
					continue
				}
				if hasLoginIDConflict(r.users[otherIndex].LoginIDs, loginIDs) {
					return User{}, ErrConflict
				}
			}
			r.users[index].DisplayName = displayName
			r.users[index].LoginIDs = slices.Clone(loginIDs)
			return cloneUser(r.users[index]), nil
		}
	}

	return User{}, ErrNotFound
}

func (r *StaticRepository) UpdatePermissions(userID string, permissions []string) (User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.users {
		if r.users[index].ID != userID {
			continue
		}
		r.users[index].Permissions = slices.Clone(permissions)
		return cloneUser(r.users[index]), nil
	}

	return User{}, ErrNotFound
}

func (r *StaticRepository) UpdateDisplayName(userID, displayName string) (User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.users {
		if r.users[index].ID != userID {
			continue
		}
		r.users[index].DisplayName = displayName
		return cloneUser(r.users[index]), nil
	}

	return User{}, ErrNotFound
}

func (r *StaticRepository) UpdateVerified(userID string, verified bool) (User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.users {
		if r.users[index].ID != userID {
			continue
		}
		r.users[index].IsVerified = verified
		return cloneUser(r.users[index]), nil
	}

	return User{}, ErrNotFound
}

func (r *StaticRepository) Delete(userID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.users {
		if r.users[index].ID != userID {
			continue
		}
		r.users = append(r.users[:index], r.users[index+1:]...)
		return nil
	}

	return ErrNotFound
}

func (r *StaticRepository) ListByCircleIDs(circleIDs []string) ([]User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	users := make([]User, 0, len(r.users))
	for _, user := range r.users {
		if len(circleIDs) > 0 && !intersects(user.CircleIDs, circleIDs) {
			continue
		}
		users = append(users, cloneUser(user))
	}

	return users, nil
}

func (r *StaticRepository) ListLeadersByCircleIDs(circleIDs []string) ([]User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	users := make([]User, 0, len(r.users))
	for _, user := range r.users {
		if len(circleIDs) > 0 && !intersects(user.LeaderCircleIDs, circleIDs) {
			continue
		}
		users = append(users, cloneUser(user))
	}

	return users, nil
}

func (r *StaticRepository) ListVerifiedByCircleIDs(circleIDs []string) ([]User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	users := make([]User, 0, len(r.users))
	for _, user := range r.users {
		if !user.IsVerified {
			continue
		}
		if len(circleIDs) > 0 && !intersects(user.CircleIDs, circleIDs) {
			continue
		}
		users = append(users, cloneUser(user))
	}

	return users, nil
}

func (r *StaticRepository) ListVerifiedLeadersByCircleIDs(circleIDs []string) ([]User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	users := make([]User, 0, len(r.users))
	for _, user := range r.users {
		if !user.IsVerified {
			continue
		}
		if len(circleIDs) > 0 && !intersects(user.LeaderCircleIDs, circleIDs) {
			continue
		}
		users = append(users, cloneUser(user))
	}

	return users, nil
}

func cloneUser(user User) User {
	user.LoginIDs = slices.Clone(user.LoginIDs)
	user.Roles = slices.Clone(user.Roles)
	user.Permissions = slices.Clone(user.Permissions)
	user.CircleIDs = slices.Clone(user.CircleIDs)
	user.LeaderCircleIDs = slices.Clone(user.LeaderCircleIDs)
	return user
}

func intersects(values []string, targets []string) bool {
	for _, value := range values {
		for _, target := range targets {
			if value == target {
				return true
			}
		}
	}

	return false
}

func hasLoginIDConflict(existing []string, candidates []string) bool {
	for _, candidate := range candidates {
		for _, current := range existing {
			if candidate == current {
				return true
			}
		}
	}

	return false
}
