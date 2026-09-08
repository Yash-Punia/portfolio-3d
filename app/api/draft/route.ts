import {draftMode} from 'next/headers'
import {redirect} from 'next/navigation'

import {revalidateSecret} from '@/sanity/env'

/**
 * Draft mode (SPEC §3): open this with the secret and the console renders
 * unpublished edits, for whoever holds the cookie and nobody else.
 *
 * SPEC §3 names the entry point `/?preview`. It is `/api/draft?secret=…`
 * instead, because draft mode is a cookie and only a Route Handler can set one
 * — and because a bare `?preview` with nothing to check would hand every
 * visitor who guessed it a view of unpublished work. The secret is the same
 * `SANITY_REVALIDATE_SECRET` the webhook signs with: one shared secret between
 * this site and this Studio, not two to rotate.
 *
 * `GET`, not `POST`, because the way in is a link the Studio opens in a tab.
 */
export async function GET(request: Request) {
  if (!revalidateSecret) {
    return Response.json(
      {message: 'SANITY_REVALIDATE_SECRET is not set on this deployment'},
      {status: 500},
    )
  }

  const secret = new URL(request.url).searchParams.get('secret')
  if (secret !== revalidateSecret) {
    return Response.json({message: 'Invalid secret'}, {status: 401})
  }

  const draft = await draftMode()
  draft.enable()

  // Back to the console, which is the only page there is.
  redirect('/')
}
