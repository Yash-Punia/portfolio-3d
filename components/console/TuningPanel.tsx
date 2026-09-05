'use client'

import {useState} from 'react'

import {DEFAULT_TUNING, useTuning, type Tuning} from '@/components/console/tuning'

type NumberKey = {[K in keyof Tuning]: Tuning[K] extends number ? K : never}[keyof Tuning]
type ColorKey = {[K in keyof Tuning]: Tuning[K] extends string ? K : never}[keyof Tuning]

interface NumberControl {
  key: NumberKey
  label: string
  min: number
  max: number
  step: number
}

const GROUPS: {title: string; controls: NumberControl[]}[] = [
  {
    title: 'Size and shape',
    controls: [
      {key: 'bodyWidth', label: 'Body width', min: 2, max: 8, step: 0.05},
      {key: 'bodyHeight', label: 'Body height', min: 2, max: 8, step: 0.05},
      {key: 'bodyDepth', label: 'Body depth', min: 0.1, max: 1, step: 0.01},
      {key: 'bodyRadius', label: 'Corner radius', min: 0, max: 0.6, step: 0.01},
    ],
  },
  {
    title: 'Screen and bezel',
    controls: [
      {key: 'screenWidth', label: 'Screen width', min: 1, max: 7.5, step: 0.05},
      {key: 'screenHeight', label: 'Screen height', min: 1, max: 7.5, step: 0.05},
      {key: 'bezelPadding', label: 'Bezel around glass', min: 0, max: 0.6, step: 0.01},
      {key: 'faceDepth', label: 'Face frame depth', min: 0.01, max: 0.3, step: 0.005},
      {key: 'screenEmissiveIntensity', label: 'Screen brightness', min: 0, max: 8, step: 0.1},
    ],
  },
  {
    title: 'Flaps',
    controls: [
      {key: 'flapInset', label: 'Inset from body', min: 0.01, max: 0.4, step: 0.005},
      {key: 'flapDepth', label: 'Flap depth', min: 0.05, max: 0.5, step: 0.005},
      {key: 'flapRadius', label: 'Flap corner radius', min: 0, max: 0.5, step: 0.01},
      {key: 'panelMargin', label: 'Moulding margin', min: 0.02, max: 0.8, step: 0.01},
      {key: 'seamGap', label: 'Seam gap', min: 0, max: 0.1, step: 0.002},
      {key: 'seamBandWidth', label: 'Seam band width', min: 0.004, max: 0.08, step: 0.001},
      {key: 'openAngleDeg', label: 'Open angle (deg)', min: 90, max: 179, step: 1},
    ],
  },
  {
    title: 'Close button',
    controls: [
      {key: 'closeButtonRadius', label: 'Cap radius', min: 0.05, max: 0.4, step: 0.005},
      {key: 'closeButtonY', label: 'Height above edge', min: 0.1, max: 2, step: 0.02},
    ],
  },
  {
    title: 'Framing',
    controls: [
      {key: 'zoomScaleClosed', label: 'Zoom, closed', min: 0.5, max: 1.6, step: 0.01},
      {key: 'zoomScaleOpen', label: 'Zoom, open', min: 0.5, max: 1.6, step: 0.01},
    ],
  },
]

const COLOURS: {key: ColorKey; label: string}[] = [
  {key: 'shellColor', label: 'Shell'},
  {key: 'bezelColor', label: 'Bezel and seams'},
  {key: 'accentColor', label: 'Red accent'},
  {key: 'buttonColor', label: 'Button caps'},
  {key: 'screenColor', label: 'Screen, powered'},
]

const KEYS = Object.keys(DEFAULT_TUNING) as (keyof Tuning)[]

/**
 * Live controls for every value the console's form is built from, so the
 * defaults can be dialled in against the real object instead of guessed at in
 * `tuning.ts`.
 *
 * It is a development tool, not part of the site: it renders only behind the
 * `?tune` query flag, so SPEC §1's "no text outside the console" holds for
 * every visitor who does not ask for it. Edits persist in `localStorage`;
 * "copy defaults" gives back a `DEFAULT_TUNING` body to paste into the source,
 * and "reset" drops back to what is in the source today.
 */
