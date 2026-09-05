import {useThree} from '@react-three/fiber'

import {useSpec} from '@/components/console/spec'
import {useTuning} from '@/components/console/tuning'

/**
 * How much of the viewport the console should occupy, per SPEC §6. The console
 * is a square-ish object, so height is usually the binding constraint and the
 * vertical fills are set high — closed, it should own the middle of the screen.
 * Open it is roughly twice as wide, so the widths open up to match.
 */
function fillFor(width: number, isOpen: boolean) {
  if (width < 640) return {w: 0.88, h: 0.62}
  if (width < 1024) return isOpen ? {w: 0.94, h: 0.74} : {w: 0.8, h: 0.78}
  return isOpen ? {w: 0.86, h: 0.78} : {w: 0.62, h: 0.82}
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
  const {dimensions} = useSpec()
  const scaleClosed = useTuning((state) => state.values.zoomScaleClosed)
  const scaleOpen = useTuning((state) => state.values.zoomScaleOpen)
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)

  const wide = width >= 640
  const framed = isOpen && wide ? dimensions.open : dimensions.closed
  const fill = fillFor(width, isOpen)
  const scale = isOpen && wide ? scaleOpen : scaleClosed

  return Math.min((width * fill.w) / framed.width, (height * fill.h) / framed.height) * scale
}
