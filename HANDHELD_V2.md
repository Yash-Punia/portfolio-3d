# Handheld v2: two 3D consoles

This is the working doc for the visual overhaul on `design/handheld-v2`. It follows Claude Design's
"Portfolio Handheld v2" (turn 4). The export lives in `design/`, and only
`Portfolio Handheld v2.dc.html` carries design content. `image-slot.js` and `support.js` are the
design tool's runtime.

For this branch, this file supersedes the console/firmware sections of `CLAUDE.md`. The data layer,
`app/page.tsx`'s fetching, the sr-only landmark and the JSON-LD are unchanged.

## What changed

| Before                                                                  | Now                                                                                                                |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| One console with two flaps that open, a joystick, and the firmware rail | Two consoles, chosen by viewport shape. Each is always on, with a short power-on.                                  |
| Portrait phone: the console rolled −90°                                 | Portrait: the upright **handheld** (Game Boy). Landscape: the wide **desk** console (Switch 2-style).              |
| Menu / Library / Timeline sections                                      | Tabs: **Games**, **About**, **Contact** on the desk. Games and About on the handheld, whose About holds the links. |
| Theme toggle, close cap, `?tune` panel                                  | Gone. Values are constants in `components/console/tokens.ts`.                                                      |
| Archivo + Martian Mono                                                  | Archivo (`wdth` 72%, 800, caps for titles), Schibsted Grotesk (UI), JetBrains Mono (counters, legends)             |

Decisions made with the user:

- The Timeline appears inside About as **Experience**.
- The Game Boy colours go on the **shell only**. The glass keeps the design's dark UI.
- **Always on**, with a ~760ms boot.
- **Old code deleted.**

## Layout

```
components/console/
  ConsoleStage.tsx  DOM side: keys, landmark focus, D-pad stream → move(), wheel, aria-live, desk header, sr-only cap twins
  Scene.tsx         Canvas (frameloop="demand"), camera fit (zoomFor), lights, Rig (drag-to-rotate), picks Desk | Handheld
  FlatScreen.tsx    no-WebGL fallback: the same screen as plain DOM, scaled to fit
  store.ts          useConsole: screen, gameIndex, isProjectOpen, isTrailerPlaying, rowIndex, isBooting, muted
  actions.ts        accept(content, device) / details(content) / menu(device)
  content.ts        server-safe data helpers (projectFacts, projectKicker, primaryLink, trailerOf, contactRows, …)
  device.ts         useDevice() ('desk' | 'handheld'), SCREENS per device, hasRows()
  tokens.ts         design colours (C), Game Boy shell colours (GB), FONT stacks, PANEL sizes, PREVIEW_DELAY_MS
  input.ts, audio.ts, webgl.tsx, htmlScale.ts, useMediaQuery.ts, useReducedMotion.ts   kept
components/handheld/  the 3D (no DOM UI)
  Desk.tsx, Handheld.tsx   the two shells; the glass is drei <Html transform> scaled with htmlScale()
  controls.tsx             RoundCap, PillCap, DPad (shared press/focus/hit-area behaviour)
  geometry.ts              roundedRect / roundedHole / cross outlines → slab() (ExtrudeGeometry + vertex gradient)
  print.tsx                <Print>: canvas-texture ink (legends, cap letters, serial) using the page's fonts
components/screen/    the glass (DOM only, no three imports)
  DeskScreen.tsx       Games home, project page, About, Contact (design 4a)
  HandheldScreen.tsx   Library, project page, About (design 4b M1–M3)
  parts.tsx            Glass, Boot, Tabs, Shelf, Pill, Hints, Facts, WriteUp, TrailerSlot, Pager, ContactList, Experience
  media.tsx            Cover / GalleryImage (Sanity CDN at 2×, LQIP), KeyArt + dwell preview (useDwell)
```

## Sizes (design px; 1 world unit = 100 px)

