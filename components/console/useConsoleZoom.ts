import {useThree} from '@react-three/fiber'

import {isPortraitPhone} from '@/components/console/mobile'
import {useSpec} from '@/components/console/spec'
import {useTuning} from '@/components/console/tuning'

/**
 * How much of the viewport the console should occupy, per SPEC §6. The console
 * is a square-ish object, so height is usually the binding constraint and the
 * vertical fills are set high — closed, it should own the middle of the screen.
 * Open it is roughly twice as wide, so the widths open up to match.
 *
 * The turned case is its own row. An open console laid along a portrait phone's
 * long axis is being held, not looked at, so it takes nearly the whole viewport:
 * the flaps and every control on them have to be reachable, and there is nothing
 * else on the page to leave room for.
 */
function fillFor(width: number, isOpen: boolean, turned: boolean) {
  if (turned) return {w: 0.92, h: 0.94}
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
 *
 * When the console has rolled a quarter turn to lie along a portrait phone, its
 * footprint on the viewport is its own box with the sides swapped. That is the
 * whole of the turned framing: same fit, transposed.
 */
export function useConsoleZoom(isOpen: boolean): number {
  const {dimensions} = useSpec()
  const scaleClosed = useTuning((state) => state.values.zoomScaleClosed)
  const scaleOpen = useTuning((state) => state.values.zoomScaleOpen)
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)

  const turned = isOpen && isPortraitPhone(width, height)
  const box = isOpen ? dimensions.open : dimensions.closed
  const framed = turned ? {width: box.height, height: box.width} : box
  const fill = fillFor(width, isOpen, turned)
  const scale = isOpen ? scaleOpen : scaleClosed

  return Math.min((width * fill.w) / framed.width, (height * fill.h) / framed.height) * scale
}
