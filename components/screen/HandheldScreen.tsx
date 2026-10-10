'use client'

import type {ReactNode} from 'react'

import {
  counter,
  openLink,
  primaryLink,
  trailerOf,
  type ConsoleContent,
  type Project,
} from '@/components/console/content'
import {SCREENS} from '@/components/console/device'
import {useConsole} from '@/components/console/store'
import {FONT} from '@/components/console/tokens'
import {useT, usePalette} from '@/components/console/tune'
import {Empty} from '@/components/screen/DeskScreen'
import {KeyArt} from '@/components/screen/media'
import {
  BackToGames,
  Avatar,
  Experience,
  Facts,
  Glass,
  Hints,
  LinkIcons,
  Pager,
  Pill,
  ResumePill,
  row,
  Scroll,
  Shelf,
  stagger,
  Tabs,
  titleStyle,
  TrailerSlot,
  WriteUp,
} from '@/components/screen/parts'

function TopBar({right}: {right?: ReactNode}) {
  const t = useT()
  const C = usePalette()
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 46,
        ...row,
        justifyContent: 'space-between',
        padding: '0 6px 0 8px',
        zIndex: 2,
      }}
    >
      <Tabs
        activePadding="0 12px"
        fontSize={t.scrHhTabSize}
        height={32}
        idle={C.inkStrong}
        idlePadding="0 10px"
        screens={SCREENS}
      />
      {right}
    </div>
  )
}

/**
 * Design 4b, M1: key art up top under a wash, the title, and the swipeable
 * shelf. No buttons: A, or a second tap on the tile, opens the game — trailer
 * first. Laid out from the tuned glass height, so a taller glass just breathes.
 */
function Library({content, project}: {content: ConsoleContent; project: Project}) {
  const t = useT()
  const C = usePalette()
  const index = useConsole((state) => state.gameIndex)
  const meta = [project.role, project.engine, project.year].filter(Boolean).join(' · ')
  const W = t.hhGlassWidth
  const H = t.hhGlassHeight
  const art = t.scrHhArtHeight

  return (
    <>
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: art}}>
        <KeyArt height={art} project={project} width={W} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: W,
          height: art,
          pointerEvents: 'none',
          background: t.scrOverlayColor,
          opacity: t.scrOverlayOpacity,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: W,
          height: art,
          pointerEvents: 'none',
          background: `linear-gradient(0deg,${C.screen} 0%,rgba(${C.screenRgb},.55) 35%,rgba(${C.screenRgb},0) 65%),linear-gradient(180deg,rgba(${C.screenRgb},.75) 0%,rgba(${C.screenRgb},0) 26%)`,
        }}
      />
      <TopBar
        right={
          <div style={{fontFamily: FONT.mono, fontSize: 10.5, color: C.muted, paddingRight: 10}}>
            {counter(index, content.projects.length)}
          </div>
        }
      />
      {/* Anchored by its foot, so a title that wraps grows up into the art. Keyed, so each selection arrives. */}
      <div
        key={project._id}
        style={{
          position: 'absolute',
          left: t.scrHhInfoLeft,
          right: t.scrHhInfoLeft,
          bottom: H - art - t.scrHhInfoOffset,
          display: 'flex',
          flexDirection: 'column',
          gap: t.scrHhInfoGap,
        }}
      >
        <h2
          className="scr-in"
          style={{
            ...titleStyle(t.scrHhTitleSize, t.scrHhTitleLeading, t.scrHhTitleTracking),
            textWrap: 'balance',
            ...stagger(0),
          }}
        >
          {project.title}
        </h2>
        {meta ? (
          <div
            className="scr-in"
            style={{fontSize: t.scrHhMetaSize, color: C.muted, ...stagger(1)}}
          >
            {meta}
          </div>
        ) : null}
      </div>
      <div
        style={{
          position: 'absolute',
          left: t.scrHhInfoLeft,
          right: 0,
          bottom: 30 + t.scrHhShelfBottom,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{fontSize: 12, color: C.hint}}>All games</div>
        {/* The shelf pads itself for the selection ring; this gives the pad back. */}
        <div style={{paddingRight: t.scrHhInfoLeft, marginTop: -5}}>
          <Shelf
            follow
            projects={content.projects}
            size={{
              width: t.scrHhTileWidth,
              height: t.scrHhTileHeight,
              selectedWidth: t.scrHhTileWidth,
              selectedHeight: t.scrHhTileHeight,
              gap: t.scrHhTileGap,
              labelSize: t.scrHhTileLabelSize,
              labelGap: 4,
              outlineOffset: 2,
            }}
          />
        </div>
      </div>
      <Hints
        fontSize={t.scrHhHintSize}
        gap={t.scrHhHintGap}
        height={30}
        items={[
          ['◀ ▶', 'Browse'],
          ['A', 'Open'],
        ]}
        tail="or tap"
      />
    </>
  )
}

