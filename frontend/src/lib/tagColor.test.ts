import { describe, expect, it } from 'vitest'

interface Rgb {
  r: number
  g: number
  b: number
}

interface PaletteEntry {
  color: Rgb
  tint: Rgb
  tintAlpha: number
}

// Mirrors the token values declared in src/styles/app.css. The chip background
// is the translucent --color-tag-*-light tint composited over the container
// surface, and the label is the --color-tag-* text token.
const LIGHT_PALETTE: Record<string, PaletteEntry> = {
  gray: { color: { r: 88, g: 97, b: 105 }, tint: { r: 88, g: 97, b: 105 }, tintAlpha: 0.12 },
  red: { color: { r: 179, g: 42, b: 45 }, tint: { r: 190, g: 45, b: 48 }, tintAlpha: 0.12 },
  orange: { color: { r: 150, g: 75, b: 10 }, tint: { r: 175, g: 88, b: 12 }, tintAlpha: 0.14 },
  green: { color: { r: 16, g: 111, b: 53 }, tint: { r: 18, g: 125, b: 60 }, tintAlpha: 0.12 },
  blue: { color: { r: 18, g: 95, b: 186 }, tint: { r: 20, g: 105, b: 205 }, tintAlpha: 0.12 },
  purple: { color: { r: 120, g: 60, b: 185 }, tint: { r: 120, g: 60, b: 185 }, tintAlpha: 0.14 }
}

const DARK_PALETTE: Record<string, PaletteEntry> = {
  gray: { color: { r: 183, g: 183, b: 183 }, tint: { r: 160, g: 160, b: 160 }, tintAlpha: 0.18 },
  red: { color: { r: 238, g: 168, b: 170 }, tint: { r: 226, g: 118, b: 120 }, tintAlpha: 0.22 },
  orange: { color: { r: 241, g: 181, b: 124 }, tint: { r: 235, g: 155, b: 80 }, tintAlpha: 0.22 },
  green: { color: { r: 124, g: 208, b: 156 }, tint: { r: 75, g: 189, b: 119 }, tintAlpha: 0.22 },
  blue: { color: { r: 158, g: 191, b: 245 }, tint: { r: 110, g: 160, b: 240 }, tintAlpha: 0.22 },
  purple: { color: { r: 210, g: 176, b: 243 }, tint: { r: 185, g: 135, b: 235 }, tintAlpha: 0.22 }
}

// Containers where TagChip/StaffTagPicker chips actually render, from
// app.css --color-surface* / --color-page / --color-form-control /
// --color-grid-table-stripe. The worst-case (lowest-contrast) surface per
// theme is included so the guarantee holds on every real screen.
const LIGHT_CONTAINERS = [
  { r: 255, g: 255, b: 255 },
  { r: 250, g: 250, b: 252 },
  { r: 243, g: 244, b: 250 },
  { r: 237, g: 239, b: 244 },
  composite({ r: 237, g: 239, b: 244 }, 0.4, { r: 255, g: 255, b: 255 })
]

const DARK_CONTAINERS = [
  { r: 30, g: 30, b: 30 },
  { r: 40, g: 40, b: 40 },
  { r: 46, g: 46, b: 46 },
  { r: 51, g: 51, b: 51 },
  composite({ r: 255, g: 255, b: 255 }, 0.075, { r: 30, g: 30, b: 30 }),
  composite({ r: 0, g: 0, b: 0 }, 0.25, { r: 30, g: 30, b: 30 })
]

function composite(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  return {
    r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    b: Math.round(fg.b * alpha + bg.b * (1 - alpha))
  }
}

function channelToLinear(channel: number): number {
  const value = channel / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b)
}

function contrastRatio(fg: Rgb, bg: Rgb): number {
  const lighter = Math.max(relativeLuminance(fg), relativeLuminance(bg))
  const darker = Math.min(relativeLuminance(fg), relativeLuminance(bg))
  return (lighter + 0.05) / (darker + 0.05)
}

describe('tag palette contrast', () => {
  it.each([
    ['light', LIGHT_PALETTE, LIGHT_CONTAINERS],
    ['dark', DARK_PALETTE, DARK_CONTAINERS]
  ] as const)('%s theme labels keep a 4.5:1 ratio on every real chip background', (theme, palette, containers) => {
    for (const [token, { color, tint, tintAlpha }] of Object.entries(palette)) {
      for (const container of containers) {
        const chipBackground = composite(tint, tintAlpha, container)
        expect(
          contrastRatio(color, chipBackground),
          `${theme} ${token} on ${JSON.stringify(container)}`
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
