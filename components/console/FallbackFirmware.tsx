'use client'

import {useEffect, useState} from 'react'

import type {ConsoleContent} from '@/components/console/content'
import {useConsole} from '@/components/console/store'
import {Firmware} from '@/components/firmware/Firmware'
import {useFirmwareLayout} from '@/components/firmware/layout'

/**
 * The console without a console (SPEC §11.3): when WebGL cannot run, the same
 * firmware tree mounts as ordinary DOM instead of on a screen plane in 3D.
 *
 * `<Firmware>` knows nothing about whether it is in 3D, which is what makes this
 * eleven lines of mounting rather than a second interface to maintain — every
 * tile, dot, arrow and link inside it is already clickable, and `ConsoleStage`'s
 * keyboard handlers are on the DOM side and never touched the canvas. What is
 * lost is the object: there is no chassis to open, so the firmware is simply on.
 *
 * It ships in its own chunk, imported only down this path, so a visitor whose
 * browser does run WebGL never downloads it.
 */
/** Height of the `.console-controls` bar the panel must not sit under. */
const CONTROLS_STRIP = 64

/** Past this the type stops reading as a screen and starts reading as a poster. */
const MAX_SCALE = 1.5

export default function FallbackFirmware({content}: {content: ConsoleContent}) {
  const {panelWidth, panelHeight} = useFirmwareLayout()
  const open = useConsole((state) => state.open)
  const [scale, setScale] = useState(0)

  // There is no lid to lift, so the firmware boots as the page arrives.
  useEffect(() => open(), [open])

  // The panel is authored at a fixed pixel size and scaled onto the glass; with
  // no glass, it is scaled onto the viewport, less the strip the theme and mute
  // buttons stand in. Both axes are measured and the smaller wins, which on a
  // desktop is the height — so the cap only ever binds on a phone, where the
  // panel is authored at 320px for a glass this size and filling the width is
  // what the mobile layout table was written for.
  useEffect(() => {
    function fit() {
      setScale(
        Math.min(
          (window.innerWidth * 0.94) / panelWidth,
          ((window.innerHeight - CONTROLS_STRIP) * 0.96) / panelHeight,
          MAX_SCALE,
        ),
      )
    }

    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [panelWidth, panelHeight])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        paddingBottom: `${CONTROLS_STRIP}px`,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Until the first measurement the panel would flash at its authored
        // size, which on a phone is three times the viewport.
        visibility: scale === 0 ? 'hidden' : 'visible',
      }}
    >
      <div style={{transform: `scale(${scale})`, transformOrigin: 'center'}}>
        <Firmware content={content} />
      </div>
    </div>
  )
}