- **Desk body:** 1240×640, r72. Glass well 852×570, r18, with 10px of bezel, so the **glass is
  832×550**, r10. Control columns are 150 wide; their centres are at x = ±5.23.
  - D-pad: 144 across with 48 arms, centre y +0.49.
  - MENU pill: 64×22, y −0.90.
  - ABXY: 48 Ø, 46 apart, centre y +0.55.
  - Seams at x = ±4.46. Power LED at (−4.37, 2.57).
  - The standalone project mock in the design is 932 wide. The **device** (852 well) is the
    source of truth.
- **Handheld body:** 390×844. DMG corners are r16, except the bottom-right at r90.
  - Bezel: 18→554 px tall, x 16→374, with a band at the top holding the rules, "YP·01 HANDHELD"
    and the power LED.
  - **Glass 344×490** at (23, 57), r16.
  - D-pad: 138 across with 46 arms, at (93, 664).
  - B: 58 Ø at (259, 674). A: 64 Ø at (334, 642).
  - Menu/About pills: 84×44 at y 792.
  - Speaker: six slots at −30°.
- **Camera:** `zoomFor()`.
  - Desk: min(86% of the width, 94% of (height − 150)). At 1440×900 that gives exactly 100 px/unit,
    the design's own scale.
  - Handheld: 96% of either axis.

## Input map

|                       | Games                                                        | Project page                      | About (desk) | Contact (desk) / About (handheld)            |
| --------------------- | ------------------------------------------------------------ | --------------------------------- | ------------ | -------------------------------------------- |
| ◀ ▶                   | move the shelf                                               | previous/next game (no wrap)      | —            | —                                            |
| ▲ ▼                   | —                                                            | scroll the write-up               | scroll       | move between rows, then scroll past the ends |
| A / Enter / Space     | play the trailer if there is one, else open the project page | play the trailer                  | —            | open the row (résumé download / link)        |
| B / Esc               | —                                                            | stop the trailer → close the page | → Games      | → Games                                      |
| Y / D                 | open the project page                                        | —                                 | —            | —                                            |
| X / MENU / M          | next tab (wraps)                                             | next tab                          | next tab     | next tab                                     |
| Handheld "About" pill | → About                                                      | → About                           |              |                                              |

- **Taps:**
  - Everything on the glass is tappable: tabs, pills, tiles (a first tap selects, a second opens),
    the pager arrows, "‹ Games", and the rows.
  - The wheel walks the shelf on Games only.
  - The shelf swipes natively. The panel isn't rotated any more, so `useRailDrag`, `usePanelScroll`
    and `frame.ts` are gone.
- **The D-pad:** one tap is one `nudge()`. The arrow keys `hold()`, repeating every 180ms. The
  cross rocks toward `held`, and that arm lights green.
- **A trailer** (`trailerOf`):
  - YouTube → `youtube-nocookie` embed.
  - Vimeo → player embed.
  - `.mp4`/`.webm`/`.mov` → `<video controls>`.
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
- **Dwell preview:** `project.preview` fades in over the key art after `PREVIEW_DELAY_MS` (1500), and
  is skipped under reduced motion. **No project has a preview uploaded yet**, so this hasn't been
  seen live.
- **The handheld Library's meta line:** `role · engine · year`.
- **Contact rows:** résumé (`resumeLabel`, else "Download résumé"), then the `socialLinks`. Labels
  fall back to itch.io / GitHub / LinkedIn / X.
- **The desk page header** has real `<a>`s for the links and the résumé, outside
  `role="application"`.

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
  - Real 3D clicks work on MENU, the D-pad and B.
  - The flat fallback renders.
  - The trailer URL parser was checked with asserts.

## Deleted

- `components/firmware/**`
- `components/console/parts/**`
- `tuning.ts`, `TuningPanel.tsx`
- `dimensions.ts`, `materials.ts`, `spec.ts`, `geometry.ts`, `lure.ts`
- `frame.ts`, `useConsoleZoom.ts`, `glyphs.ts`, `mobile.ts`
- `Console.tsx`, `FallbackFirmware.tsx`
- `app/api/tuning`
- the theme script and `data-stage`

`store` persist is at version 2 and migrates `muted` across.
