'use client'

import {useEffect, useMemo} from 'react'
import {CanvasTexture, SRGBColorSpace} from 'three'

/**
 * Ink printed on the shell: the legends under the buttons, the letters on the
 * caps, the serial under the glass.
 *
 * Drawn into a canvas and laid on a plane, rather than set with drei's `<Text>`:
 * troika would fetch its own copy of a font, and the page has already loaded
 * the design's three through `next/font`. The canvas reads the same families
 * through their CSS variables, waits for them, and redraws once they are in.
 */

/** Canvas px per world unit: 4× the design's 100 px per unit, so print stays sharp zoomed in. */
const PX = 400

export type Draw = (ctx: CanvasRenderingContext2D, font: Fonts) => void

export interface Fonts {
  ui: string
  mono: string
  /** A design px, in canvas px. */
  px: number
}

/** Outside the component: a texture is a three.js object, mutated to say its canvas changed. */
function refresh(map: CanvasTexture) {
  map.needsUpdate = true
}

function family(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  return value || fallback
}

/**
 * A plane of `width`×`height` world units with `draw` printed on it. `draw`
 * works in canvas px with the origin at the centre; `font.px` converts a design
 * px. Pass `deps` for anything `draw` reads that changes.
 */
export function Print({
  width,
  height,
  draw,
  deps,
  position,
  rotation,
}: {
  width: number
  height: number
  draw: Draw
  deps: unknown[]
  position: [number, number, number]
  rotation?: [number, number, number]
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * PX)
    canvas.height = Math.round(height * PX)
    const map = new CanvasTexture(canvas)
    map.colorSpace = SRGBColorSpace
    map.anisotropy = 4
    return map
  }, [width, height])

  useEffect(() => {
    const canvas = texture.image as HTMLCanvasElement
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let live = true

    const fonts: Fonts = {
      ui: family('--font-schibsted', 'system-ui, sans-serif'),
      mono: family('--font-jetbrains', 'ui-monospace, monospace'),
      px: PX / 100,
    }

    function paint() {
      if (!live || !ctx) return
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      draw(ctx, fonts)
      refresh(texture)
    }

    paint()
    // A font that only the canvas uses is never requested by the page, so ask.
    void Promise.all([
      document.fonts.load(`500 40px ${fonts.mono}`),
      document.fonts.load(`500 40px ${fonts.ui}`),
    ]).then(paint, () => {})

    return () => {
      live = false
    }
    // `draw` is a fresh closure every render; `deps` says when it means something new.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texture, ...deps])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <mesh position={position} raycast={() => null} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        depthWrite={false}
        map={texture}
        polygonOffset
        polygonOffsetFactor={-2}
        roughness={0.8}
        transparent
      />
    </mesh>
  )
}
