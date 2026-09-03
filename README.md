# portfolio-3d

Portfolio site for Yash Punia, Gameplay Programmer. The entire interface is a 3D handheld console;
all content is authored in Sanity. See [SPEC.md](SPEC.md) for the build spec and
[NOTES.md](NOTES.md) for decisions and known issues.

## Local setup

```bash
pnpm install
```

Copy `.env.example` to `.env.local` and fill in the Sanity project id. Then:

```bash
pnpm dev
```

- Site: http://localhost:3000
- Studio: http://localhost:3000/studio

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` | Regenerates Sanity types, then builds |
| `pnpm typegen` | `sanity schema extract` + `sanity typegen generate` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm format` / `pnpm format:check` | Prettier |

`sanity.types.ts` and `schema.json` are generated and committed. Never edit them by hand — change
the schema or the query and re-run `pnpm typegen`.

## Adding content

Everything on screen comes from Sanity. Open `/studio` and sign in.

- **Site settings** — your name, job title, status line, the About text (max 320 characters), and
  the resume PDF. There is only one of these.
- **Projects** — one per game. `Position in the library` orders them; 1 sits next to the About
  tile. `Short description` must be 90–200 characters. A landscape cover image of at least
  1200×675 is required.
- **Timeline** — jobs and qualifications. Dates are month + year. Link projects you worked on and
  they appear as chips on the entry.
- **Social links** — four of them, one per console button (A, B, X, Y). Each platform and each
  button can only be used once.

Publish to make a change live. Nothing needs a redeploy.

## Deploy

Vercel, from GitHub. Set the variables from `.env.example` for Production, Preview and Development.
Full deployment steps land in Phase 9.
