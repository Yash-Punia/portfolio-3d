import {useThree} from '@react-three/fiber'

import {CONSOLE, CONSOLE_OPEN} from '@/components/console/dimensions'

/**
 * How much of the viewport the console should occupy, per SPEC §6. Closed,
 * mobile has the widest fill: the whole object must read on a phone, and that
 * is the first thing most visitors see. Open, the object is roughly twice as
 * wide, so the fill widens to keep it from shrinking into the middle of a
 * desktop viewport.
 */
function fillFor(width: number, isOpen: boolean) {
  if (width < 640) return {w: 0.88, h: 0.55}
  if (width < 1024) return isOpen ? {w: 0.94, h: 0.62} : {w: 0.72, h: 0.62}
  return isOpen ? {w: 0.86, h: 0.66} : {w: 0.58, h: 0.66}
}

/**
 * Orthographic zoom that keeps the console at a consistent proportion of the
 * screen at every breakpoint (SPEC §4). Recomputes on resize, because
 * `state.size` updates on resize.
 *
 * Below 640px the open console keeps the closed framing and the flaps are
 * allowed to clip out of frame — SPEC §6's mobile behaviour, whose other half
 * (the camera springing in on the screen) is Phase 6.
 *
 * R3F sets an orthographic frustum to the canvas pixel size, so at zoom 1 one
 * world unit is one CSS pixel — the zoom is therefore just pixels-per-unit.
 */
export function useConsoleZoom(isOpen: boolean): number {
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)

  const framed = isOpen && width >= 640 ? CONSOLE_OPEN : CONSOLE
  const fill = fillFor(width, isOpen)

  return Math.min((width * fill.w) / framed.width, (height * fill.h) / framed.height)
}
