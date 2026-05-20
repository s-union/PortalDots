package controllers

import (
	"slices"
	"testing"

	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
)

func TestContactHistoryMatchesRenamedCircleAndUser(t *testing.T) {
	t.Parallel()

	body := "PortalDots contact request\nfrom: Old User (0195ec00-0051-7000-8000-000000000001)\ncircle: Old Circle (0195ec00-0021-7000-8000-000000000001)\n"
	if !contactHistoryMatches(body, "0195ec00-0021-7000-8000-000000000001", "0195ec00-0051-7000-8000-000000000001") {
		t.Fatal("expected contact history to match by IDs without current names")
	}

	if contactHistoryMatches(body, "0195ec00-0022-7000-8000-000000000001", "0195ec00-0051-7000-8000-000000000001") {
		t.Fatal("expected different circle ID not to match")
	}
}

func TestContactCircleConfirmationRecipients(t *testing.T) {
	t.Parallel()

	users := []useradmin.User{
		{
			ID:              "leader",
			DisplayName:     "Leader",
			ContactEmail:    "leader@example.com",
			LeaderCircleIDs: []string{"circle-a"},
			IsEmailVerified: true,
		},
		{
			ID:              "subleader",
			DisplayName:     "Subleader",
			ContactEmail:    "subleader@example.com",
			IsEmailVerified: true,
		},
	}

	withSubleader := contactCircleConfirmationRecipients(users, "circle-a", "leader", true)
	if !slices.Equal(withSubleader, []string{"leader@example.com", "subleader@example.com"}) {
		t.Fatalf("expected leader and subleader recipients, got %#v", withSubleader)
	}

	leaderOnly := contactCircleConfirmationRecipients(users, "circle-a", "leader", false)
	if !slices.Equal(leaderOnly, []string{"leader@example.com"}) {
		t.Fatalf("expected leader-only recipients, got %#v", leaderOnly)
	}

	senderOnly := contactCircleConfirmationRecipients(users, "circle-a", "subleader", false)
	if !slices.Equal(senderOnly, []string{"subleader@example.com"}) {
		t.Fatalf("expected subleader sender recipient, got %#v", senderOnly)
	}
}

func TestContactShouldCCSubleaderDefaultsToTrue(t *testing.T) {
	t.Parallel()

	if !contactShouldCCSubleader(nil) {
		t.Fatal("expected omitted ccSubleader to preserve shared confirmation behavior")
	}

	disabled := false
	if contactShouldCCSubleader(&disabled) {
		t.Fatal("expected explicit false ccSubleader to disable subleader sharing")
	}
}
