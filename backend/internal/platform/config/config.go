package config

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"net/url"
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
)

type Config struct {
	BindAddress               string
	DatabaseURL               string
	MigrationsDir             string
	AllowDangerously          bool
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
	EmailFrom                 string
	EmailProducerURL          string
	EmailProducerToken        string
	RateLimitPerMinute        int
	MaintenanceMode           bool
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

func demoPNGContent(width int, height int) string {
	if width <= 0 {
		width = 720
	}
	if height <= 0 {
		height = 960
	}

	canvas := image.NewRGBA(image.Rect(0, 0, width, height))
	draw.Draw(canvas, canvas.Bounds(), &image.Uniform{C: color.RGBA{R: 248, G: 250, B: 252, A: 255}}, image.Point{}, draw.Src)
	draw.Draw(canvas, image.Rect(32, 32, width-32, height-32), &image.Uniform{C: color.RGBA{R: 255, G: 255, B: 255, A: 255}}, image.Point{}, draw.Src)
	draw.Draw(canvas, image.Rect(32, 32, width-32, 84), &image.Uniform{C: color.RGBA{R: 31, G: 41, B: 55, A: 255}}, image.Point{}, draw.Src)
	draw.Draw(canvas, image.Rect(72, 168, width-72, 188), &image.Uniform{C: color.RGBA{R: 96, G: 165, B: 250, A: 255}}, image.Point{}, draw.Src)
	draw.Draw(canvas, image.Rect(72, 220, width-72, 236), &image.Uniform{C: color.RGBA{R: 203, G: 213, B: 225, A: 255}}, image.Point{}, draw.Src)
	draw.Draw(canvas, image.Rect(72, 260, width-200, 276), &image.Uniform{C: color.RGBA{R: 203, G: 213, B: 225, A: 255}}, image.Point{}, draw.Src)
	draw.Draw(canvas, image.Rect(72, 330, width-72, height-120), &image.Uniform{C: color.RGBA{R: 241, G: 245, B: 249, A: 255}}, image.Point{}, draw.Src)

	var buffer bytes.Buffer
	if err := png.Encode(&buffer, canvas); err != nil {
		return ""
	}

	return buffer.String()
}

func escapePDFText(value string) string {
	replacer := strings.NewReplacer(
		`\\`, `\\\\`,
		`(`, `\(`,
		`)`, `\)`,
	)
	return replacer.Replace(value)
}

func demoPDFContent(title string, description string) string {
	contentStream := strings.Join([]string{
		"BT",
		"/F1 24 Tf",
		"72 760 Td",
		fmt.Sprintf("(%s) Tj", escapePDFText(title)),
		"0 -38 Td",
		"/F1 14 Tf",
		fmt.Sprintf("(%s) Tj", escapePDFText(description)),
		"0 -24 Td",
		"(PortalDots sample document.) Tj",
		"0 -18 Td",
		"(This PDF is included in the local demo environment.) Tj",
		"ET",
	}, "\n") + "\n"

	objects := []string{
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
		fmt.Sprintf("<< /Length %d >>\nstream\n%sendstream", len(contentStream), contentStream),
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
	}

	var buffer bytes.Buffer
	buffer.WriteString("%PDF-1.4\n%\xb5\xb5\xb5\xb5\n")

	offsets := make([]int, 0, len(objects))
	for index, object := range objects {
		offsets = append(offsets, buffer.Len())
		fmt.Fprintf(&buffer, "%d 0 obj\n%s\nendobj\n", index+1, object)
	}

	xrefOffset := buffer.Len()
	fmt.Fprintf(&buffer, "xref\n0 %d\n", len(objects)+1)
	buffer.WriteString("0000000000 65535 f \n")
	for _, offset := range offsets {
		fmt.Fprintf(&buffer, "%010d 00000 n \n", offset)
	}

	buffer.WriteString("trailer\n")
	fmt.Fprintf(&buffer, "<< /Size %d /Root 1 0 R >>\n", len(objects)+1)
	fmt.Fprintf(&buffer, "startxref\n%d\n%%%%EOF", xrefOffset)

	return buffer.String()
}

func defaultDemoAuthUser() AuthUser {
	return AuthUser{
		ID:          demoAdminUserID,
		LoginIDs:    []string{"DEMO-ADMIN"},
		DisplayName: "デモ 管理者",
		Password:    defaultAuthPassword,
		Roles:       []string{"admin"},
		Permissions: []string{},
	}
}

func defaultDemoUsers() []User {
	return []User{
		{
			ID:                  demoAdminUserID,
			LoginIDs:            []string{"DEMO-ADMIN"},
			LastName:            "デモ",
			LastNameReading:     "でも",
			FirstName:           "管理者",
			FirstNameReading:    "かんりしゃ",
			DisplayName:         "デモ 管理者",
			Password:            defaultAuthPassword,
			ContactEmail:        "demo-admin@portaldots.com",
			PhoneNumber:         "090-0000-0000",
			Roles:               []string{"admin"},
			Permissions:         []string{},
			CircleIDs:           []string{},
			LeaderCircleIDs:     []string{},
			IsVerified:          true,
			IsEmailVerified:     true,
			IsUnivemailVerified: true,
		},
		{
			ID:                  demoStaffUserID,
			LoginIDs:            []string{"DEMO-STAFF"},
			LastName:            "デモ",
			LastNameReading:     "でも",
			FirstName:           "スタッフ",
			FirstNameReading:    "すたっふ",
			DisplayName:         "デモ スタッフ",
			Password:            "demo-staff",
			ContactEmail:        "demo-staff@portaldots.com",
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
			LoginIDs:            []string{"DEMO-STAFF-SUB"},
			LastName:            "デモ",
			LastNameReading:     "でも",
			FirstName:           "副スタッフ",
			FirstNameReading:    "ふくすたっふ",
			DisplayName:         "デモ 副スタッフ",
			Password:            "demo-staff-sub",
			ContactEmail:        "demo-staff-sub@portaldots.com",
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
			LoginIDs:            []string{"DEMO-CIRCLE"},
			LastName:            "デモ",
			LastNameReading:     "でも",
			FirstName:           "企画者",
			FirstNameReading:    "きかくしゃ",
			DisplayName:         "デモ 企画者",
			Password:            "demo-circle",
			ContactEmail:        "demo-circle@portaldots.com",
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
			LoginIDs:            []string{"DEMO-CIRCLE-SUB"},
			LastName:            "デモ",
			LastNameReading:     "でも",
			FirstName:           "副企画者",
			FirstNameReading:    "ふくきかくしゃ",
			DisplayName:         "デモ 副企画者",
			Password:            "demo-circle-sub",
			ContactEmail:        "demo-circle-sub@portaldots.com",
			PhoneNumber:         "090-0000-0004",
			Roles:               []string{"participant"},
			Permissions:         []string{},
			CircleIDs:           []string{"0195ec00-0022-7000-8000-000000000001"},
			LeaderCircleIDs:     []string{"0195ec00-0022-7000-8000-000000000001"},
			IsVerified:          true,
			IsEmailVerified:     true,
			IsUnivemailVerified: true,
		},
	}
}

func FromEnv() Config {
	authPassword, authPasswordProvided := getenvWithPresence("PORTALDOTS_AUTH_PASSWORD", defaultAuthPassword)
	staffVerifyCode, staffVerifyCodeProvided := getenvWithPresence("PORTALDOTS_STAFF_VERIFY_CODE", defaultStaffVerifyCode)
	defaultAuthUser := defaultDemoAuthUser()
	allowDangerously := getenv("PORTALDOTS_ALLOW_DANGEROUSLY", "") == "true"
	appURL := getenv("APP_URL", "http://127.0.0.1:8080")

	return Config{
		BindAddress:               getenv("PORTALDOTS_API_BIND", ":8081"),
		DatabaseURL:               getenv("PORTALDOTS_DATABASE_URL", ""),
		MigrationsDir:             getenv("PORTALDOTS_MIGRATIONS_DIR", "db/migrations"),
		AllowDangerously:          allowDangerously,
		SyncAuthUserOnStartup:     getenv("PORTALDOTS_SYNC_AUTH_USER_ON_STARTUP", "") == "true",
		SessionCookieName:         getenv("PORTALDOTS_SESSION_COOKIE", "portaldots_session"),
		SessionCookieSecure:       getenvBool("PORTALDOTS_SESSION_COOKIE_SECURE", strings.HasPrefix(appURL, "https://")),
		SessionTTL:                time.Duration(getenvInt("PORTALDOTS_SESSION_TTL_SECONDS", DefaultSessionTTLSeconds)) * time.Second,
		AppName:                   getenv("APP_NAME", "PortalDots"),
		PortalDescription:         getenv("PORTAL_DESCRIPTION", ternaryString(allowDangerously, "PortalDots デモサイトです。", "学園祭参加団体向けポータル")),
		AppURL:                    appURL,
		AppForceHTTPS:             getenv("APP_FORCE_HTTPS", "") == "true",
		PortalAdminName:           getenv("PORTAL_ADMIN_NAME", ternaryString(allowDangerously, "PortalDots 実行委員会", "PortalDots 実行委員会")),
		PortalContactEmail:        getenv("PORTAL_CONTACT_EMAIL", ternaryString(allowDangerously, "support@portaldots.com", "contact@example.com")),
		PortalUnivemailLocalPart:  getenv("PORTAL_UNIVEMAIL_LOCAL_PART", "student_id"),
		PortalUnivemailDomainPart: getenv("PORTAL_UNIVEMAIL_DOMAIN_PART", ternaryString(allowDangerously, "portaldots.com", "example.ac.jp")),
		PortalStudentIDName:       getenv("PORTAL_STUDENT_ID_NAME", "学籍番号"),
		PortalUnivemailName:       getenv("PORTAL_UNIVEMAIL_NAME", ternaryString(allowDangerously, "学生用メールアドレス", "大学メールアドレス")),
		PortalPrimaryColorH:       getenvInt("PORTAL_PRIMARY_COLOR_H", 214),
		PortalPrimaryColorS:       getenvInt("PORTAL_PRIMARY_COLOR_S", 91),
		PortalPrimaryColorL:       getenvInt("PORTAL_PRIMARY_COLOR_L", 53),
		RegistrationVerifyTTL:     time.Duration(getenvInt("PORTALDOTS_REGISTRATION_VERIFY_TTL_MINUTES", 60)) * time.Minute,
		EmailFrom:                 getenv("PORTALDOTS_SMTP_FROM", ""),
		EmailProducerURL:          getenv("PORTALDOTS_EMAIL_PRODUCER_URL", ""),
		EmailProducerToken:        getenv("PORTALDOTS_EMAIL_PRODUCER_TOKEN", ""),
		RateLimitPerMinute:        getenvInt("PORTALDOTS_RATE_LIMIT_PER_MINUTE", 60),
		MaintenanceMode:           getenv("PORTALDOTS_MAINTENANCE_MODE", "") == "true",
		AuthUser: AuthUser{
			ID:          getenv("PORTALDOTS_AUTH_USER_ID", defaultAuthUser.ID),
			LoginIDs:    splitCSV(getenv("PORTALDOTS_AUTH_LOGIN_IDS", strings.Join(defaultAuthUser.LoginIDs, ","))),
			DisplayName: getenv("PORTALDOTS_AUTH_DISPLAY_NAME", defaultAuthUser.DisplayName),
			Password:    authPassword,
			Roles:       splitCSV(getenv("PORTALDOTS_AUTH_ROLES", strings.Join(defaultAuthUser.Roles, ","))),
			Permissions: []string{},
		},
		Users: func() []User {
			if allowDangerously {
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
				ID:          "0195ec00-0041-7000-8000-000000000001",
				Name:        "デモサイトへのログイン方法",
				Description: "",
				Notes:       "デモサイト案内のサンプル資料です。",
				IsPublic:    true,
				IsImportant: false,
				Filename:    "demo-login-guide.png",
				MimeType:    "image/png",
				Content:     demoPNGContent(720, 960),
				CreatedAt:   "2022-03-27T15:05:19+09:00",
				UpdatedAt:   "2022-03-27T15:05:41+09:00",
			},
			{
				ID:          "0195ec00-0042-7000-8000-000000000001",
				Name:        "サンプル配布資料",
				Description: "配布資料PDFのサンプルです。",
				Notes:       "公開配布資料のサンプルです。",
				IsPublic:    true,
				IsImportant: false,
				Filename:    "sample-document.pdf",
				MimeType:    "application/pdf",
				Content:     demoPDFContent("PortalDots Sample Document", "This is a sample PDF distributed from PortalDots."),
				CreatedAt:   "2022-03-27T15:01:54+09:00",
				UpdatedAt:   "2022-03-27T15:01:54+09:00",
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
	if strings.TrimSpace(c.SessionCookieName) == "" {
		issues = append(issues, "PORTALDOTS_SESSION_COOKIE must not be empty")
	}
	appOrigin, appURLErr := appOrigin(c.AppURL)
	if appURLErr != nil {
		issues = append(issues, "APP_URL must be an absolute http or https URL")
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
	if c.AllowDangerously {
		if len(c.AuthUser.LoginIDs) == 0 {
			issues = append(issues, "PORTALDOTS_AUTH_LOGIN_IDS must contain at least one login ID")
		}
		if strings.TrimSpace(c.AuthUser.Password) == "" {
			issues = append(issues, "PORTALDOTS_AUTH_PASSWORD must not be empty")
		}
	} else {
		if appURLErr == nil && !strings.HasPrefix(appOrigin, "https://") {
			issues = append(issues, "APP_URL must use https unless PORTALDOTS_ALLOW_DANGEROUSLY=true")
		}
		if !c.SessionCookieSecure {
			issues = append(issues, "PORTALDOTS_SESSION_COOKIE_SECURE must be true unless PORTALDOTS_ALLOW_DANGEROUSLY=true")
		}
		if !c.staffVerifyCodeProvided || c.StaffVerifyCode == defaultStaffVerifyCode {
			issues = append(issues, "PORTALDOTS_STAFF_VERIFY_CODE must be set to a non-default value unless PORTALDOTS_ALLOW_DANGEROUSLY=true")
		}
		if !c.authPasswordProvided || c.AuthUser.Password == defaultAuthPassword {
			issues = append(issues, "PORTALDOTS_AUTH_PASSWORD must be set to a non-default value unless PORTALDOTS_ALLOW_DANGEROUSLY=true")
		}
		if strings.TrimSpace(c.EmailProducerURL) == "" {
			issues = append(issues, "PORTALDOTS_EMAIL_PRODUCER_URL is required unless PORTALDOTS_ALLOW_DANGEROUSLY=true")
		}
		if strings.TrimSpace(c.EmailProducerToken) == "" {
			issues = append(issues, "PORTALDOTS_EMAIL_PRODUCER_TOKEN is required unless PORTALDOTS_ALLOW_DANGEROUSLY=true")
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
