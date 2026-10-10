import {readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'

import {DEFAULT_TUNE, type Tune} from '@/components/console/tune'

/**
 * Writes the `?tune` panel's current values back into `DEFAULT_TUNE`, so a
 * session of dialling the handhelds in ends in the source file.
 *
 * This endpoint edits a source file, so it is fenced in tightly:
 *
 * - it 404s outside `next dev`, so a deployed build has no file-writing route;
 * - the path it writes is fixed here and never comes from the request;
 * - it only ever replaces the `DEFAULT_TUNE` block;
 * - every key must be present with the type its default has: a finite number,
 *   a boolean, or a six-digit hex colour. Anything else is a 400, and nothing
 *   is written.
 */

const SOURCE = path.join(process.cwd(), 'components', 'console', 'tune.ts')
const BLOCK = /export const DEFAULT_TUNE: Tune = \{[\s\S]*?\n\}/
const HEX = /^#[0-9a-fA-F]{6}$/
/** Only bounds nonsense: the largest legitimate value is a few thousand ms. */
const LIMIT = 100_000

const KEYS = Object.keys(DEFAULT_TUNE) as (keyof Tune)[]

/**
 * A replacement `DEFAULT_TUNE` block, or `null` if the body is not exactly the
 * shape the current defaults describe. Values are emitted from the validated
 * primitives, so nothing from the request reaches the file verbatim.
 */
function renderDefaults(body: Record<string, unknown>): string | null {
  if (Object.keys(body).length !== KEYS.length) return null
  const lines: string[] = []

  for (const key of KEYS) {
    const value = body[key]
    const shape = DEFAULT_TUNE[key]

    if (typeof shape === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > LIMIT) {
        return null
      }
      // Slider arithmetic produces things like 0.30000000000000004.
      lines.push(`  ${key}: ${Number(value.toFixed(4))},`)
    } else if (typeof shape === 'boolean') {
      if (typeof value !== 'boolean') return null
      lines.push(`  ${key}: ${value},`)
    } else {
      if (typeof value !== 'string' || !HEX.test(value)) return null
      lines.push(`  ${key}: '${value.toLowerCase()}',`)
    }
  }

  return `export const DEFAULT_TUNE: Tune = {\n${lines.join('\n')}\n}`
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return Response.json({error: 'Available in `next dev` only.'}, {status: 404})
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({error: 'Expected a JSON body.'}, {status: 400})
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return Response.json({error: 'Expected an object of tune values.'}, {status: 400})
  }

  const block = renderDefaults(body as Record<string, unknown>)
  if (!block) {
    return Response.json({error: 'Values do not match the shape of Tune.'}, {status: 400})
  }

  // The checkout may be CRLF (`core.autocrlf`); match and write in its own line endings.
  const source = await readFile(SOURCE, 'utf8')
  const crlf = source.includes('\r\n')
  const lf = crlf ? source.replace(/\r\n/g, '\n') : source
  const next = lf.replace(BLOCK, block)
  if (next === lf && !lf.includes(block)) {
    return Response.json({error: 'Could not find DEFAULT_TUNE in tune.ts.'}, {status: 500})
  }

  await writeFile(SOURCE, crlf ? next.replace(/\n/g, '\r\n') : next, 'utf8')
  return Response.json({saved: true})
}
