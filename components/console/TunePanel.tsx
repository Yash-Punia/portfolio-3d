'use client'

import {useEffect, useState} from 'react'

import {DEFAULT_TUNE, useTune, type Tune} from '@/components/console/tune'

type NumberKey = {[K in keyof Tune]: Tune[K] extends number ? K : never}[keyof Tune]
type ColourKey = {[K in keyof Tune]: Tune[K] extends string ? K : never}[keyof Tune]
type BoolKey = {[K in keyof Tune]: Tune[K] extends boolean ? K : never}[keyof Tune]

type Control =
  | {kind: 'number'; key: NumberKey; label: string; min: number; max: number; step: number}
  | {kind: 'colour'; key: ColourKey; label: string}
  | {kind: 'bool'; key: BoolKey; label: string}

const n = (key: NumberKey, label: string, min: number, max: number, step: number): Control => ({
  kind: 'number',
  key,
  label,
  min,
  max,
  step,
})
const c = (key: ColourKey, label: string): Control => ({kind: 'colour', key, label})
const b = (key: BoolKey, label: string): Control => ({kind: 'bool', key, label})

interface Group {
  title: string
  controls: Control[]
}

/** The controls a shell's two caps share the shape of, for either shell. */
function capGroups(p: 'desk' | 'hh', px: boolean): Group[] {
  // The handheld places in design px from its top-left; the desk in world units from its centre.
  const pos: [number, number, number] = px ? [0, 390, 1] : [-6.2, 6.2, 0.01]
  const posY: [number, number, number] = px ? [0, 844, 1] : [-3.2, 3.2, 0.01]
  const k = <S extends string>(s: S) => `${p}${s}` as const
  return [
    {
      title: 'D-pad',
      controls: [
        n(k('DpadX'), 'X', ...pos),
        n(k('DpadY'), 'Y', ...posY),
        n(k('DpadSpan'), 'Span', 0.6, 2.4, 0.01),
        n(k('DpadArm'), 'Arm width', 0.2, 0.9, 0.01),
        n(k('DpadDepth'), 'Depth', 0.02, 0.2, 0.005),
        c(k('DpadColor'), 'Colour'),
        c(k('DpadInk'), 'Arrows'),
        c(k('DpadDimple'), 'Dimple'),
      ],
    },
    {
      title: 'A and B',
      controls: [
        n(k('AX'), 'A x', ...pos),
        n(k('AY'), 'A y', ...posY),
        n(k('ARadius'), 'A radius', 0.12, 0.6, 0.005),
        n(k('BX'), 'B x', ...pos),
        n(k('BY'), 'B y', ...posY),
        n(k('BRadius'), 'B radius', 0.12, 0.6, 0.005),
        n(k('CapHeight'), 'Cap height', 0.02, 0.2, 0.005),
        c(k('CapColor'), 'Cap colour'),
        c(k('CapInk'), 'Letter colour'),
        n(k('CapLetterSize'), 'Letter size', 8, 30, 0.5),
        n(k('HitScale'), 'Hit area (× radius)', 1, 2.5, 0.05),
      ],
    },
    {
      title: 'Labels under A and B',
      controls: [
        c(k('LabelColor'), 'Colour'),
        n(k('LabelSize'), 'Size (px)', 6, 20, 0.5),
        n(k('LabelSpacing'), 'Letter spacing (px)', -1, 6, 0.1),
        n(k('LabelGap'), 'Gap below cap', 0, 0.6, 0.005),
      ],
    },
  ] as Group[]
}

const SHARED: Group = {
  title: 'Press and focus (both shells)',
  controls: [
    c('pressColor', 'Pressed cap'),
    c('pressInk', 'Pressed ink'),
    c('focusColor', 'Focus ring'),
  ],
}

