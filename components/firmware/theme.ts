import type {CSSProperties} from 'react'

import {useTuning} from '@/components/console/tuning'
import {useTheme, type Theme} from '@/components/console/store'

/**
 * SPEC §9's two screen palettes, as CSS custom properties set on whatever
 * element mounts the firmware. Both mounts — the `<Html transform>` on the
 * screen and Phase 6's fullscreen DOM layer — get their colours from here, and
 * so does the info monitor on the left flap, which is the same lit surface.
 *
 * The accent is not a constant: SPEC §9 names a red, but the console's accent is
 * a tuning value (§4 builds the form in code precisely so it stays tweakable),
 * and a screen that disagreed with the object it is set into would read as two
 * products. So the screen's selection colour is the chassis accent, adjusted
 * only as far as contrast requires.
 */
const BASE = {
  dark: {bg: '#0a0f12', fg: '#e9f0f1', muted: '#7c8b90', scanline: 0.03},
  /*
    SPEC §9's own light muted is #6b6f70, which measures 4.23:1 on this
    background — under the 4.5:1 the same section requires, and the reason it
    says to check rather than assume. Darkened to the nearest value that clears
    it (4.56:1); the hue is unchanged.
  */
  light: {bg: '#edeae2', fg: '#141819', muted: '#656a6b', scanline: 0.015},
} as const

/** SPEC §9: body text 4.5:1, large text 3:1. The accent carries both. */
const MIN_CONTRAST = 4.5

function toRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value
  const int = parseInt(full, 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

/** WCAG relative luminance. */
function luminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrast(a: string, b: string): number {
  const one = luminance(toRgb(a))
  const two = luminance(toRgb(b))
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05)
}

/**
 * The accent, moved away from the screen background in small steps until it
 * clears 4.5:1 against it — lightened on the dark theme, darkened on the warm
 * paper-white. Direction matters: darkening a red on a near-black background
 * makes it less readable, not more, and SPEC §9's own light-theme accent is a
 * deeper red than its dark-theme one for exactly this reason.
 *
 * This is what lets the screen take its selection colour from the chassis
 * (SPEC §16, confirmed) without trusting that whatever was dialled into the
 * tuning panel happens to be legible on both themes. Sixteen steps reaches
 * either end from any starting colour.
 */
function readableAccent(accent: string, bg: string): string {
  const lighten = luminance(toRgb(bg)) < 0.5
  let rgb = toRgb(accent)

  for (let step = 0; step < 16 && contrast(toHex(rgb), bg) < MIN_CONTRAST; step += 1) {
    rgb = rgb.map((c) => (lighten ? c + (255 - c) * 0.14 : c * 0.86)) as [number, number, number]
  }

  return toHex(rgb)
}

export interface ScreenPalette {
  bg: string
  fg: string
  muted: string
  accent: string
  scanline: number
}

export function screenPalette(theme: Theme, accent: string): ScreenPalette {
  const base = BASE[theme]
  return {...base, accent: readableAccent(accent, base.bg)}
}

/**
 * The palette as inline custom properties. Every firmware component reads
 * `var(--screen-fg)` and friends rather than importing colours, so the wrapper
 * is the single place a theme is chosen (SPEC §9).
 */
export function useScreenTheme(): {palette: ScreenPalette; vars: CSSProperties} {
  const theme = useTheme()
  const accent = useTuning((state) => state.values.accentColor)
  const palette = screenPalette(theme, accent)

  return {
    palette,
    vars: {
      '--screen-bg': palette.bg,
      '--screen-fg': palette.fg,
      '--screen-muted': palette.muted,
      '--screen-accent': palette.accent,
      '--screen-scanline': String(palette.scanline),
    } as CSSProperties,
  }
}
