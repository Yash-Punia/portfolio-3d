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
import {C, FONT, PANEL} from '@/components/console/tokens'
import {Empty} from '@/components/screen/DeskScreen'
import {KeyArt} from '@/components/screen/media'
import {
  BackToGames,
  ContactList,
  Experience,
  Facts,
  Glass,
  Hints,
  Pager,
  Pill,
  row,
  Scroll,
  Shelf,
  Tabs,
  titleStyle,
  TrailerSlot,
  WriteUp,
  type ShelfSize,
} from '@/components/screen/parts'

const {width: W, height: H} = PANEL.handheld

/** Design 4b's shelf: every tile 112×63, the selected one ringed. */
const SHELF: ShelfSize = {
  width: 112,
  height: 63,
  selectedWidth: 112,
  selectedHeight: 63,
  gap: 10,
  labelSize: 11.5,
  labelGap: 4,
  outlineOffset: 2,
}

function TopBar({right}: {right?: ReactNode}) {
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
        fontSize={13}
        height={32}
        idle={C.inkStrong}
        idlePadding="0 10px"
        screens={SCREENS.handheld}
      />
      {right}
    </div>
  )
}

/** Design 4b, M1: key art up top, the title, two actions, and the swipeable shelf. */
function Library({content, project}: {content: ConsoleContent; project: Project}) {
  const index = useConsole((state) => state.gameIndex)
  const openProject = useConsole((state) => state.openProject)
  const playTrailer = useConsole((state) => state.playTrailer)
  const trailer = trailerOf(project)
  const meta = [project.role, project.engine, project.year].filter(Boolean).join(' · ')

  return (
    <>
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: 250}}>
        <KeyArt height={250} project={project} width={W} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: W,
          height: 250,
          pointerEvents: 'none',
          background: `linear-gradient(0deg,${C.screen} 0%,rgba(11,11,10,.55) 35%,rgba(11,11,10,0) 65%),linear-gradient(180deg,rgba(11,11,10,.75) 0%,rgba(11,11,10,0) 26%)`,
        }}
      />
      <TopBar
        right={
          <div style={{fontFamily: FONT.mono, fontSize: 10.5, color: C.muted, paddingRight: 10}}>
            {counter(index, content.projects.length)}
          </div>
        }
      />
      {/* Anchored by its foot, so a title that wraps grows up into the art, not down into the pills. */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: H - 278,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <h2 style={{...titleStyle(38, 0.86), textWrap: 'balance'}}>{project.title}</h2>
        {meta ? <div style={{fontSize: 12.5, color: C.muted}}>{meta}</div> : null}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          top: 290,
          display: 'grid',
          gridTemplateColumns: trailer ? '1.2fr 1fr' : '1fr',
          gap: 8,
        }}
      >
        {trailer ? (
          <Pill
            fontSize={14.5}
            height={46}
            kind="primary"
            onTap={() => (trailer.kind === 'link' ? openLink(trailer.src) : playTrailer())}
          >
            ▶&#xFE0E; Trailer
          </Pill>
        ) : null}
        <Pill
          fontSize={14.5}
          height={46}
          kind={trailer ? 'ghost' : 'primary'}
          onTap={openProject}
          style={trailer ? {background: 'rgba(237,236,232,.1)'} : undefined}
        >
          Details
        </Pill>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 16,
          right: 0,
          top: 346,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{fontSize: 12, color: C.hint}}>All games</div>
        {/* The shelf pads itself for the selection ring; this gives the pad back. */}
        <div style={{paddingRight: 16, marginTop: -5}}>
          <Shelf projects={content.projects} size={SHELF} />
        </div>
      </div>
      <Hints
        fontSize={11}
        gap={16}
        height={30}
        items={[['◀ ▶', 'Browse'], trailer ? ['A', 'Trailer'] : ['A', 'Details']]}
        tail="or tap"
      />
    </>
  )
}

/** Design 4b, M2: the trailer up top, the facts, the write-up scrolling under, the actions pinned. */
function ProjectPage({content, project}: {content: ConsoleContent; project: Project}) {
  const playTrailer = useConsole((state) => state.playTrailer)
  const trailer = trailerOf(project)
  const link = primaryLink(project)

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
      <div style={{position: 'absolute', left: 0, top: 46, width: W, height: 150}}>
        <TrailerSlot
          badge={{height: 34, disc: 26, fontSize: 12.5, discFont: 10}}
          height={150}
          project={project}
          width={W}
        />
      </div>
      <Scroll
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 196,
          bottom: trailer || link ? 96 : 30,
        }}
      >
        <div style={{padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10}}>
          <h2 style={titleStyle(28, 0.9)}>{project.title}</h2>
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
        fontSize={11}
        gap={16}
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

/** Design 4b, M3: identity, résumé and labelled links — and, below them, the timeline. */
function About({content}: {content: ConsoleContent}) {
  const settings = content.settings

  return (
    <>
      <TopBar />
      <Scroll style={{position: 'absolute', left: 0, right: 0, top: 46, bottom: 30}}>
        <div style={{padding: '8px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12}}>
          {settings?.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element -- see media.tsx */
            <img
              alt=""
              height={48}
              src={`${settings.avatarUrl}?w=96&h=96&fit=crop&auto=format`}
              style={{width: 48, height: 48, borderRadius: '50%', objectFit: 'cover'}}
              width={48}
            />
          ) : null}
          <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
            <h2 style={titleStyle(36, 0.86)}>{settings?.fullName}</h2>
            {settings?.aboutHeadline || settings?.aboutBody || settings?.title ? (
              <div style={{fontSize: 14, lineHeight: 1.45, color: C.soft}}>
                {settings?.aboutHeadline ?? settings?.aboutBody ?? settings?.title}
              </div>
            ) : null}
          </div>
          <ContactList content={content} linkSize={15} />
          {settings?.aboutHeadline && settings.aboutBody ? (
            <div style={{fontSize: 13.5, lineHeight: 1.5, color: C.inkStrong, paddingTop: 6}}>
              {settings.aboutBody}
            </div>
          ) : null}
          <div style={{paddingTop: 6}}>
            <Experience compact content={content} />
          </div>
        </div>
      </Scroll>
      <Hints
        fontSize={11}
        gap={16}
        height={30}
        items={[
          ['▲ ▼', 'Move'],
          ['A', 'Open'],
          ['B', 'Back'],
        ]}
      />
    </>
  )
}

export function HandheldScreen({content}: {content: ConsoleContent}) {
  const screen = useConsole((state) => state.screen)
  const isProjectOpen = useConsole((state) => state.isProjectOpen)
  const index = useConsole((state) => state.gameIndex)
  const project = content.projects[index]

  return (
    <Glass height={H} radius={PANEL.handheld.radius} width={W}>
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
    </Glass>
  )
}
