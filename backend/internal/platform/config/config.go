package config

import (
	"errors"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	DefaultSessionTTLSeconds = 12 * 60 * 60
	defaultAuthPassword      = "demo-admin"
	demoAdminUserID          = "0195ec00-0051-7000-8000-000000000001"
	demoStaffUserID          = "0195ec00-0052-7000-8000-000000000001"
	demoStaffSubUserID       = "0195ec00-0053-7000-8000-000000000001"
	demoCircleUserID         = "0195ec00-0054-7000-8000-000000000001"
	demoCircleSubUserID      = "0195ec00-0055-7000-8000-000000000001"
)

type Config struct {
	BindAddress               string
	DatabaseURL               string
	MigrationsDir             string
	AllowDangerously          bool
	SessionCookieName         string
	SessionCookieSecure       bool
	SessionTTL                time.Duration
	AppName                   string
	PortalDescription         string
	AppURL                    string
	PortalAdminName           string
	PortalContactEmail        string
	PortalUnivemailDomainPart string
	PortalStudentIDName       string
	PortalUnivemailName       string
	RegistrationVerifyTTL     time.Duration
	Version                   string
	EmailFrom                 string
	EmailProducerURL          string
	EmailProducerEnabled      bool
	EmailProducerToken        string
	RateLimitPerMinute        int
	MaintenanceMode           bool
	AuthUser                  AuthUser
	Users                     []User
	ParticipationTypes        []ParticipationType
	Circles                   []Circle
	Pages                     []Page
	Documents                 []Document
	Forms                     []Form
	Tags                      []Tag
	Places                    []Place
	Booths                    []BoothAssignment
	ContactCategories         []ContactCategory
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
	ID           string
	Name         string
	Description  string
	Notes        string
	IsPublic     bool
	IsImportant  bool
	ViewableTags []string
	Filename     string
	MimeType     string
	Content      string
	CreatedAt    string
	UpdatedAt    string
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
	CreatedByUserID     string
}

type Tag struct {
	ID        string
	Name      string
	CreatedAt string
	UpdatedAt string
}