const TABS: Record<string, Group[]> = {
  Desk: [
    {
      title: 'Shell',
      controls: [
        n('deskWidth', 'Width', 8, 16, 0.01),
        n('deskHeight', 'Height', 4, 9, 0.01),
        n('deskDepth', 'Depth', 0.2, 1.2, 0.01),
        n('deskRadius', 'Corner radius', 0.1, 1.6, 0.01),
        c('deskShellTop', 'Gradient top'),
        c('deskShellBottom', 'Gradient bottom'),
        b('deskSeamOn', 'Seams'),
        n('deskSeamX', 'Seam x', 3, 6, 0.01),
        c('deskSeamColor', 'Seam colour'),
      ],
    },
    {
      title: 'Glass and well',
      controls: [
        n('deskGlassWidth', 'Glass width (px)', 600, 1000, 1),
        n('deskGlassHeight', 'Glass height (px)', 400, 640, 1),
        n('deskGlassRadius', 'Glass radius (px)', 0, 40, 1),
        n('deskBezel', 'Bezel', 0, 0.4, 0.005),
        n('deskWellRadius', 'Well radius', 0, 0.6, 0.01),
        c('deskWellColor', 'Well colour'),
      ],
    },
    {
      title: 'Power light and serial',
      controls: [
        n('deskLedX', 'LED x', -6.2, 6.2, 0.01),
        n('deskLedY', 'LED y', -3.2, 3.2, 0.01),
        c('deskLedColor', 'LED colour'),
        n('deskSerialY', 'Serial y', -3.2, 3.2, 0.01),
        n('deskSerialSize', 'Serial size (px)', 4, 20, 0.5),
        n('deskSerialSpacing', 'Serial spacing (px)', 0, 10, 0.1),
        c('deskSerialColor', 'Serial colour'),
      ],
    },
    ...capGroups('desk', false),
    SHARED,
    {
      title: 'Framing',
      controls: [
        n('deskZoomWidth', 'Width share', 0.4, 1, 0.01),
        n('deskZoomHeight', 'Height share', 0.4, 1, 0.01),
        n('deskZoomMarginY', 'Vertical margin (px)', 0, 300, 1),
      ],
    },
  ],
  Handheld: [
    {
      title: 'Shell',
      controls: [
        n('hhWidth', 'Width', 3, 5, 0.01),
        n('hhHeight', 'Height', 6, 10, 0.01),
        n('hhDepth', 'Depth', 0.2, 1, 0.01),
        n('hhRadius', 'Corner radius', 0.06, 1.2, 0.01),
        c('hhShellTop', 'Gradient top'),
        c('hhShellBottom', 'Gradient bottom'),
      ],
    },
    {
      title: 'Glass and well',
      controls: [
        n('hhGlassWidth', 'Glass width (px)', 280, 380, 1),
        n('hhGlassHeight', 'Glass height (px)', 400, 700, 1),
        n('hhGlassTop', 'Glass top (px)', 0, 120, 1),
        n('hhGlassRadius', 'Glass radius (px)', 0, 40, 1),
        n('hhBezel', 'Bezel', 0, 0.3, 0.005),
        n('hhWellRadius', 'Well radius', 0, 0.6, 0.01),
        c('hhWellColor', 'Well colour'),
      ],
    },
    {
      title: 'Power light and serial',
      controls: [
        n('hhLedX', 'LED x (px)', 0, 390, 1),
        n('hhLedY', 'LED y (px)', 0, 844, 1),
        c('hhLedColor', 'LED colour'),
        n('hhSerialY', 'Serial y (px)', 0, 844, 1),
        n('hhSerialSize', 'Serial size (px)', 4, 20, 0.5),
        n('hhSerialSpacing', 'Serial spacing (px)', 0, 10, 0.1),
        c('hhSerialColor', 'Serial colour'),
      ],
    },
    ...capGroups('hh', true),
    SHARED,
    {
      title: 'Speaker',
      controls: [
        b('hhSpeakerOn', 'Speaker'),
        n('hhSpeakerX', 'X (px)', 0, 390, 1),
        n('hhSpeakerY', 'Y (px)', 0, 844, 1),
        n('hhSpeakerAngle', 'Angle (deg)', -90, 90, 1),
        c('hhSpeakerColor', 'Colour'),
      ],
    },
    {title: 'Framing', controls: [n('hhZoom', 'Viewport share', 0.5, 1, 0.01)]},
  ],
  Screen: [
    {
      title: 'Palette',
      controls: [
        c('scrInk', 'Ink'),
        c('scrInkStrong', 'Ink, body'),
        c('scrSoft', 'Soft'),
        c('scrMuted', 'Muted'),
        c('scrLabel', 'Labels'),
        c('scrHint', 'Hints'),
        c('scrDim', 'Dim'),
        c('scrOff', 'Disabled'),
        c('scrBg', 'Background'),
        c('scrScrim', 'Art gradient'),
        c('scrFooter', 'Hint strip'),
        c('scrRule', 'Rules'),
        c('scrRuleSoft', 'Rules, soft'),
        c('scrOutline', 'Outline pills'),
        c('scrAccent', 'Accent'),
        c('scrAccentInk', 'Accent ink'),
      ],
    },
    {
      title: 'Key art',
      controls: [
        c('scrOverlayColor', 'Overlay colour'),
        n('scrOverlayOpacity', 'Overlay opacity', 0, 1, 0.01),
        n('scrPreviewDelayMs', 'Preview clip after (ms)', 0, 5000, 50),
      ],
    },
    {
      title: 'Desk: type',
      controls: [
        n('scrDeskTitleSize', 'Title size', 24, 96, 0.5),
        n('scrDeskTitleLeading', 'Title leading', 0.7, 1.4, 0.01),
        n('scrDeskTitleTracking', 'Title tracking (em)', -0.06, 0.2, 0.005),
        n('scrDeskKickerSize', 'Kicker size', 8, 20, 0.5),
        n('scrDeskBlurbSize', 'Blurb size', 10, 22, 0.5),
        n('scrDeskBlurbLeading', 'Blurb leading', 1, 2, 0.01),
        n('scrDeskFactSize', 'Fact size', 9, 20, 0.5),
        n('scrDeskFactLabelSize', 'Fact label size', 8, 18, 0.5),
        n('scrDeskFactGap', 'Fact spacing', 4, 60, 1),
        n('scrDeskTabSize', 'Tab size', 9, 20, 0.5),
        n('scrDeskHintSize', 'Hint size', 8, 16, 0.5),
        n('scrDeskHintGap', 'Hint spacing', 4, 48, 1),
      ],
    },
    {
      title: 'Desk: Games layout',
      controls: [
        n('scrDeskInfoLeft', 'Left margin', 0, 80, 1),
        n('scrDeskInfoBottom', 'Text block bottom', 100, 400, 1),
        n('scrDeskInfoWidth', 'Text block width', 240, 760, 1),
        n('scrDeskInfoGap', 'Line spacing', 0, 40, 1),
        n('scrDeskShelfBottom', 'Shelf bottom', 32, 200, 1),
        n('scrDeskTileWidth', 'Tile width', 60, 220, 1),
        n('scrDeskTileHeight', 'Tile height', 34, 124, 1),
        n('scrDeskTileSelectedWidth', 'Selected width', 60, 240, 1),
        n('scrDeskTileSelectedHeight', 'Selected height', 34, 135, 1),
        n('scrDeskTileGap', 'Tile spacing', 0, 40, 1),
        n('scrDeskTileLabelSize', 'Tile label size', 8, 18, 0.5),
      ],
    },
    {
      title: 'Handheld: type',
      controls: [
        n('scrHhTitleSize', 'Title size', 18, 64, 0.5),
        n('scrHhTitleLeading', 'Title leading', 0.7, 1.4, 0.01),
        n('scrHhTitleTracking', 'Title tracking (em)', -0.06, 0.2, 0.005),
        n('scrHhMetaSize', 'Meta size', 8, 18, 0.5),
        n('scrHhTabSize', 'Tab size', 9, 18, 0.5),
        n('scrHhHintSize', 'Hint size', 8, 16, 0.5),
        n('scrHhHintGap', 'Hint spacing', 4, 40, 1),
      ],
    },
    {
      title: 'Handheld: Library layout',
      controls: [
        n('scrHhArtHeight', 'Art height', 150, 520, 1),
        n('scrHhInfoLeft', 'Side margin', 0, 40, 1),
        n('scrHhInfoGap', 'Line spacing', 0, 30, 1),
        n('scrHhInfoOffset', 'Title below art', -120, 120, 1),
        n('scrHhShelfBottom', 'Shelf bottom', 0, 200, 1),
        n('scrHhTileWidth', 'Tile width', 60, 200, 1),
        n('scrHhTileHeight', 'Tile height', 34, 112, 1),
        n('scrHhTileGap', 'Tile spacing', 0, 30, 1),
        n('scrHhTileLabelSize', 'Tile label size', 8, 16, 0.5),
      ],
    },
  ],
  Motion: [
    {
      title: 'Screen motion',
      controls: [
        b('motionOn', 'Motion'),
        n('motionMs', 'Arrival (ms)', 0, 1000, 10),
        n('motionRise', 'Arrival rise (px)', 0, 24, 0.5),
        n('motionStagger', 'Stagger (ms)', 0, 200, 5),
        n('motionFadeMs', 'Screen fade (ms)', 0, 800, 10),
        n('motionHoverMs', 'Hover (ms)', 0, 600, 10),
        n('motionHoverLift', 'Hover lift (px)', 0, 6, 0.5),
        n('motionHoverBright', 'Hover brightness', 1, 1.5, 0.01),
        n('motionTileScale', 'Tile hover scale', 1, 1.15, 0.005),
      ],
    },
    {
      title: 'Boot',
      controls: [
        b('bootOn', 'Boot sequence'),
        n('bootLineMs', 'Line (ms)', 0, 2000, 10),
        n('bootNameDelayMs', 'Name after (ms)', 0, 3000, 10),
        n('bootTitleDelayMs', 'Title after (ms)', 0, 3000, 10),
        n('bootRevealMs', 'Reveal (ms)', 0, 2000, 10),
        n('bootHoldMs', 'Fade starts at (ms)', 0, 6000, 10),
        n('bootFadeMs', 'Fade (ms)', 0, 2000, 10),
        n('bootDeskNameSize', 'Desk name size', 12, 96, 0.5),
        n('bootDeskTitleSize', 'Desk title size', 8, 28, 0.5),
        n('bootHhNameSize', 'Handheld name size', 12, 64, 0.5),
        n('bootHhTitleSize', 'Handheld title size', 8, 24, 0.5),
        n('bootTrackingFrom', 'Tracking from (em)', -0.05, 0.5, 0.005),
        n('bootTracking', 'Tracking to (em)', -0.05, 0.3, 0.005),
        c('bootNameColor', 'Name colour'),
        c('bootTitleColor', 'Title colour'),
        c('bootBarColor', 'Bar colour'),
        n('bootBarWidth', 'Bar width (px)', 0, 300, 1),
      ],
    },
  ],
}

