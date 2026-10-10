'use client'

import {useEffect, useState} from 'react'

import type {ConsoleContent} from '@/components/console/content'
import type {Device} from '@/components/console/device'
import {useT} from '@/components/console/tune'
import {DeskScreen} from '@/components/screen/DeskScreen'
import {HandheldScreen} from '@/components/screen/HandheldScreen'

/**
 * The console without a console: when WebGL cannot run, the same screen mounts
 * as ordinary DOM instead of on the glass in 3D. The screen knows nothing about
 * three.js, which is what makes this a few lines of mounting rather than a
 * second interface — every tab, tile and pill on it is already tappable, and
 * the keyboard handlers are on the DOM side.
 */

/** The `.console-controls` strip the panel must not sit under. */
const BOTTOM = 64

/** Past this the type stops reading as a screen and starts reading as a poster. */
const MAX_SCALE = 1.5

export default function FlatScreen({content, device}: {content: ConsoleContent; device: Device}) {
  const t = useT()
  const width = device === 'desk' ? t.deskGlassWidth : t.hhGlassWidth
  const height = device === 'desk' ? t.deskGlassHeight : t.hhGlassHeight
  const [scale, setScale] = useState(0)

  useEffect(() => {
    function fit() {
      setScale(
        Math.min(
          (window.innerWidth * 0.94) / width,
          ((window.innerHeight - BOTTOM) * 0.96) / height,
          MAX_SCALE,
        ),
      )
    }

    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [width, height])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        paddingBottom: BOTTOM,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Until the first measurement the panel would flash at its authored size.
        visibility: scale === 0 ? 'hidden' : 'visible',
      }}
    >
      <div style={{transform: `scale(${scale})`, transformOrigin: 'center'}}>
        {device === 'desk' ? (
          <DeskScreen content={content} />
        ) : (
          <HandheldScreen content={content} />
        )}
      </div>
    </div>
  )
}
