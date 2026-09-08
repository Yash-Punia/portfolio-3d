import {NextStudio, metadata as studioMetadata} from 'next-sanity/studio'

import config from '@/sanity.config'

export const dynamic = 'force-static'

/**
 * The Studio's own metadata, plus `noindex` (SPEC §11.8): this is Yash's
 * editor, not a page anyone should reach from a search result. `robots.ts`
 * disallows the path as well.
 */
export const metadata = {...studioMetadata, robots: {index: false, follow: false}}

export {viewport} from 'next-sanity/studio'

export default function StudioPage() {
  return <NextStudio config={config} />
}
