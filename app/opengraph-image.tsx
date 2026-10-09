import {ImageResponse} from 'next/og'

import {client} from '@/sanity/lib/client'
import {siteSettingsQuery} from '@/sanity/lib/queries'

/**
 * The sharing card, generated (SPEC §11.7).
 *
 * SPEC asks for "the open console", and a WebGL render is not something
 * `ImageResponse` can produce — Satori lays out flat elements, with no canvas
 * and no three.js. So this draws the console's *screen* instead: the same
 * status bar, the same palette, the same type, with the name and title on it.
 * A real screenshot beats it, and the Studio's "Sharing image" field is how one
 * gets in — `generateMetadata` prefers that whenever it is set, and only falls
 * back here.
 *
 * No custom font. Loading Archivo would mean fetching a woff at request time to
 * draw a picture nobody sees on the site itself; the card leans on the screen's
 * colours and layout rather than its typeface.
 */
export const size = {width: 1200, height: 630}
export const contentType = 'image/png'
/*
  Static, so it describes the picture rather than naming anyone: `alt` is a
  module export Next reads without running the component, which means it cannot
  read Sanity, and hard-coding a name here would be content in code (SPEC §15).
  The name is in the card, in the title and in the description beside it.
*/
export const alt = "The console's screen, showing the name and job title on it"

/*
  The dark screen's palette, copied from the old firmware theme rather than
  imported: that module is a client one — it reads the store and the live tuning
  values — and pulling it in here would drag React hooks into an image route.
  The accent is the corrected dark-theme one Phase 7 measured at 11.11:1.
*/
const BG = '#0a0f12'
const FG = '#e9f0f1'
const MUTED = '#7c8b90'
const ACCENT = '#4be12d'

export default async function OpenGraphImage() {
  const settings = await client.fetch(
    siteSettingsQuery,
    {},
    {cache: 'force-cache', next: {tags: ['siteSettings']}},
  )

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: BG,
        color: FG,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '28px 56px',
          borderBottom: `1px solid ${MUTED}44`,
          color: MUTED,
          fontSize: 26,
          letterSpacing: 6,
        }}
      >
        <span>MENU</span>
        <span>YP-OS 1.0</span>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 56px',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
          <span style={{color: ACCENT, fontSize: 40}}>▶</span>
          <span style={{fontSize: 92, fontWeight: 700, letterSpacing: -1}}>
            {settings?.fullName ?? ''}
          </span>
        </div>
        <span style={{marginTop: 12, marginLeft: 60, color: MUTED, fontSize: 44}}>
          {settings?.title ?? ''}
        </span>
        {settings?.statusLine ? (
          <span style={{marginTop: 40, marginLeft: 60, color: ACCENT, fontSize: 30}}>
            {settings.statusLine}
          </span>
        ) : null}
      </div>

      <div style={{display: 'flex', height: 10, background: ACCENT}} />
    </div>,
    size,
  )
}