const INK = '#edece8'
const MUTED = '#8f8d87'

/**
 * The live tune for Handheld v2, opened with `?tune`. Every value in
 * `components/console/tune.ts` has a row here; the changes persist in this
 * browser while you work, and "Save as default" writes them into the source
 * (`app/api/tune`, `next dev` only).
 */
export default function TunePanel() {
  const values = useTune((state) => state.values)
  const set = useTune((state) => state.set)
  const reset = useTune((state) => state.reset)
  const undo = useTune((state) => state.undo)
  const history = useTune((state) => state.history)
  const [tab, setTab] = useState('Desk')
  const [open, setOpen] = useState(true)
  const [status, setStatus] = useState('')

  // Only the panel reads the saved session; ordinary visits always get the defaults.
  useEffect(() => {
    void useTune.persist.rehydrate()
  }, [])

  /** Undo, from a row's button (that key) or Ctrl+Z (the latest change), and say what came back. */
  const undoAndSay = (key?: keyof Tune) => {
    const undone = undo(key)
    if (!undone) return setStatus('Nothing to undo')
    const first = undone[0]
    setStatus(
      undone.length > 1
        ? `Undid reset (${undone.length} settings)`
        : `Undid ${LABELS[first?.key ?? ''] ?? first?.key}`,
    )
  }

  // Ctrl+Z (⌘Z on a Mac) undoes the latest change wherever focus is, including in the panel's own
  // number fields, whose native undo would only rewind the text, not the setting.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return
      if (event.key.toLowerCase() !== 'z') return
      event.preventDefault()
      undoAndSay()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  async function save() {
    setStatus('Saving…')
    try {
      const response = await fetch('/api/tune', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(values),
      })
      const result = (await response.json()) as {saved?: boolean; error?: string}
      setStatus(result.saved ? 'Saved to tune.ts' : (result.error ?? 'Save failed'))
    } catch {
      setStatus('Save failed: is `next dev` running?')
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(JSON.stringify(values, null, 2))
    setStatus('Copied')
  }

  const button = {
    padding: '5px 9px',
    border: '1px solid #33332f',
    borderRadius: 6,
    background: '#1c1c1b',
    color: INK,
    font: 'inherit',
    cursor: 'pointer',
  } as const

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{...button, position: 'fixed', top: 12, right: 12, zIndex: 40}}
        type="button"
      >
        Tune
      </button>
    )
  }

  return (
    <aside
      aria-label="Tune"
      className="tune-panel"
      data-scroll=""
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        bottom: 12,
        width: 'min(320px, calc(100vw - 24px))',
        zIndex: 40,
        overflowY: 'auto',
        padding: 12,
        boxSizing: 'border-box',
        borderRadius: 10,
        border: '1px solid #2a2a28',
        background: 'rgba(16,16,15,.94)',
        color: INK,
        fontFamily: 'var(--font-schibsted), system-ui, sans-serif',
        fontSize: 12,
      }}
    >
      <style>{ROW_CSS}</style>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <strong style={{fontSize: 13}}>Tune</strong>
        <button onClick={() => setOpen(false)} style={button} type="button">
          Hide
        </button>
      </div>
      <div style={{display: 'flex', gap: 4, margin: '10px 0'}}>
        {Object.keys(TABS).map((name) => (
          <button
            key={name}
            onClick={() => setTab(name)}
            style={{
              ...button,
              flex: 1,
              background: name === tab ? INK : '#1c1c1b',
              color: name === tab ? '#0b0b0a' : INK,
            }}
            type="button"
          >
            {name}
          </button>
        ))}
      </div>
      <div style={{display: 'flex', gap: 4, flexWrap: 'wrap'}}>
        <button onClick={save} style={button} type="button">
          Save as default
        </button>
        <button onClick={copy} style={button} type="button">
          Copy JSON
        </button>
        <button
          onClick={() => {
            reset()
            setStatus('Reset to defaults (Ctrl+Z to undo)')
          }}
          style={button}
          type="button"
        >
          Reset
        </button>
        <button
          disabled={history.length === 0}
          onClick={() => undoAndSay()}
          style={{...button, opacity: history.length === 0 ? 0.4 : 1}}
          title="Undo the latest change (Ctrl+Z)"
          type="button"
        >
          Undo
        </button>
      </div>
      <div aria-live="polite" style={{minHeight: 16, marginTop: 6, color: MUTED}}>
        {status}
      </div>

      {TABS[tab]?.map((group) => (
        <fieldset
          key={group.title}
          style={{border: 0, borderTop: '1px solid #2a2a28', margin: '8px 0 0', padding: '8px 0 0'}}
        >
          <legend style={{padding: 0, color: MUTED, fontWeight: 600}}>{group.title}</legend>
          {group.controls.map((control) => (
            <Row
              canUndo={history.some((change) => change.key === control.key)}
              control={control}
              key={control.key}
              onChange={(value) => set(control.key, value as never)}
              onUndo={() => undoAndSay(control.key)}
              value={values[control.key]}
            />
          ))}
        </fieldset>
      ))}
    </aside>
  )
}

