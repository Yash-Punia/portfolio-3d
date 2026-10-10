# Handheld v2: two 3D consoles

This is the working doc for the visual overhaul on `design/handheld-v2`. It follows Claude Design's
"Portfolio Handheld v2" (turn 4). The export lives in `design/`, and only
`Portfolio Handheld v2.dc.html` carries design content. `image-slot.js` and `support.js` are the
design tool's runtime.

About follows a later export, "About Experience v2" (turn 6), in `design/experiences/`: mock 6a is
the desk's About, 6b the handheld's. It has its own copy of the same two runtime files.

For this branch, this file supersedes the console/firmware sections of `CLAUDE.md`. The data layer,
`app/page.tsx`'s fetching, the sr-only landmark and the JSON-LD are unchanged.

## What changed

| Before                                                                  | Now                                                                                                              |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| One console with two flaps that open, a joystick, and the firmware rail | Two consoles, chosen by viewport shape. Each is always on, with a short power-on.                                |
| Portrait phone: the console rolled −90°                                 | Portrait: the upright **handheld**. Landscape: the wide **desk** console (Switch 2-style). Same dark dress.      |
| Menu / Library / Timeline sections                                      | Two tabs on both consoles: **Games** and **About**. About holds the profile, the links and the Experience index. |
| Theme toggle, close cap, old `?tune` panel (`tuning.ts`)                | Theme and close gone. A **new** `?tune` (`tune.ts`, `TunePanel.tsx`, `/api/tune`) covers both handhelds.         |
| Archivo + Martian Mono                                                  | Archivo (`wdth` 72%, 800, caps for titles), Schibsted Grotesk (UI), JetBrains Mono (counters, legends)           |

Decisions made with the user:

- The Timeline appears inside About as **Experience**.
- Turn 6: **Contact is gone.** Its links are icons on About. (The desk header's "Résumé ↓" it
  kept was later removed by the polish pass, as was the header.)
