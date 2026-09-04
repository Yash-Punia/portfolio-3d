'use client'

import {animated, useSpring} from '@react-spring/three'
import {useFrame} from '@react-three/fiber'
import {useEffect, useRef} from 'react'
import {MathUtils, type MeshStandardMaterial} from 'three'

import {
  FLAP,
  FLAP_CLOSED_Z,
  FLAP_OPEN_ANGLE,
  HINGE_X,
  PANEL,
  SEAM,
} from '@/components/console/dimensions'
import {usePanelGeometry, type PanelSpec} from '@/components/console/geometry'
import {ACCENT, SHELL} from '@/components/console/materials'
import {CloseButton} from '@/components/console/parts/CloseButton'
import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'

export type FlapSide = 'left' | 'right'

/**
 * Outer corners are rounded; the inner corners — the ones that meet at the
 * centre seam — stay square, so the closed seam is a true hairline.
 */
const OUTER: Record<FlapSide, PanelSpec> = {
  left: {
    width: FLAP.width,
    height: FLAP.height,
    depth: FLAP.depth,
    radius: {tl: FLAP.radius, bl: FLAP.radius, tr: 0, br: 0},
    bevel: 0.018,
  },
  right: {
    width: FLAP.width,
    height: FLAP.height,
    depth: FLAP.depth,
    radius: {tr: FLAP.radius, br: FLAP.radius, tl: 0, bl: 0},
    bevel: 0.018,
  },
}

/**
 * A raised border laid over the flap face, which reads as a shallow moulded
 * panel recessed into it. Its four inner edges are the only thing on an
 * otherwise coplanar face for the key light and the rim lightformer to catch.
 */
const MOULDING: Record<FlapSide, PanelSpec> = {
  left: {
    width: FLAP.width,
    height: FLAP.height,
    depth: PANEL.depth,
    radius: {tl: FLAP.radius, bl: FLAP.radius, tr: 0, br: 0},
    aperture: {
      width: FLAP.width - PANEL.margin * 2,
      height: FLAP.height - PANEL.margin * 2,
      radius: PANEL.radius,
    },
    bevel: 0.007,
  },
  right: {
    width: FLAP.width,
    height: FLAP.height,
    depth: PANEL.depth,
    radius: {tr: FLAP.radius, br: FLAP.radius, tl: 0, bl: 0},
    aperture: {
      width: FLAP.width - PANEL.margin * 2,
      height: FLAP.height - PANEL.margin * 2,
      radius: PANEL.radius,
    },
    bevel: 0.007,
  },
}

/** Distance from the flap's own centre to its inner (seam) edge. */
const HALF_WIDTH = FLAP.width / 2
const BAND_X = HALF_WIDTH - SEAM.bandWidth / 2
const BAND_HEIGHT = FLAP.height - FLAP.radius * 2
const BAND_Z = FLAP.depth / 2 + PANEL.depth + SEAM.bandDepth / 2 - 0.003

/** Resting glow on the seam, and how far the idle pulse lifts it (SPEC §5). */
const GLOW_BASE = 0.16
const GLOW_SWING = 0.2

/**
 * One front door.
 *
 * The outer `<group>` is the hinge pivot, sitting on the flap's outer edge:
 * Phase 1 built it at rotation 0 so this phase only has to spring it. Left
 * opens negative, right positive, which is why `sign` flips the rotation.
 */
export function Flap({side}: {side: FlapSide}) {
  const outer = usePanelGeometry(OUTER[side])
  const moulding = usePanelGeometry(MOULDING[side])
  const sign = side === 'left' ? 1 : -1

  const isOpen = useConsole((state) => state.isOpen)
  const open = useConsole((state) => state.open)
  const reducedMotion = useReducedMotion()
  const band = useRef<MeshStandardMaterial>(null)

  const {rotation} = useSpring({
    rotation: isOpen ? -sign * FLAP_OPEN_ANGLE : 0,
    // SPEC §5, with the right flap trailing so the pair does not read as one
    // mechanism. Reduced motion opens it instantly instead (SPEC §11.5).
    config: {tension: 170, friction: 22},
    delay: side === 'right' && !reducedMotion ? 60 : 0,
    immediate: reducedMotion,
  })

  // The soft pulsing glow on the seam strip that makes the closed console read
  // as alive and clickable without any text prompt (SPEC §5).
  useFrame((state, delta) => {
    const material = band.current
    if (!material || reducedMotion) return

    const pulse = GLOW_BASE + GLOW_SWING * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 1.5))
    material.emissiveIntensity = MathUtils.damp(
      material.emissiveIntensity,
      isOpen ? 0 : pulse,
      4,
      delta,
    )
  })

  /**
   * Closed flaps are the `interactive` group of SPEC §5; open ones are inert,
   * so an open flap neither swallows clicks nor fights the close button for the
   * cursor as its events bubble past. Opening under a stationary pointer fires
   * no pointerout — R3F only re-raycasts when the pointer itself moves — so the
   * effect drops the cursor when the door the visitor just clicked swings away.
   */
  const hover = (on: boolean) => {
    // Once open the flap keeps its hands off the cursor entirely: its events
    // bubble past the close button's, and clearing here would undo them.
    if (isOpen) return
    document.body.style.cursor = on ? 'pointer' : ''
  }

  useEffect(() => {
    if (!isOpen) return
    document.body.style.cursor = ''
  }, [isOpen])

  return (
    <animated.group position={[sign * -HINGE_X, 0, FLAP_CLOSED_Z]} rotation-y={rotation}>
      {/*
        The handlers sit on the group, not on one mesh: the moulding covers most
        of the face, and R3F bubbles a child's pointer events up to its parent,
        so this makes the whole door the target rather than the sliver of shell
        around the moulding.
      */}
      <group
        position={[sign * HALF_WIDTH, 0, 0]}
        onClick={(event) => {
          if (isOpen) return
          event.stopPropagation()
          open()
        }}
        onPointerOver={() => hover(true)}
        onPointerOut={() => hover(false)}
      >
        <mesh geometry={outer}>
          <meshStandardMaterial {...SHELL} />
        </mesh>

        <mesh geometry={moulding} position={[0, 0, (FLAP.depth + PANEL.depth) / 2]}>
          <meshStandardMaterial {...SHELL} />
        </mesh>

        {/* Painted red edge along the seam (SPEC §4). */}
        <mesh position={[sign * BAND_X, 0, BAND_Z]}>
          <boxGeometry args={[SEAM.bandWidth, BAND_HEIGHT, SEAM.bandDepth]} />
          <meshStandardMaterial
            ref={band}
            {...ACCENT}
            emissive={ACCENT.color}
            emissiveIntensity={isOpen ? 0 : GLOW_BASE}
          />
        </mesh>

        {side === 'right' ? <CloseButton /> : null}
      </group>
    </animated.group>
  )
}