/** Every control's label, by key, for the undo notice. */
const LABELS: Record<string, string> = Object.fromEntries(
  Object.values(TABS)
    .flat()
    .flatMap((group) =>
      group.controls.map((control) => [control.key, `${group.title}: ${control.label}`]),
    ),
)

/** A row's undo shows on hover or focus, and is only live when that setting has something to undo. */
const ROW_CSS = `
.tune-row { position: relative; border-radius: 6px; }
.tune-row:hover, .tune-row:focus-within { background: rgba(237,236,232,.04); }
.tune-undo { opacity: 0; pointer-events: none; transition: opacity 120ms ease; }
.tune-row:hover .tune-undo, .tune-row:focus-within .tune-undo { opacity: 1; pointer-events: auto; }
.tune-undo:disabled { opacity: 0 !important; pointer-events: none !important; }
.tune-undo:not(:disabled):hover { background: #2a2a28 !important; }
`

function Row({
  control,
  value,
  canUndo,
  onChange,
  onUndo,
}: {
  control: Control
  value: Tune[keyof Tune]
  canUndo: boolean
  onChange: (value: number | string | boolean) => void
  onUndo: () => void
}) {
  return (
    <div className="tune-row" style={{display: 'flex', alignItems: 'flex-start', gap: 4}}>
      <div style={{flex: 1, minWidth: 0}}>
        <Field control={control} onChange={onChange} value={value} />
      </div>
      <button
        aria-label={`Undo ${control.label}`}
        className="tune-undo"
        disabled={!canUndo}
        onClick={onUndo}
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          marginTop: 2,
          padding: 0,
          border: '1px solid #33332f',
          borderRadius: 6,
          background: '#1c1c1b',
          color: INK,
          font: 'inherit',
          fontSize: 13,
          lineHeight: 1,
          cursor: 'pointer',
        }}
        title="Undo this setting's last change"
        type="button"
      >
        ↶
      </button>
    </div>
  )
}

