import type {Screen} from '@/components/console/store'
import {useMediaQuery} from '@/components/console/useMediaQuery'

/**
 * Which of the two handhelds is on the page.
 *
 * `desk` is the wide, Switch-style console from the design's 4a; `handheld` is
 * the upright Game Boy from 4b. The split is the viewport's shape, not its
 * width: an upright viewport gets the upright console, and a phone turned
 * sideways gets the wide one, which is the shape it then has room for.
 *
 * No three.js here, so the DOM side can read it without pulling the 3D chunk
 * into the page bundle.
 */
export type Device = 'desk' | 'handheld'

/** `desk` on the server, which is what the first paint of a desktop wants. */
export function useDevice(): Device {
  return useMediaQuery('(orientation: portrait)') ? 'handheld' : 'desk'
}

/**
 * The tabs, in the order X walks them — the same on both consoles. About holds
 * the profile, the links and the Experience index (design turn 6).
 */
export const SCREENS: Screen[] = ['games', 'about']

export const SCREEN_LABELS: Record<Screen, string> = {
  games: 'Games',
  about: 'About',
}
