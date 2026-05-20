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

	senderOnlyLeader := contactCircleConfirmationRecipients(users, "circle-a", "leader", false)
	if !slices.Equal(senderOnlyLeader, []string{"leader@example.com"}) {
		t.Fatalf("expected sender-only (leader) recipient, got %#v", senderOnlyLeader)
	}

	senderOnlySubleader := contactCircleConfirmationRecipients(users, "circle-a", "subleader", false)
	if !slices.Equal(senderOnlySubleader, []string{"subleader@example.com"}) {
		t.Fatalf("expected sender-only (subleader) recipient, got %#v", senderOnlySubleader)
	}

	// 複数リーダーがいても ccSubleader=false のとき送信者のみに送る
	multiLeaderUsers := []useradmin.User{
		{
			ID:              "leader2",
			DisplayName:     "Leader2",
			ContactEmail:    "leader2@example.com",
			LeaderCircleIDs: []string{"circle-a"},
			IsEmailVerified: true,
		},
		users[0], // leader
		users[1], // subleader
	}
	multiLeaderSenderOnly := contactCircleConfirmationRecipients(multiLeaderUsers, "circle-a", "leader", false)
	if !slices.Equal(multiLeaderSenderOnly, []string{"leader@example.com"}) {
		t.Fatalf("expected sender-only even with multiple leaders, got %#v", multiLeaderSenderOnly)
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
