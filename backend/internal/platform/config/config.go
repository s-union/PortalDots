package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	DefaultSessionTTLSeconds = 12 * 60 * 60
	defaultAuthPassword      = "demo-admin"
	defaultStaffVerifyCode   = "123456"
	demoAdminUserID          = "0195ec00-0051-7000-8000-000000000001"
	demoStaffUserID          = "0195ec00-0052-7000-8000-000000000001"
	demoStaffSubUserID       = "0195ec00-0053-7000-8000-000000000001"
	demoCircleUserID         = "0195ec00-0054-7000-8000-000000000001"
	demoCircleSubUserID      = "0195ec00-0055-7000-8000-000000000001"
	demoCircleUnverifiedID   = "0195ec00-0056-7000-8000-000000000001"
)

type Config struct {
	BindAddress               string
	DatabaseURL               string
	MigrationsDir             string
	AllowInsecureDefaults     bool
	SyncAuthUserOnStartup     bool
	SessionCookieName         string
	SessionCookieSecure       bool
	SessionTTL                time.Duration
	AppName                   string
	PortalDescription         string
	AppURL                    string
	AppForceHTTPS             bool
	PortalAdminName           string
	PortalContactEmail        string
	PortalUnivemailLocalPart  string
	PortalUnivemailDomainPart string
	PortalStudentIDName       string
	PortalUnivemailName       string
	PortalPrimaryColorH       int
	PortalPrimaryColorS       int
	PortalPrimaryColorL       int
	RegistrationVerifyTTL     time.Duration
	SMTPHost                  string
	SMTPPort                  int
	SMTPUsername              string
	SMTPPassword              string
	SMTPFrom                  string
	AuthUser                  AuthUser
	Users                     []User
	StaffVerifyCode           string
	ParticipationTypes        []ParticipationType
	Circles                   []Circle
	Pages                     []Page
	Documents                 []Document
	Forms                     []Form
	Tags                      []Tag
	Places                    []Place
	Booths                    []BoothAssignment
	ContactCategories         []ContactCategory
	authPasswordProvided      bool
	staffVerifyCodeProvided   bool
}

type AuthUser struct {
	ID          string
	LoginIDs    []string
	DisplayName string
	Password    string
	Roles       []string
	Permissions []string
}

