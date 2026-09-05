'use client'

import {animated, useSpring} from '@react-spring/three'
import {useFrame} from '@react-three/fiber'
import {useEffect, useMemo, useRef} from 'react'
import {MathUtils, type MeshStandardMaterial} from 'three'

import {resumeHref, type ConsoleContent} from '@/components/console/content'
import {usePanelGeometry, type PanelSpec} from '@/components/console/geometry'
import {CvButton} from '@/components/console/parts/CvButton'
import {FaceButtons} from '@/components/console/parts/FaceButtons'
import {InfoMonitor} from '@/components/console/parts/InfoMonitor'
import {Joystick} from '@/components/console/parts/Joystick'
import {CloseButton} from '@/components/console/parts/CloseButton'
import {useSpec} from '@/components/console/spec'
import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'

export type FlapSide = 'left' | 'right'

/** Resting glow on the seam, and how far the idle pulse lifts it (SPEC §5). */
/** Pointer travel that still counts as a tap rather than a drag (SPEC §5). */
const TAP_PX = 6

const GLOW_BASE = 0.16
const GLOW_SWING = 0.2

/**
 * One front door.
 *
 * The outer `<group>` is the hinge pivot, sitting on the flap's outer edge:
 * Phase 1 built it at rotation 0 so this phase only has to spring it. Left
 * opens negative, right positive, which is why `sign` flips the rotation.
 */
export function Flap({side, content}: {side: FlapSide; content: ConsoleContent}) {
  const {dimensions: d, materials: m} = useSpec()
  const sign = side === 'left' ? 1 : -1

  /**
   * Outer corners are rounded; the inner corners — the ones that meet at the
   * centre seam — stay square, so the closed seam is a true hairline.
   */
  const outerSpec = useMemo<PanelSpec>(
    () => ({
      width: d.flap.width,
      height: d.flap.height,
      depth: d.flap.depth,
      radius:
        side === 'left'
          ? {tl: d.flap.radius, bl: d.flap.radius, tr: 0, br: 0}
          : {tr: d.flap.radius, br: d.flap.radius, tl: 0, bl: 0},
      bevel: 0.018,
    }),
    [d, side],
  )

  /**
   * A raised border laid over the flap face, which reads as a shallow moulded
   * panel recessed into it. Its four inner edges are the only thing on an
   * otherwise coplanar face for the key light and the rim lightformer to catch.
   */
  const mouldingSpec = useMemo<PanelSpec>(
    () => ({
      width: d.flap.width,
      height: d.flap.height,
      depth: d.panel.depth,
      radius:
        side === 'left'
          ? {tl: d.flap.radius, bl: d.flap.radius, tr: 0, br: 0}
          : {tr: d.flap.radius, br: d.flap.radius, tl: 0, bl: 0},
      aperture: {
        width: d.flap.width - d.panel.margin * 2,
        height: d.flap.height - d.panel.margin * 2,
        radius: d.panel.radius,
      },
      bevel: 0.007,
    }),
    [d, side],
  )

  const outer = usePanelGeometry(outerSpec)
  const moulding = usePanelGeometry(mouldingSpec)

  const isOpen = useConsole((state) => state.isOpen)
  const open = useConsole((state) => state.open)
  const reducedMotion = useReducedMotion()
  const band = useRef<MeshStandardMaterial>(null)
  const pressedAt = useRef<{x: number; y: number} | null>(null)

  const {rotation} = useSpring({
    rotation: isOpen ? -sign * d.openAngle : 0,
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

  /** Distance from the flap's own centre to its inner (seam) edge. */
  const halfWidth = d.flap.width / 2
  const bandX = halfWidth - d.seam.bandWidth / 2
  const bandHeight = d.flap.height - d.flap.radius * 2
  const bandZ = d.flap.depth / 2 + d.panel.depth + d.seam.bandDepth / 2 - 0.003

  // Nothing to point at means no button, rather than a link to a 404 (§3.2).
  const href = resumeHref(content.settings)

  return (
    <animated.group position={[sign * -d.hingeX, 0, d.z.flapClosed]} rotation-y={rotation}>
      {/*
        The handlers sit on the group, not on one mesh: the moulding covers most
        of the face, and R3F bubbles a child's pointer events up to its parent,
        so this makes the whole door the target rather than the sliver of shell
        around the moulding.
      */}
      <group
        position={[sign * halfWidth, 0, 0]}
        /*
          The pointerdown is recorded but not stopped: it bubbles on to the
          root group so a drag that starts on a door still rotates the console.
          What the threshold below decides is only whether the release was a
          tap — a shaky one still opens the console (SPEC §5).
        */
        onPointerDown={(event) => {
          pressedAt.current = {x: event.clientX, y: event.clientY}
        }}
        onClick={(event) => {
          if (isOpen) return
          const start = pressedAt.current
          if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_PX) return
          event.stopPropagation()
          open()
        }}
        onPointerOver={() => hover(true)}
        onPointerOut={() => hover(false)}
      >
        <mesh geometry={outer}>
          <meshStandardMaterial {...m.shell} />
        </mesh>

        <mesh geometry={moulding} position={[0, 0, (d.flap.depth + d.panel.depth) / 2]}>
          <meshStandardMaterial {...m.shell} />
        </mesh>

        {/* Painted red edge along the seam (SPEC §4). */}
        <mesh position={[sign * bandX, 0, bandZ]}>
          <boxGeometry args={[d.seam.bandWidth, bandHeight, d.seam.bandDepth]} />
          <meshStandardMaterial
            ref={band}
            {...m.accent}
            emissive={m.accent.color}
            emissiveIntensity={isOpen ? 0 : GLOW_BASE}
          />
        </mesh>

        {side === 'left' ? (
          <>
            <InfoMonitor settings={content.settings} />
            {href ? <CvButton href={href} /> : null}
            <Joystick />
          </>
        ) : (
          <>
            <FaceButtons socialLinks={content.socialLinks} />
            <CloseButton />
          </>
        )}
      </group>
    </animated.group>
  )
}
