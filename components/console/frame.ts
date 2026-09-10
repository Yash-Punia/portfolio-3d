import {isPortraitPhone} from '@/components/console/mobile'

/**
 * Turning screen pixels into the firmware panel's own frame.
 *
 * The open console rolls a quarter turn on an upright phone (SPEC §6), and the
 * panel is a rotated, scaled subtree of a `<Html transform>`. So a finger's
 * delta has to be turned before anything downstream — a rail drag, a scroll —
 * can name it, and measured before anything can size it.
 *
 * Both live here rather than in one of their callers because the rails inside
 * the firmware and the scroll handler outside the canvas need the same two, and
 * a second derivation is a second chance for a sign to disagree with
 * `Console`'s roll. If one sign flips, they all do.
 */

/** A screen delta, turned into the console's own frame. */
export function inConsoleFrame(dx: number, dy: number): {x: number; y: number} {
  const turned = isPortraitPhone(window.innerWidth, window.innerHeight)
  return turned ? {x: dy, y: -dx} : {x: dx, y: dy}
}

/**
 * How many screen pixels one pixel of a panel box measures.
 *
 * The firmware is authored at a fixed width and then scaled onto the glass, so
 * a finger that has travelled 100 screen pixels has moved more or fewer than
 * 100 of the panel's own. Rolled a quarter turn, the box's local height runs
 * along the screen's x, which is why the bounding rect's width is what is
 * measured there.
 */
export function panelScale(box: HTMLElement): number {
  const rect = box.getBoundingClientRect()
  const turned = isPortraitPhone(window.innerWidth, window.innerHeight)
  const onScreen = turned ? rect.width : rect.height
  const scale = box.offsetHeight > 0 ? onScreen / box.offsetHeight : 1
  return scale > 0 ? scale : 1
}
