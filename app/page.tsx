import {client} from '@/sanity/lib/client'
import {siteSettingsQuery, socialLinksQuery} from '@/sanity/lib/queries'

/**
 * Phase 0 placeholder. It exists to prove the typed GROQ round-trip and to hold
 * the semantic content that Phase 8 will move into a visually-hidden landmark
 * behind the 3D console (SPEC §11.1). It renders nothing it was not given.
 */
export default async function Home() {
  const [settings, socialLinks] = await Promise.all([
    client.fetch(siteSettingsQuery, {}, {cache: 'force-cache', next: {tags: ['siteSettings']}}),
    client.fetch(socialLinksQuery, {}, {cache: 'force-cache', next: {tags: ['socialLink']}}),
  ])

  return (
    <main>
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
  )
}
