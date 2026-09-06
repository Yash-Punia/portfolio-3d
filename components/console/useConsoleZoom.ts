import {useThree} from '@react-three/fiber'

import {MOBILE_MAX_WIDTH, SCREEN_FILL} from '@/components/console/mobile'
import {useSpec} from '@/components/console/spec'
import {useTuning} from '@/components/console/tuning'

/**
 * How much of the viewport the console should occupy, per SPEC §6. The console
 * is a square-ish object, so height is usually the binding constraint and the
 * vertical fills are set high — closed, it should own the middle of the screen.
 * Open it is roughly twice as wide, so the widths open up to match.
 *
 * Below 640px this is the closed case only: an open console on a phone is
 * framed on its screen instead, by the early return in the hook.
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
 * R3F sets an orthographic frustum to the canvas pixel size, so at zoom 1 one
 * world unit is one CSS pixel — the zoom is therefore just pixels-per-unit.
 * That is what makes SPEC §6's mobile framing one division: the glass is
 * `screen.width` units across, so filling 92% of the viewport with it is
 * `width * 0.92 / screen.width` and nothing else.
 */
export function useConsoleZoom(isOpen: boolean): number {
  const {dimensions} = useSpec()
  const scaleClosed = useTuning((state) => state.values.zoomScaleClosed)
  const scaleOpen = useTuning((state) => state.values.zoomScaleOpen)
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)

  const wide = width >= MOBILE_MAX_WIDTH

  /*
    SPEC §6: open on a phone, the camera frames the screen rather than the
    object, and the flaps are allowed to clip out of the frustum. The DOM layer
    that mounts over the glass is sized from the same `SCREEN_FILL`, so the two
    cannot disagree — which is also why `zoomScaleOpen` is deliberately not
    applied here. A tuning multiplier would slide the panel off the glass.
  */
  if (isOpen && !wide) return (width * SCREEN_FILL) / dimensions.screen.width

  const framed = isOpen && wide ? dimensions.open : dimensions.closed
  const fill = fillFor(width, isOpen)
  const scale = isOpen && wide ? scaleOpen : scaleClosed

  return Math.min((width * fill.w) / framed.width, (height * fill.h) / framed.height) * scale
}
