'use client'

import {useState} from 'react'

import {play, type Cue} from '@/components/console/audio'
import {DEFAULT_TUNING, useTuning, WAVES, type Tuning, type Wave} from '@/components/console/tuning'

type NumberKey = {[K in keyof Tuning]: Tuning[K] extends number ? K : never}[keyof Tuning]
type ColorKey = {[K in keyof Tuning]: Tuning[K] extends string ? K : never}[keyof Tuning]
type BoolKey = {[K in keyof Tuning]: Tuning[K] extends boolean ? K : never}[keyof Tuning]
type WaveKey = {[K in keyof Tuning]: Tuning[K] extends Wave ? K : never}[keyof Tuning]

interface NumberControl {
  key: NumberKey
  label: string
  min: number
  max: number
  step: number
}

interface Group {
  title: string
  controls: NumberControl[]
  /** A group that names a cue gets a button to hear it. */
  cue?: Cue
  /** A group that can be switched off gets a checkbox beside its title. */
  on?: BoolKey
  /** A group that makes a sound gets a waveform to pick. */
  wave?: WaveKey
}

/**
 * The panel has two tabs because the console and the firmware on its screen are
 * tuned in different units and at different moments: world units against the
 * object, CSS pixels against the UI drawn on it. They share one store, one
 * "save as default" and one `Tuning` record — only the list of controls splits.
 */
