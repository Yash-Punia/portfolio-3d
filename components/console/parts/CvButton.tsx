'use client'

import {animated, useSpring} from '@react-spring/three'
import {useEffect, useState} from 'react'
import {DoubleSide} from 'three'

import {isLocalHref, RESUME_FILENAME} from '@/components/console/content'
import {useGlyphGeometry} from '@/components/console/glyphs'
import {usePanelGeometry} from '@/components/console/geometry'
import {useSpec} from '@/components/console/spec'
import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'

/** How far the housing pill is inset behind the cap. */
const HOUSING_MARGIN = 0.03
const HOUSING_DEPTH = 0.022

/**
 * The resume download button on the left flap (SPEC §4).
 *
 * `href` is resolved by `resumeHref()` — a Sanity asset when one is uploaded,
 * the committed PDF otherwise — and the button is not rendered at all when
 * there is nothing to download (SPEC §3.2: never link to a 404).
 */
export function CvButton({href}: {href: string}) {
  const {dimensions: d, materials: m} = useSpec()
  const isOpen = useConsole((state) => state.isOpen)
  const reducedMotion = useReducedMotion()
  const [pressed, setPressed] = useState(false)

  const cap = usePanelGeometry({
    width: d.cvButton.width,
    height: d.cvButton.height,
    depth: d.cvButton.depth,
    radius: d.cvButton.height / 2,
    bevel: 0.008,
  })
  const housing = usePanelGeometry({
    width: d.cvButton.width + HOUSING_MARGIN * 2,
    height: d.cvButton.height + HOUSING_MARGIN * 2,
    depth: HOUSING_DEPTH,
    radius: d.cvButton.height / 2 + HOUSING_MARGIN,
    bevel: 0.006,
  })
  const glyph = useGlyphGeometry('download', d.cvButton.height * 0.56)

  const capZ = HOUSING_DEPTH + d.cvButton.depth / 2
  const {z} = useSpring({
    z: pressed ? capZ - d.cvButton.travel : capZ,
    config: {tension: 700, friction: 26},
    immediate: reducedMotion,
  })

  const hover = (on: boolean) => {
    document.body.style.cursor = on && isOpen ? 'pointer' : ''
  }

  // Closing under a stationary pointer fires no pointerout, so the cursor has
  // to be dropped when the flap carries the button away.
  useEffect(() => {
    if (isOpen) return
    document.body.style.cursor = ''
  }, [isOpen])

  const download = () => {
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.rel = 'noopener noreferrer'
    // Cross-origin (Sanity) hrefs ignore `download`; those carry `?dl=` instead.
    if (isLocalHref(href)) anchor.download = RESUME_FILENAME
    anchor.click()
  }

  return (
    <group position={[0, d.cvButton.y, d.faceZ]} rotation={[0, Math.PI, 0]}>
      <mesh geometry={housing} position={[0, 0, HOUSING_DEPTH / 2]}>
        <meshStandardMaterial {...m.bezel} />
      </mesh>

      <animated.group position-z={z}>
        <mesh
          geometry={cap}
          onClick={(event) => {
            event.stopPropagation()
            if (isOpen) download()
          }}
          onPointerDown={(event) => {
            event.stopPropagation()
            setPressed(true)
          }}
          onPointerUp={() => setPressed(false)}
          onPointerOver={() => hover(true)}
          onPointerOut={() => {
            setPressed(false)
            hover(false)
          }}
        >
          <meshStandardMaterial {...m.button} />
        </mesh>

        <mesh geometry={glyph} position={[0, 0, d.cvButton.depth / 2 + 0.002]} raycast={() => null}>
          <meshStandardMaterial {...m.bezel} side={DoubleSide} />
        </mesh>
      </animated.group>
    </group>
  )
}
