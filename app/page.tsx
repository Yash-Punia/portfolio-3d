import {ConsoleStage} from '@/components/console/ConsoleStage'
import {entryDates, isLocalHref, RESUME_FILENAME, resumeHref} from '@/components/console/content'
import {client} from '@/sanity/lib/client'
import {
  projectsQuery,
  siteSettingsQuery,
  socialLinksQuery,
  timelineQuery,
} from '@/sanity/lib/queries'

/** SPEC §3's own default for `resumeLabel`, used when the field is empty. */
const RESUME_LABEL = 'Download CV'

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
          project links are reachable by keyboard.
        */}
        {projects.map((project) => (
          <article key={project._id}>
            {project.title ? <h3>{project.title}</h3> : null}
            {project.blurb ? <p>{project.blurb}</p> : null}
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
        {/* The timeline's entries, in axis order, for the same reason. */}
        {timeline.map((entry) => (
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
          </article>
        ))}
        {socialLinks.length > 0 ? (
          <ul>
            {socialLinks.map((link) => (
              <li key={link._id}>
                <a
                  data-social-slot={link.buttonSlot ?? undefined}
                  href={link.url ?? undefined}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {link.label ?? link.platform} ({link.buttonSlot})
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </main>
    </>
  )
}
