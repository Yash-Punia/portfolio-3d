import {isValidSignature, SIGNATURE_HEADER_NAME} from '@sanity/webhook'
import {revalidateTag} from 'next/cache'

import {CACHE_TAGS, revalidateSecret, type CacheTag} from '@/sanity/env'

/**
 * The Sanity webhook (SPEC §3, §14): publish in the Studio, and the live site
 * shows it without a redeploy.
 *
 * Every fetch in `app/page.tsx` and `app/layout.tsx` is tagged with its document
 * type, so this route's whole job is to turn "a `project` changed" into
 * `revalidateTag('project')`. Nothing is rebuilt here — the next request for the
 * page rebuilds it, and everyone else keeps the cached copy until it does.
 *
 * The body is read as text and not as JSON, because the signature is computed
 * over the exact bytes Sanity sent: `await request.json()` would re-serialise
 * them and every signature would fail.
 */
export async function POST(request: Request) {
  if (!revalidateSecret) {
    return Response.json(
      {message: 'SANITY_REVALIDATE_SECRET is not set on this deployment'},
      {status: 500},
    )
  }

  const signature = request.headers.get(SIGNATURE_HEADER_NAME)
  if (!signature) {
    return Response.json({message: 'Missing signature'}, {status: 401})
  }

  const body = await request.text()
  if (!(await isValidSignature(body, signature, revalidateSecret))) {
    return Response.json({message: 'Invalid signature'}, {status: 401})
  }

  /*
    The webhook is configured with a projection of `{_type}` (see README), so
    this is all the payload has to carry. An unknown type is not an error —
    it is a webhook filter that has drifted wider than this route knows about,
    and the honest answer is to say which tag was not revalidated.
  */
  const {_type} = JSON.parse(body) as {_type?: string}
  const tag = CACHE_TAGS.find((known): known is CacheTag => known === _type)

  if (!tag) {
    return Response.json({revalidated: false, message: `Unknown document type: ${_type}`})
  }

  /*
    `{expire: 0}` rather than the recommended `"max"`: on a one-page portfolio
    with four small queries, blocking the next single request is cheaper than
    telling an editor who just hit Publish that their change will appear on the
    visit after this one. The `max` profile is the right call for a site with
    traffic to protect; this one has a handful of readers and one author who
    needs to trust the button.
  */
  revalidateTag(tag, {expire: 0})

  return Response.json({revalidated: true, tag, now: Date.now()})
}
