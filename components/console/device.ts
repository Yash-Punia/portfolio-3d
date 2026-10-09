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
 * Each console's tabs, in the order MENU walks them. The handheld has no
 * Contact: its About holds the links and the résumé (design 4b, M3).
 */
export const SCREENS: Record<Device, Screen[]> = {
  desk: ['games', 'about', 'contact'],
  handheld: ['games', 'about'],
}

export const SCREEN_LABELS: Record<Screen, string> = {
  games: 'Games',
  about: 'About',
  contact: 'Contact',
}

/** Whether a tab is a list the D-pad walks row by row, rather than a page it scrolls. */
export function hasRows(screen: Screen, device: Device): boolean {
  return device === 'desk' ? screen === 'contact' : screen === 'about'
}
