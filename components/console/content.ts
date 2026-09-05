import type {SiteSettingsQueryResult, SocialLinksQueryResult} from '@/sanity.types'

/**
 * Everything the console renders that came from Sanity, passed down the tree as
 * props rather than through a context: React context does not cross R3F's
 * separate reconciler without drei's `useContextBridge`, and the canvas is four
 * hops deep. Every field is nullable, so each control handles its own empty
 * case (SPEC §3.2) — the dataset starts empty and fills up over time.
 */
export interface ConsoleContent {
  settings: SiteSettingsQueryResult
  socialLinks: SocialLinksQueryResult
}

export type ButtonSlot = 'A' | 'B' | 'X' | 'Y'
export type SocialLink = SocialLinksQueryResult[number]

/** SPEC §14: the CV downloads under a name a recruiter can file. */
export const RESUME_FILENAME = 'Yash-Punia-Gameplay-Programmer.pdf'

/**
 * The committed fallback resume (SPEC §3.2). Set this to `null` and the CV
 * button disappears rather than linking to a 404 — which is also how the
 * "neither exists" branch is verified.
 */
const FALLBACK_RESUME: string | null = '/resume.pdf'

/**
 * Where the CV button points, or `null` if there is nothing to point at.
 *
 * A Sanity asset is cross-origin, where the `download` attribute is ignored by
 * every browser — Sanity's own `?dl=` parameter is what makes it a download
 * with a filename. The local fallback is same-origin and uses `download`.
 */
export function resumeHref(settings: ConsoleContent['settings']): string | null {
  const url = settings?.resumeUrl
  if (url) return `${url}?dl=${RESUME_FILENAME}`

  return FALLBACK_RESUME
}

/** True when the href is ours to serve, so `download` will be honoured. */
export function isLocalHref(href: string): boolean {
  return href.startsWith('/')
}

export function linkForSlot(links: SocialLinksQueryResult, slot: ButtonSlot): SocialLink | null {
  return links.find((link) => link.buttonSlot === slot && link.url) ?? null
}
