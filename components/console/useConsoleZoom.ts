import {useThree} from '@react-three/fiber'

/**
 * How much of the viewport the console should occupy, per SPEC §6. Mobile has
 * the widest fill: closed, the whole object must read on a phone, and that is
 * the first thing most visitors see.
 */
function fillFor(width: number) {
  if (width < 640) return {w: 0.88, h: 0.55}
  if (width < 1024) return {w: 0.72, h: 0.62}
  return {w: 0.58, h: 0.66}
}

/**
 * Orthographic zoom that keeps the console at a consistent proportion of the
 * screen at every breakpoint (SPEC §4). Recomputes on resize, because
 * `state.size` updates on resize.
 *
 * R3F sets an orthographic frustum to the canvas pixel size, so at zoom 1 one
 * world unit is one CSS pixel — the zoom is therefore just pixels-per-unit.
 */
export function useConsoleZoom(worldWidth: number, worldHeight: number): number {
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)
  const fill = fillFor(width)

  return Math.min((width * fill.w) / worldWidth, (height * fill.h) / worldHeight)
}
