import {useMediaQuery} from '@/components/console/useMediaQuery'

/**
 * SPEC §6's mobile breakpoint, and what the screen fills once the console is
 * open there.
 *
 * This module exists so both sides of the canvas boundary can read the same two
 * numbers: the camera inside the scene frames the glass with them, and the DOM
 * layer outside it sizes itself to the rectangle that produces. It imports
 * nothing from three, so the DOM side can have it without pulling the 3D chunk
 * into the page bundle (SPEC §12).
 */
export const MOBILE_MAX_WIDTH = 640

/** SPEC §6: open on a phone, the glass fills ~92% of the viewport width. */
export const SCREEN_FILL = 0.92

/**
 * True below SPEC §6's mobile breakpoint. `false` on the server, which is the
 * default every caller wants — the mobile layer mounts only while the console
 * is open, and it is never open at hydration.
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_MAX_WIDTH - 0.02}px)`)
}
