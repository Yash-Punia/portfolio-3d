'use client'

import {animated, useSpring} from '@react-spring/three'
import {Environment, Lightformer, OrthographicCamera} from '@react-three/drei'
import {Canvas, useThree} from '@react-three/fiber'
import {useEffect, useRef, useState, type ReactNode} from 'react'
import {MathUtils} from 'three'

import type {ConsoleContent} from '@/components/console/content'
import type {Device} from '@/components/console/device'
import {useReducedMotion} from '@/components/console/useReducedMotion'
import {Desk, DESK} from '@/components/handheld/Desk'
import {Handheld, HANDHELD} from '@/components/handheld/Handheld'

/**
 * How much of the viewport each console takes. The desk leaves room for the
 * page's header (84px) and the keyboard hint under it (60px), as the design's
 * 1440×900 page does — at that size it lands at exactly 100px per world unit,
 * which is the design's own scale. The handheld is held, not looked at, so it
 * takes nearly all of an upright phone.
 */
function zoomFor(device: Device, width: number, height: number): number {
  if (device === 'desk') {
    return Math.min((width * 0.86) / DESK.width, ((height - 150) * 0.94) / DESK.height)
  }
  return Math.min((width * 0.96) / HANDHELD.width, (height * 0.96) / HANDHELD.height)
}

/**
 * R3F sets an orthographic frustum to the canvas's pixel size, so at zoom 1 one
 * world unit is one CSS pixel and the zoom is simply pixels per unit.
 */
function Camera({device}: {device: Device}) {
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)

  return (
    <OrthographicCamera
      far={100}
      makeDefault
      near={0.1}
      position={[0, 0, 10]}
      zoom={zoomFor(device, width, height)}
    />
  )
}

/** The design's clamps: it is a display object, not a model viewer. */
const MAX_YAW = (22 * Math.PI) / 180
const MAX_PITCH = (14 * Math.PI) / 180
/** Pointer travel to rotation. A full yaw sweep takes about 110px of drag. */
const RAD_PER_PX = 0.0035

/**
 * Drag-to-rotate. A drag on bare shell turns the console a little, and it
 * springs back square on release. The controls and the glass stop their own
 * `pointerdown`, so a press or a swipe on them never turns it.
 *
 * The listeners are on the window rather than the canvas so that a drag which
 * leaves the canvas still finishes cleanly.
 */
function Rig({children}: {children: ReactNode}) {
  const reducedMotion = useReducedMotion()
  const [dragging, setDragging] = useState(false)
  const from = useRef({x: 0, y: 0, yaw: 0, pitch: 0})
  const [pose, api] = useSpring(() => ({yaw: 0, pitch: 0, config: {tension: 120, friction: 18}}))

  useEffect(() => {
    if (!dragging) return

    function move(event: PointerEvent) {
      const yaw = MathUtils.clamp(
        from.current.yaw + (event.clientX - from.current.x) * RAD_PER_PX,
        -MAX_YAW,
        MAX_YAW,
      )
      const pitch = MathUtils.clamp(
        from.current.pitch + (event.clientY - from.current.y) * RAD_PER_PX,
        -MAX_PITCH,
        MAX_PITCH,
      )
      api.start({yaw, pitch, config: {tension: 280, friction: 34}, immediate: reducedMotion})
    }

    function end() {
      setDragging(false)
      api.start({yaw: 0, pitch: 0, config: {tension: 120, friction: 18}, immediate: reducedMotion})
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [dragging, api, reducedMotion])

  return (
    <animated.group
      onPointerDown={(event) => {
        from.current = {
          x: event.clientX,
          y: event.clientY,
          yaw: pose.yaw.get(),
          pitch: pose.pitch.get(),
        }
        setDragging(true)
      }}
      rotation-x={pose.pitch}
      rotation-y={pose.yaw}
    >
      {children}
    </animated.group>
  )
}

export default function Scene({content, device}: {content: ConsoleContent; device: Device}) {
  return (
    /*
      On demand: nothing moves unless something has changed. The springs
      invalidate as they run, and R3F invalidates on every commit, so a press,
      a drag and a resize all repaint — and an idle page costs nothing.
    */
    <Canvas dpr={[1, 2]} frameloop="demand" gl={{antialias: true}} orthographic>
      <Camera device={device} />

      <ambientLight color="#b8bcc4" intensity={0.35} />
      {/* Raking, not head-on: a light square to a flat face shades it evenly. */}
      <directionalLight color="#fdf6ee" intensity={2.2} position={[-7, 6, 4]} />

      {/*
        Softboxes built in-scene rather than an HDRI preset, which would fetch
        from a third-party CDN at runtime. They shape a matte shell's edges.
      */}
      <Environment frames={1} resolution={256}>
        <Lightformer
          color="#ffffff"
          form="rect"
          intensity={1.4}
          position={[0, 6, 3]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[12, 7, 1]}
        />
        <Lightformer
          color="#dce6f2"
          form="rect"
          intensity={4}
          position={[6, 1.5, 1]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[7, 8, 1]}
        />
        <Lightformer
          color="#6f7c8c"
          form="rect"
          intensity={0.9}
          position={[-8, -2, 2]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[7, 5, 1]}
        />
      </Environment>

      <Rig>{device === 'desk' ? <Desk content={content} /> : <Handheld content={content} />}</Rig>
    </Canvas>
  )
}
