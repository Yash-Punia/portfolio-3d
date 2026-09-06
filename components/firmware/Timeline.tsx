'use client'

import {entryDates, type ConsoleContent, type TimelineEntry} from '@/components/console/content'
import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'
import {useFirmwareLayout} from '@/components/firmware/layout'
import {transition} from '@/components/firmware/LibraryRail'

/**
 * The Timeline section (SPEC §8): one horizontal line of dots, most recent on
 * the left, running right into the past — work first, then education, which is
 * the order the query returns.
 *
 * The axis moves the same way the Library rail does: the row translates so the
 * selected dot always sits at the same place, and the panel under it carries
 * everything about that entry. There is no drill-down — the detail is the
 * selection, so `Enter` has nothing to open here (confirmed with Yash).
 *
 * Sizes come from the tuning values through `useFirmwareLayout()`, so the axis
 * is dialled in against the real screen behind `?tune`.
 */

/** Mono chrome above each dot: the month the entry started. */
function dotLabel(entry: TimelineEntry): string {
  const start = entry.startDate
  if (!start) return ''
  return `${start.slice(0, 4)} / ${start.slice(5, 7)}`
}

function Dot({
  entry,
  selected,
  reducedMotion,
  onSelect,
}: {
  entry: TimelineEntry
  selected: boolean
  reducedMotion: boolean
  onSelect: () => void
}) {
  const layout = useFirmwareLayout()

  // Work is filled, education is ringed — the two kinds read apart without a
  // caps label under every dot (SPEC §10). The selected one fills with accent
  // whichever kind it is.
  const ringed = entry.kind === 'education'

  return (
    <div
      onClick={onSelect}
      style={{
        flex: `0 0 ${layout.dotGap}px`,
        cursor: 'pointer',
        opacity: selected ? 1 : layout.unselectedOpacity,
        ...transition(reducedMotion, 'opacity'),
      }}
    >
      <p
        style={{
          margin: `0 0 ${Math.round(layout.textGap * 0.7)}px`,
          color: selected ? 'var(--screen-fg)' : 'var(--screen-muted)',
          fontFamily: 'var(--font-martian-mono), ui-monospace, monospace',
          fontSize: `${layout.metaFont}px`,
          letterSpacing: '0.12em',
        }}
      >
        {dotLabel(entry)}
      </p>

      {/*
        The box keeps its size whatever the dot inside it does, so the axis line
        stays put and nothing reflows as the selection moves.
      */}
      <div
        style={{
          height: `${layout.dotSize}px`,
          width: `${layout.dotSize}px`,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div
          style={{
            width: `${layout.dotSize}px`,
            height: `${layout.dotSize}px`,
            borderRadius: '50%',
            boxSizing: 'border-box',
            background: selected
              ? 'var(--screen-accent)'
              : ringed
                ? 'var(--screen-bg)'
                : 'var(--screen-muted)',
            border: `2px solid ${selected ? 'var(--screen-accent)' : 'var(--screen-muted)'}`,
            transform: selected ? 'scale(1.7)' : 'scale(1)',
            ...transition(reducedMotion, 'transform, background-color, border-color'),
          }}
        />
      </div>

      <p
        style={{
          margin: `${Math.round(layout.textGap * 0.8)}px ${Math.round(layout.dotSize * 1.6)}px 0 0`,
          color: selected ? 'var(--screen-fg)' : 'var(--screen-muted)',
          fontSize: `${layout.bodyFont - 2}px`,
          fontWeight: selected ? 600 : 400,
          lineHeight: 1.2,
        }}
      >
        {entry.organisation}
      </p>
    </div>
  )
}

/**
 * The selected entry, below the axis. Every optional field collapses on its own
 * (SPEC §3.2) — most entries have no `highlights`, none has `relatedProjects`,
 * and `result` is education's alone.
 */
function Entry({entry, projects}: {entry: TimelineEntry; projects: ConsoleContent['projects']}) {
  const layout = useFirmwareLayout()
  const setLibraryIndex = useConsole((state) => state.setLibraryIndex)
  const setSection = useConsole((state) => state.setSection)

  const meta = [entry.organisation, entryDates(entry), entry.location].filter(Boolean)

  // A chip jumps to the project's place in the Library rail (SPEC §8). One that
  // is not in the rail has nowhere to jump to.
  const chips = (entry.relatedProjects ?? []).flatMap((related) => {
    const index = projects.findIndex((project) => project._id === related._id)
    return index < 0 ? [] : [{id: related._id, title: related.title, index}]
  })

  return (
    <div
      style={{
        padding: `${layout.entryGap}px ${layout.railX}px 0`,
        maxWidth: '68ch',
        overflowY: 'auto',
      }}
    >
      <h2
        style={{
          margin: 0,
          color: 'var(--screen-fg)',
          fontSize: `${Math.round(layout.titleFont * 0.6)}px`,
          fontStretch: '125%',
          fontWeight: 600,
          letterSpacing: '-0.015em',
          lineHeight: 1.05,
        }}
      >
        {entry.role}
      </h2>

      <p
        style={{
          margin: `${Math.round(layout.textGap * 0.85)}px 0 0`,
          color: 'var(--screen-muted)',
          fontFamily: 'var(--font-martian-mono), ui-monospace, monospace',
          fontSize: `${layout.metaFont}px`,
          letterSpacing: '0.08em',
        }}
      >
        {meta.join('   /   ')}
      </p>

      {entry.summary ? (
        <p
          style={{
            margin: `${layout.textGap}px 0 0`,
            color: 'var(--screen-fg)',
            fontSize: `${layout.bodyFont}px`,
            lineHeight: 1.5,
          }}
        >
          {entry.summary}
        </p>
      ) : null}

      {entry.highlights?.length ? (
        <ul
          style={{
            margin: `${layout.textGap}px 0 0`,
            padding: `0 0 0 ${layout.bodyFont}px`,
            color: 'var(--screen-fg)',
            fontSize: `${layout.bodyFont - 1}px`,
            lineHeight: 1.5,
          }}
        >
          {entry.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      ) : null}

      {entry.result ? (
        <p
          style={{
            margin: `${layout.textGap}px 0 0`,
            color: 'var(--screen-muted)',
            fontFamily: 'var(--font-martian-mono), ui-monospace, monospace',
            fontSize: `${layout.metaFont - 1}px`,
            letterSpacing: '0.16em',
          }}
        >
          RESULT — <span style={{color: 'var(--screen-fg)'}}>{entry.result}</span>
        </p>
      ) : null}

      {chips.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            margin: `${Math.round(layout.textGap * 1.5)}px 0 0`,
          }}
        >
          {chips.map((chip) => (
            <span
              key={chip.id}
              onClick={() => {
                setLibraryIndex(chip.index)
                setSection('library')
              }}
              style={{
                border: '1px solid color-mix(in srgb, var(--screen-accent) 55%, transparent)',
                borderRadius: '999px',
                color: 'var(--screen-fg)',
                cursor: 'pointer',
                fontSize: `${layout.bodyFont - 3}px`,
                padding: '5px 14px',
              }}
            >
              {chip.title}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function Timeline({content}: {content: ConsoleContent}) {
  const index = useConsole((state) => state.timelineIndex)
  const setTimelineIndex = useConsole((state) => state.setTimelineIndex)
  const reducedMotion = useReducedMotion()
  const layout = useFirmwareLayout()

  const {timeline, projects} = content
  const selected = timeline[index] ?? null

  return (
    <div style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}>
      <div style={{position: 'relative', overflow: 'hidden', paddingTop: `${layout.axisTop}px`}}>
        {/*
          The axis itself, behind the dots and across the whole panel: it runs
          off both edges because the line continues past what is in frame.
        */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${layout.axisTop + layout.metaFont * 1.4 + Math.round(layout.textGap * 0.7) + layout.dotSize / 2}px`,
            height: '1px',
            background: 'color-mix(in srgb, var(--screen-muted) 32%, transparent)',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            paddingLeft: `${layout.railX}px`,
            transform: `translateX(${-index * layout.dotGap}px)`,
            ...transition(reducedMotion, 'transform'),
          }}
        >
          {timeline.map((entry, position) => (
            <Dot
              key={entry._id}
              entry={entry}
              selected={position === index}
              reducedMotion={reducedMotion}
              onSelect={() => setTimelineIndex(position)}
            />
          ))}
        </div>
      </div>

      {/* Keyed on the selection so the block crossfades as a whole. */}
      {selected ? (
        <div
          key={selected._id}
          style={{
            minHeight: 0,
            animation: reducedMotion ? undefined : 'firmware-fade 240ms ease-out',
          }}
        >
          <Entry entry={selected} projects={projects} />
        </div>
      ) : null}
    </div>
  )
}
