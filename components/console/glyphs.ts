import {useEffect, useMemo} from 'react'
import {ShapeGeometry} from 'three'
import {SVGLoader} from 'three/examples/jsm/loaders/SVGLoader.js'

import {GLYPHS, type GlyphName} from '@/components/console/glyphPaths'

/**
 * The glyphs as three geometry. The path data itself lives in `glyphPaths.ts`,
 * which imports nothing, so the mobile control overlay can draw the same marks
 * as `<svg>` without pulling three into the page bundle (SPEC §12). Re-exported
 * here so the 3D call sites read as they always did.
 */
export {
  GLYPHS,
  GLYPH_BOX,
  GLYPH_FOR_PLATFORM,
  type GlyphName,
} from '@/components/console/glyphPaths'

/**
 * A flat mesh of one glyph, scaled so its longest side is `size`.
 *
 * SVG's y axis points down and three's points up, so the geometry is flipped
 * on y — which reverses the winding of every triangle. The glyph meshes are
 * therefore drawn `side: DoubleSide`, which they want anyway: a flap swings
 * through 172°, and a one-sided glyph would vanish on the way.
 */
function glyphGeometry(path: string, size: number): ShapeGeometry {
  const parsed = new SVGLoader().parse(
    `<svg xmlns="http://www.w3.org/2000/svg"><path d="${path}"/></svg>`,
  )
  // toShapes rather than SVGLoader.createShapes: the latter is deprecated in
  // three r185 and warns on every call. r185 also dropped its isCCW argument.
  const shapes = parsed.paths.flatMap((subPath) => subPath.toShapes())
  const geometry = new ShapeGeometry(shapes, 12)

  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (box) {
    const scale = size / Math.max(box.max.x - box.min.x, box.max.y - box.min.y)
    geometry.scale(scale, -scale, scale)
  }
  geometry.center()

  return geometry
}

/** Memoised glyph geometry, disposed on unmount (SPEC §12). */
export function useGlyphGeometry(name: GlyphName, size: number): ShapeGeometry {
  const geometry = useMemo(() => glyphGeometry(GLYPHS[name], size), [name, size])

  useEffect(() => () => geometry.dispose(), [geometry])

  return geometry
}
