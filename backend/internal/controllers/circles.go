package controllers

// circles.go - Type definitions for circle-related responses and requests.
// Endpoint handlers are in circles_handlers.go.
// Registration response/build helpers are in circles_registration.go.
// Membership/validation/helper utilities are in circles_helpers.go.

type selectableCircleResponse struct {
	ID                    string `json:"id"`
	Name                  string `json:"name"`
	GroupName             string `json:"groupName"`
	ParticipationTypeName string `json:"participationTypeName"`
}

type setCurrentCircleRequest struct {
	CircleID string `json:"circleId"`
}

type circleDetailResponse struct {
	ID                    string              `json:"id"`
	Name                  string              `json:"name"`
	NameYomi              string              `json:"nameYomi"`
	GroupName             string              `json:"groupName"`
	GroupNameYomi         string              `json:"groupNameYomi"`
	ParticipationTypeID   string              `json:"participationTypeId"`
	ParticipationTypeName string              `json:"participationTypeName"`
	FormID                string              `json:"formId"`
	Notes                 string              `json:"notes"`
	LeaderDisplayName     string              `json:"leaderDisplayName"`
	CanChangeGroupName    bool                `json:"canChangeGroupName"`
	IsLeader              bool                `json:"isLeader"`
	LastUpdatedAt         string              `json:"lastUpdatedAt"`
	UsersCountMin         int32               `json:"usersCountMin"`
	UsersCountMax         int32               `json:"usersCountMax"`
	MemberCount           int                 `json:"memberCount"`
	CanSubmit             bool                `json:"canSubmit"`
	FormDescription       string              `json:"formDescription"`
	ConfirmationMessage   string              `json:"confirmationMessage"`
	Questions             []staffFormQuestion `json:"questions"`
	Answer                *formAnswerResponse `json:"answer"`
	InvitationToken       string              `json:"invitationToken"`
	SubmittedAt           *string             `json:"submittedAt"`
	Status                string              `json:"status"`
}

type circleMemberResponse struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
	IsLeader    bool   `json:"isLeader"`
}

type createCircleRequest struct {
	Name                string         `json:"name"`
	NameYomi            string         `json:"nameYomi"`
	GroupName           string         `json:"groupName"`
	GroupNameYomi       string         `json:"groupNameYomi"`
	ParticipationTypeID string         `json:"participationTypeId"`
	Notes               string         `json:"notes"`
	Details             map[string]any `json:"details"`
}

type updateCircleRequest struct {
	Name          string         `json:"name"`
	NameYomi      string         `json:"nameYomi"`
	GroupName     string         `json:"groupName"`
	GroupNameYomi string         `json:"groupNameYomi"`
	Notes         string         `json:"notes"`
	Details       map[string]any `json:"details"`
}

type submitCurrentCircleRequest struct {
	LastUpdatedAt string `json:"lastUpdatedAt"`
}
