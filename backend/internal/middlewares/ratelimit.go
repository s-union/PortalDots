package middlewares

import (
	"net/http"
	"sync"
	"time"

	"github.com/labstack/echo/v5"
	"golang.org/x/time/rate"
)

// RateLimitConfig configures the IP-based rate limiter.
// Rate defines the sustained request rate (requests per second).
// Burst defines the maximum burst size.
type RateLimitConfig struct {
	Rate  rate.Limit
	Burst int
}

type ipRateLimiter struct {
	mu      sync.RWMutex
	entries map[string]*rateLimiterEntry
	rate    rate.Limit
	burst   int
}

type rateLimiterEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

func newIPRateLimiter(cfg RateLimitConfig) *ipRateLimiter {
	rl := &ipRateLimiter{
		entries: make(map[string]*rateLimiterEntry),
		rate:    cfg.Rate,
		burst:   cfg.Burst,
	}
	return rl
}

func (rl *ipRateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	entry, exists := rl.entries[ip]
	if !exists {
		entry = &rateLimiterEntry{
			limiter: rate.NewLimiter(rl.rate, rl.burst),
		}
		rl.entries[ip] = entry
	}
	entry.lastSeen = time.Now()
	rl.mu.Unlock()
	return entry.limiter.Allow()
}

func (rl *ipRateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	for ip, entry := range rl.entries {
		if time.Since(entry.lastSeen) > 5*time.Minute {
			delete(rl.entries, ip)
		}
	}
}

// RateLimitMiddleware returns a middleware that limits requests per IP.
// If cfg.Rate is 0, the middleware is a no-op.
func RateLimitMiddleware(cfg RateLimitConfig) echo.MiddlewareFunc {
	if cfg.Rate <= 0 {
		return func(next echo.HandlerFunc) echo.HandlerFunc {
			return next
		}
	}
	limiter := newIPRateLimiter(cfg)
	cleanupTicker := time.NewTicker(1 * time.Minute)
	go func() {
		for range cleanupTicker.C {
			limiter.cleanup()
		}
	}()
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			ip := c.RealIP()
			if !limiter.allow(ip) {
				return c.JSON(http.StatusTooManyRequests, map[string]string{
					"message": "rate_limit_exceeded",
				})
			}
			return next(c)
		}
	}
}
