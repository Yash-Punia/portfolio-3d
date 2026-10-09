'use client'

import type {ReactNode} from 'react'

import {
  counter,
  primaryLink,
  projectKicker,
  openLink,
  trailerOf,
  type ConsoleContent,
  type Project,
} from '@/components/console/content'
import {SCREENS} from '@/components/console/device'
import {useConsole} from '@/components/console/store'
import {C, FONT, PANEL} from '@/components/console/tokens'
import {GalleryImage, KeyArt} from '@/components/screen/media'
import {
  ABadge,
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

const {width: W, height: H} = PANEL.desk

/** Design 4a's shelf: 126×71 tiles, the selected one 140×79 with the green ring. */
const SHELF: ShelfSize = {
  width: 126,
  height: 71,
  selectedWidth: 140,
  selectedHeight: 79,
  gap: 12,
  labelSize: 12,
  labelGap: 7,
  outlineOffset: 3,
}

/** The top strip: the tabs, and a counter or a pager on the right. */
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
        padding: '0 14px 0 22px',
        zIndex: 2,
      }}
    >
      <Tabs
        activePadding="0 13px"
        fontSize={13.5}
        height={30}
        idle={C.soft}
        idlePadding="0 13px"
        screens={SCREENS.desk}
      />
      {right}
    </div>
  )
}