export function TuningPanel() {
  const values = useTuning((state) => state.values)
  const set = useTuning((state) => state.set)
  const reset = useTuning((state) => state.reset)
  const [collapsed, setCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const changed = KEYS.filter((key) => values[key] !== DEFAULT_TUNING[key]).length

  const copy = async () => {
    const body = KEYS.map((key) => {
      const value = values[key]
      return `  ${key}: ${typeof value === 'string' ? `'${value}'` : value},`
    }).join('\n')

    await navigator.clipboard.writeText(`export const DEFAULT_TUNING: Tuning = {\n${body}\n}\n`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  /**
   * Writes the current values into `DEFAULT_TUNING` in the source file, then
   * drops the local override and reloads so what renders afterwards is the new
   * default rather than a saved copy of it sitting on top. Needs `next dev` —
   * the route that does the writing does not exist in a built app.
   */
  const save = async () => {
    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/tuning', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const reason: unknown = await response.json().catch(() => null)
        const message =
          typeof reason === 'object' && reason !== null && 'error' in reason
            ? String((reason as {error: unknown}).error)
            : `Save failed (${response.status}).`
        setError(message)
        return
      }

      useTuning.persist.clearStorage()
      window.location.reload()
    } catch {
      setError('Could not reach the dev server.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className="fixed top-3 right-3 bottom-3 z-10 flex w-[19rem] max-w-[calc(100vw-1.5rem)] flex-col rounded-lg border border-white/10 bg-black/85 font-mono text-[11px] text-neutral-200 shadow-xl backdrop-blur">
      <header className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <span className="tracking-wide text-neutral-400">
          console tuning{changed > 0 ? ` — ${changed} changed` : ''}
        </span>
        <button
          className="rounded border border-white/15 px-2 py-0.5 hover:bg-white/10"
          onClick={() => setCollapsed((value) => !value)}
          type="button"
        >
          {collapsed ? 'show' : 'hide'}
        </button>
      </header>

      {collapsed ? null : (
        <>
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {GROUPS.map((group) => (
              <section key={group.title} className="mb-3">
                <h2 className="mb-1 text-neutral-500">{group.title}</h2>
                {group.controls.map((control) => (
                  <div key={control.key} className="mb-1.5">
                    <label
                      className="flex items-center justify-between gap-2"
                      htmlFor={control.key}
                    >
                      <span className="truncate text-neutral-300">{control.label}</span>
                      <input
                        className="w-16 rounded border border-white/15 bg-white/5 px-1 py-0.5 text-right tabular-nums"
                        id={control.key}
                        max={control.max}
                        min={control.min}
                        onChange={(event) => {
                          const next = Number(event.target.value)
                          if (Number.isFinite(next)) set(control.key, next)
                        }}
                        step={control.step}
                        type="number"
                        value={values[control.key]}
                      />
                    </label>
                    <input
                      aria-label={`${control.label} slider`}
                      className="mt-1 w-full accent-[#e12b38]"
                      max={control.max}
                      min={control.min}
                      onChange={(event) => set(control.key, Number(event.target.value))}
                      step={control.step}
                      type="range"
                      value={values[control.key]}
                    />
                  </div>
                ))}
              </section>
            ))}

            <section className="mb-2">
              <h2 className="mb-1 text-neutral-500">Colours</h2>
              {COLOURS.map((colour) => (
                <div key={colour.key} className="mb-1.5 flex items-center justify-between gap-2">
                  <label className="truncate text-neutral-300" htmlFor={colour.key}>
                    {colour.label}
                  </label>
                  <span className="flex items-center gap-1">
                    <input
                      aria-label={`${colour.label} hex`}
                      className="w-20 rounded border border-white/15 bg-white/5 px-1 py-0.5 uppercase"
                      onChange={(event) => set(colour.key, event.target.value)}
                      type="text"
                      value={values[colour.key]}
                    />
                    <input
                      className="h-6 w-8 rounded border border-white/15 bg-transparent"
                      id={colour.key}
                      onChange={(event) => set(colour.key, event.target.value)}
                      type="color"
                      value={values[colour.key]}
                    />
                  </span>
                </div>
              ))}
            </section>
          </div>

          <footer className="border-t border-white/10 px-3 py-2">
            <div className="flex items-center gap-2">
              <button
                className="rounded border border-[#e12b38]/60 bg-[#e12b38]/15 px-2 py-1 hover:bg-[#e12b38]/25 disabled:opacity-50"
                disabled={saving || changed === 0}
                onClick={save}
                type="button"
              >
                {saving ? 'saving…' : 'save as default'}
              </button>
              <button
                className="rounded border border-white/15 px-2 py-1 hover:bg-white/10"
                onClick={copy}
                type="button"
              >
                {copied ? 'copied' : 'copy'}
              </button>
              <button
                className="rounded border border-white/15 px-2 py-1 hover:bg-white/10"
                onClick={reset}
                type="button"
              >
                reset
              </button>
            </div>
            <p className="mt-1.5 text-neutral-500">
              {error ? (
                <span className="text-[#ff6b74]">{error}</span>
              ) : (
                'writes tuning.ts — dev server only'
              )}
            </p>
          </footer>
        </>
      )}
    </aside>
  )
}
