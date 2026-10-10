import {defineQuery} from 'next-sanity'

/**
 * Queries must be assigned to a named variable and wrapped in `defineQuery`
 * for Sanity TypeGen to pick them up — inline query strings are skipped.
 */

export const siteSettingsQuery = defineQuery(`*[_type == "siteSettings"][0]{
  fullName,
  title,
  statusLine,
  email,
  aboutHeadline,
  aboutBody,
  resumeLabel,
  "resumeUrl": resumeFile.asset->url,
  seo,
  "avatarUrl": avatar.asset->url,
  "ogImage": seo.ogImage.asset->{
    url,
    "width": metadata.dimensions.width,
    "height": metadata.dimensions.height
  }
}`)

export const socialLinksQuery = defineQuery(`*[_type == "socialLink"] | order(buttonSlot asc){
  _id,
  platform,
  url,
  buttonSlot,
  label
}`)

export const projectsQuery = defineQuery(`*[_type == "project"] | order(order asc){
  _id,
  title,
  "slug": slug.current,
  order,
  blurb,
  description,
  role,
  year,
  engine,
  tech,
  platforms,
  // The cover carries its own placeholder and its own aspect: lqip is the tiny
  // data URI Sanity generates for every asset, painted under the image while it
  // loads, and the dimensions are the intrinsic size the element declares
  // (SPEC §12).
  cover{
    ...,
    "lqip": asset->metadata.lqip,
    "width": asset->metadata.dimensions.width,
    "height": asset->metadata.dimensions.height
  },
  // The URL and the type: a GIF is drawn with <img>, a video with <video>.
  "preview": preview.asset->{url, mimeType},
  gallery,
  videoUrl,
  links[]{label, url},
  teamSize,
  featured
}`)

/**
 * SPEC §8: work first, then education, each most-recent-first — the axis runs
 * leftwards into the past. The group key is written out rather than leaning on
 * `kind` sorting the right way alphabetically by accident.
 */
export const timelineQuery =
  defineQuery(`*[_type == "timelineEntry"] | order(select(kind == "work" => 0, 1) asc, startDate desc){
  _id,
  kind,
  organisation,
  role,
  startDate,
  endDate,
  isCurrent,
  location,
  summary,
  highlights,
  result,
  relatedProjects[]->{_id, title, "slug": slug.current}
}`)