const CONSOLE_GROUPS: Group[] = [
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
      {key: 'screenEmissiveIntensity', label: 'Brightness, dark', min: 0, max: 8, step: 0.1},
      {key: 'screenEmissiveIntensityLight', label: 'Brightness, light', min: 0, max: 8, step: 0.1},
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
    title: 'Info monitor',
    controls: [
      {key: 'monitorY', label: 'Monitor height', min: -2, max: 2, step: 0.01},
      {key: 'monitorHeight', label: 'Monitor size', min: 0.2, max: 2.5, step: 0.01},
    ],
  },
  {
    title: 'Joystick',
    controls: [
      {key: 'joystickY', label: 'Height', min: -2, max: 2, step: 0.01},
      {key: 'joystickRadius', label: 'Cap radius', min: 0.1, max: 0.9, step: 0.01},
    ],
  },
  {
    title: 'ABXY',
    controls: [
      {key: 'abxyY', label: 'Cluster height', min: -2, max: 2, step: 0.01},
      {key: 'abxySpacing', label: 'Spacing', min: 0.15, max: 1.2, step: 0.01},
      {key: 'abxyRadius', label: 'Cap radius', min: 0.06, max: 0.5, step: 0.005},
    ],
  },
  {
    title: 'Theme toggle and close',
    controls: [
      {key: 'toggleY', label: 'Depth below top edge', min: 0.1, max: 2, step: 0.02},
      {key: 'toggleX', label: 'Toggle across', min: -0.9, max: 0.9, step: 0.01},
      {key: 'closeX', label: 'Close across', min: -0.9, max: 0.9, step: 0.01},
      {key: 'toggleRadius', label: 'Toggle radius', min: 0.05, max: 0.4, step: 0.005},
    ],
  },
  {
    title: 'Hit areas',
    controls: [
      {key: 'buttonHitScale', label: 'Buttons (× cap radius)', min: 1, max: 3, step: 0.05},
      {key: 'joystickHitScale', label: 'Joystick (× cap radius)', min: 1, max: 3, step: 0.05},
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

/**
 * The firmware UI (SPEC §7, §8). These are CSS pixels in the panel's own
 * authored space, so they stay put relative to the screen whatever the console's
 * proportions are — and "panel width" is the whole UI's zoom: lower it and
 * everything on the screen gets bigger.
 */
const FIRMWARE_GROUPS: Group[] = [
  {
    title: 'Panel',
    controls: [
      {key: 'fwPanelWidth', label: 'Panel width (UI zoom)', min: 400, max: 1600, step: 10},
      {key: 'fwRailX', label: 'Side margin', min: 0, max: 240, step: 2},
    ],
  },
  {
    title: 'Status bar',
    controls: [
      {key: 'fwStatusHeight', label: 'Height', min: 20, max: 140, step: 1},
      {key: 'fwStatusFont', label: 'Font size', min: 8, max: 40, step: 1},
    ],
  },
  {
    title: 'Rail',
    controls: [
      {key: 'fwRailTop', label: 'Space above tiles', min: 0, max: 200, step: 2},
      {key: 'fwTileWidth', label: 'Tile width', min: 80, max: 600, step: 5},
      {key: 'fwTileHeight', label: 'Tile height', min: 50, max: 400, step: 5},
      {key: 'fwTileGap', label: 'Gap between tiles', min: 0, max: 120, step: 2},
      {key: 'fwSelectedScale', label: 'Selected scale', min: 1, max: 1.6, step: 0.01},
      {key: 'fwUnselectedOpacity', label: 'Unselected opacity', min: 0.1, max: 1, step: 0.01},
    ],
  },
  {
    title: 'Text block',
    controls: [
      {key: 'fwBlockGap', label: 'Space below rail', min: 0, max: 160, step: 2},
      {key: 'fwTextGap', label: 'Space between lines', min: 0, max: 80, step: 1},
      {key: 'fwTitleFont', label: 'Title size', min: 16, max: 110, step: 1},
      {key: 'fwMetaFont', label: 'Meta size', min: 8, max: 40, step: 1},
      {key: 'fwBodyFont', label: 'Body size', min: 10, max: 48, step: 1},
    ],
  },
  {
    title: 'Preview clip',
    controls: [
      {key: 'fwPreviewDelayMs', label: 'Rest before it plays (ms)', min: 0, max: 5000, step: 100},
    ],
  },
  {
    title: 'Timeline',
    controls: [
      {key: 'fwAxisTop', label: 'Space above axis', min: 20, max: 400, step: 2},
      {key: 'fwDotGap', label: 'Space between dots', min: 60, max: 400, step: 5},
      {key: 'fwDotSize', label: 'Dot size', min: 4, max: 40, step: 1},
      {key: 'fwEntryGap', label: 'Space below axis', min: 0, max: 200, step: 2},
    ],
  },
]

/**
 * The cues (SPEC §16.2). Every one has the same four knobs — start pitch, the
 * pitch it glides to, how long, how loud — so they are generated from one table
 * rather than written out nine times. `play` beside each title is how they are
 * dialled: by ear, without having to trigger the event that fires them.
 *
 * The `Hz` range stops at 3kHz because a console blip above that is a whistle,
 * and gain at 0.2 because these are punctuation, not music.
 */
const SOUND_CUES: {cue: Cue; title: string; prefix: string}[] = [
  {cue: 'open', title: 'Open the console', prefix: 'sfxOpen'},
  {cue: 'close', title: 'Close the console', prefix: 'sfxClose'},
  {cue: 'boot', title: 'Boot chord', prefix: 'sfxBoot'},
  {cue: 'move', title: 'Move along a rail', prefix: 'sfxMove'},
  {cue: 'press', title: 'Face button', prefix: 'sfxPress'},
  {cue: 'section', title: 'Change screen', prefix: 'sfxSection'},
  {cue: 'detail', title: 'Open a project', prefix: 'sfxDetail'},
  {cue: 'back', title: 'Step back out', prefix: 'sfxBack'},
  {cue: 'theme', title: 'Theme toggle', prefix: 'sfxTheme'},
]

const SOUND_GROUPS: Group[] = [
  {
    title: 'Master',
    on: 'sfxOn',
    controls: [
      {key: 'sfxVolume', label: 'Volume', min: 0, max: 2, step: 0.05},
      // The ramp up to full gain. Near zero it is a click; past ~40ms a swell.
      {key: 'sfxAttackMs', label: 'Attack (ms)', min: 0, max: 120, step: 1},
    ],
  },
  ...SOUND_CUES.map(({cue, title, prefix}) => ({
    title,
    cue,
    on: `${prefix}On` as BoolKey,
    wave: `${prefix}Wave` as WaveKey,
    controls: [
      {key: `${prefix}From` as NumberKey, label: 'Pitch from (Hz)', min: 40, max: 3000, step: 5},
      {key: `${prefix}To` as NumberKey, label: 'Pitch to (Hz)', min: 40, max: 3000, step: 5},
      {key: `${prefix}Ms` as NumberKey, label: 'Length (ms)', min: 10, max: 600, step: 2},
      {key: `${prefix}Gain` as NumberKey, label: 'Loudness', min: 0, max: 0.2, step: 0.002},
    ],
  })),
]

const TABS: {id: string; label: string; groups: Group[]; colours: boolean}[] = [
  {id: 'console', label: 'console', groups: CONSOLE_GROUPS, colours: true},
  {id: 'firmware', label: 'firmware', groups: FIRMWARE_GROUPS, colours: false},
  {id: 'sounds', label: 'sounds', groups: SOUND_GROUPS, colours: false},
]

const COLOURS: {key: ColorKey; label: string}[] = [
  {key: 'shellColor', label: 'Shell'},
  {key: 'bezelColor', label: 'Bezel and seams'},
  {key: 'accentColor', label: 'Red accent'},
  {key: 'buttonColor', label: 'Button caps'},
  {key: 'heldTintColor', label: 'Button mark, held'},
  {key: 'screenColor', label: 'Screen, dark theme'},
  {key: 'screenLightColor', label: 'Screen, light theme'},
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
  const [tab, setTab] = useState(TABS[0]!)
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
          tuning{changed > 0 ? ` — ${changed} changed` : ''}
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
          <div className="flex gap-1 border-b border-white/10 px-3 py-1.5">
            {TABS.map((entry) => (
              <button
                key={entry.id}
                className={`rounded px-2 py-0.5 ${
                  entry.id === tab.id
                    ? 'bg-white/15 text-neutral-100'
                    : 'text-neutral-400 hover:bg-white/5'
                }`}
                onClick={() => setTab(entry)}
                type="button"
              >
                {entry.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2">
            {tab.groups.map((group) => (
              <section key={group.title} className="mb-3">
                <h2 className="mb-1 flex items-center justify-between gap-2 text-neutral-500">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {group.on ? (
                      <input
                        aria-label={`${group.title} on`}
                        checked={values[group.on]}
                        className="accent-[#e12b38]"
                        onChange={(event) => set(group.on as BoolKey, event.target.checked)}
                        type="checkbox"
                      />
                    ) : null}
                    <span className="truncate">{group.title}</span>
                  </span>
                  {group.cue ? (
                    <button
                      className="shrink-0 rounded border border-white/15 px-1.5 py-0.5 text-neutral-300 hover:bg-white/10"
                      // Straight to `play`, not through the store: the mute is
                      // the visitor's, and a preview you cannot hear is not one.
                      onClick={() => play(group.cue as Cue)}
                      type="button"
                    >
                      play
                    </button>
                  ) : null}
                </h2>

                {group.wave ? (
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label className="truncate text-neutral-300" htmlFor={group.wave}>
                      Waveform
                    </label>
                    <select
                      className="w-28 rounded border border-white/15 bg-white/5 px-1 py-0.5"
                      id={group.wave}
                      onChange={(event) => set(group.wave as WaveKey, event.target.value as Wave)}
                      value={values[group.wave]}
                    >
                      {WAVES.map((wave) => (
                        <option key={wave} value={wave}>
                          {wave}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
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

            {/*
              The colours sit on the console tab: the screen's palette is
              SPEC §9's, and its accent is the chassis accent, so there is
              nothing here that belongs only to the firmware.
            */}
            <section className="mb-2" hidden={!tab.colours}>
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
