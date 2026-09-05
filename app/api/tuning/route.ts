import {readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'

import {DEFAULT_TUNING, type Tuning} from '@/components/console/tuning'

/**
 * Writes the tuning panel's current values back into `DEFAULT_TUNING`, so a
 * session of dialling the console in ends in the source file rather than in a
 * clipboard paste.
 *
 * This endpoint edits a source file, so it is fenced in tightly:
 *
 * - it 404s outside `next dev`, so a deployed build has no file-writing route;
 * - the path it writes is fixed here and never comes from the request;
 * - it only ever replaces the `DEFAULT_TUNING` block, never anything else;
 * - every key must be present, with the type and range its default has. An
 *   unknown key, a missing one, a non-finite number or a colour that is not a
 *   six-digit hex is a 400, and nothing is written.
 */

const SOURCE = path.join(process.cwd(), 'components', 'console', 'tuning.ts')
const BLOCK = /export const DEFAULT_TUNING: Tuning = \{[\s\S]*?\n\}/
const HEX = /^#[0-9a-fA-F]{6}$/
/** No dimension in this model is anywhere near this; it only bounds nonsense. */
const LIMIT = 1000

const KEYS = Object.keys(DEFAULT_TUNING) as (keyof Tuning)[]

/**
 * Renders a replacement `DEFAULT_TUNING` block, or `null` if the body is not
 * exactly the shape the current defaults describe. Values are emitted from the
 * validated primitives, so nothing from the request reaches the file verbatim.
 */
function renderDefaults(body: Record<string, unknown>): string | null {
  if (Object.keys(body).length !== KEYS.length) return null

  const lines: string[] = []

  for (const key of KEYS) {
    const value = body[key]

    if (typeof DEFAULT_TUNING[key] === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > LIMIT) {
        return null
      }
      // Slider arithmetic produces things like 0.30000000000000004.
      lines.push(`  ${key}: ${Number(value.toFixed(4))},`)
    } else {
      if (typeof value !== 'string' || !HEX.test(value)) return null
      lines.push(`  ${key}: '${value.toLowerCase()}',`)
    }
  }

  return `export const DEFAULT_TUNING: Tuning = {\n${lines.join('\n')}\n}`
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
    return Response.json({error: 'Expected an object of tuning values.'}, {status: 400})
  }

  const block = renderDefaults(body as Record<string, unknown>)
  if (!block) {
    return Response.json({error: 'Values do not match the shape of Tuning.'}, {status: 400})
  }

  const source = await readFile(SOURCE, 'utf8')
  const next = source.replace(BLOCK, block)
  if (next === source) {
    return Response.json({error: 'Could not find DEFAULT_TUNING in tuning.ts.'}, {status: 500})
  }

  await writeFile(SOURCE, next, 'utf8')

  return Response.json({saved: true})
}
