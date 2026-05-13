package controllers

import "testing"

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
