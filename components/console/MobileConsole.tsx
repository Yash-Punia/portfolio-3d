'use client'

import {useCallback, useSyncExternalStore} from 'react'

import type {ConsoleContent} from '@/components/console/content'
import {SCREEN_FILL} from '@/components/console/mobile'
import {useSpec} from '@/components/console/spec'
import {useReducedMotion} from '@/components/console/useReducedMotion'
import {Firmware} from '@/components/firmware/Firmware'
import {useFirmwareLayout} from '@/components/firmware/layout'

/**
 * The viewport width in CSS pixels. The layer is sized from the same number the
 * camera frames the glass with, so a scale factor is needed — and a scale
 * factor cannot be a `calc()`, because CSS has no way to divide a length by a
 * length. Hence a real measurement rather than `92vw`.
 */
function useViewportWidth(): number {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener('resize', onChange)
    return () => window.removeEventListener('resize', onChange)
  }, [])

  return useSyncExternalStore(
    subscribe,
    () => window.innerWidth,
    // Never read on the server: the layer mounts only while the console is
    // open, and it is never open at hydration.
    () => 0,
  )
}

/**
 * SPEC §6 and §7's second mount: on a phone the firmware is a fixed DOM layer
 * rather than drei's `<Html transform>` on the screen mesh. Sharper text, native
 * hit-testing, no per-frame matrix — and the same `<Firmware />` tree, which is
 * what §7 means by one implementation and two mounts.
 *
 * The layer is glued to the glass, not to the viewport. `useConsoleZoom` frames
 * the screen at `SCREEN_FILL` of the viewport width and the box below is that
 * same rectangle, so the chassis and its bezel still surround it: on a phone the
 * console is still the object, not a web page that replaced it.
 *
 * The camera damps into that framing over roughly half a second, so the layer
 * fades in behind the boot rather than overhanging the glass on the way.
 */
export function MobileConsole({content}: {content: ConsoleContent}) {
  const {dimensions: d} = useSpec()
  const layout = useFirmwareLayout()
  const reducedMotion = useReducedMotion()
  const width = useViewportWidth()

  const glass = width * SCREEN_FILL

  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        top: '50%',
        width: `${glass}px`,
        height: `${(glass * d.screen.height) / d.screen.width}px`,
        transform: 'translate(-50%, -50%)',
        overflow: 'hidden',
        /*
          Deliberately no `touch-action: none` here, unlike the canvas and the
          control overlay. The detail view is a real scrolling box, and
          `touch-action` is intersected down the ancestor chain — `none` on this
          layer would take a descendant's `pan-y` with it and leave the panel
          unscrollable by finger. Nothing else on the page scrolls (`body` is
          `overflow: hidden`), so there is nothing to suppress.
        */
        zIndex: 1,
        animation: reducedMotion ? undefined : 'firmware-fade 180ms ease-out 260ms both',
      }}
    >
      {/*
        The panel is authored at `panelWidth` and scaled onto the glass, exactly
        as the `<Html transform>` mount scales it onto the screen mesh. The
        mobile layout table is what keeps that scale near 1 — the desktop panel
        shrunk to this width would be unreadable.
      */}
      <div style={{transform: `scale(${glass / layout.panelWidth})`, transformOrigin: 'top left'}}>
        <Firmware content={content} />
      </div>
    </div>
  )
}
