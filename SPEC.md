# Build Spec — "Pokédex" 3D Portfolio for Yash Punia

> **How to use this file.** Put it in your project root as `SPEC.md`, then open Claude Code in that folder and say:
> _"Read SPEC.md. Follow the Working Agreement section. Start with Phase 0 and stop at the checkpoint."_
> Do **not** paste the whole thing as one chat message — a file Claude Code can re-read beats a wall of chat text that scrolls out of context.

---

## 0. Working Agreement (read this first)

You are building a production portfolio site for **Yash Punia, Gameplay Programmer**. This is his primary job-hunting artifact — recruiters and studio leads will open it on a laptop and on a phone. It must be fast, accessible, and correct, not just impressive.

Rules:

1. **Work in phases.** Section 14 defines phases. Complete one phase, run the acceptance checks, then stop and report. Do not skip ahead.
2. **Verify visually.** After any change to the 3D scene or firmware UI, take a screenshot with the Chrome DevTools MCP and look at it. Do not report a visual feature as done without having seen it render.
3. **Never create content.** Do not seed, mock, stub, or invent projects or timeline entries — not in Sanity, not in a fixture file, not inline in a component, not "temporarily to test the layout". Yash authors all project and timeline content himself in the Sanity Studio. The only content values you may hard-code are the ones explicitly given in §3.1. Build every view so it renders correctly against an **empty dataset** and fills in as documents are published.
4. **Ask before inventing.** If a spec detail is genuinely ambiguous, ask one focused question rather than guessing and building 400 lines on a wrong assumption.
5. **Keep a `NOTES.md`** with decisions made, things tried that failed, and known issues. Update it at each checkpoint.
6. **Type safety is non-negotiable.** `strict: true`, no `any`, no `@ts-ignore`. Generated Sanity types only.
7. **Commit at every checkpoint** with a conventional commit message. Never commit `.env.local`.

---

## 1. What we're building, in one paragraph

A single-page site whose entire interface is a 3D handheld console — a black, red-accented, Pokédex-style clamshell with two front-opening flaps — rendered orthographically, centered, facing the viewer. Closed by default. The visitor taps it, the flaps swing open, and a screen boots into a console-firmware UI containing the whole portfolio: an About tile, a horizontally-scrolling library of games/projects (PS5-dashboard style), and a horizontal timeline of experience and education. The console's physical controls — a joystick, four ABXY face buttons, a DS-style power slider — are real inputs, not decoration. **There is no text, chrome, or scroll content anywhere outside the console.** The page is the object.

---

## 2. Locked technical decisions

Use exactly this stack. Do not substitute.

| Layer           | Choice                                                                                      | Notes                                                                    |
| --------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Framework       | **Next.js (App Router)**, latest stable                                                     | React Server Components for CMS fetching                                 |
| Language        | **TypeScript**, `strict`                                                                    |                                                                          |
| Package manager | **pnpm**                                                                                    |                                                                          |
| Styling         | **Tailwind CSS v4** + CSS custom properties for theme                                       |                                                                          |
| 3D              | **three.js** + **@react-three/fiber** + **@react-three/drei**                               |                                                                          |
| 3D animation    | **@react-spring/three**                                                                     | Springs for flaps, rotation snap-back, camera                            |
| 2D/UI animation | **Motion** (`motion/react`)                                                                 | Firmware UI transitions only                                             |
| State           | **Zustand**                                                                                 | One console store; see §8                                                |
| CMS             | **Sanity** (Studio embedded at `/studio`)                                                   | See §3                                                                   |
| CMS client      | `next-sanity` + `@sanity/image-url` + **Sanity TypeGen**                                    | Typed GROQ, no hand-written interfaces                                   |
| Icons           | `lucide-react` for UI; **custom inline SVG** for brand marks (itch.io, GitHub, X, LinkedIn) | Do not use a brand-icon npm package that ships thousands of unused paths |
| Hosting         | **Vercel**                                                                                  |                                                                          |
| Analytics       | `@vercel/analytics` + `@vercel/speed-insights`                                              | Optional, but wire them                                                  |

**Before writing code against any of these libraries, pull current docs via Context7.** React Three Fiber, drei, and `next-sanity` all have breaking-change history and the version in your training data is probably not the version being installed. This is a hard requirement, not a suggestion.

---

## 3. CMS: Sanity

### Why Sanity for this project

