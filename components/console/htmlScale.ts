/**
 * drei's `<Html transform>` lays its element out at `400 / distanceFactor` CSS
 * pixels per world unit, and defaults `distanceFactor` to 10 — so one world unit
 * is 40px there, and any panel authored at a fixed pixel width has to undo that
 * to land on the surface it belongs to.
 *
 * Both DOM-in-3D surfaces use this: the info monitor on the left flap and the
 * firmware on the screen. Authoring at a fixed pixel size and scaling to fit
 * keeps each panel's type scale a fixed ratio of its own panel, so retuning the
 * console's proportions never means re-guessing a font size.
 */
const PX_PER_UNIT = 40

export function htmlScale(worldWidth: number, authoredPx: number): number {
  return (worldWidth / authoredPx) * PX_PER_UNIT
}
