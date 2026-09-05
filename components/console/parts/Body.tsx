'use client'

import {useFrame} from '@react-three/fiber'
import {useMemo, useRef} from 'react'
import {Color, type MeshPhysicalMaterial} from 'three'

import type {ConsoleContent} from '@/components/console/content'
import {usePanelGeometry, type PanelSpec} from '@/components/console/geometry'
import {useSpec} from '@/components/console/spec'
import {useReducedMotion} from '@/components/console/useReducedMotion'
import {PowerSlider} from '@/components/console/parts/PowerSlider'
import {Screen} from '@/components/console/parts/Screen'
import {useConsole, useTheme} from '@/components/console/store'

/** Bezel floor sits a hair proud of the core's front face to avoid z-fighting. */
const BEZEL_FLOOR_DEPTH = 0.02

/**
 * The base slab, and the screen it carries. Closed, none of this is visible —
 * the flaps cover the whole front face.
 */
export function Body({content}: {content: ConsoleContent}) {
  const {dimensions: d, materials: m} = useSpec()

  const core = useMemo<PanelSpec>(
    () => ({
      width: d.body.width,
      height: d.body.height,
      depth: d.body.depth,
      radius: d.body.radius,
    }),
    [d],
  )
  /** The front frame, with the screen aperture cut out of it. */
  const frameSpec = useMemo<PanelSpec>(
    () => ({
      width: d.body.width,
      height: d.body.height,
      depth: d.face.depth,
      radius: d.body.radius,
      aperture: {
        width: d.face.apertureWidth,
        height: d.face.apertureHeight,
        radius: d.face.apertureRadius,
      },
    }),
    [d],
  )

  const coreGeometry = usePanelGeometry(core)
  const frameGeometry = usePanelGeometry(frameSpec)

  const isOpen = useConsole((state) => state.isOpen)
  const reducedMotion = useReducedMotion()
  const theme = useTheme()
  const glass = useRef<MeshPhysicalMaterial>(null)
  // The power slider flips this, and nothing else on the chassis (SPEC §5).
  const on = useMemo(() => new Color(m.screenOn[theme]), [m.screenOn, theme])
  const off = useMemo(() => new Color(m.screenOff), [m.screenOff])

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
    material.emissive.lerp(isOpen ? on : off, 1 - Math.exp(-7 * delta))
  })

  const bezelFloorZ = d.z.bodyFront + 0.005 - BEZEL_FLOOR_DEPTH / 2
  const screenZ = d.z.bodyFront + 0.007

  return (
    <group>
      <mesh geometry={coreGeometry}>
        <meshStandardMaterial {...m.shell} />
      </mesh>

      <mesh geometry={frameGeometry} position={[0, 0, d.z.bodyFront + d.face.depth / 2]}>
        <meshStandardMaterial {...m.shell} />
      </mesh>

      <mesh position={[0, 0, bezelFloorZ]}>
        <boxGeometry args={[d.face.apertureWidth, d.face.apertureHeight, BEZEL_FLOOR_DEPTH]} />
        <meshStandardMaterial {...m.bezel} />
      </mesh>

      {/*
        The screen. Its emissive prop is constant unless motion is reduced, so a
        re-render never snaps the lerp above back to its starting value.
      */}
      <mesh position={[0, 0, screenZ]} onPointerDown={(event) => event.stopPropagation()}>
        <planeGeometry args={[d.screen.width, d.screen.height]} />
        <meshPhysicalMaterial
          ref={glass}
          {...m.screenGlass}
          emissive={reducedMotion && isOpen ? m.screenOn[theme] : m.screenOff}
        />
      </mesh>

      <Screen content={content} />

      <PowerSlider />
    </group>
  )
}
