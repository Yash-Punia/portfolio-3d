import {ConsoleStage} from '@/components/console/ConsoleStage'
import {
  descriptionParagraphs,
  entryDates,
  isLocalHref,
  projectMeta,
  RESUME_FILENAME,
  RESUME_LABEL,
  resumeHref,
  SECTION_LABELS,
} from '@/components/console/content'
import {client} from '@/sanity/lib/client'
import {
  projectsQuery,
  siteSettingsQuery,
  socialLinksQuery,
  timelineQuery,
} from '@/sanity/lib/queries'

/**
 * The page is the object: the console is the entire visible interface, and the
 * portfolio's real markup sits behind it in a visually-hidden landmark so that
 * crawlers and screen readers get the whole site (SPEC §1, §11.1). Phase 8
 * fills that landmark out; for now it holds what Phase 0 already queried.
 *
 * Those anchors are also the console's keyboard surface: each social link
 * carries the ABXY slot its physical button occupies, and focusing one lights
 * that button's focus ring in 3D (SPEC §11.4). One set of links, doing both
 * jobs — a second, hidden set would only make a screen reader read them twice.
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

export default async function Home() {
  const [settings, socialLinks, projects, timeline] = await Promise.all([
    client.fetch(siteSettingsQuery, {}, {cache: 'force-cache', next: {tags: ['siteSettings']}}),
    client.fetch(socialLinksQuery, {}, {cache: 'force-cache', next: {tags: ['socialLink']}}),
    client.fetch(projectsQuery, {}, {cache: 'force-cache', next: {tags: ['project']}}),
    client.fetch(timelineQuery, {}, {cache: 'force-cache', next: {tags: ['timelineEntry']}}),
  ])

  const resume = resumeHref(settings)

  return (
    <>
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
        {projects.length > 0 ? <h2>{SECTION_LABELS.library}</h2> : null}
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
                  <a
                    data-console-focus={link.buttonSlot ?? undefined}
                    href={link.url ?? undefined}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {link.label ?? link.platform} ({link.buttonSlot})
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
