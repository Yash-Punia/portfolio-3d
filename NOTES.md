# NOTES

Running log of decisions, dead ends, and known issues. Updated at every phase checkpoint.

## Phase 0 — Scaffold

### Versions installed

| Package                            | Version |
| ---------------------------------- | ------- |
| next                               | 16.3.4  |
| react / react-dom                  | 19.2.8  |
| tailwindcss / @tailwindcss/postcss | 4.3.3   |
| typescript                         | 5.9.3   |
| sanity                             | 6.12.0  |
| next-sanity                        | 13.3.4  |
| @sanity/client                     | 8.4.0   |
| @sanity/image-url                  | 2.1.1   |
| @sanity/icons                      | 5.2.1   |
| eslint                             | 9.39.5  |
| prettier                           | 3.9.6   |
| pnpm                               | 11.25.0 |

Docs for next-sanity, Sanity TypeGen and Tailwind v4 were pulled through Context7 before any
code was written (SPEC §2), and Next 16's own bundled docs under `node_modules/next/dist/docs/`
were read for the caching model.

### Decisions

- **No `src/` directory.** SPEC §3 names `sanity/schemaTypes/`; the layout matches the spec
  literally. App Router lives at `app/`, alias `@/*` maps to the repo root.
- **Legacy caching model, not Cache Components.** Next 16 ships `cacheComponents` (`use cache`,
  `cacheTag`, `updateTag`) and next-sanity's newest guidance is built around `defineLive`. SPEC §3
  explicitly locks tag-based `fetch` caching plus `revalidateTag`, so that is what is wired.
  Next 16 documents the model as "Caching and Revalidating (Previous Model)" and still supports it.
- **`cache: 'force-cache'` is passed alongside `next: { tags }`.** In Next 16 `fetch` is no longer
  cached by default, so the spec's `{ next: { tags: [...] } }` alone would tag a request that is
  never cached and `revalidateTag` would have nothing to invalidate. This is an addition to the
  spec's snippet, not a departure from its intent.
- **`aboutHeadline` is optional, not required.** SPEC §3 lists it as required, but §3.1 says it is
  not yet supplied and must be left empty, and §3.2 requires the About tile to render without it.
  A `required()` rule would block publishing `siteSettings` at all. Max length 60 is enforced.
  Flip it to required once Yash supplies a headline.
- **`siteSettings` is a true singleton**: fixed document id `siteSettings`, removed from the global
  create menu and from initial-value templates, reachable only through its own structure item.
- **`socialLink` uniqueness on `platform` and `buttonSlot`** is enforced with an async custom
  validator that queries for a sibling document holding the same value (ignoring the draft/published
  pair of the document being edited). Sanity has no built-in cross-document unique constraint.
- **`@sanity/icons` and `@sanity/client` added as direct dependencies.** Both were already in the
  tree transitively, but pnpm's strict `node_modules` means schema files importing icons fail to
  resolve during `sanity schema extract`, and the TypeGen module augmentation
  (`declare module '@sanity/client'`) does not type-check unless the package is a direct dependency.
  Without the latter, `client.fetch()` results silently degrade to `any`.
- **Phase 0 installs no 3D dependencies.** three, R3F, drei, react-spring, motion and zustand land
  in the phase that first needs them.
- **No fonts loaded yet.** The scaffold's Geist/Geist Mono were removed — SPEC §10 allows only
  Archivo and Martian Mono, which arrive with the firmware UI in Phase 4.
- **`app/page.tsx` is a plain typed-GROQ readout**, not a design. It proves the Sanity round-trip
  for this checkpoint and becomes the visually-hidden semantic landmark required by SPEC §11.1 in
  Phase 8. It renders no string it was not given.

### Verified

- `pnpm typegen` — `sanity schema extract` runs entirely locally (no network, no auth) and emits
  `schema.json`; `sanity typegen generate` produces `sanity.types.ts` with 18 schema types and
  both query result types. Neither artifact contains the project id, so wiring `typegen` into
  `build` is safe on Vercel.
- `pnpm typecheck` — clean under `strict` + `noUncheckedIndexedAccess` + `noImplicitOverride`.
  No `any`, no `@ts-ignore` in the tree.
