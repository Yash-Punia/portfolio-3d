@AGENTS.md

# portfolio-3d — working guide

Yash Punia's portfolio. The whole site is a 3D handheld console with two flaps that open. All
content comes from Sanity. `SPEC.md` is the original build spec and `NOTES.md` is the decision log.
This file describes the code **as it is now**, and where it has moved on from the spec, this file
wins.

## Stack and commands

Next 16.3 (App Router, Turbopack) · React 19.2 · R3F 9 + drei 10 + three r185 + `@react-spring/three`
· zustand 5 · Sanity 6 (Studio embedded at `/studio`) · Tailwind 4 · pnpm. Prefix shell commands with
`rtk` (see the global CLAUDE.md).

| Command | What |
|---|---|
| `pnpm dev` | Dev server. Run it through the preview tool (`.claude/launch.json` → `portfolio-3d`), not Bash. |
| `pnpm typegen` | `sanity schema extract` + `typegen` → `schema.json`, `sanity.types.ts`. Both are committed; never hand-edit them. |
| `pnpm typecheck` / `pnpm lint` / `pnpm build` | `build` runs `typegen` first. |
| `npx prettier --end-of-line auto --check <files>` | `core.autocrlf=true` makes plain `prettier --check` flag every file for CRLF. |

**Deploy:** Vercel Git integration. A push to any branch builds a Preview. `main` builds
Production. The Studio ships with the site, so a schema change needs no separate `sanity deploy`.

## Layout

```
app/page.tsx              Server Component: fetches Sanity, renders the sr-only landmark + <ConsoleStage>
app/api/tuning            dev-only: "save as default" in ?tune rewrites DEFAULT_TUNING in tuning.ts
app/api/revalidate, draft Sanity webhook revalidation, draft mode
components/console/       the 3D object and the state behind it
  ConsoleStage.tsx        DOM side: keys, landmark focus, rail input, wheel, panel scroll, sr-only controls
  Scene.tsx, Console.tsx  canvas/camera; Console = drag-to-rotate + the portrait-phone roll
  parts/                  Body (glass + <Screen>), Flap, InfoMonitor, Joystick, FaceButtons, ThemeToggle
  store.ts                useConsole — navigation state machine (persisted: theme, muted)
  input.ts                useInput — held direction + tick stream, nudge(), pressedSlot, focusedSlot
  actions.ts              accept(content) — the A verb (kept out of content.ts: page.tsx is a Server Component)
  tuning.ts               useTuning + DEFAULT_TUNING — every size/colour/sound, live-editable via ?tune
  dimensions.ts, materials.ts, spec.ts   pure derivations of tuning → geometry/materials (useSpec)
  glyphs.ts               SVG path table: 3D cap marks (SVGLoader) and DOM icons (VIEWBOX per path)
  frame.ts, mobile.ts     portrait-phone maths (isPortraitPhone, inConsoleFrame, panelScale)
  audio.ts                synthesized Web Audio cues, all knobs in tuning (sfx*)
components/firmware/      the DOM UI on the screen (drei <Html transform>), knows nothing about 3D
  Firmware.tsx            root: StatusBar + Menu | LibraryRail | Timeline, Detail overlay, Boot
  layout.ts               useFirmwareLayout — tuning → px sizes; MOBILE table overrides on phones
  useRailDrag.ts          finger-follow + snap for both rails
sanity/schemaTypes        project, timelineEntry, socialLink, siteSettings
sanity/lib/queries.ts     defineQuery GROQ (TypeGen only sees named defineQuery variables)
```

## Navigation model

- **Sections:** `menu`, `library`, `timeline`. `open()` boots straight into the Library at index
  0, not the menu. The menu (Games / Projects | Experience) is one step *out* of the rails, reached
  only by back; it opens highlighting the rail you came from. On the rails, joystick or arrow
  up/down walks between Library and Timeline (`neighbours()` in `content.ts`) and left/right moves
  within the rail. On the menu every direction moves the highlight. `menuChoice()` clamps the
  store's bare `menuIndex` against `menuOptions(content)`.
- **Verbs** live in the store, so every input path agrees:
  - `back()`: detail → rail, rail → menu, menu → closed.
  - `jump(section)`: open if needed, section at index 0.
  - `setSection` resets both indices. A caller that targets a specific tile sets its index *after*
    calling it.
- **Right flap:**
  - A (✓ `check`) = `accept`, B (↶ `undo`) = `back`, X (gamepad) = `jump('library')`,
    Y (hourglass) = `jump('timeline')`.
  - Top row: theme toggle (left) and close cap (right). The close cap is `FaceButton dark`.
  - Keys `a/b/x/y`, Enter = A, Escape = B.
- **Left flap:** info monitor (name, title, status, social icons + resume download), then the
  joystick. The stick is one push → one `nudge()`, and the lean self-clears after 200ms. Arrow keys
  use `hold()`, which repeats every 180ms.
