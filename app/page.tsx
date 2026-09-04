import {ConsoleStage} from '@/components/console/ConsoleStage'
import {client} from '@/sanity/lib/client'
import {siteSettingsQuery, socialLinksQuery} from '@/sanity/lib/queries'

/**
 * The page is the object: the console is the entire visible interface, and the
 * portfolio's real markup sits behind it in a visually-hidden landmark so that
 * crawlers and screen readers get the whole site (SPEC §1, §11.1). Phase 8
 * fills that landmark out; for now it holds what Phase 0 already queried.
 *
 * It renders nothing it was not given.
 */
export default async function Home() {
  const [settings, socialLinks] = await Promise.all([
    client.fetch(siteSettingsQuery, {}, {cache: 'force-cache', next: {tags: ['siteSettings']}}),
    client.fetch(socialLinksQuery, {}, {cache: 'force-cache', next: {tags: ['socialLink']}}),
  ])

  return (
    <>
      <ConsoleStage />

      <main className="sr-only">
        {settings?.fullName ? <h1>{settings.fullName}</h1> : null}
        {settings?.title ? <p>{settings.title}</p> : null}
        {settings?.statusLine ? <p>{settings.statusLine}</p> : null}
        {settings?.aboutHeadline ? <h2>{settings.aboutHeadline}</h2> : null}
        {settings?.aboutBody ? <p>{settings.aboutBody}</p> : null}
        {socialLinks.length > 0 ? (
          <ul>
            {socialLinks.map((link) => (
              <li key={link._id}>
                <a href={link.url ?? undefined} rel="noopener noreferrer" target="_blank">
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
