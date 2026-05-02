package database

import (
	"testing"

	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

func TestShouldReseedOnStartup(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		userCount int64
		cfg       config.Config
		want      bool
	}{
		{
			name:      "reseeds when database is empty",
			userCount: 0,
			cfg:       config.Config{},
			want:      true,
		},
		{
			name:      "reseeds in demo mode when sync is enabled",
			userCount: 1,
			cfg: config.Config{
				AllowDangerously:      true,
				SyncAuthUserOnStartup: true,
			},
			want: true,
		},
		{
			name:      "does not reseed in demo mode when sync is disabled",
			userCount: 1,
			cfg: config.Config{
				AllowDangerously:      true,
				SyncAuthUserOnStartup: false,
			},
			want: false,
		},
		{
			name:      "does not reseed outside demo mode",
			userCount: 1,
			cfg: config.Config{
				AllowDangerously:      false,
				SyncAuthUserOnStartup: true,
			},
			want: false,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := shouldReseedOnStartup(tt.userCount, tt.cfg)
			if got != tt.want {
				t.Fatalf("shouldReseedOnStartup(%d, cfg) = %t, want %t", tt.userCount, got, tt.want)
			}
		})
	}
}