/** Design 4b, M2: the trailer up top, the facts, the write-up scrolling under, the actions pinned. */
function ProjectPage({content, project}: {content: ConsoleContent; project: Project}) {
  const t = useT()
  const C = usePalette()
  const playTrailer = useConsole((state) => state.playTrailer)
  const trailer = trailerOf(project)
  const link = primaryLink(project)
  const W = t.hhGlassWidth
  // 16:9 trailer: the taller glass has room for the full frame.
  const media = Math.round((W * 9) / 16)

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 46,
          ...row,
          justifyContent: 'space-between',
          padding: '0 2px',
          borderBottom: `1px solid ${C.ruleSoft}`,
        }}
      >
        <BackToGames height={44} padding="0 12px" />
        <Pager count={content.projects.length} fontSize={10.5} size={44} />
      </div>
      <div style={{position: 'absolute', left: 0, top: 46, width: W, height: media}}>
        <TrailerSlot
          badge={{height: 34, disc: 26, fontSize: 12.5, discFont: 10}}
          height={media}
          project={project}
          width={W}
        />
      </div>
      <Scroll
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 46 + media,
          bottom: trailer || link ? 96 : 30,
        }}
      >
        <div style={{padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10}}>
          <h2 style={titleStyle(28, 0.9, t.scrHhTitleTracking)}>{project.title}</h2>
          <Facts project={project} variant="stacked" />
          <WriteUp compact project={project} />
        </div>
      </Scroll>
      {trailer || link ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 30,
            padding: '10px 12px',
            borderTop: `1px solid ${C.ruleSoft}`,
            background: C.screen,
            display: 'grid',
            gridTemplateColumns: trailer && link ? '1.2fr 1fr' : '1fr',
            gap: 8,
          }}
        >
          {trailer ? (
            <Pill
              fontSize={14}
              height={46}
              kind="primary"
              onTap={() => (trailer.kind === 'link' ? openLink(trailer.src) : playTrailer())}
            >
              ▶&#xFE0E; Trailer
            </Pill>
          ) : null}
          {link ? (
            <Pill
              fontSize={14}
              height={46}
              kind={trailer ? 'outline' : 'primary'}
              onTap={() => openLink(link.url)}
            >
              {link.label} ↗
            </Pill>
          ) : null}
        </div>
      ) : null}
      <Hints
        fontSize={t.scrHhHintSize}
        gap={t.scrHhHintGap}
        height={30}
        items={[
          ['▲ ▼', 'Scroll'],
          ...(trailer ? ([['A', 'Trailer']] as Array<[string, string]>) : []),
          ['B', 'Back'],
        ]}
      />
    </>
  )
}

/** Design 6b: the profile, its icon links and the résumé up top, the Experience index under them. */
function About({content}: {content: ConsoleContent}) {
  const t = useT()
  const C = usePalette()
  const settings = content.settings

  return (
    <>
      <TopBar />
      <Scroll style={{position: 'absolute', left: 0, right: 0, top: 46, bottom: 30}}>
        <div style={{padding: '10px 18px 24px', display: 'flex', flexDirection: 'column', gap: 14}}>
          <div style={{...row, gap: 12}}>
            <Avatar size={48} url={settings?.avatarUrl} />
            <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
              <h2 style={titleStyle(28, 0.88, t.scrHhTitleTracking)}>{settings?.fullName}</h2>
              {settings?.title ? (
                <div style={{fontSize: 12.5, color: C.label}}>{settings.title}</div>
              ) : null}
            </div>
          </div>
          <div style={{...row, gap: 10, flexWrap: 'wrap'}}>
            <LinkIcons content={content} />
            <ResumePill fontSize={13} height={40} settings={settings} />
          </div>
          <Experience compact content={content} />
        </div>
      </Scroll>
      <Hints
        fontSize={t.scrHhHintSize}
        gap={t.scrHhHintGap}
        height={30}
        items={[
          ['▲ ▼', 'Select'],
          ['B', 'Back'],
        ]}
      />
    </>
  )
}

export function HandheldScreen({content}: {content: ConsoleContent}) {
  const t = useT()
  const screen = useConsole((state) => state.screen)
  const isProjectOpen = useConsole((state) => state.isProjectOpen)
  const index = useConsole((state) => state.gameIndex)
  const project = content.projects[index]
  const view = screen !== 'games' ? 'about' : isProjectOpen ? `page-${project?._id}` : 'games'

  return (
    <Glass
      compact
      height={t.hhGlassHeight}
      radius={t.hhGlassRadius}
      settings={content.settings}
      width={t.hhGlassWidth}
    >
      <div className="scr-fade" key={view} style={{position: 'absolute', inset: 0}}>
        {screen !== 'games' ? (
          <About content={content} />
        ) : !project ? (
          <>
            <TopBar />
            <Empty />
          </>
        ) : isProjectOpen ? (
          <ProjectPage content={content} key={project._id} project={project} />
        ) : (
          <Library content={content} project={project} />
        )}
      </div>
    </Glass>
  )
}