- The Studio is a React app that lives **in this same repo** at `/studio` and deploys to Vercel alongside the site — one repo, one deploy, no second dashboard to pay for.
- **GROQ** handles the exact shapes here cleanly: ordered project rails, timeline entries that reference projects, singleton settings.
- **TypeGen** generates TypeScript types directly from your schema _and_ from each GROQ query, so a schema change that breaks a query becomes a compile error.
- The image CDN does hotspot/crop, format negotiation, and on-the-fly resizing — important because project cover art is the heaviest asset on this site.
- File assets handle the resume PDF, so Yash can swap his resume without a redeploy.
- It has a **first-party MCP server and Claude Code plugin**, meaning Claude Code can inspect the live schema and write and test GROQ queries against it instead of guessing. (It must not use this to author project or timeline content — see Working Agreement rule 3.)
- Free tier is generous for a personal portfolio.

Alternatives considered and rejected for this project: _Payload_ (excellent and Next-native, but self-hosted and needs a database — more ops than a portfolio warrants); _Contentful/Storyblok_ (fine, but heavier and less pleasant for a solo dev); _Keystatic/Tina_ (git-based and free, but weaker media handling and no MCP). If you ever want zero external services, Keystatic is the fallback — but start with Sanity.

### 3.1 Confirmed content values

These are real and final. Hard-code nothing else.

**About body** (`siteSettings.aboutBody`) — 182 characters, comfortably inside the 320 limit:

> I'm a creative person with a passion of developing games and learning novel methods to improve my skills. I love studying programming patterns, rendering and tinkering with problems.

**About headline** (`siteSettings.aboutHeadline`) — not yet supplied. Leave the field empty and let the About tile render without it until Yash fills it in.

**Name:** Yash Punia · **Title:** Gameplay Programmer

**Social links** — create these four `socialLink` documents and nothing else:

| Slot | Platform   | URL                                      | Position |
| ---- | ---------- | ---------------------------------------- | -------- |
| `A`  | `itch`     | `https://yashpunia.itch.io`              | right    |
| `B`  | `github`   | `https://github.com/Yash-Punia`          | bottom   |
| `X`  | `twitter`  | `https://x.com/zeldariomon`              | top      |
| `Y`  | `linkedin` | `https://www.linkedin.com/in/yash-punia` | left     |

Projects and timeline entries are **not** provided and must not be fabricated. See §3.2.

### 3.2 Empty-state requirements

Because the dataset starts empty and fills up over time, every view must handle zero and partial data without breaking:

- **Zero projects:** the Library rail shows only the About tile. No horizontal scroll affordance appears, no empty card placeholders, no "coming soon" copy. The rail simply has one item.
- **Zero timeline entries:** the Timeline section is **hidden entirely** — `↓` from the Library does nothing and the section indicator doesn't render. Do not show an empty timeline axis.
- **One item in a rail:** left/right input is a no-op. Don't animate a bounce or wrap around.
- **Missing optional fields:** absent `cover`, `videoUrl`, `gallery`, `logo`, `result`, or `relatedProjects` must each collapse cleanly. A project with no cover renders a solid accent-tinted tile with the title set in Archivo Expanded — deliberate, not a broken-image icon.
- **Missing `resumeFile`:** fall back to `public/resume.pdf`. If neither exists, hide the CV button rather than linking to a 404.
- Write these as unit tests or at minimum verify each case manually and record it in `NOTES.md`.

### Content model

Create these schema types in `sanity/schemaTypes/`. Use `defineType`/`defineField`. Every field gets a `description` written for a non-technical editor.

**`siteSettings`** (singleton)

- `fullName` — string, required. ("Yash Punia")
- `title` — string, required. ("Gameplay Programmer")
- `statusLine` — string, optional. Short line for the info monitor, e.g. "Open to work".
- `aboutHeadline` — string, required. Max 60 chars.
- `aboutBody` — text, required. **Max 320 characters, enforced by validation.** This must fit the About tile without scrolling.
- `resumeFile` — file, accept `.pdf`. Optional; falls back to `/public/resume.pdf`.
- `resumeLabel` — string, default "Download CV".
- `avatar` — image with hotspot, optional.
- `seo` — object: `metaTitle`, `metaDescription`, `ogImage`.

**`socialLink`**

- `platform` — string, list: `itch` | `github` | `twitter` | `linkedin`. Required, unique.
- `url` — URL, required.
- `buttonSlot` — string, list: `A` | `B` | `X` | `Y`. Required, unique. Drives which face button opens it.
- `label` — string, for the tooltip and screen-reader name.

