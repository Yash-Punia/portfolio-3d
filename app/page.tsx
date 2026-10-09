import {ConsoleStage} from '@/components/console/ConsoleStage'
import {
  descriptionParagraphs,
  entryDates,
  isLocalHref,
  projectMeta,
  RESUME_FILENAME,
  RESUME_LABEL,
  resumeHref,
} from '@/components/console/content'
import type {FilteredResponseQueryOptions} from 'next-sanity'
import {draftMode} from 'next/headers'

import {siteUrl} from '@/app/site'
import {readToken, type CacheTag} from '@/sanity/env'
import {client} from '@/sanity/lib/client'
import {
  projectsQuery,
  siteSettingsQuery,
  socialLinksQuery,
  timelineQuery,
} from '@/sanity/lib/queries'
import type {
  ProjectsQueryResult,
  SiteSettingsQueryResult,
  SocialLinksQueryResult,
} from '@/sanity.types'

/**
 * The page is the object: the console is the entire visible interface, and the
 * portfolio's real markup sits behind it in a visually-hidden landmark so that
 * crawlers and screen readers get the whole site (SPEC §1, §11.1). Phase 8
 * fills that landmark out; for now it holds what Phase 0 already queried.
 *
 * Those anchors are also the console's keyboard surface: focusing a project's
 * button selects that tile on the rail and activating it opens the tile's
 * detail view (SPEC §11.4, §11.6). One set of links, doing both jobs — a
 * second, hidden set would only make a screen reader read them twice.
 *
 * The social links used to carry ABXY slots for the same reason. They do not
 * any more: those four caps are the console's own verbs now, and their hidden
 * twins live in `ConsoleStage` where they can say what they do.
 *
 * It renders nothing it was not given.
 */
/**
 * The two halves of the timeline, as a document says them. On the axis the kinds
 * read apart by position and by a filled or ringed dot; in prose they need
 * naming. Chrome, not content (SPEC §15) — these name the parts of a CV, not
 * anything an editor owns.
 */
const TIMELINE_GROUPS = [
  ['work', 'Work'],
  ['education', 'Education'],
] as const

/**
 * SPEC §11.7's `Person` schema.
 *
 * `knowsAbout` is not a field anyone has to maintain: it is the union of every
 * engine and every technology across the published projects, in rail order. A
 * project added in the Studio widens it; nothing goes stale.
 */
function personSchema(content: {
  settings: SiteSettingsQueryResult
  socialLinks: SocialLinksQueryResult
  projects: ProjectsQueryResult
}) {
  const {settings, socialLinks, projects} = content
  // `Custom` and `Other` are the engine list's escape hatches, not subjects:
  // "knows about Custom" says nothing to a search engine.
  const engines = projects
    .map((project) => project.engine)
    .filter((engine) => engine !== 'Custom' && engine !== 'Other')
  const knowsAbout = [
    ...new Set([...engines, ...projects.flatMap((project) => project.tech ?? [])]),
  ].filter((value): value is string => Boolean(value))

  const sameAs = socialLinks
    .map((link) => link.url)
    .filter((url): url is string => Boolean(url))
    .sort()

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: settings?.fullName ?? undefined,
    jobTitle: settings?.title ?? undefined,
    description: settings?.seo?.metaDescription ?? settings?.aboutBody ?? undefined,
    url: siteUrl(),
    image: settings?.avatarUrl ?? undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    knowsAbout: knowsAbout.length > 0 ? knowsAbout : undefined,
  }
}

/**
 * How one query is read: from the cache and tagged for the webhook, or straight
 * from Sanity's `drafts` perspective while an editor is previewing.
 */
function read(isDraft: boolean, tag: CacheTag): FilteredResponseQueryOptions {
  return isDraft
    ? {cache: 'no-store', perspective: 'drafts'}
    : {cache: 'force-cache', next: {tags: [tag]}, perspective: 'published'}
}

