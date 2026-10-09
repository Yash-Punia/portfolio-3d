'use client'

import {Component, useSyncExternalStore, type ReactNode} from 'react'

/**
 * Whether this browser can run the console at all (SPEC §11.3).
 *
 * A canvas whose context never arrives renders nothing and reports nothing, so
 * the check is the only way to know before mounting the scene: a throwaway
 * canvas, WebGL 2 then WebGL 1, and the context released again immediately so
 * the probe does not hold one of the browser's few live contexts. A machine that
 * refuses both — a locked-down browser, a blocklisted driver, a device out of
 * memory — gets the flat screen instead of a blank stage.
 */
export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

/**
 * Whether 3D can run, as an external store rather than component state.
 *
 * It is a property of the machine, not of a render: the probe answers once and
 * the answer is cached, so mounting, unmounting or a second reader never asks
 * the driver again. `useSyncExternalStore` is also what keeps the server's
 * markup and the first client render agreeing — the server cannot probe, so it
 * is told 3D is available and the client corrects it on the first commit,
 * behind the skeleton that is already standing in for the scene's chunk.
 *
 * Three ways it goes false, all landing on one path: the probe fails, the
 * context is lost later (a GPU reset, a background tab reclaimed), or the scene
 * throws while rendering and the boundary below catches it. It never goes back
 * to `true` — a context that has already died once is not something to re-enter
 * while someone is reading.
 */
let available: boolean | null = null
const listeners = new Set<() => void>()

/** Say that 3D is not, or is no longer, an option. */
export function failWebgl() {
  if (available === false) return
  available = false
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // `webglcontextlost` does not bubble, so it is caught on the way down.
  window.addEventListener('webglcontextlost', failWebgl, true)

  return () => {
    listeners.delete(listener)
    window.removeEventListener('webglcontextlost', failWebgl, true)
  }
}

function snapshot(): boolean {
  if (available === null) available = webglAvailable()
  return available
}

export function useWebgl(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => true)
}

/**
 * The scene's error boundary. R3F throws during render when it cannot create a
 * renderer, which no event listener sees — and an uncaught throw here would take
 * the whole page with it, which is the blank page SPEC §11.3 forbids.
 */
export class WebglBoundary extends Component<
  {children: ReactNode; onError: () => void},
  {failed: boolean}
> {
  override state = {failed: false}

  static getDerivedStateFromError() {
    return {failed: true}
  }

  override componentDidCatch() {
    this.props.onError()
  }

  override render() {
    return this.state.failed ? null : this.props.children
  }
}