**`project`**

- `title` — string, required.
- `slug` — slug from title, required.
- `order` — number, required. Controls rail position; lower = closer to the About tile.
- `blurb` — text, required. **Validation: 90–200 characters.** This is the 2–3 line description on the tile.
- `description` — Portable Text, optional. Longer detail for the expanded view.
- `role` — string. ("Gameplay Programmer", "Solo Developer")
- `year` — string. ("2024" or "2023–24")
- `engine` — string, list: `Unity` | `Unreal` | `Godot` | `Custom` | `Other`.
- `tech` — array of strings. (C#, C++, DOTS, Netcode, Behaviour Trees…)
- `platforms` — array of strings, list: PC, Web, Android, iOS, Console.
- `cover` — image with hotspot, required. **Landscape, min 1200×675.**
- `gallery` — array of images, optional.
- `videoUrl` — URL, optional. YouTube/Vimeo trailer.
- `links` — array of objects `{ label, url }`. Itch page, GitHub repo, Play Store, devlog.
- `teamSize` — number, optional.
- `featured` — boolean.

**`timelineEntry`**

- `kind` — string, list: `work` | `education`. Required.
- `organisation` — string, required. (Studio or institution name)
- `role` — string, required. (Job title or degree)
- `startDate` — date, required. Date-only, `YYYY-MM`.
- `endDate` — date, optional. Empty = current.
- `isCurrent` — boolean.
- `location` — string.
- `summary` — text, required, max 400 chars. Shown when the entry is selected.
- `highlights` — array of strings. Bullet points: shipped titles, systems owned, results.
- `relatedProjects` — array of references to `project`. Lets the timeline link into the library.
- `logo` — image, optional.
- `result` — string, optional. For education: CGPA, class, honours.

### Fetching and revalidation

- Fetch in Server Components with `next-sanity`, using tag-based caching: `{ next: { tags: ['project', 'timelineEntry', 'siteSettings'] } }`.
- Create `app/api/revalidate/route.ts` that verifies a Sanity webhook signature (`@sanity/webhook`) and calls `revalidateTag()` for the changed document type.
- Configure the webhook in Sanity → API → Webhooks, pointing at the deployed URL, with the secret in `SANITY_REVALIDATE_SECRET`.
- Enable **draft mode** so Yash can preview unpublished content at `/?preview`.
- Run `pnpm sanity typegen generate` and wire it into the build script so types can't drift.

---

## 4. The 3D console — geometry and materials

Build the console **procedurally in React Three Fiber** using primitives (`RoundedBox`, `Cylinder`, `Torus`, extruded shapes). Do **not** author or import a GLTF. Reasons: the form is simple, procedural geometry keeps the bundle tiny, and every dimension stays tweakable in code instead of requiring a Blender round-trip.

### Camera and framing

- `OrthographicCamera`, `makeDefault`, positioned on `+Z`, looking at origin. No perspective distortion — the console reads as a flat, deliberate object.
- Zoom is derived from viewport size so the console fills a consistent proportion of the screen at every breakpoint. Recompute on resize.
- Camera never orbits. `OrbitControls` is **not** used anywhere.

### Form

A clamshell, viewed front-on:

```
        ┌─────────────┬─────────────┐
        │             │             │
        │  LEFT FLAP  │ RIGHT FLAP  │   ← closed state: two doors, hairline
        │             │             │      seam down the centre, red accent
        │             │             │      strip along the seam
        └─────────────┴─────────────┘

              ↓ open (flaps swing outward on Y-axis hinges)

  ┌────────┐ ┌───────────────────┐ ┌────────┐
  │ INFO   │ │                   │ │  X     │
  │ MONITOR│ │      SCREEN       │ │ Y   A  │
  │ [CV ↓] │ │                   │ │    B   │
  │        │ │                   │ │        │
  │  ( ● ) │ │                   │ │ [close]│
  │ joystick│ └───────────────────┘ └────────┘
  └────────┘
   LEFT FLAP        BODY              RIGHT FLAP
```

- **Body** — the base slab. Recessed screen bezel in the centre. The DS-style **power slider** sits on the lower bezel of the body, below the screen.
- **Left flap** — hinged on its left edge, swings out to roughly −105°. Carries, top to bottom: a small secondary **info monitor** (self-illuminated, always shows name + title + status line), a **resume download button**, and a **joystick** in the lower half.
- **Right flap** — hinged on its right edge, swings out to roughly +105°. Carries the **ABXY cluster** in diamond arrangement, and a **close button** at the bottom.
- Flap interiors are visible only when open; the info monitor and buttons are on the inner faces.

### Materials

Differentiate surfaces by material, not just colour — this is what makes it read as a physical object rather than a black box:

| Part                 | Material                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Outer shell          | `meshStandardMaterial`, `#141416`, roughness 0.65, metalness 0.05 — matte, slightly soft plastic                                                  |
| Screen bezel / seams | `#0A0A0C`, roughness 0.35 — darker, glossier, recessed                                                                                            |
| Red accents          | `#E12B38`, roughness 0.4. Used on: the centre seam strip, a hinge detail, the joystick collar ring, and the power-slider track. **Nowhere else.** |
| Buttons (ABXY, CV)   | `#F2F2F0`, roughness 0.5 — off-white, not pure white                                                                                              |
| Button glyphs        | `#0A0A0C`, rendered as flat extruded SVG or as an alpha-mapped decal                                                                              |
| Screen glass         | `meshPhysicalMaterial`, transmission ~0.1, thin, subtle clearcoat — a faint reflection sells "glass"                                              |
| Info monitor         | `meshBasicMaterial` — self-lit, unaffected by scene lighting                                                                                      |

Lighting: one key `directionalLight` upper-left, one low `ambientLight`, and a drei `<Environment preset="city" />` at low intensity for edge definition. No shadow maps — use a soft `ContactShadows` plane instead. Total lights: three or fewer.

**The 3D model never changes colour with the light/dark toggle.** The toggle affects the screen contents only.

---

## 5. Interactions on the model

Split the scene into two raycast groups:

- **`interactive`** — screen surface, ABXY buttons, joystick, power slider, CV button, close button, and the flaps _while closed_ (tapping either flap opens the console).
- **`chassis`** — everything else: shell, bezels, hinges, flap backs.

### Opening

- Console starts **closed**. A slow, subtle idle: ±1.5° yaw drift on a sine, and a soft pulsing red glow on the seam strip, so the object reads as "alive" and clickable without any text prompt.
- Cursor becomes `pointer` over the closed flaps.
- Click/tap → both flaps spring open (`@react-spring/three`, config roughly `{ tension: 170, friction: 22 }`, right flap delayed ~60ms behind the left so it doesn't look mechanical-symmetrical) → screen boots (§7).
- Opening is idempotent; clicking again while open does nothing.

### Closing

- The close button on the lower right flap closes the console. `Escape` also closes it.
- Closing reverses the flap springs and powers down the screen. Firmware state (selected section and index) is **preserved**, so reopening returns to where the visitor was.

### Drag-to-rotate

- `onPointerDown` on any `chassis` mesh begins a drag.
- Pointer delta maps to rotation: X delta → `rotation.y`, Y delta → `rotation.x`.
- **Clamp** to ±22° yaw, ±14° pitch. Never let it spin freely — it's a display object, not a model viewer.
- Slight damping while dragging so it feels weighted.
- `onPointerUp` / `onPointerLeave` / `onPointerCancel` → spring back to identity rotation, config `{ tension: 120, friction: 18 }`, gentle overshoot.
- Drags starting on `interactive` meshes do **not** rotate the model.
- Distinguish tap from drag with a movement threshold (~6px) so a slightly-shaky tap on a flap still opens it.
- On touch, do not preempt vertical page scroll — but since the page doesn't scroll, `touch-action: none` on the canvas is correct here.

### Joystick

The joystick and the arrow keys are **the same input, bidirectionally mirrored**:

- Pressing `ArrowLeft/Right/Up/Down` **visually tilts the joystick** in that direction, and releases it on keyup. This is the "one-to-one mapping" — the physical control animates to reflect keyboard input.
- Dragging the joystick with pointer emits the same navigation events the arrow keys do.
- Drag is constrained to a circle (max tilt ~18°), with a deadzone of ~25% of radius.
- Direction is quantised to 4-way. Holding past the threshold triggers an initial move, then repeats every 180ms (standard key-repeat feel).
- Release → springs back to centre.

### ABXY buttons

- Diamond layout. **A** right, **B** bottom, **X** top, **Y** left (Nintendo layout — confirm with Yash, see Open Items).
- Each button is bound to a `socialLink` document via its `buttonSlot` field, so the mapping is CMS-driven, not hard-coded.
- Press: the button mesh depresses ~1.5mm on a fast spring, plus a brief red rim flash, then opens the URL in a new tab (`rel="noopener noreferrer"`).
- Keyboard equivalents: `A`, `B`, `X`, `Y` keys, and `Tab`-focusable with a visible focus ring rendered in 3D (a red outline ring around the button).
- Glyphs are black brand marks on off-white caps. Keep them legible at the smallest breakpoint — if a mark is illegible below ~28px, simplify the path rather than shrinking it.

### Power slider (light/dark)

- Horizontal slider on the body's lower bezel, DS-style: a small nub in a recessed track with a red-painted channel.
- Drag or click to toggle. Nub travels ~60% of its housing width with a firm, short spring — it should feel like a detent, not a smooth fade.
- Toggling flips the **screen theme only**. The chassis materials are unchanged.
- Persist the choice in `localStorage`; initialise from `prefers-color-scheme` on first visit.
- Add a tiny red LED next to the track that is lit in dark mode and dim in light mode.

---

## 6. Responsive behaviour

Three modes, driven by `matchMedia` and viewport aspect:

**Desktop (≥1024px)** — as described. Whole console visible, flaps in frame, all physical controls usable.

**Tablet (640–1023px)** — same as desktop with the camera zoomed slightly tighter; flap contents scale but stay in frame.

**Mobile (<640px)** — this is the important divergence:

- **Closed:** identical behaviour. The whole console is visible, centred, tappable. It must look good here — this is what most people will see first.
- **On open:** the camera springs to a much tighter zoom framed on the **screen**, which fills roughly 92% of the viewport width. The flaps swing open and are **allowed to clip out of the frustum** — do not try to fit them.
- Because the flap controls are now off-screen, render a **DOM control overlay** on top of the canvas:
  - A D-pad (or a compact virtual joystick) bottom-left.
  - ABXY cluster bottom-right, same glyphs, same bindings.
  - A CV download button.
  - A theme toggle.
  - A **close button**, positioned bottom-right, corresponding to the physical one on the right flap.
- The overlay must respect `env(safe-area-inset-*)`.
- Overlay controls are DOM buttons styled to match the physical ones — same off-white caps, black glyphs, red press state — so the language is continuous.
- Drag-to-rotate is **disabled** on mobile while open (the console is off-frame; rotating it is meaningless and steals touch events from the screen UI). It remains active while closed.
- On mobile, the firmware UI renders as a **fullscreen DOM layer** rather than through drei's `<Html transform>` — sharper text, far better performance, native scrolling and hit-testing. Same React component tree, different mount point.

---

## 7. The screen: how the firmware is rendered

Build the firmware as a **single self-contained React component tree** (`<Firmware />`) that has no knowledge of whether it's in 3D or not. Mount it two ways:

- **Desktop/tablet:** inside drei `<Html transform occlude="blending" />` positioned and scaled to sit exactly on the screen plane. Real DOM in 3D space: crisp text, working links, real focus management, screen-reader accessible.
- **Mobile (open):** as a normal fixed-position DOM overlay.

Everything else — state, routing between sections, animations — is shared. One implementation, two mounts.

### Boot sequence

On open, the screen plays a short (~900ms) power-on:

1. Black → a single horizontal scanline expands vertically (CRT-style), ~180ms.
2. A brief firmware header renders — a small mark, the version string, and the name — then wipes.
3. The Library section fades in with the About tile focused.

Under `prefers-reduced-motion: reduce`, skip straight to step 3. Never make the boot sequence blocking — content must be interactive the moment it appears, and reopening the console should **not** replay the boot in full (use a 250ms short-form instead).

### Screen chrome (persistent status bar)

A thin bar across the top of the screen, always present:

- Left: current section name (`LIBRARY` / `TIMELINE`).
- Centre: nothing, or a small firmware mark.
- Right: a clock (`HH:MM`, visitor's local time), rendered in mono.

Caps are acceptable here because this is diegetic console chrome, not a typographic eyebrow label. Do not use caps labels anywhere else.

---

## 8. Navigation model and state machine

One Zustand store, `useConsole`:

```ts
type Section = 'library' | 'timeline'

interface ConsoleState {
  isOpen: boolean
  isBooting: boolean
  theme: 'dark' | 'light'
  section: Section
  libraryIndex: number // 0 = About tile, 1..n = projects
  timelineIndex: number
  isDetailOpen: boolean // expanded project view
  rotation: {x: number; y: number}
}
```

### The rails

There are two horizontal rails stacked vertically. This is the PS5 model:

```
 ┌─────────────────────────────────────────────────────────┐
 │ LIBRARY                                             14:32 │
 ├─────────────────────────────────────────────────────────┤
 │                                                         │
 │   ┌──────┐  ┌────────────┐  ┌──────┐  ┌──────┐          │
 │   │ABOUT │  │  PROJECT   │  │ PROJ │  │ PROJ │   →      │
 │   │      │  │  SELECTED  │  │      │  │      │          │
 │   └──────┘  │  (larger)  │  └──────┘  └──────┘          │
 │             └────────────┘                              │
 │             Hollow Reach                                │
 │             A co-op extraction shooter built in Unity   │
 │             with custom netcode and 12-player lobbies.  │
 │                                                         │
 │   ▾  timeline                                           │
 └─────────────────────────────────────────────────────────┘
```

- **Library rail:** index 0 is the **About tile** (visually distinct — no cover art, just the headline and the short about body). Indices 1..n are projects ordered by the `order` field. Moving right from About enters the games. This is why About "prompts you to go across" — it is literally the leftmost item in the same rail.
- **Timeline rail:** a single horizontal line of dots, most recent on the left, scrolling right into the past — work first, then education. Year/month above each dot, organisation name below. The selected dot expands: larger, red-filled, and a detail panel appears showing role, dates, summary, highlights, and (for education) the result. Linked projects appear as small chips that jump back to the Library rail.

### Input mapping

| Input                                               | Action                                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `←` / `→`, joystick left/right, D-pad left/right    | Move selection within the current rail                                                                       |
| `↓` / `→` on the Nintendo joystick down, D-pad down | Go to the next section (Library → Timeline)                                                                  |
| `↑`                                                 | Go to the previous section (Timeline → Library)                                                              |
| Mouse wheel / trackpad **vertical** scroll          | Move selection **horizontally** within the current rail (this is the "scroll down to move across" behaviour) |
| Trackpad horizontal scroll                          | Same as ←/→                                                                                                  |
| Touch swipe left/right on the screen                | Move within rail                                                                                             |
| Touch swipe up/down on the screen                   | Change section                                                                                               |
| `Enter` / `Space`                                   | Open the selected item's detail view                                                                         |
| `Escape`                                            | Close detail view; if none open, close the console                                                           |
| `A`,`B`,`X`,`Y`                                     | Fire the corresponding social link                                                                           |
| `Tab` / `Shift+Tab`                                 | Standard DOM focus order through all interactive elements                                                    |

Wheel input must be **debounced and quantised** — one notch of a mouse wheel moves one tile, and a trackpad's inertial flick must not skip eight projects. Accumulate delta, fire on threshold, then lock for ~120ms.

### Motion

Selection changes animate the rail with a spring, not a linear tween. The selected tile scales to ~1.18× with a slight lift; unselected tiles sit at 1.0 with reduced opacity (~0.55) and desaturated covers. The description text below crossfades. Keep the whole transition under 320ms — this is a menu, and menus that feel slow feel broken.

---

## 9. Theme

Two screen themes. Both must feel like a real display, not a website with a dark mode.

**Dark** (default)

- Screen background `#0A0F12`
- Foreground `#E9F0F1`
- Muted `#7C8B90`
- Selection / accent `#E12B38`
- A faint scanline overlay at ~3% opacity, plus a very subtle vignette. Not a heavy CRT filter — a hint.

**Light**

- Screen background `#EDEAE2` (warm paper-white, not `#FFF` — it reads as a backlit LCD)
- Foreground `#141819`
- Muted `#6B6F70`
- Selection / accent `#C41C29` (slightly deeper red for contrast on light)
- Scanline drops to ~1.5%.

Both themes must pass **WCAG AA (4.5:1)** for body text and 3:1 for large text. Check this, don't assume it.

Implement as CSS custom properties on a wrapper element; the toggle swaps a class. Do not use Tailwind's `dark:` variant driven by the OS — the power slider is the source of truth once the user touches it.

---

## 10. Typography and visual voice

Two families, both via `next/font`:

- **Archivo** (variable) — all UI and display. Use the width axis: expanded for section headers and project titles, normal for body. Its slightly condensed, industrial character suits console chrome without being a "gamer font".
- **Martian Mono** — data only: the clock, years, dates, tech tags, version strings. Its distinctive shape makes numeric chrome read as _instrument readout_.

Do not add a third family. Do not use Inter.

Type scale: set a clear modular scale and stick to it. Project titles are the largest thing on the screen; everything else is quiet. Line length under 65 characters inside the screen.

**Avoid these**, they are the visual tells of a generated page: accenting one word of a headline in a different colour; caps labels above every block (the status bar is the sole exception, because it's diegetic); numbered `01 / 02 / 03` markers on anything that isn't genuinely a sequence (the timeline is a sequence, so numbering _there_ is legitimate — the project rail is not); identical rounded cards with identical soft grey shadows; a `→` glued onto every link.

Spend the boldness in one place: **the console object itself is the hero.** The screen UI should be quiet, precise, and legible — a good firmware, not a second show.

### Copy

There is no marketing copy on this site. Every string either names something or describes it plainly. Buttons say what happens: "Download CV", not "Get in touch ↗". Empty and loading states are directional, not apologetic — a loading screen says `LOADING LIBRARY`, not "Please wait while we fetch your content".

---

## 11. Accessibility, SEO, and fallbacks

This site is a canvas. Without deliberate work it is invisible to Google and unusable with a screen reader. That is unacceptable for a job-hunting portfolio. Required:

1. **Server-rendered semantic content.** Render the full portfolio — `<h1>Yash Punia</h1>`, the title, the about text, every project with its blurb and links, every timeline entry — into real HTML inside a visually-hidden landmark (`.sr-only`, not `display:none`, not `hidden`). Crawlers and screen readers get the whole site; sighted users see only the console. This satisfies "no text outside the console" visually while keeping the page real.
2. **`<noscript>`** renders that same content unhidden, with plain styling.
3. **WebGL fallback.** Detect WebGL support and low-power/failed contexts. If 3D can't run, render a styled 2D version of the firmware UI directly — same components, no canvas. Never show a blank page.
4. **Keyboard-complete.** Every action reachable without a pointer. Visible focus indicators everywhere, including the 3D buttons (render a red focus ring mesh).
5. **`prefers-reduced-motion`:** disable the idle drift, the boot animation, the flap spring (open instantly), and reduce rail transitions to a fast crossfade. Do not disable _all_ motion — motion that shows what changed is still helpful.
6. **ARIA:** the firmware is a `role="application"` region with a live region announcing section and selection changes. Project tiles are buttons with accessible names.
7. **Metadata:** Next.js Metadata API — title, description, canonical, Open Graph, Twitter card. Generate a static OG image (or `next/og`) showing the open console. Add **JSON-LD `Person` schema** with `jobTitle`, `sameAs` (all four socials), and `knowsAbout`.
8. **`sitemap.ts`** and **`robots.ts`**.

---

## 12. Performance budget

Hold these. Measure with Lighthouse and the Chrome DevTools MCP performance trace, don't guess.

- **LCP < 2.0s** on a simulated Moto G4 / Slow 4G.
- **CLS < 0.05.** The canvas must reserve its space.
- **Initial JS < 200KB gzipped** excluding the three.js chunk.
- three.js and the scene are **dynamically imported** with `next/dynamic` and `ssr: false`, behind a `<Suspense>` boundary showing a minimal skeleton of the closed console silhouette.
- `dpr={[1, 2]}` on the canvas — never render above 2×.
- `frameloop="demand"` when the console is closed and idle-animation is disabled; `"always"` while animating.
- Project cover images go through the Sanity image CDN via `next/image` with explicit sizes, `blurDataURL` from Sanity's LQIP, and `priority` only on the first two rail items.
- Import three.js modules individually. Never `import * as THREE`.
- Dispose geometries, materials, and textures on unmount.
- Run `@next/bundle-analyzer` before the final deploy and report the top five chunks.

---

## 13. Build phases

Stop at every checkpoint and report.

**Phase 0 — Scaffold.** Next.js + TS + Tailwind v4 + pnpm. ESLint + Prettier. Sanity project init, Studio at `/studio`, all schemas from §3 with validation. Create the `siteSettings` singleton and the four `socialLink` documents using the exact values in §3.1 — **no project or timeline documents**. TypeGen wired into the build.
_Checkpoint:_ `/studio` loads with all four document types available and correctly labelled for a non-technical editor; `pnpm build` passes clean against an empty project and timeline dataset; typed GROQ queries return the settings and the four links.

**Phase 1 — Static console.** Orthographic scene, procedural closed console, materials from §4, lighting, contact shadow, responsive camera zoom. No interaction yet.
_Checkpoint:_ Screenshot at 1440px and 390px. It should already look like an object worth clicking.

**Phase 2 — Open/close and flaps.** Flap hinges and springs, open on click, close button, `Escape`, boot-free black screen plane, idle drift, reduced-motion handling.
_Checkpoint:_ Screenshots of closed, mid-open, and fully open at both widths.

**Phase 3 — Physical controls.** Joystick with two-way arrow-key mirroring, ABXY with CMS-driven links and press animation, power slider, CV download button, info monitor. Drag-to-rotate with clamping and snap-back.
_Checkpoint:_ Every control demonstrably works; describe how each was verified.

**Phase 4 — Firmware: Library.** `<Firmware />` component, `<Html transform>` mount, status bar, clock, boot sequence, About tile, project rail with spring selection, detail view. All input mappings from §8.
_Checkpoint:_ Rail navigable by keyboard, joystick, and wheel. Screenshots of three selection states.

**Phase 5 — Firmware: Timeline.** Horizontal dot timeline, section switching, selected-entry detail panel, linked-project chips.
_Checkpoint:_ Both sections reachable and navigable.

**Phase 6 — Mobile.** Camera zoom-to-screen on open, flap clipping, DOM control overlay, fullscreen firmware mount, safe areas, touch gestures.
_Checkpoint:_ Screenshots at 390×844 and 430×932, closed and open.

**Phase 7 — Themes and polish.** Both screen themes, contrast audit, persistence, scanlines, all micro-interactions, sound design hooks (see Open Items).
_Checkpoint:_ Contrast ratios reported as numbers.

**Phase 8 — A11y, SEO, perf.** Everything in §11 and §12. Lighthouse run. Bundle analysis.
_Checkpoint:_ Lighthouse scores and bundle report pasted into `NOTES.md`.

**Phase 9 — Deploy.** Vercel, env vars, Sanity webhook revalidation, draft mode, custom domain, OG image.
_Checkpoint:_ Live URL, and a demonstrated content edit in Sanity appearing on the live site without a redeploy.

---

## 14. Deployment

- Deploy to **Vercel** from GitHub. Preview deploys on every PR.
- Environment variables (set in Vercel for Production, Preview, and Development):

```
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=
SANITY_API_READ_TOKEN=          # server-only, for draft mode
SANITY_REVALIDATE_SECRET=       # server-only, webhook signature
```

- `.env.example` committed with keys and empty values. `.env.local` gitignored.
- Sanity webhook → `POST https://<domain>/api/revalidate` with the secret, filtered to the three document types.
- Add `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` headers in `next.config.ts`.
- Resume: commit `public/resume.pdf` as the fallback and prefer `siteSettings.resumeFile` when present. The download button uses the `download` attribute with a sensible filename (`Yash-Punia-Gameplay-Programmer.pdf`).

---

## 15. Definition of done

- [ ] Zero TypeScript errors, zero ESLint errors, zero console warnings in the browser.
- [ ] Every string on screen originates from Sanity (no hard-coded content).
- [ ] Works on Chrome, Safari, Firefox, iOS Safari, and Chrome Android.
- [ ] Full keyboard traversal of every feature.
- [ ] Screen reader reads the complete portfolio.
- [ ] Lighthouse: Performance ≥ 90, Accessibility 100, Best Practices ≥ 95, SEO 100.
- [ ] No layout shift on load.
- [ ] `README.md` covers local setup, how to add a project in Sanity, and how to deploy.
- [ ] `NOTES.md` documents all decisions and known limitations.

---

## 16. Open items — confirm before Phase 4

These affect content and mapping and cannot be guessed:

1. **Rail order.** Confirm that About sits at position 0 of the same rail as the projects, rather than being a separate screen above them.
2. **Sound.** Should the console have audio — a click on open, a tick on selection change, a soft boot chime? Default: build the hooks, ship it muted, with a mute toggle. Confirm.
3. **Detail view.** When `Enter` is pressed on a project, does the screen show an expanded panel in place, or does it stay a single-screen rail with no drill-down? Default: expanded in-place panel.
4. **Firmware version string.** A small joke in the status bar, e.g. `YP-OS 1.0`. Confirm the text.
