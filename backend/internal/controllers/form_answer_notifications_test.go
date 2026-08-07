package controllers

import (
	"context"
	"testing"

	"github.com/s-union/PortalDots/backend/internal/domain/answer"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/shared/emailqueue"
)

type recordingEmailSender struct {
	jobs []emailqueue.EmailJob
}

func (s *recordingEmailSender) Enqueue(_ context.Context, job emailqueue.EmailJob) error {
	s.jobs = append(s.jobs, job)
	return nil
}

func TestEnqueueWorkspaceFormAnswerMailExcludesDeprivilegedCreator(t *testing.T) {
	sender := &recordingEmailSender{}
	users := useradmin.NewStaticRepository(config.AuthUser{ID: "auth-user"}, []config.User{
		{
			ID:              "creator",
			ContactEmail:    "creator@example.com",
			Roles:           []string{"participant"},
			IsEmailVerified: true,
		},
		{
			ID:              "member",
			ContactEmail:    "member@example.com",
			CircleIDs:       []string{"circle"},
			IsEmailVerified: true,
		},
	})
	h := &workspaceHandlers{
		users: users,
		email: EmailContext{EmailSender: sender},
	}

	h.enqueueWorkspaceFormAnswerMail(context.Background(), "creator", formDetailResponse{
		Name:            "Application",
		CreatedByUserID: "creator",
	}, answer.Answer{CircleID: "circle", Body: "sensitive answer"})

	if len(sender.jobs) != 1 {
		t.Fatalf("enqueueWorkspaceFormAnswerMail() queued %d jobs; want member notification only", len(sender.jobs))
	}
	job := sender.jobs[0]
	if job.Subject != "申請「Application」を承りました" {
		t.Fatalf("enqueueWorkspaceFormAnswerMail() subject = %q; want member notification", job.Subject)
	}
	if len(job.To) != 1 || job.To[0] != "member@example.com" {
		t.Fatalf("enqueueWorkspaceFormAnswerMail() recipients = %#v; want member only", job.To)
	}
}

func TestEnqueueWorkspaceFormAnswerMailIncludesCurrentAnswerReader(t *testing.T) {
	sender := &recordingEmailSender{}
	users := useradmin.NewStaticRepository(config.AuthUser{ID: "auth-user"}, []config.User{
		{
			ID:              "creator",
			ContactEmail:    "creator@example.com",
			Permissions:     []string{"staff.forms.answers.read"},
			IsEmailVerified: true,
		},
	})
	h := &workspaceHandlers{
		users: users,
		email: EmailContext{EmailSender: sender},
	}

	h.enqueueWorkspaceFormAnswerMail(context.Background(), "creator", formDetailResponse{
		Name:            "Application",
		CreatedByUserID: "creator",
	}, answer.Answer{CircleID: "circle", Body: "sensitive answer"})

	if len(sender.jobs) != 1 {
		t.Fatalf("enqueueWorkspaceFormAnswerMail() queued %d jobs; want staff copy only", len(sender.jobs))
	}
	job := sender.jobs[0]
	if job.Subject != "【スタッフ用控え】申請「Application」を承りました" {
		t.Fatalf("enqueueWorkspaceFormAnswerMail() subject = %q; want staff copy", job.Subject)
	}
	if len(job.To) != 1 || job.To[0] != "creator@example.com" {
		t.Fatalf("enqueueWorkspaceFormAnswerMail() recipients = %#v; want current answer reader", job.To)
	}
}

func TestEnqueueWorkspaceFormAnswerMailUsesConfiguredRecipients(t *testing.T) {
	sender := &recordingEmailSender{}
	users := useradmin.NewStaticRepository(config.AuthUser{ID: "auth-user"}, []config.User{
		{
			ID:              "creator",
			ContactEmail:    "creator@example.com",
			Permissions:     []string{"staff.forms.answers.read"},
			IsEmailVerified: true,
		},
		{
			ID:              "staff-a",
			ContactEmail:    "staff-a@example.com",
			Permissions:     []string{"staff.forms.answers.read"},
			IsEmailVerified: true,
		},
		{
			ID:              "staff-b",
			ContactEmail:    "staff-b@example.com",
			Permissions:     []string{"staff.forms.answers.read"},
			IsEmailVerified: true,
		},
	})
	h := &workspaceHandlers{
		users: users,
		email: EmailContext{EmailSender: sender},
	}

	h.enqueueWorkspaceFormAnswerMail(context.Background(), "creator", formDetailResponse{
		Name:                     "Application",
		CreatedByUserID:          "creator",
		StaffNotificationUserIDs: []string{"staff-a", "staff-b"},
	}, answer.Answer{CircleID: "circle", Body: "sensitive answer"})

	if len(sender.jobs) != 1 {
		t.Fatalf("enqueueWorkspaceFormAnswerMail() queued %d jobs; want staff copy only", len(sender.jobs))
	}
	job := sender.jobs[0]
	if job.Subject != "【スタッフ用控え】申請「Application」を承りました" {
		t.Fatalf("enqueueWorkspaceFormAnswerMail() subject = %q; want staff copy", job.Subject)
	}
	if len(job.To) != 2 || job.To[0] != "staff-a@example.com" || job.To[1] != "staff-b@example.com" {
		t.Fatalf("enqueueWorkspaceFormAnswerMail() recipients = %#v; want configured staff only", job.To)
	}
}

