package externalid

import "testing"

func TestEncodeDecodeUUIDStringRoundTrip(t *testing.T) {
	t.Parallel()

	internal := "0195ec00-0031-7000-8000-000000000001"
	external, err := EncodeUUIDString(internal)
	if err != nil {
		t.Fatalf("EncodeUUIDString returned error: %v", err)
	}
	if external == internal || external == "" {
		t.Fatalf("expected opaque external id, got %q", external)
	}

	decoded, err := DecodeToUUIDString(external)
	if err != nil {
		t.Fatalf("DecodeToUUIDString returned error: %v", err)
	}
	if decoded != internal {
		t.Fatalf("expected %q, got %q", internal, decoded)
	}
}

func TestDecodeRejectsRawUUID(t *testing.T) {
	t.Parallel()

	if _, err := DecodeToUUIDString("0195ec00-0031-7000-8000-000000000001"); err == nil {
		t.Fatal("expected raw uuid to be rejected")
	}
}

func TestRewriteURLPathUUIDs(t *testing.T) {
	t.Parallel()

	got := RewriteURLPathUUIDs("/v1/public/pages/0195ec00-0031-7000-8000-000000000001?x=1")
	if got == "/v1/public/pages/0195ec00-0031-7000-8000-000000000001?x=1" {
		t.Fatalf("expected path uuid to be rewritten, got %q", got)
	}
	if got[:17] != "/v1/public/pages/" {
		t.Fatalf("unexpected rewritten url: %q", got)
	}
}