/** Design 4a, left: the console home. Key art first, one title, four facts, then the shelf. */
function Games({content, project}: {content: ConsoleContent; project: Project}) {
  const index = useConsole((state) => state.gameIndex)
  const openProject = useConsole((state) => state.openProject)
  const playTrailer = useConsole((state) => state.playTrailer)
  const kicker = projectKicker(project)
  const trailer = trailerOf(project)
  const link = primaryLink(project)

  return (
    <>
      <div style={{position: 'absolute', inset: 0}}>
        <KeyArt height={H} project={project} width={W} />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `linear-gradient(90deg,rgba(${C.scrim},.94) 0%,rgba(${C.scrim},.6) 42%,rgba(${C.scrim},0) 72%),linear-gradient(0deg,${C.footer} 0%,rgba(${C.scrim},.85) 22%,rgba(${C.scrim},0) 48%),linear-gradient(180deg,rgba(${C.scrim},.7) 0%,rgba(${C.scrim},0) 14%)`,
        }}
      />

      <TopBar
        right={
          <div
            style={{fontFamily: FONT.mono, fontSize: 11, color: C.muted, letterSpacing: '.06em'}}
          >
            {counter(index, content.projects.length)}
          </div>
        }
      />

      <div
        style={{
          position: 'absolute',
          left: 28,
          bottom: 170,
          width: 500,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {kicker ? <div style={{fontSize: 13, color: C.soft}}>{kicker}</div> : null}
        <h2 style={{...titleStyle(60, 0.86), textWrap: 'balance'}}>{project.title}</h2>
        {project.blurb ? (
          // Two lines at most: the block grows upward, and the tabs are above it.
          <div
            style={{
              fontSize: 14.5,
              lineHeight: 1.45,
              color: C.inkStrong,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {project.blurb}
          </div>
        ) : null}
        <Facts project={project} variant="inline" />
        <div style={{display: 'flex', gap: 8, paddingTop: 4}}>
          {trailer ? (
            <Pill
              fontSize={14}
              height={40}
              kind="primary"
              onTap={() => (trailer.kind === 'link' ? openLink(trailer.src) : playTrailer())}
              padding="0 16px 0 6px"
            >
              <ABadge fontSize={11} size={28} />
              Watch trailer
            </Pill>
          ) : null}
          <Pill fontSize={14} height={40} kind={trailer ? 'ghost' : 'primary'} onTap={openProject}>
            Details
          </Pill>
          {link ? (
            <Pill fontSize={14} height={40} kind="ghost" onTap={() => openLink(link.url)}>
              {link.label} ↗
            </Pill>
          ) : null}
        </div>
      </div>

      <div style={{position: 'absolute', left: 28, right: 28, bottom: 44}}>
        <Shelf projects={content.projects} size={SHELF} />
      </div>

      <Hints
        fontSize={11.5}
        gap={22}
        height={32}
        items={[
          ['◀ ▶', 'Browse'],
          ...(trailer
            ? ([['A', 'Trailer']] as Array<[string, string]>)
            : [['A', 'Details'] as [string, string]]),
          ['Y', 'Details'],
          ['MENU', 'About'],
        ]}
        tail="or click anything"
      />
    </>
  )
}

/** Design 4a, right: the project page. Media on the left, facts on the right, and the right side scrolls. */
function ProjectPage({content, project}: {content: ConsoleContent; project: Project}) {
  const playTrailer = useConsole((state) => state.playTrailer)
  const kicker = projectKicker(project)
  const trailer = trailerOf(project)
  const link = primaryLink(project)
  const shots = (project.gallery ?? []).filter((image) => image.asset).slice(0, 2)

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
          padding: '0 8px 0 6px',
          borderBottom: `1px solid ${C.ruleSoft}`,
        }}
      >
        <BackToGames height={40} padding="0 14px" />
        <Pager count={content.projects.length} fontSize={11} size={40} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 46,
          bottom: 32,
          display: 'grid',
          gridTemplateColumns: '400px minmax(0,1fr)',
        }}
      >
        <div
          style={{padding: '20px 0 20px 22px', display: 'flex', flexDirection: 'column', gap: 10}}
        >
          <div style={{borderRadius: 6, overflow: 'hidden'}}>
            <TrailerSlot
              badge={{height: 36, disc: 28, fontSize: 13, discFont: 11}}
              height={213}
              project={project}
              width={378}
            />
          </div>
          {shots.length > 0 ? (
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10}}>
              {shots.map((image) => (
                <div
                  key={image._key}
                  style={{
                    position: 'relative',
                    width: 184,
                    height: 104,
                    borderRadius: 6,
                    overflow: 'hidden',
                  }}
                >
                  <GalleryImage height={104} image={image} width={184} />
                </div>
              ))}
            </div>
          ) : null}
          <div style={{display: 'flex', gap: 8, paddingTop: 6}}>
            {trailer ? (
              <Pill
                fontSize={14}
                height={40}
                kind="primary"
                onTap={() => (trailer.kind === 'link' ? openLink(trailer.src) : playTrailer())}
                style={{flex: 1}}
              >
                ▶&#xFE0E; Watch trailer
              </Pill>
            ) : null}
            {link ? (
              <Pill
                fontSize={14}
                height={40}
                kind={trailer ? 'outline' : 'primary'}
                onTap={() => openLink(link.url)}
                style={{flex: 1, ...(trailer ? {background: 'transparent'} : {})}}
              >
                {link.label} ↗
              </Pill>
            ) : null}
          </div>
        </div>

        <div style={{position: 'relative', overflow: 'hidden'}}>
          <Scroll style={{position: 'absolute', inset: 0}}>
            <div
              style={{
                padding: '18px 28px 40px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                {kicker ? <div style={{fontSize: 12.5, color: C.label}}>{kicker}</div> : null}
                <h2 style={titleStyle(40, 0.9)}>{project.title}</h2>
              </div>
              <Facts project={project} variant="grid" />
              <WriteUp compact={false} project={project} />
            </div>
          </Scroll>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 56,
              background: `linear-gradient(rgba(11,11,10,0),${C.screen})`,
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      <Hints
        fontSize={11.5}
        gap={22}
        height={32}
        items={[
          ['▲ ▼', 'Scroll'],
          ['◀ ▶', 'Prev / next game'],
          ...(trailer ? ([['A', 'Play trailer']] as Array<[string, string]>) : []),
          ['B', 'Back'],
        ]}
      />
    </>
  )
}