- **Detail view:**
  - Title, then a `3fr 2fr` grid (cover + link buttons | facts), then the description.
  - Link buttons get their glyph from the URL host (`glyphFor`).
  - Up/down from the stick or arrows call `scrollDetail()` on `[data-detail-scroll]`.
  - Left/right (stick, arrow keys, the corner `StepArrow`s, or a sideways swipe on phones via
    `usePanelScroll`, `DETAIL_SWIPE` panel px) call `moveLibrary(±1)` and step to
    the neighbouring project without leaving the view. `Detail` is keyed on `project._id`, so each
    step starts at the top. No wrap: the first project has no prev arrow, the last no next.
- **Rail dots:** `RailDots` under the Library rail, one per project, Instagram-style. Past
  `MAX_DOTS` (7) a window follows the selection and an edge dot with more beyond it shrinks.
- **Dwell preview:** when the selection rests on a project for `fwPreviewDelayMs`, its Sanity
  `preview` file (GIF via `<img>`, MP4/WebM via `<video muted loop playsInline>`) fades in over the
  cover. It is skipped under reduced motion.

## Phones

- A portrait viewport under 640px (`isPortraitPhone`) rolls the console −90° **always**, closed or
  open. The visitor turns the phone. `useConsoleZoom` frames the swapped footprint.
- Any screen-space delta must go through `inConsoleFrame()` (direction) and `panelScale()`
  (distance). `Console`'s roll, `frame.ts` and `Joystick` all share that sign: change one, change
  all.
- The firmware has a separate `MOBILE` px table in `firmware/layout.ts`. It is not a scaled copy of
  the desktop values.
- `usePanelScroll` finger-scrolls `[data-console-scroll]` boxes manually. They are
  `touch-action: none` inside a rotated transform.

## Gotchas that have already bitten

- **drei `<Html>` mounts inside R3F's event source.** Its DOM events bubble into R3F, which raycasts
  with the DOM target's offsets and hits random chassis. That made swiping the rail rotate the
  console. `Firmware`'s root and the InfoMonitor icons stop `pointerdown` and `click`. Window
  listeners that need firmware pointerdowns must use the capture phase. Never stop
  `pointermove`/`pointerup`: the rail drag, stick and rotation listen for them on `window`.
- **Pointer capture retargets `click`** to the capturing element. `useRailDrag` uses window
  listeners instead, otherwise tapping a tile stops opening it.
- **One tap = one press:** fire actions on `onClick` (the release) only. `onPointerDown` just sets
  the held visual and calls `stopPropagation()`, so it doesn't rotate the console.
- **Positions on a flap's inner face** are in the flap's own frame, which faces away. `x` is
  negated when placing a group, and the `rotation={[0, π, 0]}` only rights the group's *children*.
- **Hit areas:** each control has an invisible (`visible={false}`) disc sized by
  `buttonHitScale` / `joystickHitScale`. R3F raycasts invisible meshes. Handlers sit on the parent
  group, so the disc, housing and cap all answer.
- **The tuning persist `version` must be bumped** whenever `DEFAULT_TUNING` changes. Every visit
  saves the record, so without a bump returning visitors never see new defaults.
- **New tuning keys** need a `TuningPanel` row. Booleans and waveform strings also need the
  `/api/tuning` validator branch, which switches on `typeof DEFAULT_TUNING[key]`.

## Accessibility pattern

The 3D tree and the firmware DOM are `aria-hidden`. Their controls are `<span onClick>`, never
`<button>`/`<a>`, because a focusable element inside `aria-hidden` is a trap. The real controls live
in the server-rendered `.sr-only` landmark (`app/page.tsx`) and in `ConsoleControls`
(`ConsoleStage.tsx`):

- `data-console-focus="A|B|X|Y|close|theme"` lights the matching cap's focus ring.
- `data-project-index` selects or opens a tile.
- An `aria-live` region announces the selection.

Caps text is allowed only in the status bar and similar console chrome (SPEC §10).

## Sanity

After changing a schema or query, run `pnpm typegen` and commit `schema.json` and
`sanity.types.ts`. Every field is nullable in the UI, and each control collapses on its own empty
case. `project.preview` (file: GIF/MP4/WebM) drives the dwell preview.

## Verifying in the preview pane

- R3F ignores synthetic DOM events. Use real `computer` clicks and drags for 3D controls. Keyboard
  paths can be driven with dispatched `keydown` on `window`.
- CSS transitions, smooth scrolling and the boot sequence freeze while the pane isn't painting.
  Run `document.getAnimations().forEach(a => a.finish())` and read inline styles. Otherwise a
  "wrong tile" click is just a rail frozen mid-transition.
- The `aria-live` text is the quickest state readout. `preview_logs` is cumulative, so restart the
  server for a clean log.
- Screenshot coordinates are in the reported frame (1.5× CSS on the mobile preset), not image pixels.
- Clear `localStorage['console-tuning']` to pick up new defaults within the same persist version.
