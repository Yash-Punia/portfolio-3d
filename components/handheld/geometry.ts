import {Color, ExtrudeGeometry, Float32BufferAttribute, Path, Shape, Vector2} from 'three'

/**
 * Outlines for the two shells and their parts, in world units (1 = 100 design
 * px). Everything is a flat outline extruded backwards from z = 0, so a part's
 * front face sits at its group's origin and the numbers in `Desk` and
 * `Handheld` read straight off the design.
 */

type Corner = [x: number, y: number, radius: number]

/**
 * A closed outline through `corners`, each one rounded by its own radius. A
 * quadratic through the corner point is close enough to an arc at these sizes,
 * and it lets one helper draw a rounded rectangle, a Game Boy's single big
 * corner and a D-pad's cross alike.
 */
function rounded<T extends Shape | Path>(target: T, corners: Corner[]): T {
  const n = corners.length
  corners.forEach(([x, y, r], i) => {
    const point = new Vector2(x, y)
    const prev = new Vector2(corners[(i - 1 + n) % n]![0], corners[(i - 1 + n) % n]![1])
    const next = new Vector2(corners[(i + 1) % n]![0], corners[(i + 1) % n]![1])
    const into = prev.sub(point).normalize().multiplyScalar(r).add(point)
    const out = next.sub(point).normalize().multiplyScalar(r).add(point)
    if (i === 0) target.moveTo(into.x, into.y)
    else target.lineTo(into.x, into.y)
    target.quadraticCurveTo(x, y, out.x, out.y)
  })
  target.closePath()
  return target
}

/** Per-corner radii, clockwise from top-left. */
export type Radii = [tl: number, tr: number, br: number, bl: number]

function rectCorners(
  width: number,
  height: number,
  [tl, tr, br, bl]: Radii,
  x = 0,
  y = 0,
): Corner[] {
  const w = width / 2
  const h = height / 2
  // Counter-clockwise, which is what three expects of an outer contour.
  return [
    [x - w, y + h, tl],
    [x - w, y - h, bl],
    [x + w, y - h, br],
    [x + w, y + h, tr],
  ]
}

export function roundedRect(width: number, height: number, radii: Radii | number): Shape {
  const r: Radii = typeof radii === 'number' ? [radii, radii, radii, radii] : radii
  return rounded(new Shape(), rectCorners(width, height, r))
}

/** A hole in a shape, the same outline wound the other way. */
export function roundedHole(width: number, height: number, radius: number, x = 0, y = 0): Path {
  return rounded(
    new Path(),
    rectCorners(width, height, [radius, radius, radius, radius], x, y).reverse(),
  )
}

/** A D-pad: a plus of arms `arm` wide, `span` from end to end, rounded at the ends. */
export function cross(span: number, arm: number, radius: number): Shape {
  const L = span / 2
  const a = arm / 2
  return rounded(new Shape(), [
    [-a, L, radius],
    [-a, a, 0],
    [-L, a, radius],
    [-L, -a, radius],
    [-a, -a, 0],
    [-a, -L, radius],
    [a, -L, radius],
    [a, -a, 0],
    [L, -a, radius],
    [L, a, radius],
    [a, a, 0],
    [a, L, radius],
  ])
}

/**
 * An outline extruded `depth` backwards, its front face (bevel included) at
 * z = 0. With `gradient`, the faces are vertex-coloured from the first colour
 * at the top to the second at the bottom — the design's shell gradient,
 * lit rather than painted.
 */
export function slab(
  shape: Shape,
  depth: number,
  bevel: number,
  gradient?: [top: string, bottom: string],
): ExtrudeGeometry {
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 24,
  })
  geometry.translate(0, 0, -depth - bevel)

  if (gradient) {
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const top = new Color(gradient[0])
    const bottom = new Color(gradient[1])
    const position = geometry.getAttribute('position')
    const colours = new Float32Array(position.count * 3)
    const colour = new Color()
    for (let i = 0; i < position.count; i++) {
      const t = (box.max.y - position.getY(i)) / (box.max.y - box.min.y)
      colour.copy(top).lerp(bottom, t)
      colour.toArray(colours, i * 3)
    }
    geometry.setAttribute('color', new Float32BufferAttribute(colours, 3))
  }

  return geometry
}
