import type {Tuning} from '@/components/console/tuning'

/**
 * The closed console asking to be opened, with no text (SPEC §5).
 *
 * Every `peekPeriodS` seconds the doors crack open and settle, and light from
 * inside glows out of the seam as far as they stand open. A pointer on a door
 * parts them a little; a press sinks them. The optional ripple taps the seam
 * just before each peek. Flap, SeamGlow and Ripple all read the same clock
 * through `ajarDeg`, so the crack and the glow cannot drift apart. The knobs are
 * in `tuning.ts` (`peek*`, `rippleOn`).
 */

/** How far a pressed door sinks into the body. */
export const SINK = 0.02
/** Seconds without input before the ripple starts tapping. */
export const IDLE = 3
/** Seconds into the period the peek waits, so a ripple lands first. */
const PEEK_AT = 0.25
const PEEK_FOR = 0.8

// ponytail: module singleton, fine while there is exactly one console on the page.
export const lure = {hover: false, pressed: false}

/** 0..1: one out-and-back crack per period. */
function peek(t: number, period: number): number {
  const phase = (t % period) - PEEK_AT
  if (phase < 0 || phase > PEEK_FOR) return 0
  return Math.sin((Math.PI * phase) / PEEK_FOR) ** 2
}

/** Degrees the closed doors should stand open at clock time `t`. */
export function ajarDeg(t: number, v: Tuning): number {
  if (lure.pressed) return 0
  const peeked = v.peekOn ? peek(t, v.peekPeriodS) * v.peekAngleDeg : 0
  return Math.max(peeked, lure.hover ? v.peekLeanDeg : 0)
}