export default async function Home() {
  /*
    Draft mode (SPEC §3). Sanity serves drafts from a different perspective and
    only to a token, so unlike a CMS with one URL for both, the fetch itself has
    to change: a token-bearing client on the `drafts` perspective, uncached,
    because a preview that could be served from a cache is not a preview.

    Published rendering is untouched — `isEnabled` is false for every visitor,
    and the four tagged `force-cache` fetches are what the webhook invalidates.
  */
  const {isEnabled: isDraft} = await draftMode()
  const reader = isDraft && readToken ? client.withConfig({token: readToken}) : client

  const [settings, socialLinks, projects, timeline] = await Promise.all([
    reader.fetch(siteSettingsQuery, {}, read(isDraft, 'siteSettings')),
    reader.fetch(socialLinksQuery, {}, read(isDraft, 'socialLink')),
    reader.fetch(projectsQuery, {}, read(isDraft, 'project')),
    reader.fetch(timelineQuery, {}, read(isDraft, 'timelineEntry')),
  ])

  const resume = resumeHref(settings)

  return (
    <>
      {/*
        Structured data, not markup a visitor ever sees — a `<script>` of type
        `application/ld+json` is inert to the parser and invisible to a screen
        reader (SPEC §11.7).
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(personSchema({settings, socialLinks, projects})),
        }}
      />

      {/*
        The one thing on the page that is not the console. A preview that does
        not say it is a preview is how unpublished copy gets mistaken for the
        live site — and the way out has to be visible, because the cookie
        outlives the tab that set it.
      */}
      {isDraft ? (
        <a className="draft-banner" href="/api/draft/disable">
          Draft mode — showing unpublished edits. Leave preview.
        </a>
      ) : null}

      <ConsoleStage content={{settings, socialLinks, projects, timeline}} />

      <main className="sr-only">
        {settings?.fullName ? <h1>{settings.fullName}</h1> : null}
        {settings?.title ? <p>{settings.title}</p> : null}
        {settings?.statusLine ? <p>{settings.statusLine}</p> : null}
        {settings?.aboutHeadline ? <h2>{settings.aboutHeadline}</h2> : null}
        {settings?.aboutBody ? <p>{settings.aboutBody}</p> : null}
        {resume ? (
          <a download={isLocalHref(resume) ? RESUME_FILENAME : undefined} href={resume}>
            {settings?.resumeLabel ?? RESUME_LABEL}
          </a>
        ) : null}
        {/*
          The projects the Library rail draws, in rail order. This is the copy a
          crawler and a screen reader get (SPEC §11.1) — the rail itself is
          `aria-hidden` DOM floating in 3D space, so this is the only place the
          project links are reachable by keyboard, and it carries every field the
          detail view shows rather than a shorter summary of them.

          Each title is a button (SPEC §11.6). It carries no `onClick`: this file
          stays a Server Component, and `ConsoleStage` delegates focus and clicks
          from `data-project-index` the same way it already does from
          `data-console-focus` — focusing one selects that tile on the rail,
          activating one opens its detail view.
        */}
        {projects.length > 0 ? <h2>Games</h2> : null}
        {projects.map((project, index) => (
          <article key={project._id}>
            <h3>
              <button data-project-index={index} type="button">
                {project.title}
              </button>
            </h3>
            {project.blurb ? <p>{project.blurb}</p> : null}
            <dl>
              {projectMeta(project).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {descriptionParagraphs(project.description).map(({key, text}) => (
              <p key={key}>{text}</p>
            ))}
            {project.links?.length ? (
              <ul>
                {project.links.map((link) =>
                  link.url ? (
                    <li key={link.url}>
                      <a href={link.url} rel="noopener noreferrer" target="_blank">
                        {link.label ?? link.url}
                      </a>
                    </li>
                  ) : null,
                )}
              </ul>
            ) : null}
          </article>
        ))}
        {/*
          The timeline's entries, in axis order, for the same reason — grouped by
          `kind`, which the axis shows by position and a document has to say.
        */}
        {TIMELINE_GROUPS.map(([kind, heading]) => {
          // Split the way `timelineQuery` orders them — work first, everything
          // else after — so an entry whose `kind` never got set is still read.
          const entries = timeline.filter((entry) =>
            kind === 'work' ? entry.kind === 'work' : entry.kind !== 'work',
          )
          if (entries.length === 0) return null

          return (
            <section key={kind}>
              <h2>{heading}</h2>
              {entries.map((entry) => (
                <article key={entry._id}>
                  {entry.role ? <h3>{entry.role}</h3> : null}
                  {entry.organisation ? <p>{entry.organisation}</p> : null}
                  <p>{entryDates(entry)}</p>
                  {entry.location ? <p>{entry.location}</p> : null}
                  {entry.summary ? <p>{entry.summary}</p> : null}
                  {entry.highlights?.length ? (
                    <ul>
                      {entry.highlights.map((highlight) => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </ul>
                  ) : null}
                  {entry.result ? <p>{entry.result}</p> : null}
                  {entry.relatedProjects?.length ? (
                    <ul>
                      {entry.relatedProjects.map((related) => (
                        <li key={related._id}>{related.title}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </section>
          )
        })}
        {socialLinks.length > 0 ? (
          <>
            <h2>Links</h2>
            <ul>
              {socialLinks.map((link) => (
                <li key={link._id}>
                  <a href={link.url ?? undefined} rel="noopener noreferrer" target="_blank">
                    {link.label ?? link.platform}
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </main>
    </>
  )
}
