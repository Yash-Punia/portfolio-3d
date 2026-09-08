import type {Project} from '@/components/console/content'
import {urlFor} from '@/sanity/lib/image'

/**
 * A project's cover, sized for wherever it is about to be drawn (SPEC §12).
 *
 * One definition for the rail's tile and the detail view's header, because the
 * two had grown separate copies of the same three calls and only differed in
 * their dimensions.
 *
 * `next/image` is deliberately not used, and the reason has not changed since
 * Phase 4: these elements live inside a drei `<Html>` subtree in the canvas, and
 * Sanity's CDN already does the resizing and format negotiation the optimiser
 * would add — a second optimiser in front of the first buys a redeploy-scoped
 * cache and an `images.remotePatterns` entry, and nothing else. What §12 asks
 * for beyond that is the LQIP placeholder and an explicit intrinsic size, and
 * both are here.
 */
export interface Cover {
  src: string
  /** Sanity's own base64 placeholder, ~20 bytes, painted under the image. */
  lqip: string | null
  width: number
  height: number
}

export function cover(project: Project, width: number, height: number): Cover | null {
  if (!project.cover?.asset) return null

  return {
    src: urlFor(project.cover).width(width).height(height).fit('crop').auto('format').url(),
    lqip: project.cover.lqip ?? null,
    width,
    height,
  }
}

/**
 * The style that paints the placeholder under an image.
 *
 * It goes on the `<img>` itself rather than on a wrapper: an image's background
 * shows through exactly until its own pixels arrive, which is the whole of what
 * a blur-up placeholder is. No extra element, no state, nothing to unmount.
 */
export function placeholder(lqip: string | null) {
  return lqip ? {background: `url(${lqip}) center / cover no-repeat`} : {}
}