/** About: who, in a sentence or two, and the timeline under it. Not drawn in the design; built from its parts. */
function About({content}: {content: ConsoleContent}) {
  const settings = content.settings

  return (
    <>
      <TopBar />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 46,
          bottom: 32,
          display: 'grid',
          gridTemplateColumns: '340px minmax(0,1fr)',
          borderTop: `1px solid ${C.ruleSoft}`,
        }}
      >
        <div style={{padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14}}>
          {settings?.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element -- see media.tsx */
            <img
              alt=""
              height={64}
              src={`${settings.avatarUrl}?w=128&h=128&fit=crop&auto=format`}
              style={{width: 64, height: 64, borderRadius: '50%', objectFit: 'cover'}}
              width={64}
            />
          ) : null}
          <h2 style={titleStyle(44, 0.86)}>{settings?.fullName}</h2>
          {settings?.title ? (
            <div style={{fontSize: 14, color: C.label}}>{settings.title}</div>
          ) : null}
          {settings?.aboutHeadline ? (
            <div style={{fontSize: 16, lineHeight: 1.4, fontWeight: 600}}>
              {settings.aboutHeadline}
            </div>
          ) : null}
          {settings?.aboutBody ? (
            <div style={{fontSize: 14.5, lineHeight: 1.5, color: C.inkStrong, textWrap: 'pretty'}}>
              {settings.aboutBody}
            </div>
          ) : null}
        </div>
        <div
          style={{position: 'relative', overflow: 'hidden', borderLeft: `1px solid ${C.ruleSoft}`}}
        >
          <Scroll style={{position: 'absolute', inset: 0}}>
            <div style={{padding: '22px 28px 40px'}}>
              <Experience compact={false} content={content} />
            </div>
          </Scroll>
        </div>
      </div>
      <Hints
        fontSize={11.5}
        gap={22}
        height={32}
        items={[
          ['▲ ▼', 'Scroll'],
          ['MENU', 'Contact'],
          ['B', 'Back'],
        ]}
      />
    </>
  )
}

/** Contact: the résumé and the links, the same list the page header mirrors. */
function Contact({content}: {content: ConsoleContent}) {
  const settings = content.settings

  return (
    <>
      <TopBar />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 46,
          bottom: 32,
          borderTop: `1px solid ${C.ruleSoft}`,
          display: 'grid',
          gridTemplateColumns: '340px minmax(0,1fr)',
        }}
      >
        <div style={{padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 10}}>
          <div style={{fontSize: 12.5, color: C.label}}>Get in touch</div>
          <h2 style={titleStyle(44, 0.86)}>{settings?.fullName}</h2>
          {settings?.statusLine ? (
            <div style={{fontSize: 14.5, lineHeight: 1.45, color: C.soft}}>
              {settings.statusLine}
            </div>
          ) : null}
        </div>
        <Scroll style={{padding: '24px 28px 32px', borderLeft: `1px solid ${C.ruleSoft}`}}>
          <ContactList content={content} linkSize={15} />
        </Scroll>
      </div>
      <Hints
        fontSize={11.5}
        gap={22}
        height={32}
        items={[
          ['▲ ▼', 'Move'],
          ['A', 'Open'],
          ['B', 'Back'],
        ]}
      />
    </>
  )
}

export function DeskScreen({content}: {content: ConsoleContent}) {
  const screen = useConsole((state) => state.screen)
  const isProjectOpen = useConsole((state) => state.isProjectOpen)
  const index = useConsole((state) => state.gameIndex)
  const project = content.projects[index]

  return (
    <Glass height={H} radius={PANEL.desk.radius} width={W}>
      {screen === 'about' ? (
        <About content={content} />
      ) : screen === 'contact' ? (
        <Contact content={content} />
      ) : !project ? (
        <>
          <TopBar />
          <Empty />
        </>
      ) : isProjectOpen ? (
        // Keyed on the project, so stepping to the next one starts at its top.
        <ProjectPage content={content} key={project._id} project={project} />
      ) : (
        <Games content={content} project={project} />
      )}
    </Glass>
  )
}

/** Games with no games published: the tabs still work, and the glass says so plainly. */
export function Empty() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        ...row,
        justifyContent: 'center',
        fontSize: 14,
        color: C.label,
      }}
    >
      Nothing on the shelf yet.
    </div>
  )
}
