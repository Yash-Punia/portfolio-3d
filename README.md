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

| Script                              | What it does                                        |
| ----------------------------------- | --------------------------------------------------- |
| `pnpm dev`                          | Dev server                                          |
| `pnpm build`                        | Regenerates Sanity types, then builds               |
| `pnpm typegen`                      | `sanity schema extract` + `sanity typegen generate` |
| `pnpm typecheck`                    | `tsc --noEmit`                                      |
| `pnpm lint`                         | ESLint                                              |
| `pnpm format` / `pnpm format:check` | Prettier                                            |

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

**Live: https://portfolio-3d-five-inky.vercel.app**

Vercel, from GitHub, as the project `yashpunias-projects/portfolio-3d`. Every push to `main` becomes
production; every pull request gets its own preview URL.

Steps 1, 2 and part of 4 are already done — they are written down because a project gets rebuilt,
moved or handed over, and because steps 3, 5 and 6 are still open.

### 1. Create the Vercel project — done

Import `Yash-Punia/portfolio-3d` at [vercel.com/new](https://vercel.com/new). The framework, the
build command and the output are all detected — nothing to configure.

### 2. Set the environment variables — the four below are set

In **Settings → Environment Variables**, add every key from `.env.example` to **Production**,
**Preview** and **Development**:

| Variable                         | Value                                                                |
| -------------------------------- | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`           | The site's own origin, e.g. `https://yashpunia.com`, no trailing `/` |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`  | From `.env.local`                                                    |
| `NEXT_PUBLIC_SANITY_DATASET`     | `production`                                                         |
| `NEXT_PUBLIC_SANITY_API_VERSION` | From `.env.local`                                                    |
| `SANITY_API_READ_TOKEN`          | A **Viewer** token from sanity.io/manage → API → Tokens              |
| `SANITY_REVALIDATE_SECRET`       | A long random string you invent; used by the webhook and by previews |

`NEXT_PUBLIC_SITE_URL` is baked in at build time, so changing it needs a redeploy. The two
server-only secrets are read at request time, but an environment change only reaches a **new**
deployment, so they need one too.

`NEXT_PUBLIC_SITE_URL` is deliberately **not** set: with it empty the site falls back to Vercel's own
production URL, which is correct until there is a custom domain (step 6). `SANITY_API_READ_TOKEN` is
not set either — only draft previews need it.

### 3. Let the Studio talk to Sanity — still to do

In [sanity.io/manage](https://sanity.io/manage) → your project → **API → CORS origins**, add your
production domain with **Allow credentials** ticked. Without it `/studio` loads but cannot sign in.
Add preview domains the same way if you want to edit from a preview deploy.

### 4. Publishing without a redeploy — secret set, webhook still to create

In sanity.io/manage → **API → Webhooks**, create a webhook:

- **URL** — `https://portfolio-3d-five-inky.vercel.app/api/revalidate`
- **Dataset** — `production`
- **Trigger on** — Create, Update, Delete
- **Filter** — `_type in ["siteSettings", "socialLink", "project", "timelineEntry"]`
- **Projection** — `{_type}`
- **HTTP method** — `POST`
- **Secret** — the value of `SANITY_REVALIDATE_SECRET`, revealed in Vercel → Settings → Environment Variables

Publish anything in the Studio and the change is live on the next page load. Nothing rebuilds.

### 5. Previewing unpublished work — works now

Open `https://portfolio-3d-five-inky.vercel.app/api/draft?secret=<SANITY_REVALIDATE_SECRET>`. The site then shows your
unpublished edits, with a yellow banner saying so; the banner is also the way out. The preview lives
in a cookie in your browser and nobody else sees it.

### 6. Custom domain — still to do

**Settings → Domains** in Vercel, then follow its DNS instructions. Afterwards update
`NEXT_PUBLIC_SITE_URL` and redeploy, add the domain as a Sanity CORS origin, and point the webhook
at it.
