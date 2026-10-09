/**
 * drei's `<Html transform>` lays its element out at `400 / distanceFactor` CSS
 * pixels per world unit, and defaults `distanceFactor` to 10 — so one world unit
 * is 40px there, and any panel authored at a fixed pixel width has to undo that
 * to land on the surface it belongs to.
 *
 * Both consoles use this to lay their screen on the glass (`Desk`, `Handheld`).
 * Authoring at a fixed pixel size and scaling to fit keeps each panel's type
 * scale a fixed ratio of its own panel.
 */
const PX_PER_UNIT = 40

export function htmlScale(worldWidth: number, authoredPx: number): number {
  return (worldWidth / authoredPx) * PX_PER_UNIT
}
