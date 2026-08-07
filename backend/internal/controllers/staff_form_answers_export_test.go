package controllers

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"mime"
	"net/http"
	"slices"
	"strings"
	"testing"

	"github.com/labstack/echo/v5"
)

func TestSanitizeArchiveFilename(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		filename string
		want     string
	}{
		{
			name:     "keeps simple filename",
			filename: "document.pdf",
			want:     "document.pdf",
		},
		{
			name:     "normalizes parent traversal",
			filename: "../evil.txt",
			want:     "evil.txt",
		},
		{
			name:     "normalizes nested traversal",
			filename: "../../nested/evil.txt",
			want:     "evil.txt",
		},
		{
			name:     "keeps japanese filename",
			filename: "企画書.pdf",
			want:     "企画書.pdf",
		},
		{
			name:     "keeps extension through traversal",
			filename: "../../docs/資料.pdf",
			want:     "資料.pdf",
		},
		{
			name:     "removes null byte",
			filename: "evil\x00.pdf",
			want:     "evil.pdf",
		},
		{
			name:     "handles empty filename",
			filename: "   ",
			want:     "upload.bin",
		},
		{
			name:     "handles dot-only filename",
			filename: ".",
			want:     "upload.bin",
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := sanitizeArchiveFilename(tt.filename); got != tt.want {
				t.Fatalf("sanitizeArchiveFilename(%q) = %q, want %q", tt.filename, got, tt.want)
			}
		})
	}
}

func TestUniqueArchiveCircleDirectory(t *testing.T) {
	t.Parallel()

	t.Run("uses sanitised circle name", func(t *testing.T) {
		t.Parallel()
		used := map[string]bool{}
		if got := uniqueArchiveCircleDirectory("食品サンプル展示会", "id1", used); got != "食品サンプル展示会" {
			t.Fatalf("got %q, want %q", got, "食品サンプル展示会")
		}
	})

	t.Run("collapses traversal into a single segment", func(t *testing.T) {
		t.Parallel()
		used := map[string]bool{}
		got := uniqueArchiveCircleDirectory("../エスケープ", "id1", used)
		if got != "エスケープ" {
			t.Fatalf("got %q, want %q", got, "エスケープ")
		}
		if strings.Contains(got, "/") || strings.HasPrefix(got, "..") {
			t.Fatalf("circle name escapes archive layout: %q", got)
		}
	})

	t.Run("duplicate circle names do not collide", func(t *testing.T) {
		t.Parallel()
		used := map[string]bool{}
		first := uniqueArchiveCircleDirectory("食品", "id1", used)
		second := uniqueArchiveCircleDirectory("食品", "id2", used)
		if first == second {
			t.Fatalf("expected distinct directories, got %q for both", first)
		}
		if first != "食品" || !strings.HasPrefix(second, "食品_") {
			t.Fatalf("unexpected directories: %q, %q", first, second)
		}
	})

	t.Run("blank name falls back to encoded circle ID", func(t *testing.T) {
		t.Parallel()
		used := map[string]bool{}
		if got := uniqueArchiveCircleDirectory("   ", "id1", used); got != "id1" {
			t.Fatalf("got %q, want %q", got, "id1")
		}
	})
}

func TestArchiveEntryPath(t *testing.T) {
	t.Parallel()

	t.Run("contains question and file names", func(t *testing.T) {
		t.Parallel()
		got := archiveEntryPath("食品", "パンフレット用データ", "資料.pdf")
		want := "食品/パンフレット用データ_資料.pdf"
		if got != want {
			t.Fatalf("got %q, want %q", got, want)
		}
	})

	t.Run("cannot escape archive layout", func(t *testing.T) {
		t.Parallel()
		got := archiveEntryPath("食品", "質問\x00名", "../../../evil.pdf")
		segments := strings.Split(got, "/")
		if len(segments) != 2 {
			t.Fatalf("expected exactly one directory component, got %#v", segments)
		}
		for _, segment := range segments {
			if strings.HasPrefix(segment, "..") || strings.Contains(segment, "\x00") {
				t.Fatalf("entry segment escapes archive layout: %q", segment)
			}
		}
	})
}

func TestUniqueArchiveEntryName(t *testing.T) {
	t.Parallel()

	t.Run("keeps first name as-is", func(t *testing.T) {
		t.Parallel()
		used := map[string]bool{}
		if got := uniqueArchiveEntryName(used, "食品/資料.pdf"); got != "食品/資料.pdf" {
			t.Fatalf("got %q, want %q", got, "食品/資料.pdf")
		}
	})

	t.Run("dedupes before the extension", func(t *testing.T) {
		t.Parallel()
		used := map[string]bool{}
		first := uniqueArchiveEntryName(used, "食品/資料.pdf")
		second := uniqueArchiveEntryName(used, "食品/資料.pdf")
		third := uniqueArchiveEntryName(used, "食品/資料.pdf")
		if first != "食品/資料.pdf" || second != "食品/資料-1.pdf" || third != "食品/資料-2.pdf" {
			t.Fatalf("got %q, %q, %q", first, second, third)
		}
	})

	t.Run("skips names that are already used", func(t *testing.T) {
		t.Parallel()
		used := map[string]bool{}
		uniqueArchiveEntryName(used, "食品/資料-1.pdf")
		first := uniqueArchiveEntryName(used, "食品/資料.pdf")
		second := uniqueArchiveEntryName(used, "食品/資料.pdf")
		if first != "食品/資料.pdf" || second != "食品/資料-2.pdf" {
			t.Fatalf("got %q, %q", first, second)
		}
	})
}

