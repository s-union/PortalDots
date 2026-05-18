package config

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"strings"
)

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
