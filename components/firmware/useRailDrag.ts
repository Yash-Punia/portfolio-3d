'use client'

import {useRef, useState, type PointerEvent as ReactPointerEvent} from 'react'

import {inConsoleFrame, panelScale} from '@/components/console/frame'

/**
 * A horizontal rail the visitor can throw with a finger.
 *
 * Both rails translate so the selection sits at a fixed place, which made them
 * navigable only one tap at a time — you had to hit the tile you wanted. This
 * adds the gesture a carousel is expected to have: the row follows the finger,
 * and on release it snaps to whichever item is nearest. The tap-to-select path
 * is untouched; `moved` is what tells the caller to swallow a click that was
 * really the end of a drag.
 *
 * Deltas go through `inConsoleFrame` and `panelScale` — the panel is a rotated,
 * scaled subtree of a `<Html transform>`, so neither the direction nor the
 * distance of a finger is what it looks like until those two have had it.
 *
 * ponytail: no fling. The row tracks the finger and settles where it lifts;
 * momentum is a spring and a rAF loop away if it is missed on a real device.
 */

/** Pointer travel that still counts as a tap rather than a drag (SPEC §5). */
const TAP_PX = 6

export interface RailDrag {
  /** Pixels to add to the rail's own translate while a finger is on it. */
  offset: number
  dragging: boolean
  /** True until the next pointerdown if the gesture was a drag, not a tap. */
  moved: () => boolean
  handlers: {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void
  }
}

export function useRailDrag({
  step,
  index,
  count,
  setIndex,
}: {
  /** Distance along the rail between one item and the next, in panel pixels. */
  step: number
  index: number
  count: number
  setIndex: (index: number) => void
}): RailDrag {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{x: number; y: number; scale: number} | null>(null)
  const travelled = useRef(false)

  const finish = (event: ReactPointerEvent<HTMLElement>) => {
    const from = start.current
    start.current = null
    setDragging(false)
    setOffset(0)
    if (!from || count === 0) return

    const {x} = inConsoleFrame(event.clientX - from.x, event.clientY - from.y)
    const shift = x / from.scale
    if (Math.abs(shift) < TAP_PX) return

    // Where the rail was left, read back as an index. The row's translate is
    // `-index * step + shift`, so the item now under the selection slot is that
    // divided back out — round, and clamp: no wrap and no bounce (SPEC §3.2).
    const next = Math.round((index * step - shift) / step)
    setIndex(Math.min(Math.max(next, 0), count - 1))
  }

  return {
    offset,
    dragging,
    moved: () => travelled.current,
    handlers: {
      onPointerDown: (event) => {
        travelled.current = false
        start.current = {
          x: event.clientX,
          y: event.clientY,
          scale: panelScale(event.currentTarget),
        }
        // Implicit capture is a touch pointer's only; taking it explicitly
        // means a mouse dragged off the rail still finishes here. It is a
        // convenience, not the mechanism — a browser that refuses the capture
        // still gets the drag, so a throw here must not end the gesture.
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          // No capture. The handlers on the element are enough.
        }
        setDragging(true)
      },
      onPointerMove: (event) => {
        const from = start.current
        if (!from) return

        const {x, y} = inConsoleFrame(event.clientX - from.x, event.clientY - from.y)
        // The dominant axis wins outright: a drag down a scrolling panel that
        // began on the rail is that panel's, not the rail's.
        if (Math.abs(x) <= Math.abs(y)) return

        const shift = x / from.scale
        if (Math.abs(shift) > TAP_PX) travelled.current = true
        setOffset(shift)
      },
      onPointerUp: finish,
      onPointerCancel: finish,
    },
  }
}
