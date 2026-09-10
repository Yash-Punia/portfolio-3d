import type {
  ProjectsQueryResult,
  SiteSettingsQueryResult,
  SocialLinksQueryResult,
  TimelineQueryResult,
} from '@/sanity.types'
import type {Section} from '@/components/console/store'

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
  projects: ProjectsQueryResult
  timeline: TimelineQueryResult
}

/**
 * What each screen is called where the visitor is offered it — on the menu's
 * two buttons and on the arrows that walk between them. The status bar has its
 * own short caps names; these are the readable ones.
 *
 * Chrome rather than content, like the status bar's own strings.
 */
export const SECTION_LABELS: Record<Section, string> = {
  menu: 'Menu',
  library: 'Games / Projects',
  timeline: 'Experience',
}

/**
 * The destinations the post-boot menu offers, top half then bottom half. A
 * section with nothing published is not offered: the menu is the way in, so an
 * option that led to an empty screen would be a dead end (SPEC §3.2).
 */
export function menuOptions(content: ConsoleContent): Section[] {
  const options: Section[] = []
  if (content.projects.length > 0) options.push('library')
  if (content.timeline.length > 0) options.push('timeline')
  return options
}

/**
 * Where up and down go from a screen — the one definition of the stack, read by
 * both the arrow keys and the arrows drawn on the screen so the two cannot
 * disagree. A section with nothing in it is not a neighbour.
 */
export function neighbours(
  section: Section,
  content: ConsoleContent,
): {up: Section | null; down: Section | null} {
  if (section === 'menu') return {up: null, down: null}
  if (section === 'library') {
    return {up: 'menu', down: content.timeline.length > 0 ? 'timeline' : null}
  }
  return {up: content.projects.length > 0 ? 'library' : 'menu', down: null}
}

export type ButtonSlot = 'A' | 'B' | 'X' | 'Y'
export type SocialLink = SocialLinksQueryResult[number]
export type Project = ProjectsQueryResult[number]
export type TimelineEntry = TimelineQueryResult[number]

/**
 * A project's specification, in the order the detail view lists it.
 *
 * One definition, two readers: the detail view on the screen and the page's
 * hidden landmark (SPEC §11.1). A field added here appears in both, which is
 * the point — the crawlable copy fell behind the visible one once already.
 */
const PROJECT_META: Array<[string, (project: Project) => string | null]> = [
  ['ROLE', (project) => project.role],
  ['YEAR', (project) => project.year],
  ['ENGINE', (project) => project.engine],
  ['TEAM', (project) => (project.teamSize ? `${project.teamSize}` : null)],
  ['PLATFORMS', (project) => project.platforms?.join(', ') ?? null],
  ['TECH', (project) => project.tech?.join(', ') ?? null],
]

/** The pairs a project actually has. An empty field is not a row (SPEC §3.2). */
export function projectMeta(project: Project): Array<[string, string]> {
  const rows: Array<[string, string]> = []
  for (const [label, read] of PROJECT_META) {
    const value = read(project)
    if (value) rows.push([label, value])
  }
  return rows
}

/**
 * Portable Text, flattened to paragraphs.
 *
 * `@portabletext/react` exists for this, but it is a dependency added for a
 * field no published project fills in yet, and blocks with spans are the whole
 * of what the schema's editor can produce here. If the field grows lists, links
 * or marks that matter, swap this for the library rather than growing it.
 */
export function descriptionParagraphs(
  blocks: Project['description'],
): Array<{key: string; text: string; heading: boolean}> {
  if (!blocks) return []

  return blocks
    .map((block) => ({
      key: block._key,
      text: block.children?.map((span) => span.text ?? '').join('') ?? '',
      heading: Boolean(block.style && block.style !== 'normal' && block.style !== 'blockquote'),
    }))
    .filter((paragraph) => paragraph.text !== '')
}

/** SPEC §14: the CV downloads under a name a recruiter can file. */
export const RESUME_FILENAME = 'Yash-Punia-Gameplay-Programmer.pdf'

/**
 * SPEC §3's own default for `resumeLabel`, used when the field is empty.
 *
 * The words on the link are content, not chrome — the field exists in Sanity
 * and Yash owns what it says — so the info monitor and the hidden landmark both
 * read `settings.resumeLabel` and fall back to this one definition.
 */
export const RESUME_LABEL = 'Download CV'

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

/**
 * Opening an outbound link. Lives here rather than in a 3D part because both
 * the face buttons and the firmware's own link lists fire it, and the firmware
 * knows nothing about three.js (SPEC §7).
 */
export function openLink(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * Dates on the timeline. `startDate`/`endDate` are date-only `YYYY-MM-DD`
 * strings, so they are sliced rather than parsed: `new Date('2022-02-01')` is
 * UTC midnight and would read as January to anyone west of Greenwich.
 *
 * Fixed month names rather than `Intl`, because the same string is rendered on
 * the server (the hidden landmark) and on the client (the axis), and a locale
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
