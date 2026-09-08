import {draftMode} from 'next/headers'
import {redirect} from 'next/navigation'

/**
 * The way out of draft mode. No secret: dropping a cookie you already hold is
 * not a privileged act, and a preview you cannot leave is a trap.
 *
 * `GET` for the same reason the way in is: it is a link, in the banner the page
 * shows while a draft is on screen.
 */
export async function GET() {
  const draft = await draftMode()
  draft.disable()

  redirect('/')
}
