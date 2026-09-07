import type {CSSProperties} from 'react'

/**
 * The two edges of the screen where content runs out of the panel, and what is
 * done about each. Both are pure CSS and neither adds an element to the layout.
 */

/**
 * A rail that continues past the frame, faded at both ends rather than cut.
 *
 * The Library's tiles are images and read fine sliced by the panel edge; the
 * timeline's axis carries organisation names, and a word chopped mid-letter
 * ("ool" of "DAV Public School" against the left edge) reads as a bug rather
 * than as a rail that goes on. The mask is on the container, so the axis line,
 * the dots and the labels all fade together.
 */
export function edgeMask(px: number): CSSProperties {
  const gradient = `linear-gradient(to right, transparent 0, #000 ${px}px, #000 calc(100% - ${px}px), transparent 100%)`
  return {maskImage: gradient, WebkitMaskImage: gradient}
}

/**
 * A box the visitor can drag with a finger. Pair it with `data-console-scroll`,
 * which is the attribute `ConsoleStage`'s touch handler looks for.
 *
 * On a phone `touch-action: none` hands the gesture to that handler rather than
 * to the browser. The panel is a rotated, scaled subtree of a `<Html transform>`
 * there, so what a browser makes of a touch on a box turned through 90° is not
 * something to discover on someone's phone — and one owner means a scroll and a
 * swipe cannot disagree about which way is up.
 *
 * Only on a phone, because that is the only width the handler runs at. A tablet
 * is not turned and has no swipe gestures, so its finger scrolling is the
 * ordinary axis-aligned case and belongs to the browser. The wheel and the
 * scrollbar are untouched everywhere: `touch-action` only speaks to touch.
 */
export function scrollBox(mobile: boolean): CSSProperties {
  return {overflowY: 'auto', touchAction: mobile ? 'none' : 'auto'}
}

/**
 * The bottom of a scrolling box: content fading out under the edge, which is
 * the only thing saying there is more of it. A phone has no scrollbar at rest
 * and the panel has no chrome to hang one on.
 *
 * Deliberately not conditional on whether the box actually scrolls. With
 * nothing to scroll it fades the background over the background and no pixel
 * changes, so the alternative — measuring `scrollHeight` on every resize, every
 * theme change and every selection — buys a state nobody can see.
 *
 * The element is a sibling of the scrolling box, not a child: inside it, it
 * would scroll away with the content.
 */
export function scrollFade(px: number): CSSProperties {
  return {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: `${px}px`,
    pointerEvents: 'none',
    background: 'linear-gradient(to bottom, transparent, var(--screen-bg))',
  }
}
