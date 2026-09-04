'use client'

import {useFrame} from '@react-three/fiber'
import {useRef} from 'react'
import {Color, type MeshPhysicalMaterial} from 'three'

import {BODY, BODY_FRONT_Z, FACE, SCREEN} from '@/components/console/dimensions'
import {usePanelGeometry, type PanelSpec} from '@/components/console/geometry'
import {BEZEL, SCREEN_GLASS, SHELL} from '@/components/console/materials'
import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'

const CORE: PanelSpec = {
  width: BODY.width,
  height: BODY.height,
  depth: BODY.depth,
  radius: BODY.radius,
}

/** The front frame, with the screen aperture cut out of it. */
const FRAME: PanelSpec = {
  width: BODY.width,
  height: BODY.height,
  depth: FACE.depth,
  radius: BODY.radius,
  aperture: {
    width: FACE.apertureWidth,
    height: FACE.apertureHeight,
    radius: FACE.apertureRadius,
  },
}

/** Bezel floor sits a hair proud of the core's front face to avoid z-fighting. */
const BEZEL_FLOOR_DEPTH = 0.02
const BEZEL_FLOOR_Z = BODY_FRONT_Z + 0.005 - BEZEL_FLOOR_DEPTH / 2
const SCREEN_Z = BODY_FRONT_Z + 0.007

/** Powered off, and SPEC §9's dark screen background powered on. */
const SCREEN_OFF = '#000000'
const SCREEN_ON = '#0a0f12'
const OFF = new Color(SCREEN_OFF)
const ON = new Color(SCREEN_ON)

/**
 * The base slab, and the screen it carries. Closed, none of this is visible —
 * the flaps cover the whole front face; it gets its first look in Phase 2 when
 * they open.
 */
export function Body() {
  const core = usePanelGeometry(CORE)
  const frame = usePanelGeometry(FRAME)

  const isOpen = useConsole((state) => state.isOpen)
  const reducedMotion = useReducedMotion()
  const glass = useRef<MeshPhysicalMaterial>(null)

  /**
   * The screen powers up with the flaps and down when they close. This is the
   * "boot-free black screen plane" of SPEC §13 Phase 2: lit, no CRT sequence,
   * no content. The boot (§7) and everything on the screen are Phase 4.
   *
   * The glass itself lights up rather than a lit plane behind it — §4's glass
   * transmits ~0.1, so anything sitting behind it would be invisible anyway.
   */
  useFrame((_, delta) => {
    const material = glass.current
    if (!material || reducedMotion) return
    material.emissive.lerp(isOpen ? ON : OFF, 1 - Math.exp(-7 * delta))
  })

  return (
    <group>
      <mesh geometry={core}>
        <meshStandardMaterial {...SHELL} />
      </mesh>

      <mesh geometry={frame} position={[0, 0, BODY_FRONT_Z + FACE.depth / 2]}>
        <meshStandardMaterial {...SHELL} />
      </mesh>

      <mesh position={[0, 0, BEZEL_FLOOR_Z]}>
        <boxGeometry args={[FACE.apertureWidth, FACE.apertureHeight, BEZEL_FLOOR_DEPTH]} />
        <meshStandardMaterial {...BEZEL} />
      </mesh>

      {/*
        The screen. Its emissive prop is constant unless motion is reduced, so a
        re-render never snaps the lerp above back to its starting value.
      */}
      <mesh position={[0, 0, SCREEN_Z]}>
        <planeGeometry args={[SCREEN.width, SCREEN.height]} />
        <meshPhysicalMaterial
          ref={glass}
          {...SCREEN_GLASS}
          emissive={reducedMotion && isOpen ? SCREEN_ON : SCREEN_OFF}
        />
      </mesh>
    </group>
  )
}
