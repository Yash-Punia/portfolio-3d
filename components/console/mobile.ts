import {useMediaQuery} from '@/components/console/useMediaQuery'

/**
 * SPEC §6's mobile breakpoint, and the one thing the phone case turns on.
 *
 * This module exists so both sides of the canvas boundary can read the same
 * definitions: the camera inside the scene frames the console from them, and
 * the DOM outside it labels its controls from them. It imports nothing from
 * three, so the DOM side can have it without pulling the 3D chunk into the page
 * bundle (SPEC §12).
 */
export const MOBILE_MAX_WIDTH = 640

/**
 * True below the mobile breakpoint. `false` on the server, which is the default
 * every caller wants.
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_MAX_WIDTH - 0.02}px)`)
}

/**
 * A phone held upright.
 *
 * This is the case the console turns sideways for: opened here, it rolls a
 * quarter turn so it is laid out along the phone's long axis, and the visitor
 * turns the phone to meet it. It is a handheld, so it should be held like one.
 *
 * A phone whose auto-rotate has already taken the viewport to landscape is not
 * this case — the browser has done the turning, and the console stays upright.
 * That is the whole of the auto-rotate handling: it needs no orientation API,
 * because a viewport wider than it is tall already says the phone is sideways.
 */
export function isPortraitPhone(width: number, height: number): boolean {
  return width < MOBILE_MAX_WIDTH && height > width
}