- `pnpm lint` — clean.
- `pnpm format` — clean.
- Typed GROQ: `SiteSettingsQueryResult` and `SocialLinksQueryResult` are generated from the
  queries in `sanity/lib/queries.ts` and applied automatically at the `client.fetch()` call site.

### Known issues / open risks

- **Blocked on Sanity login.** The Sanity project has not been created yet: `sanity login` needs an
  interactive browser flow. Until then there is no `.env.local`, so `pnpm build`, `pnpm dev` and
  `/studio` cannot run — `sanity/env.ts` throws by design rather than failing later with a confusing 404. Remaining Phase 0 checkpoint items: `/studio` visual verification, validation-rule screenshots,
  an empty-dataset `pnpm build`, and Yash entering the §3.1 values.
- `pnpm peers check` reports one unmet peer inside Sanity's own tree
  (`@sanity/workbench@0.1.0-alpha.24` wants `@sanity/sdk@^2.9.0`, installed 3.0.0). Upstream, not
  ours; nothing in this project imports either package.
- Prettier reformatted `SPEC.md` on its first run (table padding only — no content changed).
  `SPEC.md` is now in `.prettierignore` so the spec stays as authored.
- `corepack enable pnpm` needs an elevated shell on this machine (`EPERM` writing to
  `C:\Program Files\nodejs`). pnpm 11.25.0 was installed with `npm i -g pnpm` instead, landing in
  `%APPDATA%\npm`.

### Phase 0 follow-up — after Sanity login

Reusing the existing Sanity project **`yash-punia` (24ye8s9j)** rather than creating a new one. Its
`production` dataset held only Sanity's own system documents (`system.group`, `system.retention`),
so there was nothing to collide with. `.env.local` points at it; `http://localhost:3000` was added
to the project's CORS allowlist with credentials (it previously only allowed `localhost:3333`).

Three real bugs surfaced and were fixed:

1. **`sanity schema extract` refuses to overwrite `schema.json`.** The build script needed
   `--force`, otherwise every build after the first failed with
   `Schema file already exists`. Would have broken the first Vercel rebuild.
2. **`@sanity/icons` v5 is types/runtime mismatched.** Its `.d.ts` declares every icon as a named
   export, but the runtime root module only exports `Icon` and a lazy `icons` map — individual icons
   moved to subpath exports. `tsc` passed, the bundle failed. Icons were polish, not requirement, so
   the dependency was removed rather than worked around; the Studio uses default document icons.
3. **`@sanity/workbench` breaks `next dev`.** This transitive alpha dependency of `sanity` 6.12 maps
   its `development` export condition at raw TypeScript source, which Turbopack refuses to load from
   `node_modules` (`Error: Unknown module type`). Production resolves `default` → `dist` and was
   unaffected, so `pnpm build` passed while `/studio` 500'd in dev. Fixed with
   `transpilePackages: ['@sanity/workbench']` in `next.config.ts`. Revisit when `sanity` ships a
   stable workbench.

Verified after the fixes:

- `pnpm build` — clean against the empty dataset. Three routes, all prerendered static:
  `/`, `/_not-found`, `/studio/[[...tool]]`.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` — all clean.
- `/studio` loads in the browser, authenticates against project 24ye8s9j, shows the workspace title
  "Yash Punia — Portfolio". Zero console errors in a fresh tab.
- `/` renders as an empty document against the empty dataset — no placeholder copy, no errors, no
  invented strings. This is the SPEC §3.2 zero-data case for the page shell.

Still open at the end of Phase 0:

- **Studio logged-in verification is Yash's to do** — signing in means entering credentials, which
  is out of scope for the agent. Needs a look at: all four types listed and human-labelled,
  `siteSettings` behaving as a singleton (no create button, no list), and the `aboutBody` (320) /
  `blurb` (90–200) / `socialLink` uniqueness rules firing.
- **The §3.1 values are not entered yet** — `siteSettings` and the four `socialLink` documents.
  Until then the typed GROQ queries return `null` and `[]`, which is the correct empty-state result
  but does not prove the populated path.
- **Chrome is not installed on this machine**, so the Chrome DevTools MCP cannot launch. Visual
  verification used the in-app browser instead. Phase 8's Lighthouse run and performance traces will
  need Chrome installed.
