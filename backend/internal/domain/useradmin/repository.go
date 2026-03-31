package useradmin

import (
	"errors"
	"slices"
	"strconv"
	"strings"
	"sync"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

var ErrNotFound = errors.New("user not found")
var ErrConflict = errors.New("user conflict")

type User struct {
	ID                  string
	LastName            string
	LastNameReading     string
	FirstName           string
	FirstNameReading    string
	DisplayName         string
	LoginIDs            []string
	ContactEmail        string
	PhoneNumber         string
	Roles               []string
	Permissions         []string
	CircleIDs           []string
	LeaderCircleIDs     []string
	IsVerified          bool
	IsEmailVerified     bool
	IsUnivemailVerified bool
}

type CreateParams struct {
	ID                  string
	LastName            string
	LastNameReading     string
	FirstName           string
	FirstNameReading    string
	DisplayName         string
	LoginIDs            []string
	ContactEmail        string
	PhoneNumber         string
	PasswordHash        string
	Roles               []string
	Permissions         []string
	IsVerified          bool
	IsEmailVerified     bool
	IsUnivemailVerified bool
}

type Repository interface {
	List() ([]User, error)
	ListByQuery(query string) ([]User, error)
	Find(userID string) (User, error)
	FindByLoginID(loginID string) (User, error)
	FindByContactEmail(contactEmail string) (User, error)
	Create(params CreateParams) (User, error)
	Update(userID, displayName string, loginIDs []string) (User, error)
	UpdateFull(userID, displayName string, loginIDs []string, lastName, lastNameReading, firstName, firstNameReading, contactEmail, phoneNumber string) (User, error)
	UpdateDisplayName(userID, displayName string) (User, error)
	UpdateProfile(userID, lastName, lastNameReading, firstName, firstNameReading, contactEmail, phoneNumber string) (User, error)
	UpdateRoles(userID string, roles []string) (User, error)
	UpdatePermissions(userID string, permissions []string) (User, error)
	UpdateVerified(userID string, verified bool) (User, error)
	UpdateEmailVerified(userID string, verified bool) (User, error)
	UpdateUnivemailVerified(userID string, verified bool) (User, error)
	Delete(userID string) error
	ListByCircleIDs(circleIDs []string) ([]User, error)
	ListLeadersByCircleIDs(circleIDs []string) ([]User, error)
	ListVerifiedByCircleIDs(circleIDs []string) ([]User, error)
	ListVerifiedLeadersByCircleIDs(circleIDs []string) ([]User, error)
}

type StaticRepository struct {
	mu     sync.RWMutex
	users  []User
	nextID int
}

func NewStaticRepository(authUser config.AuthUser, users []config.User) *StaticRepository {
	built := make([]User, 0, len(users)+1)
	matchedAuthUserIndex := slices.IndexFunc(users, func(user config.User) bool {
		return user.ID == authUser.ID
	})
	authCircleIDs := []string{}
	authLeaderCircleIDs := []string{}
	authIsVerified := true
	authLastName := ""
	authLastNameReading := ""
	authFirstName := ""
	authFirstNameReading := ""
	authContactEmail := ""
	authPhoneNumber := ""
	authIsEmailVerified := false
	authIsUnivemailVerified := false
	if matchedAuthUserIndex >= 0 {
		matched := users[matchedAuthUserIndex]
		authCircleIDs = slices.Clone(matched.CircleIDs)
		authLeaderCircleIDs = slices.Clone(matched.LeaderCircleIDs)
		authIsVerified = matched.IsVerified
		authLastName = matched.LastName
		authLastNameReading = matched.LastNameReading
		authFirstName = matched.FirstName
		authFirstNameReading = matched.FirstNameReading
		authContactEmail = matched.ContactEmail
		authPhoneNumber = matched.PhoneNumber
		authIsEmailVerified = matched.IsEmailVerified
		authIsUnivemailVerified = matched.IsUnivemailVerified
	}
	built = append(built, User{
		ID:                  authUser.ID,
		LastName:            authLastName,
		LastNameReading:     authLastNameReading,
		FirstName:           authFirstName,
		FirstNameReading:    authFirstNameReading,
		DisplayName:         authUser.DisplayName,
		LoginIDs:            slices.Clone(authUser.LoginIDs),
		ContactEmail:        authContactEmail,
		PhoneNumber:         authPhoneNumber,
		Roles:               slices.Clone(authUser.Roles),
		Permissions:         slices.Clone(authUser.Permissions),
		CircleIDs:           authCircleIDs,
		LeaderCircleIDs:     authLeaderCircleIDs,
		IsVerified:          authIsVerified,
		IsEmailVerified:     authIsEmailVerified,
		IsUnivemailVerified: authIsUnivemailVerified,
	})
	for _, user := range users {
		if user.ID == authUser.ID {
			continue
		}
		built = append(built, User{
			ID:                  user.ID,
			LastName:            user.LastName,
			LastNameReading:     user.LastNameReading,
			FirstName:           user.FirstName,
			FirstNameReading:    user.FirstNameReading,
			DisplayName:         user.DisplayName,
			LoginIDs:            slices.Clone(user.LoginIDs),
			ContactEmail:        user.ContactEmail,
			PhoneNumber:         user.PhoneNumber,
			Roles:               slices.Clone(user.Roles),
			Permissions:         slices.Clone(user.Permissions),
			CircleIDs:           slices.Clone(user.CircleIDs),
			LeaderCircleIDs:     slices.Clone(user.LeaderCircleIDs),
			IsVerified:          user.IsVerified,
			IsEmailVerified:     user.IsEmailVerified,
			IsUnivemailVerified: user.IsUnivemailVerified,
		})
	}

	return &StaticRepository{
		users:  built,
		nextID: len(built) + 1,
	}
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

func (r *StaticRepository) ListByQuery(query string) ([]User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if strings.TrimSpace(query) == "" {
		users := make([]User, 0, len(r.users))
		for _, user := range r.users {
			users = append(users, cloneUser(user))
		}
		return users, nil
	}

	q := strings.ToLower(strings.TrimSpace(query))
	filtered := make([]User, 0)
	for _, u := range r.users {
		target := strings.ToLower(strings.Join([]string{
			u.ID, u.DisplayName, u.LastName, u.FirstName,
			strings.Join(u.LoginIDs, " "),
			u.ContactEmail,
		}, " "))
		if strings.Contains(target, q) {
			filtered = append(filtered, cloneUser(u))
		}
	}

	return filtered, nil
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

func (r *StaticRepository) FindByLoginID(loginID string) (User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, user := range r.users {
		for _, current := range user.LoginIDs {
			if current == loginID {
				return cloneUser(user), nil
			}
		}
	}

	return User{}, ErrNotFound
}

func (r *StaticRepository) FindByContactEmail(contactEmail string) (User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	normalized := strings.TrimSpace(strings.ToLower(contactEmail))
	for _, user := range r.users {
		if strings.ToLower(strings.TrimSpace(user.ContactEmail)) == normalized {
			return cloneUser(user), nil
		}
	}

	return User{}, ErrNotFound
}

func (r *StaticRepository) Create(params CreateParams) (User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, current := range r.users {
		if hasLoginIDConflict(current.LoginIDs, params.LoginIDs) {
			return User{}, ErrConflict
		}
		if strings.EqualFold(strings.TrimSpace(current.ContactEmail), strings.TrimSpace(params.ContactEmail)) {
			return User{}, ErrConflict
		}
	}

	id := strings.TrimSpace(params.ID)
	if id == "" {
		id = "user-generated-" + strconv.Itoa(r.nextID)
		r.nextID++
	}

	created := User{
		ID:                  id,
		LastName:            params.LastName,
		LastNameReading:     params.LastNameReading,
		FirstName:           params.FirstName,
		FirstNameReading:    params.FirstNameReading,
		DisplayName:         params.DisplayName,
		LoginIDs:            slices.Clone(params.LoginIDs),
		ContactEmail:        params.ContactEmail,
		PhoneNumber:         params.PhoneNumber,
		Roles:               slices.Clone(params.Roles),
		Permissions:         slices.Clone(params.Permissions),
		CircleIDs:           []string{},
		LeaderCircleIDs:     []string{},
		IsVerified:          params.IsVerified,
		IsEmailVerified:     params.IsEmailVerified,
		IsUnivemailVerified: params.IsUnivemailVerified,
	}

	r.users = append(r.users, created)
	return cloneUser(created), nil
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

func (r *StaticRepository) UpdateFull(userID, displayName string, loginIDs []string, lastName, lastNameReading, firstName, firstNameReading, contactEmail, phoneNumber string) (User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.users {
		if r.users[index].ID == userID {
			for otherIndex := range r.users {
				if otherIndex == index {
					continue
				}
				if hasLoginIDConflict(r.users[otherIndex].LoginIDs, loginIDs) {
					return User{}, ErrConflict
				}
			}
			r.users[index].DisplayName = displayName
			r.users[index].LoginIDs = slices.Clone(loginIDs)
			r.users[index].LastName = lastName
			r.users[index].LastNameReading = lastNameReading
			r.users[index].FirstName = firstName
			r.users[index].FirstNameReading = firstNameReading
			r.users[index].ContactEmail = contactEmail
			r.users[index].PhoneNumber = phoneNumber
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

func (r *StaticRepository) UpdateProfile(userID, lastName, lastNameReading, firstName, firstNameReading, contactEmail, phoneNumber string) (User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.users {
		if r.users[index].ID != userID {
			continue
		}
		r.users[index].LastName = lastName
		r.users[index].LastNameReading = lastNameReading
		r.users[index].FirstName = firstName
		r.users[index].FirstNameReading = firstNameReading
		r.users[index].ContactEmail = contactEmail
		r.users[index].PhoneNumber = phoneNumber
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

func (r *StaticRepository) UpdateEmailVerified(userID string, verified bool) (User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.users {
		if r.users[index].ID != userID {
			continue
		}
		r.users[index].IsEmailVerified = verified
		return cloneUser(r.users[index]), nil
	}

	return User{}, ErrNotFound
}

func (r *StaticRepository) UpdateUnivemailVerified(userID string, verified bool) (User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index := range r.users {
		if r.users[index].ID != userID {
			continue
		}
		r.users[index].IsUnivemailVerified = verified
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
