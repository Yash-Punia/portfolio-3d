'use client'

import {Html} from '@react-three/drei'

import type {ConsoleContent} from '@/components/console/content'
import {htmlScale} from '@/components/console/htmlScale'
import {useSpec} from '@/components/console/spec'
import {useConsole} from '@/components/console/store'
import {Firmware} from '@/components/firmware/Firmware'
import {useFirmwareLayout} from '@/components/firmware/layout'

/**
 * The firmware, mounted on the screen plane (SPEC §7): real DOM in 3D space, so
 * the text is crisp, the links work and the layout is ordinary CSS.
 *
 * It is mounted only while the console is open, for the same reason the info
 * monitor is: DOM in 3D has no depth test, so a closed door would not hide it.
 *
 * `occlude="blending"` is deliberately not used. It writes the panel into the
 * depth buffer through a hidden mesh, which under this scene's orthographic,
 * dead-on camera buys nothing — nothing ever passes in front of the screen —
 * while costing an extra draw and, with the flaps swinging past at 172°, a
 * visible seam as the occluding plane fights the door.
 */
export function Screen({content}: {content: ConsoleContent}) {
  const {dimensions: d} = useSpec()
  const {panelWidth} = useFirmwareLayout()
  const isOpen = useConsole((state) => state.isOpen)

  if (!isOpen) return null

  return (
    <Html
      center
      // The glass is at bodyFront + 0.007; this sits a hair in front of it.
      position={[0, 0, d.z.bodyFront + 0.012]}
      // The panel is authored at the screen's own aspect, so scaling by width
      // alone lands it on the glass — see `deriveFirmwareLayout`.
      scale={htmlScale(d.screen.width, panelWidth)}
      transform
      // A drag that starts on the screen must not rotate the console (SPEC §5);
      // the screen mesh behind it already stops the event, and the DOM layer
      // over it never reaches R3F at all.
      zIndexRange={[10, 0]}
    >
      <Firmware content={content} />
    </Html>
  )
}
