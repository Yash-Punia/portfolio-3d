import {defineQuery} from 'next-sanity'

/**
 * Queries must be assigned to a named variable and wrapped in `defineQuery`
 * for Sanity TypeGen to pick them up — inline query strings are skipped.
 */

export const siteSettingsQuery = defineQuery(`*[_type == "siteSettings"][0]{
  fullName,
  title,
  statusLine,
  aboutHeadline,
  aboutBody,
  resumeLabel,
  "resumeUrl": resumeFile.asset->url,
  seo
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
  cover,
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
