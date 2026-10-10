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
import {FONT} from '@/components/console/tokens'
import {useT, usePalette} from '@/components/console/tune'
import {GalleryImage, KeyArt} from '@/components/screen/media'
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

/** The top strip: the tabs, and a counter or a pager on the right. */
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
        padding: '0 14px 0 22px',
        zIndex: 2,
      }}
    >
      <Tabs
        activePadding="0 13px"
        fontSize={t.scrDeskTabSize}
        height={30}
        idle={C.soft}
        idlePadding="0 13px"
        screens={SCREENS}
      />
      {right}
    </div>
  )
}

/**
 * Design 4a, left: the console home. Key art under a wash, one title, four
 * facts, then the shelf. No buttons: A, or a second click on the tile, opens
 * the game — its trailer first, when it has one.
 */
function Games({content, project}: {content: ConsoleContent; project: Project}) {
  const t = useT()
  const C = usePalette()
  const index = useConsole((state) => state.gameIndex)
  const kicker = projectKicker(project)

  return (
    <>
      <div style={{position: 'absolute', inset: 0}}>
        <KeyArt height={t.deskGlassHeight} project={project} width={t.deskGlassWidth} />
      </div>
      {/* A flat wash first, so the text reads over a bright frame; then the design's gradients. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: t.scrOverlayColor,
          opacity: t.scrOverlayOpacity,
        }}
      />
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

      {/* Keyed on the game, so each new selection arrives line by line. */}
      <div
        key={project._id}
        style={{
          position: 'absolute',
          left: t.scrDeskInfoLeft,
          bottom: t.scrDeskInfoBottom,
          width: t.scrDeskInfoWidth,
          display: 'flex',
          flexDirection: 'column',
          gap: t.scrDeskInfoGap,
        }}
      >
        {kicker ? (
          <div
            className="scr-in"
            style={{fontSize: t.scrDeskKickerSize, color: C.soft, ...stagger(0)}}
          >
            {kicker}
          </div>
        ) : null}
        <h2
          className="scr-in"
          style={{
            ...titleStyle(t.scrDeskTitleSize, t.scrDeskTitleLeading, t.scrDeskTitleTracking),
            textWrap: 'balance',
            ...stagger(1),
          }}
        >
          {project.title}
        </h2>
        {project.blurb ? (
          // Two lines at most: the block grows upward, and the tabs are above it.
          <div
            className="scr-in"
            style={{
              fontSize: t.scrDeskBlurbSize,
              lineHeight: t.scrDeskBlurbLeading,
              color: C.inkStrong,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              ...stagger(2),
            }}
          >
            {project.blurb}
          </div>
        ) : null}
        <Facts
          className="scr-in"
          inline={{
            fontSize: t.scrDeskFactSize,
            labelSize: t.scrDeskFactLabelSize,
            gap: t.scrDeskFactGap,
          }}
          project={project}
          style={stagger(3)}
          variant="inline"
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: t.scrDeskInfoLeft,
          right: t.scrDeskInfoLeft,
          bottom: t.scrDeskShelfBottom,
        }}
      >
        <Shelf
          projects={content.projects}
          size={{
            width: t.scrDeskTileWidth,
            height: t.scrDeskTileHeight,
            selectedWidth: t.scrDeskTileSelectedWidth,
            selectedHeight: t.scrDeskTileSelectedHeight,
            gap: t.scrDeskTileGap,
            labelSize: t.scrDeskTileLabelSize,
            labelGap: 7,
            outlineOffset: 3,
          }}
        />
      </div>

      <Hints
        fontSize={t.scrDeskHintSize}
        gap={t.scrDeskHintGap}
        height={32}
        items={[
          ['◀ ▶', 'Browse'],
          ['A', 'Open'],
        ]}
        tail="or click anything"
      />
    </>
  )
}

/** Design 4a, right: the project page. Media on the left, facts on the right, and the right side scrolls. */
function ProjectPage({content, project}: {content: ConsoleContent; project: Project}) {
  const t = useT()
  const C = usePalette()
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
                <h2 style={titleStyle(40, 0.9, t.scrDeskTitleTracking)}>{project.title}</h2>
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
              background: `linear-gradient(rgba(${C.screenRgb},0),${C.screen})`,
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      <Hints
        fontSize={t.scrDeskHintSize}
        gap={t.scrDeskHintGap}
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

/** Design 6a: the profile on the left, links and the résumé pinned under it, and the Experience index on the right. */
function About({content}: {content: ConsoleContent}) {
  const t = useT()
  const C = usePalette()
  const settings = content.settings
  const bio = settings?.aboutBody ?? settings?.aboutHeadline

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
          gridTemplateColumns: '260px minmax(0,1fr)',
          borderTop: `1px solid ${C.ruleSoft}`,
        }}
      >
        <div
          style={{
            padding: '32px 26px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            borderRight: `1px solid ${C.ruleSoft}`,
          }}
        >
          <Avatar size={72} url={settings?.avatarUrl} />
          <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
            <h2 style={titleStyle(40, 0.88, t.scrDeskTitleTracking)}>{settings?.fullName}</h2>
            {settings?.title ? (
              <div style={{fontSize: 14, color: C.label}}>{settings.title}</div>
            ) : null}
          </div>
          {bio ? (
            <div style={{fontSize: 14.5, lineHeight: 1.55, color: C.inkStrong, textWrap: 'pretty'}}>
              {bio}
            </div>
          ) : null}
          <div style={{marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14}}>
            <LinkIcons content={content} />
            <ResumePill fontSize={13.5} height={38} settings={settings} />
          </div>
        </div>
        <Scroll style={{padding: '30px 30px 24px 22px'}}>
          <Experience compact={false} content={content} />
        </Scroll>
      </div>
      <Hints
        fontSize={t.scrDeskHintSize}
        gap={t.scrDeskHintGap}
        height={32}
        items={[
          ['▲ ▼', 'Select'],
          ['B', 'Back'],
        ]}
      />
    </>
  )
}

export function DeskScreen({content}: {content: ConsoleContent}) {
  const t = useT()
  const screen = useConsole((state) => state.screen)
  const isProjectOpen = useConsole((state) => state.isProjectOpen)
  const index = useConsole((state) => state.gameIndex)
  const project = content.projects[index]
  // A change of screen fades in, and so does each step between project pages.
  const view = screen === 'about' ? 'about' : isProjectOpen ? `page-${project?._id}` : 'games'

  return (
    <Glass
      compact={false}
      height={t.deskGlassHeight}
      radius={t.deskGlassRadius}
      settings={content.settings}
      width={t.deskGlassWidth}
    >
      <div className="scr-fade" key={view} style={{position: 'absolute', inset: 0}}>
        {screen === 'about' ? (
          <About content={content} />
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
      </div>
    </Glass>
  )
}

/** Games with no games published: the tabs still work, and the glass says so plainly. */
export function Empty() {
  const C = usePalette()
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