type Place struct {
	ID        string
	Name      string
	Type      int
	Notes     string
	CreatedAt string
	UpdatedAt string
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

func ternaryString(condition bool, whenTrue string, whenFalse string) string {
	if condition {
		return whenTrue
	}
	return whenFalse
}

func FromEnv() Config {
	defaultAuthUser := defaultDemoAuthUser()
	allowDangerously := getenv("PORTAL_DANGEROUSLY_ALLOW_DEMO_MODE", "") == "true"
	appURL := getenv("APP_URL", "http://127.0.0.1:8080")

	return Config{
		BindAddress:               getenv("PORTAL_API_BIND", ":8081"),
		DatabaseURL:               getenv("PORTAL_DATABASE_URL", ""),
		MigrationsDir:             getenv("PORTAL_MIGRATIONS_DIR", "db/migrations"),
		AllowDangerously:          allowDangerously,
		SessionCookieName:         getenv("PORTAL_SESSION_COOKIE", "portaldots_session"),
		SessionCookieSecure:       getenvBool("PORTAL_SESSION_COOKIE_SECURE", strings.HasPrefix(appURL, "https://")),
		SessionTTL:                time.Duration(getenvInt("PORTAL_SESSION_TTL_SECONDS", DefaultSessionTTLSeconds)) * time.Second,
		AppName:                   getenv("PORTAL_APP_NAME", "PortalDots"),
		PortalDescription:         getenv("PORTAL_DESCRIPTION", ternaryString(allowDangerously, "PortalDots デモサイトです。", "学園祭参加団体向けポータル")),
		AppURL:                    appURL,
		PortalAdminName:           getenv("PORTAL_ADMIN_NAME", ternaryString(allowDangerously, "PortalDots 実行委員会", "PortalDots 実行委員会")),
		PortalContactEmail:        getenv("PORTAL_CONTACT_EMAIL", ternaryString(allowDangerously, "support@portaldots.com", "contact@example.com")),
		PortalUnivemailDomainPart: getenv("PORTAL_UNIVEMAIL_DOMAIN_PART", ternaryString(allowDangerously, "portaldots.com", "example.ac.jp")),
		PortalStudentIDName:       getenv("PORTAL_STUDENT_ID_NAME", "学籍番号"),
		PortalUnivemailName:       getenv("PORTAL_UNIVEMAIL_NAME", ternaryString(allowDangerously, "学生用メールアドレス", "大学メールアドレス")),
		RegistrationVerifyTTL:     time.Duration(getenvInt("PORTAL_REGISTRATION_VERIFY_TTL_MINUTES", 60)) * time.Minute,
		Version:                   getenv("PORTAL_VERSION", ""),
		EmailFrom:                 getenv("PORTAL_EMAIL_FROM", getenv("PORTAL_SMTP_FROM", "")),
		EmailProducerURL:          getenv("PORTAL_EMAIL_PRODUCER_URL", ""),
		EmailProducerEnabled:      getenvBool("PORTAL_EMAIL_PRODUCER_ENABLED", false),
		EmailProducerToken:        getenv("PORTAL_EMAIL_PRODUCER_TOKEN", ""),
		RateLimitPerMinute:        getenvInt("PORTAL_RATE_LIMIT_PER_MINUTE", 60),
		MaintenanceMode:           getenv("PORTAL_MAINTENANCE_MODE", "") == "true",
		AuthUser: AuthUser{
			ID:          defaultAuthUser.ID,
			LoginIDs:    defaultAuthUser.LoginIDs,
			DisplayName: defaultAuthUser.DisplayName,
			Password:    defaultAuthUser.Password,
			Roles:       defaultAuthUser.Roles,
			Permissions: []string{},
		},
		Users: func() []User {
			if allowDangerously {
				return defaultDemoUsers()
			}
			return []User{}
		}(),
		ParticipationTypes: []ParticipationType{
			{
				ID:            "0195ec00-0001-7000-8000-000000000001",
				Name:          "模擬店",
				Description:   "模擬店企画の参加登録です。",
				UsersCountMin: 1,
				UsersCountMax: 4,
				Tags:          []string{"模擬店"},
				FormID:        "0195ec00-0011-7000-8000-000000000001",
			},
			{
				ID:            "0195ec00-0002-7000-8000-000000000001",
				Name:          "展示",
				Description:   "展示企画の参加登録です。",
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
				Title:        "お知らせサンプル",
				Body:         "このような形でお知らせを掲載できます。\n\n## 見出し\n\n- 箇条書き\n- 箇条書き\n- 箇条書き\n  - 段下げもできます\n\n表を書くこともできます。\n\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Text | Text | Text |\n\nまた、お知らせに配布資料へのリンクを設置することができます。下記の「関連する配布資料」をご覧ください。",
				Notes:        "デモサイト用のお知らせサンプルです。",
				IsPinned:     false,
				IsPublic:     true,
				ViewableTags: []string{},
				DocumentIDs:  []string{"0195ec00-0042-7000-8000-000000000001"},
				CreatedAt:    "2022-03-27T15:02:00+09:00",
				UpdatedAt:    "2022-03-27T15:02:00+09:00",
			},
			{
				ID:           "0195ec00-0032-7000-8000-000000000001",
				Title:        "PortalDots デモサイトへようこそ！",
				Body:         "デモサイトでは PortalDots のほぼ全機能をお試し利用することができます。\n(他のデモサイト利用者へ影響が出ないよう、データの保存は制限しています)",
				Notes:        "",
				IsPinned:     true,
				IsPublic:     true,
				ViewableTags: []string{},
				DocumentIDs:  []string{"0195ec00-0041-7000-8000-000000000001"},
				CreatedAt:    "2022-03-27T15:05:00+09:00",
				UpdatedAt:    "2022-03-27T15:05:00+09:00",
			},
			{
				ID:           "0195ec00-0034-7000-8000-000000000001",
				Title:        "お知らせサンプル2",
				Body:         "お知らせサンプルです。",
				Notes:        "",
				IsPinned:     false,
				IsPublic:     true,
				ViewableTags: []string{},
				DocumentIDs:  []string{},
				CreatedAt:    "2021-06-07T22:30:00+09:00",
				UpdatedAt:    "2021-06-07T22:30:00+09:00",
			},
			{
				ID:           "0195ec00-0035-7000-8000-000000000001",
				Title:        "サイコロステーキ企画を実施する際の注意事項",
				Body:         "このお知らせは、サイコロステーキ企画を実施される企画の関係者向けに掲載しています。\n\n（※ お知らせを掲載できる対象ユーザーを限定することもできます）",
				Notes:        "模擬店向けの限定公開サンプルです。",
				IsPinned:     false,
				IsPublic:     true,
				ViewableTags: []string{"模擬店"},
				DocumentIDs:  []string{},
				CreatedAt:    "2021-06-07T22:09:00+09:00",
				UpdatedAt:    "2021-06-07T22:09:00+09:00",
			},
		},
		Documents: []Document{
			{
				ID:           "0195ec00-0041-7000-8000-000000000001",
				Name:         "デモサイトへのログイン方法",
				Description:  "",
				Notes:        "デモサイト案内のサンプル資料です。",
				IsPublic:     true,
				IsImportant:  false,
				ViewableTags: []string{},
				Filename:     "demo-login-guide.png",
				MimeType:     "image/png",
				Content:      demoPNGContent(720, 960),
				CreatedAt:    "2022-03-27T15:05:19+09:00",
				UpdatedAt:    "2022-03-27T15:05:41+09:00",
			},
			{
				ID:           "0195ec00-0042-7000-8000-000000000001",
				Name:         "サンプル配布資料",
				Description:  "配布資料PDFのサンプルです。",
				Notes:        "公開配布資料のサンプルです。",
				IsPublic:     true,
				IsImportant:  false,
				ViewableTags: []string{},
				Filename:     "sample-document.pdf",
				MimeType:     "application/pdf",
				Content:      demoPDFContent("PortalDots Sample Document", "This is a sample PDF distributed from PortalDots."),
				CreatedAt:    "2022-03-27T15:01:54+09:00",
				UpdatedAt:    "2022-03-27T15:01:54+09:00",
			},
		},
		Forms: []Form{
			{
				ID:                  "0195ec00-0011-7000-8000-000000000001",
				CircleID:            "",
				Name:                "企画参加登録",
				Description:         "模擬店向けの企画参加登録フォームです。",
				IsPublic:            true,
				IsOpen:              true,
				OpenAt:              "2022-03-01T00:00:00+09:00",
				CloseAt:             "2099-12-31T23:59:59+09:00",
				CreatedAt:           "2022-03-01T00:00:00+09:00",
				UpdatedAt:           "2022-03-01T00:00:00+09:00",
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
				OpenAt:              "2022-03-01T00:00:00+09:00",
				CloseAt:             "2099-12-31T23:59:59+09:00",
				CreatedAt:           "2022-03-01T00:00:00+09:00",
				UpdatedAt:           "2022-03-01T00:00:00+09:00",
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
			{
				ID:        "0195ec00-0061-7000-8000-000000000001",
				Name:      "模擬店",
				CreatedAt: "2021-06-07T12:42:19+09:00",
				UpdatedAt: "2021-06-07T12:42:19+09:00",
			},
			{
				ID:        "0195ec00-0062-7000-8000-000000000001",
				Name:      "展示",
				CreatedAt: "2021-06-07T12:42:19+09:00",
				UpdatedAt: "2021-06-07T12:42:19+09:00",
			},
			{
				ID:        "0195ec00-0063-7000-8000-000000000001",
				Name:      "飲食",
				CreatedAt: "2021-06-07T12:42:19+09:00",
				UpdatedAt: "2021-06-07T12:42:19+09:00",
			},
			{
				ID:        "0195ec00-0064-7000-8000-000000000001",
				Name:      "ステージ",
				CreatedAt: "2021-06-07T12:42:19+09:00",
				UpdatedAt: "2021-06-07T12:42:19+09:00",
			},
		},
		Places: []Place{
			{
				ID:        "0195ec00-0071-7000-8000-000000000001",
				Name:      "1号館 101",
				Type:      1,
				Notes:     "屋内",
				CreatedAt: "2021-06-07T22:19:45+09:00",
				UpdatedAt: "2021-06-07T22:19:45+09:00",
			},
			{
				ID:        "0195ec00-0072-7000-8000-000000000001",
				Name:      "中庭",
				Type:      2,
				Notes:     "屋外",
				CreatedAt: "2021-06-07T22:19:50+09:00",
				UpdatedAt: "2021-06-07T22:19:50+09:00",
			},
		},
		Booths: []BoothAssignment{
			{PlaceID: "0195ec00-0071-7000-8000-000000000001", CircleID: "0195ec00-0021-7000-8000-000000000001"},
			{PlaceID: "0195ec00-0071-7000-8000-000000000001", CircleID: "0195ec00-0022-7000-8000-000000000001"},
			{PlaceID: "0195ec00-0072-7000-8000-000000000001", CircleID: "0195ec00-0022-7000-8000-000000000001"},
		},
		ContactCategories: []ContactCategory{
			{
				ID: "0195ec00-0081-7000-8000-000000000001", Name: "公式ウェブサイト掲載内容に関すること", Email: "website@example.com",
			},
			{ID: "0195ec00-0082-7000-8000-000000000001", Name: "オンライン開催に関すること", Email: "online@example.com"},
			{ID: "0195ec00-0083-7000-8000-000000000001", Name: "イベント当日に利用可能な備品に関すること", Email: "equipment@example.com"},
			{ID: "0195ec00-0084-7000-8000-000000000001", Name: "その他", Email: "general@example.com"},
		},
	}
}

func (c Config) Validate() error {
	var issues []string

	if strings.TrimSpace(c.DatabaseURL) == "" {
		issues = append(issues, "PORTAL_DATABASE_URL is required")
	}
	if strings.TrimSpace(c.MigrationsDir) == "" {
		issues = append(issues, "PORTAL_MIGRATIONS_DIR is required")
	}

	if len(issues) == 0 {
		return nil
	}

	return errors.New(strings.Join(issues, "; "))
}

func (c Config) ValidateForAPI() error {
	var issues []string

	if strings.TrimSpace(c.DatabaseURL) == "" {
		issues = append(issues, "PORTAL_DATABASE_URL is required")
	}
	if strings.TrimSpace(c.MigrationsDir) == "" {
		issues = append(issues, "PORTAL_MIGRATIONS_DIR is required")
	}
	if c.SessionTTL <= 0 {
		issues = append(issues, "PORTAL_SESSION_TTL_SECONDS must be greater than zero")
	}
	if strings.TrimSpace(c.SessionCookieName) == "" {
		issues = append(issues, "PORTAL_SESSION_COOKIE must not be empty")
	}
	appOrigin, appURLErr := appOrigin(c.AppURL)
	if appURLErr != nil {
		issues = append(issues, "APP_URL must be an absolute http or https URL")
	}
	if c.RegistrationVerifyTTL <= 0 {
		issues = append(issues, "PORTAL_REGISTRATION_VERIFY_TTL_MINUTES must be greater than zero")
	}
	if !c.AllowDangerously {
		if appURLErr == nil && !strings.HasPrefix(appOrigin, "https://") {
			issues = append(issues, "APP_URL must use https unless PORTAL_DANGEROUSLY_ALLOW_DEMO_MODE=true")
		}
		if !c.SessionCookieSecure {
			issues = append(issues, "PORTAL_SESSION_COOKIE_SECURE must be true unless PORTAL_DANGEROUSLY_ALLOW_DEMO_MODE=true")
		}
		if strings.TrimSpace(c.EmailProducerURL) == "" {
			issues = append(issues, "PORTAL_EMAIL_PRODUCER_URL is required unless PORTAL_DANGEROUSLY_ALLOW_DEMO_MODE=true")
		}
		if strings.TrimSpace(c.EmailProducerToken) == "" {
			issues = append(issues, "PORTAL_EMAIL_PRODUCER_TOKEN is required unless PORTAL_DANGEROUSLY_ALLOW_DEMO_MODE=true")
		}
	}

	if len(issues) == 0 {
		return nil
	}

	return errors.New(strings.Join(issues, "; "))
}

func (c Config) AppOrigin() (string, error) {
	return appOrigin(c.AppURL)
}

func appOrigin(value string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(value))
	if err != nil {
		return "", err
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", errors.New("unsupported scheme")
	}
	if parsed.Host == "" {
		return "", errors.New("missing host")
	}
	return parsed.Scheme + "://" + parsed.Host, nil
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getenvBool(key string, fallback bool) bool {
	value, ok := os.LookupEnv(key)
	if !ok || value == "" {
		return fallback
	}

	return value == "true"
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