type User struct {
	ID                  string
	LoginIDs            []string
	LastName            string
	LastNameReading     string
	FirstName           string
	FirstNameReading    string
	DisplayName         string
	Password            string
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

type Circle struct {
	ID                    string
	Name                  string
	NameYomi              string
	GroupName             string
	GroupNameYomi         string
	ParticipationTypeID   string
	ParticipationTypeName string
	Tags                  []string
	Status                string
}

type ParticipationType struct {
	ID            string
	Name          string
	Description   string
	UsersCountMin int32
	UsersCountMax int32
	Tags          []string
	FormID        string
}

type Page struct {
	ID           string
	Title        string
	Body         string
	Notes        string
	IsPinned     bool
	IsPublic     bool
	ViewableTags []string
	DocumentIDs  []string
	CreatedAt    string
	UpdatedAt    string
}

type Document struct {
	ID          string
	CircleID    string
	Name        string
	Description string
	Notes       string
	IsPublic    bool
	IsImportant bool
	Filename    string
	MimeType    string
	Content     string
	CreatedAt   string
	UpdatedAt   string
}

type Form struct {
	ID                  string
	CircleID            string
	Name                string
	Description         string
	IsPublic            bool
	IsOpen              bool
	OpenAt              string
	CloseAt             string
	CreatedAt           string
	UpdatedAt           string
	MaxAnswers          int32
	AnswerableTags      []string
	ConfirmationMessage string
}

type Tag struct {
	ID   string
	Name string
}

type Place struct {
	ID    string
	Name  string
	Type  int
	Notes string
}

type BoothAssignment struct {
	PlaceID  string
	CircleID string
}

type ContactCategory struct {
	ID    string
	Name  string
	Email string
}

func defaultDemoAuthUser() AuthUser {
	return AuthUser{
		ID:          demoAdminUserID,
		LoginIDs:    []string{"demo-admin"},
		DisplayName: "Demo Admin",
		Password:    defaultAuthPassword,
		Roles:       []string{"admin"},
		Permissions: []string{},
	}
}

func defaultDemoUsers() []User {
	return []User{
		{
			ID:                  demoStaffUserID,
			LoginIDs:            []string{"demo-staff"},
			LastName:            "デモ",
			LastNameReading:     "でも",
			FirstName:           "スタッフ",
			FirstNameReading:    "すたっふ",
			DisplayName:         "Demo Staff",
			Password:            "demo-staff",
			ContactEmail:        "demo-staff@example.com",
			PhoneNumber:         "090-0000-0001",
			Roles:               []string{"content_manager"},
			Permissions:         []string{"staff.users", "staff.circles", "staff.forms", "staff.permissions"},
			CircleIDs:           []string{},
			LeaderCircleIDs:     []string{},
			IsVerified:          true,
			IsEmailVerified:     true,
			IsUnivemailVerified: true,
		},
		{
			ID:                  demoStaffSubUserID,
			LoginIDs:            []string{"demo-staff-sub"},
			LastName:            "デモ",
			LastNameReading:     "でも",
			FirstName:           "サブスタッフ",
			FirstNameReading:    "さぶすたっふ",
			DisplayName:         "Demo Staff Sub",
			Password:            "demo-staff-sub",
			ContactEmail:        "demo-staff-sub@example.com",
			PhoneNumber:         "090-0000-0002",
			Roles:               []string{"content_manager"},
			Permissions:         []string{"staff.users", "staff.circles", "staff.forms", "staff.permissions"},
			CircleIDs:           []string{},
			LeaderCircleIDs:     []string{},
			IsVerified:          true,
			IsEmailVerified:     true,
			IsUnivemailVerified: true,
		},
		{
			ID:                  demoCircleUserID,
			LoginIDs:            []string{"demo-circle"},
			LastName:            "デモ",
			LastNameReading:     "でも",
			FirstName:           "サークル",
			FirstNameReading:    "さーくる",
			DisplayName:         "Demo Circle",
			Password:            "demo-circle",
			ContactEmail:        "demo-circle@example.com",
			PhoneNumber:         "090-0000-0003",
			Roles:               []string{"participant"},
			Permissions:         []string{},
			CircleIDs:           []string{"0195ec00-0021-7000-8000-000000000001", "0195ec00-0022-7000-8000-000000000001"},
			LeaderCircleIDs:     []string{"0195ec00-0021-7000-8000-000000000001", "0195ec00-0022-7000-8000-000000000001"},
			IsVerified:          true,
			IsEmailVerified:     true,
			IsUnivemailVerified: true,
		},
		{
			ID:                  demoCircleSubUserID,
			LoginIDs:            []string{"demo-circle-sub"},
			LastName:            "デモ",
			LastNameReading:     "でも",
			FirstName:           "サブ",
			FirstNameReading:    "さぶ",
			DisplayName:         "Demo Circle Sub",
			Password:            "demo-circle-sub",
			ContactEmail:        "demo-circle-sub@example.com",
			PhoneNumber:         "090-0000-0004",
			Roles:               []string{"participant"},
			Permissions:         []string{},
			CircleIDs:           []string{"0195ec00-0022-7000-8000-000000000001"},
			LeaderCircleIDs:     []string{"0195ec00-0022-7000-8000-000000000001"},
			IsVerified:          true,
			IsEmailVerified:     true,
			IsUnivemailVerified: true,
		},
		{
			ID:                  demoCircleUnverifiedID,
			LoginIDs:            []string{"0195ec00-0022-7000-8000-000000000001-unverified@example.com"},
			LastName:            "未確認",
			LastNameReading:     "みかくにん",
			FirstName:           "メンバー",
			FirstNameReading:    "めんばー",
			DisplayName:         "Circle B Unverified Member",
			Password:            "password",
			ContactEmail:        "0195ec00-0022-7000-8000-000000000001-unverified@example.com",
			PhoneNumber:         "",
			Roles:               []string{"participant"},
			Permissions:         []string{},
			CircleIDs:           []string{"0195ec00-0022-7000-8000-000000000001"},
			LeaderCircleIDs:     []string{},
			IsVerified:          false,
			IsEmailVerified:     false,
			IsUnivemailVerified: false,
		},
	}
}

func FromEnv() Config {
	authPassword, authPasswordProvided := getenvWithPresence("PORTALDOTS_AUTH_PASSWORD", defaultAuthPassword)
	staffVerifyCode, staffVerifyCodeProvided := getenvWithPresence("PORTALDOTS_STAFF_VERIFY_CODE", defaultStaffVerifyCode)
	defaultAuthUser := defaultDemoAuthUser()

	return Config{
		BindAddress:               getenv("PORTALDOTS_API_BIND", ":8081"),
		DatabaseURL:               getenv("PORTALDOTS_DATABASE_URL", ""),
		MigrationsDir:             getenv("PORTALDOTS_MIGRATIONS_DIR", "db/migrations"),
		AllowInsecureDefaults:     getenv("PORTALDOTS_ALLOW_INSECURE_DEFAULTS", "") == "true",
		SyncAuthUserOnStartup:     getenv("PORTALDOTS_SYNC_AUTH_USER_ON_STARTUP", "") == "true",
		SessionCookieName:         getenv("PORTALDOTS_SESSION_COOKIE", "portaldots_session"),
		SessionCookieSecure:       getenv("PORTALDOTS_SESSION_COOKIE_SECURE", "") == "true",
		SessionTTL:                time.Duration(getenvInt("PORTALDOTS_SESSION_TTL_SECONDS", DefaultSessionTTLSeconds)) * time.Second,
		AppName:                   getenv("APP_NAME", "PortalDots"),
		PortalDescription:         getenv("PORTAL_DESCRIPTION", "学園祭参加団体向けポータル"),
		AppURL:                    getenv("APP_URL", "http://127.0.0.1:8080"),
		AppForceHTTPS:             getenv("APP_FORCE_HTTPS", "") == "true",
		PortalAdminName:           getenv("PORTAL_ADMIN_NAME", "PortalDots 実行委員会"),
		PortalContactEmail:        getenv("PORTAL_CONTACT_EMAIL", "contact@example.com"),
		PortalUnivemailLocalPart:  getenv("PORTAL_UNIVEMAIL_LOCAL_PART", "student_id"),
		PortalUnivemailDomainPart: getenv("PORTAL_UNIVEMAIL_DOMAIN_PART", "example.ac.jp"),
		PortalStudentIDName:       getenv("PORTAL_STUDENT_ID_NAME", "学籍番号"),
		PortalUnivemailName:       getenv("PORTAL_UNIVEMAIL_NAME", "大学メールアドレス"),
		PortalPrimaryColorH:       getenvInt("PORTAL_PRIMARY_COLOR_H", 214),
		PortalPrimaryColorS:       getenvInt("PORTAL_PRIMARY_COLOR_S", 91),
		PortalPrimaryColorL:       getenvInt("PORTAL_PRIMARY_COLOR_L", 53),
		RegistrationVerifyTTL:     time.Duration(getenvInt("PORTALDOTS_REGISTRATION_VERIFY_TTL_MINUTES", 60)) * time.Minute,
		SMTPHost:                  getenv("PORTALDOTS_SMTP_HOST", ""),
		SMTPPort:                  getenvInt("PORTALDOTS_SMTP_PORT", 587),
		SMTPUsername:              getenv("PORTALDOTS_SMTP_USERNAME", ""),
		SMTPPassword:              getenv("PORTALDOTS_SMTP_PASSWORD", ""),
		SMTPFrom:                  getenv("PORTALDOTS_SMTP_FROM", ""),
		AuthUser: AuthUser{
			ID:          getenv("PORTALDOTS_AUTH_USER_ID", defaultAuthUser.ID),
			LoginIDs:    splitCSV(getenv("PORTALDOTS_AUTH_LOGIN_IDS", strings.Join(defaultAuthUser.LoginIDs, ","))),
			DisplayName: getenv("PORTALDOTS_AUTH_DISPLAY_NAME", defaultAuthUser.DisplayName),
			Password:    authPassword,
			Roles:       splitCSV(getenv("PORTALDOTS_AUTH_ROLES", strings.Join(defaultAuthUser.Roles, ","))),
			Permissions: []string{},
		},
		Users: func() []User {
			if getenv("PORTALDOTS_ALLOW_INSECURE_DEFAULTS", "") == "true" {
				return defaultDemoUsers()
			}
			return []User{}
		}(),
		StaffVerifyCode:         staffVerifyCode,
		authPasswordProvided:    authPasswordProvided,
		staffVerifyCodeProvided: staffVerifyCodeProvided,
		ParticipationTypes: []ParticipationType{
			{
				ID:            "0195ec00-0001-7000-8000-000000000001",
				Name:          "模擬店",
				Description:   "飲食系の企画参加登録フォームです。",
				UsersCountMin: 1,
				UsersCountMax: 4,
				Tags:          []string{"模擬店"},
				FormID:        "0195ec00-0011-7000-8000-000000000001",
			},
			{
				ID:            "0195ec00-0002-7000-8000-000000000001",
				Name:          "展示",
				Description:   "展示系の企画参加登録フォームです。",
				UsersCountMin: 1,
				UsersCountMax: 3,
				Tags:          []string{"展示"},
				FormID:        "0195ec00-0012-7000-8000-000000000001",
			},
		},
		Circles: []Circle{
			{
				ID:                    "0195ec00-0021-7000-8000-000000000001",
				Name:                  "デモ企画A",
				NameYomi:              "でもきかくえー",
				GroupName:             "Aブロック",
				GroupNameYomi:         "えーぶろっく",
				ParticipationTypeID:   "0195ec00-0001-7000-8000-000000000001",
				ParticipationTypeName: "模擬店",
				Tags:                  []string{"模擬店"},
				Status:                "approved",
			},
			{
				ID:                    "0195ec00-0022-7000-8000-000000000001",
				Name:                  "デモ企画B",
				NameYomi:              "でもきかくびー",
				GroupName:             "Bブロック",
				GroupNameYomi:         "びーぶろっく",
				ParticipationTypeID:   "0195ec00-0002-7000-8000-000000000001",
				ParticipationTypeName: "展示",
				Tags:                  []string{"展示"},
				Status:                "approved",
			},
		},
		Pages: []Page{
			{
				ID:           "0195ec00-0031-7000-8000-000000000001",
				Title:        "搬入時間のお知らせ",
				Body:         "Aブロックの搬入は 9:00 から開始します。",
				Notes:        "搬入担当向けの補足です。",
				IsPinned:     false,
				IsPublic:     true,
				ViewableTags: []string{"模擬店"},
				DocumentIDs:  []string{"0195ec00-0041-7000-8000-000000000001"},
				CreatedAt:    "2026-03-01T09:00:00Z",
				UpdatedAt:    "2026-03-01T09:00:00Z",
			},
			{
				ID:           "0195ec00-0032-7000-8000-000000000001",
				Title:        "固定表示の連絡",
				Body:         "このお知らせは一覧には出しません。",
				Notes:        "",
				IsPinned:     true,
				IsPublic:     true,
				ViewableTags: []string{},
				DocumentIDs:  []string{},
				CreatedAt:    "2026-03-02T09:00:00Z",
				UpdatedAt:    "2026-03-02T09:00:00Z",
			},
			{
				ID:           "0195ec00-0034-7000-8000-000000000001",
				Title:        "展示レイアウト更新",
				Body:         "Bブロックの展示レイアウトを更新しました。",
				Notes:        "展示班向けの差し替え指示あり。",
				IsPinned:     false,
				IsPublic:     true,
				ViewableTags: []string{"展示"},
				DocumentIDs:  []string{"0195ec00-0042-7000-8000-000000000001"},
				CreatedAt:    "2026-03-03T09:00:00Z",
				UpdatedAt:    "2026-03-03T09:00:00Z",
			},
			{
				ID:           "0195ec00-0035-7000-8000-000000000001",
				Title:        "非公開メモ",
				Body:         "このお知らせは公開されません。",
				Notes:        "スタッフだけが確認するメモです。",
				IsPinned:     false,
				IsPublic:     false,
				ViewableTags: []string{},
				DocumentIDs:  []string{"0195ec00-0043-7000-8000-000000000001"},
				CreatedAt:    "2026-03-04T09:00:00Z",
				UpdatedAt:    "2026-03-04T09:00:00Z",
			},
		},
		Documents: []Document{
			{
				ID:          "0195ec00-0041-7000-8000-000000000001",
				CircleID:    "0195ec00-0021-7000-8000-000000000001",
				Name:        "搬入手順書",
				Description: "Aブロック向けの搬入手順です。",
				Notes:       "搬入班で最終確認してください。",
				IsPublic:    true,
				IsImportant: true,
				Filename:    "a-loading-guide.txt",
				MimeType:    "text/plain; charset=utf-8",
				Content:     "Aブロックの搬入は 9:00 から 9:30 です。",
				CreatedAt:   "2026-03-01T09:00:00Z",
				UpdatedAt:   "2026-03-02T09:00:00Z",
			},
			{
				ID:          "0195ec00-0042-7000-8000-000000000001",
				CircleID:    "0195ec00-0022-7000-8000-000000000001",
				Name:        "展示ガイド",
				Description: "Bブロック向けの展示ガイドです。",
				Notes:       "展示班の責任者に共有済みです。",
				IsPublic:    true,
				IsImportant: true,
				Filename:    "b-exhibition-guide.txt",
				MimeType:    "text/plain; charset=utf-8",
				Content:     "Bブロックは 10:00 までに設営してください。",
				CreatedAt:   "2026-03-03T09:00:00Z",
				UpdatedAt:   "2026-03-05T09:00:00Z",
			},
			{
				ID:          "0195ec00-0043-7000-8000-000000000001",
				CircleID:    "0195ec00-0022-7000-8000-000000000001",
				Name:        "内部メモ",
				Description: "この資料は公開しません。",
				Notes:       "スタッフ内だけで参照します。",
				IsPublic:    false,
				IsImportant: false,
				Filename:    "private-note.txt",
				MimeType:    "text/plain; charset=utf-8",
				Content:     "private",
				CreatedAt:   "2026-03-04T09:00:00Z",
				UpdatedAt:   "2026-03-04T09:00:00Z",
			},
		},
		Forms: []Form{
			{
				ID:                  "0195ec00-0011-7000-8000-000000000001",
				CircleID:            "",
				Name:                "企画参加登録",
				Description:         "",
				IsPublic:            true,
				IsOpen:              true,
				OpenAt:              "2026-03-01T00:00:00Z",
				CloseAt:             "2026-03-31T23:59:59Z",
				CreatedAt:           "2026-03-01T00:00:00Z",
				UpdatedAt:           "2026-03-01T00:00:00Z",
				MaxAnswers:          1,
				AnswerableTags:      []string{},
				ConfirmationMessage: "企画参加登録を受け付けました。",
			},
			{
				ID:                  "0195ec00-0012-7000-8000-000000000001",
				CircleID:            "",
				Name:                "企画参加登録",
				Description:         "",
				IsPublic:            true,
				IsOpen:              true,
				OpenAt:              "2026-03-01T00:00:00Z",
				CloseAt:             "2026-03-31T23:59:59Z",
				CreatedAt:           "2026-03-01T00:00:00Z",
				UpdatedAt:           "2026-03-01T00:00:00Z",
				MaxAnswers:          1,
				AnswerableTags:      []string{},
				ConfirmationMessage: "企画参加登録を受け付けました。",
			},
			{
				ID:                  "0195ec00-0013-7000-8000-000000000001",
				CircleID:            "0195ec00-0021-7000-8000-000000000001",
				Name:                "搬入確認フォーム",
				Description:         "搬入予定時刻と責任者情報を提出してください。",
				IsPublic:            true,
				IsOpen:              true,
				OpenAt:              "2026-03-01T00:00:00Z",
				CloseAt:             "2026-04-30T23:59:59Z",
				CreatedAt:           "2026-03-01T00:00:00Z",
				UpdatedAt:           "2026-03-01T00:00:00Z",
				MaxAnswers:          1,
				AnswerableTags:      []string{},
				ConfirmationMessage: "搬入確認フォームへの回答ありがとうございました。",
			},
			{
				ID:                  "0195ec00-0014-7000-8000-000000000001",
				CircleID:            "0195ec00-0022-7000-8000-000000000001",
				Name:                "展示チェックフォーム",
				Description:         "展示レイアウトと機材使用申請を提出してください。",
				IsPublic:            true,
				IsOpen:              true,
				OpenAt:              "2026-03-02T00:00:00Z",
				CloseAt:             "2026-03-22T23:59:59Z",
				CreatedAt:           "2026-03-02T00:00:00Z",
				UpdatedAt:           "2026-03-02T00:00:00Z",
				MaxAnswers:          2,
				AnswerableTags:      []string{"展示"},
				ConfirmationMessage: "展示チェックフォームへの回答を受け付けました。",
			},
			{
				ID:                  "0195ec00-0010-7000-8000-000000000001",
				CircleID:            "0195ec00-0022-7000-8000-000000000001",
				Name:                "締切済みフォーム",
				Description:         "このフォームは締切済みです。",
				IsPublic:            true,
				IsOpen:              false,
				OpenAt:              "2026-02-01T00:00:00Z",
				CloseAt:             "2026-02-10T23:59:59Z",
				CreatedAt:           "2026-02-01T00:00:00Z",
				UpdatedAt:           "2026-02-01T00:00:00Z",
				MaxAnswers:          1,
				AnswerableTags:      []string{},
				ConfirmationMessage: "",
			},
			{
				ID:                  "0195ec00-0015-7000-8000-000000000001",
				CircleID:            "0195ec00-0022-7000-8000-000000000001",
				Name:                "非公開フォーム",
				Description:         "このフォームは公開されません。",
				IsPublic:            false,
				IsOpen:              true,
				OpenAt:              "2026-03-02T00:00:00Z",
				CloseAt:             "2026-03-22T23:59:59Z",
				CreatedAt:           "2026-03-02T00:00:00Z",
				UpdatedAt:           "2026-03-02T00:00:00Z",
				MaxAnswers:          1,
				AnswerableTags:      []string{"展示"},
				ConfirmationMessage: "",
			},
		},
		Tags: []Tag{
			{ID: "0195ec00-0061-7000-8000-000000000001", Name: "模擬店"},
			{ID: "0195ec00-0062-7000-8000-000000000001", Name: "展示"},
			{ID: "0195ec00-0063-7000-8000-000000000001", Name: "飲食"},
			{ID: "0195ec00-0064-7000-8000-000000000001", Name: "ステージ"},
		},
		Places: []Place{
			{ID: "0195ec00-0071-7000-8000-000000000001", Name: "1号館 101", Type: 1, Notes: "屋内"},
			{ID: "0195ec00-0072-7000-8000-000000000001", Name: "中庭", Type: 2, Notes: "屋外"},
		},
		Booths: []BoothAssignment{
			{PlaceID: "0195ec00-0071-7000-8000-000000000001", CircleID: "0195ec00-0021-7000-8000-000000000001"},
			{PlaceID: "0195ec00-0071-7000-8000-000000000001", CircleID: "0195ec00-0022-7000-8000-000000000001"},
			{PlaceID: "0195ec00-0072-7000-8000-000000000001", CircleID: "0195ec00-0022-7000-8000-000000000001"},
		},
		ContactCategories: []ContactCategory{
			{ID: "0195ec00-0081-7000-8000-000000000001", Name: "総合窓口", Email: "general@example.com"},
			{ID: "0195ec00-0082-7000-8000-000000000001", Name: "安全管理", Email: "safety@example.com"},
		},
	}
}

func (c Config) ValidateForAPI() error {
	var issues []string

	if strings.TrimSpace(c.DatabaseURL) == "" {
		issues = append(issues, "PORTALDOTS_DATABASE_URL is required")
	}
	if strings.TrimSpace(c.MigrationsDir) == "" {
		issues = append(issues, "PORTALDOTS_MIGRATIONS_DIR is required")
	}
	if c.SessionTTL <= 0 {
		issues = append(issues, "PORTALDOTS_SESSION_TTL_SECONDS must be greater than zero")
	}
	if strings.TrimSpace(c.StaffVerifyCode) == "" {
		issues = append(issues, "PORTALDOTS_STAFF_VERIFY_CODE must not be empty")
	}
	if c.RegistrationVerifyTTL <= 0 {
		issues = append(issues, "PORTALDOTS_REGISTRATION_VERIFY_TTL_MINUTES must be greater than zero")
	}
	if strings.TrimSpace(c.PortalUnivemailLocalPart) != "student_id" {
		issues = append(issues, "PORTAL_UNIVEMAIL_LOCAL_PART must be student_id")
	}
	if c.AllowInsecureDefaults {
		if len(c.AuthUser.LoginIDs) == 0 {
			issues = append(issues, "PORTALDOTS_AUTH_LOGIN_IDS must contain at least one login ID")
		}
		if strings.TrimSpace(c.AuthUser.Password) == "" {
			issues = append(issues, "PORTALDOTS_AUTH_PASSWORD must not be empty")
		}
	} else {
		if !c.staffVerifyCodeProvided || c.StaffVerifyCode == defaultStaffVerifyCode {
			issues = append(issues, "PORTALDOTS_STAFF_VERIFY_CODE must be set to a non-default value unless PORTALDOTS_ALLOW_INSECURE_DEFAULTS=true")
		}
		if !c.authPasswordProvided || c.AuthUser.Password == defaultAuthPassword {
			issues = append(issues, "PORTALDOTS_AUTH_PASSWORD must be set to a non-default value unless PORTALDOTS_ALLOW_INSECURE_DEFAULTS=true")
		}
		if strings.TrimSpace(c.SMTPHost) == "" {
			issues = append(issues, "PORTALDOTS_SMTP_HOST is required unless PORTALDOTS_ALLOW_INSECURE_DEFAULTS=true")
		}
		if c.SMTPPort <= 0 {
			issues = append(issues, "PORTALDOTS_SMTP_PORT must be greater than zero unless PORTALDOTS_ALLOW_INSECURE_DEFAULTS=true")
		}
		if strings.TrimSpace(c.SMTPUsername) == "" {
			issues = append(issues, "PORTALDOTS_SMTP_USERNAME is required unless PORTALDOTS_ALLOW_INSECURE_DEFAULTS=true")
		}
		if strings.TrimSpace(c.SMTPPassword) == "" {
			issues = append(issues, "PORTALDOTS_SMTP_PASSWORD is required unless PORTALDOTS_ALLOW_INSECURE_DEFAULTS=true")
		}
		if strings.TrimSpace(c.SMTPFrom) == "" {
			issues = append(issues, "PORTALDOTS_SMTP_FROM is required unless PORTALDOTS_ALLOW_INSECURE_DEFAULTS=true")
		}
	}

	if len(issues) == 0 {
		return nil
	}

	return errors.New(strings.Join(issues, "; "))
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getenvWithPresence(key, fallback string) (string, bool) {
	value, ok := os.LookupEnv(key)
	if !ok || value == "" {
		return fallback, false
	}

	return value, true
}

func getenvInt(key string, fallback int) int {
	value, ok := os.LookupEnv(key)
	if !ok || value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	items := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		items = append(items, trimmed)
	}
	return items
}
