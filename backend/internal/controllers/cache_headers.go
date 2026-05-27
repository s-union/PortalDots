package controllers

import (
	"fmt"

	"github.com/labstack/echo/v5"
)

func setCacheControlPublic(c *echo.Context, maxAgeSeconds int) {
	c.Response().Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d", maxAgeSeconds))
}
