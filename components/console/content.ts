import type {
  ProjectsQueryResult,
  SiteSettingsQueryResult,
  SocialLinksQueryResult,
  TimelineQueryResult,
} from '@/sanity.types'

/**
 * Everything the console renders that came from Sanity, passed down the tree as
 * props rather than through a context: React context does not cross R3F's
 * separate reconciler without drei's `useContextBridge`. Every field is
 * nullable, so each control handles its own empty case — the dataset starts
 * empty and fills up over time.
 *
 * Server-safe: `app/page.tsx` imports this, so nothing here touches the store.
 */
export interface ConsoleContent {
  settings: SiteSettingsQueryResult
  socialLinks: SocialLinksQueryResult
  projects: ProjectsQueryResult
  timeline: TimelineQueryResult
}

export type ButtonSlot = 'A' | 'B'
export type SocialLink = SocialLinksQueryResult[number]
export type Project = ProjectsQueryResult[number]
export type TimelineEntry = TimelineQueryResult[number]

/**
 * A project's specification, in the order the hidden landmark lists it.
 *
 * One definition, two readers: the screen's facts and the page's hidden
 * landmark. A field added here appears in both, which is the point — the
 * crawlable copy fell behind the visible one once already.
 */
const PROJECT_META: Array<[string, (project: Project) => string | null]> = [
  ['Role', (project) => project.role],
  ['Year', (project) => project.year],
  ['Engine', (project) => project.engine],
  ['Platforms', (project) => project.platforms?.join(', ') ?? null],
  ['Team', (project) => (project.teamSize ? `${project.teamSize}` : null)],
  ['Tech', (project) => project.tech?.join(', ') ?? null],
]

/** The pairs a project actually has. An empty field is not a row. */
export function projectMeta(project: Project): Array<[string, string]> {
  const rows: Array<[string, string]> = []
  for (const [label, read] of PROJECT_META) {
    const value = read(project)
    if (value) rows.push([label, value])
  }
  return rows
}

/** The design's four facts, in its order. Tech has its own "Stack" line. */
const FACTS = new Set(['Role', 'Year', 'Engine', 'Platforms'])

export function projectFacts(project: Project): Array<[string, string]> {
  return projectMeta(project).filter(([label]) => FACTS.has(label))
}

/**
 * The small line over a title — "Mobile · PvP shooter" in the design. There is
 * no genre field and the data does not change, so it is the platforms and the
 * engine. Empty when both are.
 */