func TestStaffFormAnswerUploadsZIPEntryNames(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	formID := "0195ec00-0014-7000-8000-000000000001"
	questionID := createTestUploadQuestion(t, server, cookies, formID, "pdf")

	recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms/"+formID+"/answers", map[string]any{
		"circleId": "0195ec00-0021-7000-8000-000000000001",
		"details":  map[string]any{},
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("create answer status = %d; want %d, body=%s", recorder.Code, http.StatusCreated, recorder.Body.String())
	}

	var created createStaffFormAnswerResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal created answer: %v", err)
	}

	recorder = doMultipartRequest(
		t,
		server,
		cookies,
		http.MethodPost,
		"/v1/staff/forms/"+formID+"/answers/"+created.Answer.ID+"/uploads",
		"file",
		"レイアウト図.pdf",
		[]byte("%PDF-1.4 layout"),
		"application/pdf",
		map[string]string{"questionId": questionID},
	)
	if recorder.Code != http.StatusCreated {
		t.Fatalf("upload status = %d; want %d, body=%s", recorder.Code, http.StatusCreated, recorder.Body.String())
	}

	recorder = doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/"+formID+"/answers/uploads.zip", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("download zip status = %d; want %d, body=%s", recorder.Code, http.StatusOK, recorder.Body.String())
	}

	reader, err := zip.NewReader(bytes.NewReader(recorder.Body.Bytes()), int64(recorder.Body.Len()))
	if err != nil {
		t.Fatalf("open zip: %v", err)
	}
	var entryNames []string
	for _, file := range reader.File {
		entryNames = append(entryNames, file.Name)
	}

	wantEntry := "デモ企画A/Test upload_レイアウト図.pdf"
	if !slices.Contains(entryNames, wantEntry) {
		t.Fatalf("expected zip entry %q, got %#v", wantEntry, entryNames)
	}

	contentDisposition := recorder.Header().Get(echo.HeaderContentDisposition)
	_, params, err := mime.ParseMediaType(contentDisposition)
	if err != nil {
		t.Fatalf("parse content disposition %q: %v", contentDisposition, err)
	}
	if got := params["filename"]; got != "展示チェックフォーム-answer-uploads.zip" {
		t.Fatalf("expected form name in content disposition, got %q in %q", got, contentDisposition)
	}
}

func TestStaffFormAnswerUploadsZIPGroupAnswersByCircle(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	cookies := map[string]*http.Cookie{}

	loginAsStaff(t, server, cookies)
	selectCircle(t, server, cookies, "0195ec00-0022-7000-8000-000000000001")
	authorizeStaff(t, server, cookies)

	formID := "0195ec00-0014-7000-8000-000000000001"
	circleID := "0195ec00-0021-7000-8000-000000000001"
	questionID := createTestUploadQuestion(t, server, cookies, formID, "pdf")

	var answerIDs []string
	for i := 0; i < 2; i++ {
		recorder := doJSONRequest(t, server, cookies, http.MethodPost, "/v1/staff/forms/"+formID+"/answers", map[string]any{
			"circleId": circleID,
			"details":  map[string]any{},
		})
		if recorder.Code != http.StatusCreated {
			t.Fatalf("create answer %d status = %d; want %d, body=%s", i, recorder.Code, http.StatusCreated, recorder.Body.String())
		}

		var created createStaffFormAnswerResponse
		if err := json.Unmarshal(recorder.Body.Bytes(), &created); err != nil {
			t.Fatalf("unmarshal created answer: %v", err)
		}
		answerIDs = append(answerIDs, created.Answer.ID)
	}

	uploadNames := []string{"レイアウト図.pdf", "機材図.pdf"}
	for i, answerID := range answerIDs {
		recorder := doMultipartRequest(
			t,
			server,
			cookies,
			http.MethodPost,
			"/v1/staff/forms/"+formID+"/answers/"+answerID+"/uploads",
			"file",
			uploadNames[i],
			[]byte("%PDF-1.4 layout"),
			"application/pdf",
			map[string]string{"questionId": questionID},
		)
		if recorder.Code != http.StatusCreated {
			t.Fatalf("upload %d status = %d; want %d, body=%s", i, recorder.Code, http.StatusCreated, recorder.Body.String())
		}
	}

	recorder := doJSONRequest(t, server, cookies, http.MethodGet, "/v1/staff/forms/"+formID+"/answers/uploads.zip", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("download zip status = %d; want %d, body=%s", recorder.Code, http.StatusOK, recorder.Body.String())
	}

	reader, err := zip.NewReader(bytes.NewReader(recorder.Body.Bytes()), int64(recorder.Body.Len()))
	if err != nil {
		t.Fatalf("open zip: %v", err)
	}
	var entryNames []string
	for _, file := range reader.File {
		entryNames = append(entryNames, file.Name)
	}

	for _, want := range []string{
		"デモ企画A/Test upload_レイアウト図.pdf",
		"デモ企画A/Test upload_機材図.pdf",
	} {
		if !slices.Contains(entryNames, want) {
			t.Fatalf("expected zip entry %q, got %#v", want, entryNames)
		}
	}
}