- Turn 6: **No MENU / Menu pill** on either shell. (The polish pass then removed X, Y and the Game
  Boy's About/Résumé pills too.)
- Turn 6: `siteSettings.email` (optional) adds a mail icon after the social links.
- **Always on**, with a boot that shows the name and title on the glass (~2.2s).
- **Old code deleted.**

### Polish pass (after turn 6), from the user's review

- **No page chrome.** The desk's name/title header, its "Résumé ↓" and the "Arrow keys · Enter ·
  Esc" hint are gone. The name and title are in the boot instead.
- **A and B only.** X and Y are gone from the desk. Both shells print "Open" under A and "Back"
  under B. A is a dark cap like the rest.
- **One press tint.** Every cap and the D-pad's held arm turn `pressColor` (#2f7a2c) while down.
- **The handheld wears the desk's dress:** a dark gradient shell, a black well, a green LED. The
  Game Boy colours, bezel stripes and About/Résumé pills are gone, and the glass grew to 344×600.
- **Résumé:** a "Résumé ↓" pill on About, on both consoles.
- **No buttons on the shelf.** Watch trailer / Details / store link are gone from Games and the
  Library. A, or a second tap on the selected tile, opens the game (`openGame`). If the trailer
  can play inline, it is already playing. Project pages keep their pills.
- **A wash over the key art** (`scrOverlayColor` at `scrOverlayOpacity`, black at 0.35).
- **Motion:**
  - New selections stagger in, screens fade, and hovers brighten or lift slightly.
  - It is all CSS (`scr-*` classes in `globals.css`), driven by custom properties from the tune.
  - It is off under reduced motion or `motionOn: false`.
- **Mobbin was not used.** Its MCP needs a paid plan, so the motion was designed in-house.
- **A new live tune** (`?tune`): about 180 settings with save-as-default, a per-row undo and
  Ctrl+Z. See below.
- **Trailers start muted** on every player (YouTube, Vimeo, video files).
- **The handheld shelf follows the finger.**
  - The first slot is the selection, and a swipe selects each tile as it reaches it.
  - It snaps one tile per flick, and never auto-scrolls against a swipe in progress.

## Layout

```
components/console/
  ConsoleStage.tsx  DOM side: keys, landmark focus, D-pad stream → move(), wheel, aria-live, sr-only cap twins, mounts TunePanel on ?tune
  Scene.tsx         Canvas (frameloop="demand"), camera fit (zoomFor), lights, Rig (drag-to-rotate), picks Desk | Handheld
  FlatScreen.tsx    no-WebGL fallback: the same screen as plain DOM, scaled to fit
  store.ts          useConsole: screen, gameIndex, isProjectOpen, isTrailerPlaying, rowIndex, isBooting, muted
  actions.ts        openGame(project) / accept(content)
  content.ts        server-safe data helpers (projectFacts, projectKicker, primaryLink, trailerOf, profileLinks, downloadResume, entryYears, …)
  device.ts         useDevice() ('desk' | 'handheld'), SCREENS (the same two tabs on both)
  tune.ts           Tune + DEFAULT_TUNE (every colour, size, position, timing), useTune/useT, usePalette (the screen colours as C.*)
  TunePanel.tsx     the ?tune panel: Desk · Handheld · Screen · Motion tabs, Save as default / Copy JSON / Reset
  tokens.ts         FONT stacks only
  input.ts, audio.ts, webgl.tsx, htmlScale.ts, useMediaQuery.ts, useReducedMotion.ts   kept
app/api/tune/route.ts  dev-only: rewrites the DEFAULT_TUNE block in tune.ts, validated by each default's type
components/handheld/  the 3D (no DOM UI)
  Desk.tsx, Handheld.tsx   the two shells; the glass is drei <Html transform> scaled with htmlScale()
  controls.tsx             RoundCap (with its label under it), DPad (shared press/tint/focus/hit-area behaviour)
  geometry.ts              roundedRect / roundedHole / cross outlines → slab() (ExtrudeGeometry + vertex gradient)
  print.tsx                <Print>: canvas-texture ink (legends, cap letters, serial) using the page's fonts
components/screen/    the glass (DOM only, no three imports)
  DeskScreen.tsx       Games home, project page (design 4a), About (6a)
  HandheldScreen.tsx   Library, project page (design 4b M1–M2), About (6b)
  parts.tsx            Glass, Boot, Tabs, Shelf, Pill, ResumePill, Hints, Facts, WriteUp, TrailerSlot, Pager, Avatar, LinkIcons, Experience
  media.tsx            Cover / GalleryImage (Sanity CDN at 2×, LQIP), KeyArt + dwell preview (useDwell)
```

## The tune (`?tune`)

- **Opening it:** open any page with `?tune`. The panel is its own chunk, so ordinary visits
  never download it.
- **What it covers:** every value either shell or screen is drawn from, in
  `components/console/tune.ts`:
  - shell sizes and colours, glass and well, LED and serial;
  - D-pad and A/B position, size and colour, and their labels;
  - the press tint, framing, and the screen palette and overlay;
  - per-device type sizes, leading and tracking, the Games/Library layout and shelf tiles;
  - motion and boot timings.
- **Units:** `desk*` positions are world units from the shell's centre. `hh*` positions are design
  px from the handheld's top-left. `scr*` values are CSS px on the glass.
- **Persistence:** the store persists as `handheld-tune` with `skipHydration`. Only the panel
  rehydrates it, so a visitor without `?tune` always gets `DEFAULT_TUNE`, and there is no
  persist-version bump to remember.
- **Save as default:** POSTs to `/api/tune`.
  - It is 404 in production.
  - It rewrites only the `DEFAULT_TUNE` block, in the file's own line endings.
  - Every key must match its default's type: a finite number, a boolean, or `#rrggbb`.
  - So keep `DEFAULT_TUNE` values-only, and put notes on the `Tune` interface.
- **Undo:**
  - Each row has a ↶ that appears on hover or focus. It undoes that setting's last change, and
    is disabled when there is nothing to undo.
  - **Ctrl+Z / ⌘Z** (or the panel's Undo button) undoes the latest change of all, and takes a
    whole Reset back in one step.
  - Edits to one key within 600 ms count as one change, so a slider drag undoes in one step.
  - The history lives in `useTune` but is not persisted.
- **A new key** needs a row in `TunePanel`'s `TABS` (or in `capGroups` for a per-shell cap key).
- **Colours in screen code:** they come from `usePalette()`, returned as `C`, so the old `C.ink`
  spelling still reads naturally.
- **Separate from the old tuning:** the old `tuning.ts` / `TuningPanel` / `/api/tuning` on `main`
  is a separate system. This branch deleted it, and the new one shares nothing with it.

## Sizes (defaults; design px; 1 world unit = 100 px)

The defaults below include the user's own **Save as default** session.

- The desk body is 0.72 deep with r160 corners.
- The handheld shell is a lighter grey (#454545 → #484847).
- The key-art wash is at 0.5.
- The desk Games type is smaller (title 48, leading 1.05).
- Shelf gaps are wider.
- The arrival motion is slower and deeper (620ms, 12px rise, 85ms stagger).

`tune.ts` is the source of truth.

- **Desk body:** 1240×640. Glass well 852×570, r18, with 10px of bezel, so the **glass is
  832×550**, r10. Control columns are 150 wide; their centres are at x = ±5.23.
  - D-pad: 144 across with 48 arms, at (−5.23, 0.49).
  - A at (5.55, 0.82) and B at (4.91, 0.30), both r0.30, each with its label 0.14 below the cap.
  - Seams at x = ±4.46. Power LED at (−4.37, 2.57).
  - The standalone project mock in the design is 932 wide. The **device** (852 well) is the
    source of truth.
- **Handheld body:** 390×844, r40, a grey vertex gradient.
  - **Glass 344×600** at top 46, r14, in an 8px black well. LED and "YP·01" sit at y 22.
  - D-pad: 138 across with 46 arms, at (93, 742).
  - B: r0.29 at (259, 752). A: r0.32 at (334, 716).
  - The speaker is off by default (`hhSpeakerOn`).
  - Library: 330px of key art, the title's foot 30px below it, the shelf 48px above the hint
    strip. The project page's trailer is 16:9.
- **Camera:** `zoomFor()`.
  - Desk: min(86% of the width, 94% of (height − 60)). At 1440×900 the width binds, which gives
    100 px/unit, the design's own scale.
  - Handheld: 96% of either axis.

## Input map

|                     | Games                                                        | Project page                      | About                                               |
| ------------------- | ------------------------------------------------------------ | --------------------------------- | --------------------------------------------------- |
| ◀ ▶                 | move the shelf                                               | previous/next game (no wrap)      | —                                                   |
| ▲ ▼                 | —                                                            | scroll the write-up               | move the open Experience row, then scroll past ends |
| A / Enter / Space   | open the game; an inline trailer starts playing (`openGame`) | play the trailer                  | —                                                   |
| B / Esc             | —                                                            | stop the trailer → close the page | → Games                                             |
| `x` key (no cap)    | next tab (wraps)                                             | next tab                          | next tab                                            |
| "Résumé ↓" on About | —                                                            | —                                 | download the résumé                                 |

- **Taps:**
  - Everything on the glass is tappable: tabs, tiles, the pager arrows, "‹ Games", the
    Experience rows (a tap opens that row), the link icons and the résumé pill.
  - On a tile, a first tap selects it and a second opens it, the same as A.
  - On the handheld, the shelf snaps tile by tile (`Shelf follow`), and the first slot is the
    selection:
    - A swipe selects each tile as it reaches that slot, and the one before slides off to the
      left.
    - The D-pad and taps scroll their tile into the same slot.
    - A flick moves one tile (`scroll-snap-stop: always`).
    - The row never scrolls itself to chase a selection a swipe made. The finger and the
      browser's snap own that scroll.
  - The wheel walks the shelf on Games only.
  - The shelf swipes natively. The panel isn't rotated any more, so `useRailDrag`, `usePanelScroll`
    and `frame.ts` are gone.
- **The D-pad:** one tap is one `nudge()`. The arrow keys `hold()`, repeating every 180ms. The
  cross rocks toward `held`, and that arm takes the press tint.
- **A trailer** (`trailerOf`):
  - YouTube → `youtube-nocookie` embed (`mute=1`).
  - Vimeo → player embed (`muted=1`).
  - `.mp4`/`.webm`/`.mov` → `<video controls muted>`.
  - Every trailer starts muted, and its own controls unmute it.
  - Any other URL opens in a new tab.
  - The CSP `frame-src` allows exactly those two embed hosts (`next.config.ts`).

## Data → UI

- **Kicker** ("Mobile · PvP shooter" in the design): there is no genre field, so it shows
  `platforms · engine`. **Gap:** add a `genre` field if the design's wording matters.
- **Four facts:** Role, Year, Engine, Platforms (`projectFacts`). Team and Tech stay in the landmark;
  Tech is the "Stack" line.
- **"What I built":** Portable Text list items in `description` (`descriptionParagraphs().listItem`).
  None are published yet, so the page shows prose paragraphs.
- **Screenshots:** the first two `gallery` images. None are published yet, so the row collapses.
- **Dwell preview:** `project.preview` fades in over the key art after `scrPreviewDelayMs` (1500), and
  is skipped under reduced motion. **No project has a preview uploaded yet**, so this hasn't been
  seen live.
- **The handheld Library's meta line:** `role · engine · year`.
- **About's profile:** avatar (collapses when there is none), `fullName`, `title`, and the bio
  (`aboutBody`, else `aboutHeadline`; the handheld shows no bio, as in 6b).
- **Link icons** (`profileLinks`): each `socialLink` with a URL, then `mailto:` from
  `siteSettings.email`. The marks are inline SVG paths in `parts.tsx`. The design's icon CDN is
  blocked by the CSP. A link without a known platform shows its label's first letter.
- **Experience index:** the timeline in query order. The years column is `entryYears` (`2023 — 2026`,
  `2026 — Now`, or one year). Only the open row (`rowIndex`) shows its `summary` and `highlights`.
  The landmark keeps the month-precise `entryDates`.
- **Résumé:** the "Résumé ↓" pill on About (`ResumePill` → `downloadResume`), which collapses
  without a résumé. The landmark keeps the accessible link. The flat fallback shows the same pill.

## 3D notes

- `slab()` extrudes backwards from z = 0, so a part's front face is at its group's origin. Pass an
  outline already shrunk by the bevel.
- A hole in the outline (the desk's well) is enlarged by the bevel, because the bevel grows into it.
- The desk shell's gradient (#262625 → #181817) is vertex colour, lit, not painted.
- `Print` draws into a canvas at 400 px per unit. It reads `--font-jetbrains` / `--font-schibsted`,
  calls `document.fonts.load()`, then repaints. Don't switch to drei `<Text>`: troika fetches its own
  fonts, and the CSP blocks it.
- Controls follow the old rules:
  - an invisible hit mesh
  - `pointerdown` only holds the cap and stops propagation
  - the action fires on `click`
  - `pressedSlot` / `focusedSlot` drive the travel and the green focus ring
- `Glass` stops `pointerdown` and `click` at its root, because drei `<Html>` mounts inside R3F's
  event source.
- `frameloop="demand"`: there is no idle drift any more. Springs and commits invalidate.

## Verifying

- **Hidden preview pane:** the Claude browser pane stalls rAF and ResizeObserver while it is
  hidden. The canvas stays 300×150 and the boot never ends. Use the chrome-devtools MCP (headless
  page) when the pane is hidden.
- **Screenshot timing:** pane screenshots can lag a state change by a beat. Re-take before
  believing a "wrong screen".
- **3D controls need real clicks** (`computer` in the pane). Keyboard paths can be driven with a
  `keydown` dispatched on `window`. The `aria-live` text is the fastest state readout.
- **Forcing the WebGL fallback:** pass a navigation `initScript` that makes
  `getContext('webgl*')` return null.
- **Checked on this branch:**
  - typecheck, lint and `pnpm build` are clean.
  - Desk 1440×900 and handheld 390×844 match 4a and 4b M1–M3.
  - Keyboard covers every verb.
  - Real 3D clicks work on the D-pad and B (and on MENU before turn 6 removed it).
  - Turn 6: desk 1440×900 and handheld 390×844 About match 6a/6b. ▲ ▼ walk the open row,
    `entryYears` was checked with asserts, and the Résumé twin and link icons were driven from
    script. The new pills share `PillCap`'s press path but were not real-clicked (the pane was
    hidden).
  - The flat fallback renders.
  - The trailer URL parser was checked with asserts.
  - Polish pass:
    - typecheck, lint and build are clean.
    - Headless 1440×900 and 390×844 (chrome-devtools) show the boot frozen mid-sequence, Games,
      and About with the résumé pill.
    - A real click on A opened the project page with its trailer playing, and B closed it.
    - A tile clicked twice opened its page. Esc stepped back, and `x` walked to About.
    - `?tune` edits applied live. Save as default rewrote only the changed keys, and that was
      reverted.
    - The press tint and reduced motion were not seen on screen.
    - Tune undo was driven from script:
      - a row's ↶ undid only its own key;
      - Ctrl+Z walked back across keys, and a Reset came back in one step;
      - a burst of slider edits undid as one.
    - The trailer embed's `src` carries `mute=1`.
    - Simulated swipes on the handheld:
      - 2.4 tiles selected the 3rd;
      - the end reached the 17th;
      - mid-drag the row was not pulled ahead of the finger.
      - A real touch swipe was not tested.

## Deleted

- `components/firmware/**`
- `components/console/parts/**`
- `tuning.ts`, `TuningPanel.tsx`
- `dimensions.ts`, `materials.ts`, `spec.ts`, `geometry.ts`, `lure.ts`
- `frame.ts`, `useConsoleZoom.ts`, `glyphs.ts`, `mobile.ts`
- `Console.tsx`, `FallbackFirmware.tsx`
- `app/api/tuning`
- the theme script and `data-stage`
- polish pass: the desk header and keyboard hint (`DeskChrome`), X/Y caps, `PillCap`, the Game Boy
  colours (`GB`), `details()` / `menu()`, and the shelf pills

`store` persist is at version 2 and migrates `muted` across.