function Field({
  control,
  value,
  onChange,
}: {
  control: Control
  value: Tune[keyof Tune]
  onChange: (value: number | string | boolean) => void
}) {
  const changed = value !== DEFAULT_TUNE[control.key]
  const label = (
    <span style={{color: changed ? INK : MUTED, flex: 1}} title={control.key}>
      {control.label}
    </span>
  )
  const rowStyle = {display: 'flex', alignItems: 'center', gap: 8, minHeight: 26} as const

  if (control.kind === 'bool') {
    return (
      <label style={rowStyle}>
        {label}
        <input
          checked={value as boolean}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
      </label>
    )
  }

  if (control.kind === 'colour') {
    return (
      <label style={rowStyle}>
        {label}
        <code style={{color: MUTED}}>{value as string}</code>
        <input
          onChange={(event) => onChange(event.target.value)}
          style={{width: 32, height: 22, padding: 0, border: 0, background: 'none'}}
          type="color"
          value={value as string}
        />
      </label>
    )
  }

  return (
    <label style={{display: 'grid', gridTemplateColumns: '1fr 64px', gap: 4, padding: '3px 0'}}>
      {label}
      <input
        max={control.max}
        min={control.min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={control.step}
        style={{width: 64, font: 'inherit', background: '#1c1c1b', color: INK, border: 0}}
        type="number"
        value={value as number}
      />
      <input
        max={control.max}
        min={control.min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={control.step}
        style={{gridColumn: '1 / -1', width: '100%', accentColor: '#5fd35a'}}
        type="range"
        value={value as number}
      />
    </label>
  )
}
