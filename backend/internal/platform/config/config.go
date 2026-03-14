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
	defaultAuthPassword      = "password"
	defaultStaffVerifyCode   = "123456"
)

type Config struct {
	BindAddress             string
	DatabaseURL             string
	MigrationsDir           string
	AllowInsecureDefaults   bool
	SessionCookieName       string
	SessionCookieSecure     bool
	SessionTTL              time.Duration
	AuthUser                AuthUser
	Users                   []User
	StaffVerifyCode         string
	ParticipationTypes      []ParticipationType
	Circles                 []Circle
	Pages                   []Page
	Documents               []Document
	Forms                   []Form
	Tags                    []Tag
	Places                  []Place
	ContactCategories       []ContactCategory
	authPasswordProvided    bool
	staffVerifyCodeProvided bool
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
	ID              string
	LoginIDs        []string
	DisplayName     string
	Password        string
	Roles           []string
	Permissions     []string
	CircleIDs       []string
	LeaderCircleIDs []string
	IsVerified      bool
}

type Circle struct {
	ID                    string
	Name                  string
	GroupName             string
	ParticipationTypeID   string
	ParticipationTypeName string
	Tags                  []string
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
	CircleID     string
	Title        string
	Body         string
	Notes        string
	IsPinned     bool
	IsPublic     bool
	ViewableTags []string
	DocumentIDs  []string
	PublishedAt  string
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

type ContactCategory struct {
	ID    string
	Name  string
	Email string
}

func FromEnv() Config {
	authPassword, authPasswordProvided := getenvWithPresence("PORTALDOTS_AUTH_PASSWORD", defaultAuthPassword)
	staffVerifyCode, staffVerifyCodeProvided := getenvWithPresence("PORTALDOTS_STAFF_VERIFY_CODE", defaultStaffVerifyCode)

	return Config{
		BindAddress:           getenv("PORTALDOTS_API_BIND", ":8081"),
		DatabaseURL:           getenv("PORTALDOTS_DATABASE_URL", ""),
		MigrationsDir:         getenv("PORTALDOTS_MIGRATIONS_DIR", "db/migrations"),
		AllowInsecureDefaults: getenv("PORTALDOTS_ALLOW_INSECURE_DEFAULTS", "") == "true",
		SessionCookieName:     getenv("PORTALDOTS_SESSION_COOKIE", "portaldots_session"),
		SessionCookieSecure:   getenv("PORTALDOTS_SESSION_COOKIE_SECURE", "") == "true",
		SessionTTL:            time.Duration(getenvInt("PORTALDOTS_SESSION_TTL_SECONDS", DefaultSessionTTLSeconds)) * time.Second,
		AuthUser: AuthUser{
			ID:          getenv("PORTALDOTS_AUTH_USER_ID", "demo-user"),
			LoginIDs:    splitCSV(getenv("PORTALDOTS_AUTH_LOGIN_IDS", "demo@example.com,24a0000")),
			DisplayName: getenv("PORTALDOTS_AUTH_DISPLAY_NAME", "Demo User"),
			Password:    authPassword,
			Roles:       splitCSV(getenv("PORTALDOTS_AUTH_ROLES", "participant")),
			Permissions: []string{},
		},
		Users: []User{
			{
				ID:              "member-circle-a",
				LoginIDs:        []string{"circle-a@example.com"},
				DisplayName:     "Circle A Member",
				Password:        defaultAuthPassword,
				Roles:           []string{"participant"},
				Permissions:     []string{},
				CircleIDs:       []string{"circle-a"},
				LeaderCircleIDs: []string{"circle-a"},
				IsVerified:      true,
			},
			{
				ID:              "member-circle-b",
				LoginIDs:        []string{"circle-b@example.com"},
				DisplayName:     "Circle B Member",
				Password:        defaultAuthPassword,
				Roles:           []string{"participant"},
				Permissions:     []string{},
				CircleIDs:       []string{"circle-b"},
				LeaderCircleIDs: []string{"circle-b"},
				IsVerified:      true,
			},
			{
				ID:              "member-circle-b-unverified",
				LoginIDs:        []string{"circle-b-unverified@example.com"},
				DisplayName:     "Circle B Unverified Member",
				Password:        defaultAuthPassword,
				Roles:           []string{"participant"},
				Permissions:     []string{},
				CircleIDs:       []string{"circle-b"},
				LeaderCircleIDs: []string{},
				IsVerified:      false,
			},
		},
		StaffVerifyCode:         staffVerifyCode,
		authPasswordProvided:    authPasswordProvided,
		staffVerifyCodeProvided: staffVerifyCodeProvided,
		ParticipationTypes: []ParticipationType{
			{
				ID:            "participation-type-food",
				Name:          "模擬店",
				Description:   "飲食系の企画参加登録フォームです。",
				UsersCountMin: 1,
				UsersCountMax: 4,
				Tags:          []string{"模擬店"},
				FormID:        "form-participation-food",
			},
			{
				ID:            "participation-type-exhibit",
				Name:          "展示",
				Description:   "展示系の企画参加登録フォームです。",
				UsersCountMin: 1,
				UsersCountMax: 3,
				Tags:          []string{"展示"},
				FormID:        "form-participation-exhibit",
			},
		},
		Circles: []Circle{
			{
				ID:                    "circle-a",
				Name:                  "デモ企画A",
				GroupName:             "Aブロック",
				ParticipationTypeID:   "participation-type-food",
				ParticipationTypeName: "模擬店",
				Tags:                  []string{"模擬店"},
			},
			{
				ID:                    "circle-b",
				Name:                  "デモ企画B",
				GroupName:             "Bブロック",
				ParticipationTypeID:   "participation-type-exhibit",
				ParticipationTypeName: "展示",
				Tags:                  []string{"展示"},
			},
		},
		Pages: []Page{
			{
				ID:           "page-circle-a-1",
				CircleID:     "circle-a",
				Title:        "搬入時間のお知らせ",
				Body:         "Aブロックの搬入は 9:00 から開始します。",
				Notes:        "搬入担当向けの補足です。",
				IsPinned:     false,
				IsPublic:     true,
				ViewableTags: []string{"模擬店"},
				DocumentIDs:  []string{"document-circle-a-1"},
				PublishedAt:  "2026-03-01T09:00:00Z",
			},
			{
				ID:           "page-circle-a-pinned",
				CircleID:     "circle-a",
				Title:        "固定表示の連絡",
				Body:         "このお知らせは一覧には出しません。",
				Notes:        "",
				IsPinned:     true,
				IsPublic:     true,
				ViewableTags: []string{},
				DocumentIDs:  []string{},
				PublishedAt:  "2026-03-02T09:00:00Z",
			},
			{
				ID:           "page-circle-b-1",
				CircleID:     "circle-b",
				Title:        "展示レイアウト更新",
				Body:         "Bブロックの展示レイアウトを更新しました。",
				Notes:        "展示班向けの差し替え指示あり。",
				IsPinned:     false,
				IsPublic:     true,
				ViewableTags: []string{"展示"},
				DocumentIDs:  []string{"document-circle-b-1"},
				PublishedAt:  "2026-03-03T09:00:00Z",
			},
			{
				ID:           "page-circle-b-private",
				CircleID:     "circle-b",
				Title:        "非公開メモ",
				Body:         "このお知らせは公開されません。",
				Notes:        "スタッフだけが確認するメモです。",
				IsPinned:     false,
				IsPublic:     false,
				ViewableTags: []string{},
				DocumentIDs:  []string{"document-circle-b-private"},
				PublishedAt:  "2026-03-04T09:00:00Z",
			},
		},
		Documents: []Document{
			{
				ID:          "document-circle-a-1",
				CircleID:    "circle-a",
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
				ID:          "document-circle-b-1",
				CircleID:    "circle-b",
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
				ID:          "document-circle-b-private",
				CircleID:    "circle-b",
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
				ID:                  "form-participation-food",
				CircleID:            "",
				Name:                "企画参加登録",
				Description:         "模擬店企画の参加登録内容を提出してください。",
				IsPublic:            true,
				IsOpen:              true,
				OpenAt:              "2026-03-01T00:00:00Z",
				CloseAt:             "2026-03-31T23:59:59Z",
				MaxAnswers:          1,
				AnswerableTags:      []string{},
				ConfirmationMessage: "企画参加登録を受け付けました。",
			},
			{
				ID:                  "form-participation-exhibit",
				CircleID:            "",
				Name:                "企画参加登録",
				Description:         "展示企画の参加登録内容を提出してください。",
				IsPublic:            true,
				IsOpen:              true,
				OpenAt:              "2026-03-01T00:00:00Z",
				CloseAt:             "2026-03-31T23:59:59Z",
				MaxAnswers:          1,
				AnswerableTags:      []string{},
				ConfirmationMessage: "企画参加登録を受け付けました。",
			},
			{
				ID:                  "form-circle-a-1",
				CircleID:            "circle-a",
				Name:                "搬入確認フォーム",
				Description:         "搬入予定時刻と責任者情報を提出してください。",
				IsPublic:            true,
				IsOpen:              true,
				OpenAt:              "2026-03-01T00:00:00Z",
				CloseAt:             "2026-03-20T23:59:59Z",
				MaxAnswers:          1,
				AnswerableTags:      []string{},
				ConfirmationMessage: "搬入確認フォームへの回答ありがとうございました。",
			},
			{
				ID:                  "form-circle-b-1",
				CircleID:            "circle-b",
				Name:                "展示チェックフォーム",
				Description:         "展示レイアウトと機材使用申請を提出してください。",
				IsPublic:            true,
				IsOpen:              true,
				OpenAt:              "2026-03-02T00:00:00Z",
				CloseAt:             "2026-03-22T23:59:59Z",
				MaxAnswers:          2,
				AnswerableTags:      []string{"展示"},
				ConfirmationMessage: "展示チェックフォームへの回答を受け付けました。",
			},
			{
				ID:                  "form-circle-b-closed",
				CircleID:            "circle-b",
				Name:                "締切済みフォーム",
				Description:         "このフォームは締切済みです。",
				IsPublic:            true,
				IsOpen:              false,
				OpenAt:              "2026-02-01T00:00:00Z",
				CloseAt:             "2026-02-10T23:59:59Z",
				MaxAnswers:          1,
				AnswerableTags:      []string{},
				ConfirmationMessage: "",
			},
			{
				ID:                  "form-circle-b-private",
				CircleID:            "circle-b",
				Name:                "非公開フォーム",
				Description:         "このフォームは公開されません。",
				IsPublic:            false,
				IsOpen:              true,
				OpenAt:              "2026-03-02T00:00:00Z",
				CloseAt:             "2026-03-22T23:59:59Z",
				MaxAnswers:          1,
				AnswerableTags:      []string{"展示"},
				ConfirmationMessage: "",
			},
		},
		Tags: []Tag{
			{ID: "tag-food-stall", Name: "模擬店"},
			{ID: "tag-exhibit", Name: "展示"},
			{ID: "tag-food", Name: "飲食"},
			{ID: "tag-stage", Name: "ステージ"},
		},
		Places: []Place{
			{ID: "place-indoor-1", Name: "1号館 101", Type: 1, Notes: "屋内"},
			{ID: "place-outdoor-1", Name: "中庭", Type: 2, Notes: "屋外"},
		},
		ContactCategories: []ContactCategory{
			{ID: "contact-general", Name: "総合窓口", Email: "general@example.com"},
			{ID: "contact-safety", Name: "安全管理", Email: "safety@example.com"},
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
	if len(c.AuthUser.LoginIDs) == 0 {
		issues = append(issues, "PORTALDOTS_AUTH_LOGIN_IDS must contain at least one login ID")
	}
	if strings.TrimSpace(c.AuthUser.Password) == "" {
		issues = append(issues, "PORTALDOTS_AUTH_PASSWORD must not be empty")
	}
	if strings.TrimSpace(c.StaffVerifyCode) == "" {
		issues = append(issues, "PORTALDOTS_STAFF_VERIFY_CODE must not be empty")
	}
	if !c.AllowInsecureDefaults {
		if !c.authPasswordProvided || c.AuthUser.Password == defaultAuthPassword {
			issues = append(issues, "PORTALDOTS_AUTH_PASSWORD must be set to a non-default value unless PORTALDOTS_ALLOW_INSECURE_DEFAULTS=true")
		}
		if !c.staffVerifyCodeProvided || c.StaffVerifyCode == defaultStaffVerifyCode {
			issues = append(issues, "PORTALDOTS_STAFF_VERIFY_CODE must be set to a non-default value unless PORTALDOTS_ALLOW_INSECURE_DEFAULTS=true")
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
