//go:build ignore

package publichttp

import (
	"testing"
	"time"
)

func TestParticipantVerifyCodeStoreMatchUsesExactCode(t *testing.T) {
	t.Parallel()

	store := newParticipantVerifyCodeStore()
	now := time.Now().UTC()
	expiresAt := now.Add(5 * time.Minute)
	store.Put("session-1", "univemail", "123456", expiresAt)

	if !store.Match("session-1", "univemail", "123456", now) {
		t.Fatal("expected exact code match")
	}
	if store.Match("session-1", "univemail", "12345", now) {
		t.Fatal("expected different-length code not to match")
	}
	if store.Match("session-1", "univemail", "123457", now) {
		t.Fatal("expected different code not to match")
	}
	if store.Match("session-1", "univemail", "123456", expiresAt.Add(time.Second)) {
		t.Fatal("expected expired code not to match")
	}
}