func TestEnqueueWorkspaceFormAnswerMailExcludesDeprivilegedConfiguredRecipient(t *testing.T) {
	sender := &recordingEmailSender{}
	users := useradmin.NewStaticRepository(config.AuthUser{ID: "auth-user"}, []config.User{
		{
			ID:              "creator",
			ContactEmail:    "creator@example.com",
			Permissions:     []string{"staff.forms.answers.read"},
			IsEmailVerified: true,
		},
		{
			ID:              "staff-a",
			ContactEmail:    "staff-a@example.com",
			Permissions:     []string{"staff.forms.answers.read"},
			IsEmailVerified: true,
		},
		{
			ID:              "ex-staff",
			ContactEmail:    "ex-staff@example.com",
			Roles:           []string{"participant"},
			IsEmailVerified: true,
		},
	})
	h := &workspaceHandlers{
		users: users,
		email: EmailContext{EmailSender: sender},
	}

	h.enqueueWorkspaceFormAnswerMail(context.Background(), "creator", formDetailResponse{
		Name:                     "Application",
		CreatedByUserID:          "creator",
		StaffNotificationUserIDs: []string{"staff-a", "ex-staff"},
	}, answer.Answer{CircleID: "circle", Body: "sensitive answer"})

	if len(sender.jobs) != 1 {
		t.Fatalf("enqueueWorkspaceFormAnswerMail() queued %d jobs; want staff copy only", len(sender.jobs))
	}
	job := sender.jobs[0]
	if len(job.To) != 1 || job.To[0] != "staff-a@example.com" {
		t.Fatalf("enqueueWorkspaceFormAnswerMail() recipients = %#v; want eligible recipient only", job.To)
	}
}

func TestEnqueueWorkspaceFormAnswerMailSkipsUnknownRecipient(t *testing.T) {
	sender := &recordingEmailSender{}
	users := useradmin.NewStaticRepository(config.AuthUser{ID: "auth-user"}, []config.User{
		{
			ID:              "staff-a",
			ContactEmail:    "staff-a@example.com",
			Permissions:     []string{"staff.forms.answers.read"},
			IsEmailVerified: true,
		},
	})
	h := &workspaceHandlers{
		users: users,
		email: EmailContext{EmailSender: sender},
	}

	h.enqueueWorkspaceFormAnswerMail(context.Background(), "creator", formDetailResponse{
		Name:                     "Application",
		CreatedByUserID:          "creator",
		StaffNotificationUserIDs: []string{"missing-user", "staff-a"},
	}, answer.Answer{CircleID: "circle", Body: "sensitive answer"})

	if len(sender.jobs) != 1 {
		t.Fatalf("enqueueWorkspaceFormAnswerMail() queued %d jobs; want staff copy only", len(sender.jobs))
	}
	job := sender.jobs[0]
	if len(job.To) != 1 || job.To[0] != "staff-a@example.com" {
		t.Fatalf("enqueueWorkspaceFormAnswerMail() recipients = %#v; want known recipient only", job.To)
	}
}

func TestEnqueueWorkspaceFormAnswerMailFallsBackToCreator(t *testing.T) {
	sender := &recordingEmailSender{}
	users := useradmin.NewStaticRepository(config.AuthUser{ID: "auth-user"}, []config.User{
		{
			ID:              "creator",
			ContactEmail:    "creator@example.com",
			Permissions:     []string{"staff.forms.answers.read"},
			IsEmailVerified: true,
		},
	})
	h := &workspaceHandlers{
		users: users,
		email: EmailContext{EmailSender: sender},
	}

	h.enqueueWorkspaceFormAnswerMail(context.Background(), "creator", formDetailResponse{
		Name:            "Application",
		CreatedByUserID: "creator",
	}, answer.Answer{CircleID: "circle", Body: "sensitive answer"})

	if len(sender.jobs) != 1 {
		t.Fatalf("enqueueWorkspaceFormAnswerMail() queued %d jobs; want staff copy only", len(sender.jobs))
	}
	job := sender.jobs[0]
	if job.Subject != "【スタッフ用控え】申請「Application」を承りました" {
		t.Fatalf("enqueueWorkspaceFormAnswerMail() subject = %q; want staff copy", job.Subject)
	}
	if len(job.To) != 1 || job.To[0] != "creator@example.com" {
		t.Fatalf("enqueueWorkspaceFormAnswerMail() recipients = %#v; want creator fallback", job.To)
	}
}

func TestEnqueueWorkspaceFormAnswerMailWithEmptyRecipientsSendsNone(t *testing.T) {
	sender := &recordingEmailSender{}
	users := useradmin.NewStaticRepository(config.AuthUser{ID: "auth-user"}, []config.User{
		{
			ID:              "staff-a",
			ContactEmail:    "staff-a@example.com",
			Roles:           []string{"participant"},
			IsEmailVerified: true,
		},
	})
	h := &workspaceHandlers{
		users: users,
		email: EmailContext{EmailSender: sender},
	}

	h.enqueueWorkspaceFormAnswerMail(context.Background(), "", formDetailResponse{
		Name:                     "Application",
		StaffNotificationUserIDs: []string{"staff-a"},
	}, answer.Answer{CircleID: "circle", Body: "sensitive answer"})

	if len(sender.jobs) != 0 {
		t.Fatalf("enqueueWorkspaceFormAnswerMail() queued %d jobs; want none", len(sender.jobs))
	}
}
