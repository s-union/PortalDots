package useradmin

import (
	"slices"
	"testing"
)

func TestMailRecipientsPrefersVerifiedContactEmail(t *testing.T) {
	t.Parallel()

	recipients := MailRecipients(User{
		LoginIDs:        []string{"24v2001@example.ac.jp"},
		ContactEmail:    "contact@example.com",
		IsEmailVerified: true,
	})

	if !slices.Equal(recipients, []string{"contact@example.com"}) {
		t.Fatalf("expected verified contact email recipient, got %#v", recipients)
	}
}

func TestMailRecipientsFallsBackToLoginEmailWhenContactIsUnverified(t *testing.T) {
	t.Parallel()

	recipients := MailRecipients(User{
		LoginIDs:        []string{"24v2001@example.ac.jp"},
		ContactEmail:    "contact@example.com",
		IsEmailVerified: false,
	})

	if !slices.Equal(recipients, []string{"24v2001@example.ac.jp"}) {
		t.Fatalf("expected login email recipient when contact email is unverified, got %#v", recipients)
	}
}

func TestMailRecipientsUsesPreferredRecipientPerUser(t *testing.T) {
	t.Parallel()

	recipients := MailRecipients(
		User{
			LoginIDs:        []string{"24v2001@example.ac.jp"},
			ContactEmail:    "contact-a@example.com",
			IsEmailVerified: true,
		},
		User{
			LoginIDs:        []string{"24v2002@example.ac.jp"},
			ContactEmail:    "contact-b@example.com",
			IsEmailVerified: false,
		},
	)

	if !slices.Equal(recipients, []string{"contact-a@example.com", "24v2002@example.ac.jp"}) {
		t.Fatalf("expected preferred recipients per user, got %#v", recipients)
	}
}