export function projectKicker(project: Project): string | null {
  const parts = [project.platforms?.join(', '), project.engine].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

/** The first link with somewhere to go — the store page, usually. */
export function primaryLink(project: Project): {label: string; url: string} | null {
  const link = project.links?.find((candidate) => candidate.url)
  if (!link?.url) return null
  return {label: link.label ?? hostOf(link.url), url: link.url}
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * How a project's `videoUrl` plays inline: YouTube and Vimeo as their embed
 * players, a bare video file in a `<video>`, and anything else opens in a tab.
 */
export type Trailer = {kind: 'iframe' | 'video'; src: string} | {kind: 'link'; src: string}

export function trailerOf(project: Project): Trailer | null {
  const url = project.videoUrl
  if (!url) return null

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const host = parsed.hostname.replace(/^(www|m)\./, '')
  const youtube =
    host === 'youtu.be'
      ? parsed.pathname.slice(1)
      : host === 'youtube.com' || host === 'youtube-nocookie.com'
        ? (parsed.searchParams.get('v') ??
          parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1])
        : null
  if (youtube) {
    return {
      kind: 'iframe',
      src: `https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&mute=1&rel=0&playsinline=1`,
    }
  }

  const vimeo = host === 'vimeo.com' ? parsed.pathname.match(/^\/(\d+)/)?.[1] : null
  if (vimeo)
    return {kind: 'iframe', src: `https://player.vimeo.com/video/${vimeo}?autoplay=1&muted=1`}

  if (/\.(mp4|webm|mov|m4v)$/i.test(parsed.pathname)) return {kind: 'video', src: url}

  return {kind: 'link', src: url}
}

/**
 * Portable Text, flattened to paragraphs. List items are flagged: the project
 * page sets them as the numbered "What I built" rows.
 *
 * `@portabletext/react` exists for this, but blocks with spans are the whole of
 * what the schema's editor can produce here. If the field grows links or marks
 * that matter, swap this for the library rather than growing it.
 */
export function descriptionParagraphs(
  blocks: Project['description'],
): Array<{key: string; text: string; heading: boolean; listItem: boolean}> {
  if (!blocks) return []

  return blocks
    .map((block) => ({
      key: block._key,
      text: block.children?.map((span) => span.text ?? '').join('') ?? '',
      heading: Boolean(block.style && block.style !== 'normal' && block.style !== 'blockquote'),
      listItem: Boolean(block.listItem),
    }))
    .filter((paragraph) => paragraph.text !== '')
}

/** The CV downloads under a name a recruiter can file. */
export const RESUME_FILENAME = 'Yash-Punia-Gameplay-Programmer.pdf'

/**
 * The default for `resumeLabel`, used when the field is empty. The words on the
 * link are content, not chrome — the field exists in Sanity and Yash owns what
 * it says.
 */
export const RESUME_LABEL = 'Download résumé'

/**
 * The committed fallback resume. Set this to `null` and the résumé row
 * disappears rather than linking to a 404.
 */
const FALLBACK_RESUME: string | null = '/resume.pdf'

/**
 * Where the résumé points, or `null` if there is nothing to point at.
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

/** What each platform is called when its link has no label of its own. */
const PLATFORM_LABELS: Record<NonNullable<SocialLink['platform']>, string> = {
  itch: 'itch.io',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  twitter: 'X',
}

export function socialLabel(link: SocialLink): string {
  return link.label ?? (link.platform ? PLATFORM_LABELS[link.platform] : (link.url ?? ''))
}

/**
 * About's icon links (design turn 6): each social link with somewhere to go,
 * then the email as a `mailto:`. The screen draws them as icons, the page's
 * landmark as words, so both read this one list.
 */
export interface ProfileLink {
  key: string
  label: string
  href: string
  icon: NonNullable<SocialLink['platform']> | 'email' | null
}

export function profileLinks(content: ConsoleContent): ProfileLink[] {
  const links: ProfileLink[] = []
  for (const link of content.socialLinks) {
    if (link.url) {
      links.push({key: link._id, label: socialLabel(link), href: link.url, icon: link.platform})
    }
  }
  const email = content.settings?.email
  if (email) links.push({key: 'email', label: 'Email', href: `mailto:${email}`, icon: 'email'})
  return links
}

/** The résumé, from the Game Boy's pill or its hidden twin. */
export function downloadResume(settings: ConsoleContent['settings']) {
  const href = resumeHref(settings)
  if (!href) return
  const anchor = document.createElement('a')
  anchor.href = href
  if (isLocalHref(href)) anchor.download = RESUME_FILENAME
  else anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  anchor.click()
}

/** Opening an outbound link. A `mailto:` hands over to the mail app without a blank tab. */
export function openLink(url: string) {
  if (url.startsWith('mailto:')) {
    window.location.href = url
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * Dates on the timeline. `startDate`/`endDate` are date-only `YYYY-MM-DD`
 * strings, so they are sliced rather than parsed: `new Date('2022-02-01')` is
 * UTC midnight and would read as January to anyone west of Greenwich.
 *
 * Fixed month names rather than `Intl`, because the same string is rendered on
 * the server (the hidden landmark) and on the client (the screen), and a locale
 * that disagreed between the two is a hydration mismatch.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `2022-02-01` → `Feb 2022`. */
export function monthLabel(date: string | null): string | null {
  if (!date) return null
  const month = MONTHS[Number(date.slice(5, 7)) - 1]
  return month ? `${month} ${date.slice(0, 4)}` : date.slice(0, 4)
}

/** An entry's span. An open end reads `now` — it is where Yash is right now. */
export function entryDates(entry: TimelineEntry): string {
  const start = monthLabel(entry.startDate) ?? ''
  const end = entry.isCurrent || !entry.endDate ? 'now' : monthLabel(entry.endDate)
  return end ? `${start} – ${end}` : start
}

/**
 * The years column on About's Experience index: `2023 — 2026`, `2026 — Now`,
 * or one year when a role starts and ends in it.
 */
export function entryYears(
  entry: Pick<TimelineEntry, 'startDate' | 'endDate' | 'isCurrent'>,
): string {
  const start = entry.startDate?.slice(0, 4) ?? ''
  const end = entry.isCurrent || !entry.endDate ? 'Now' : entry.endDate.slice(0, 4)
  return !start || start === end ? end : `${start} — ${end}`
}

/** `3` of `6` → `03 / 06`, the screen's counter. */
export function counter(index: number, count: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(index + 1)} / ${pad(count)}`
}
