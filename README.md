# Pressure Systems Website

This repository is the public website codebase for Pressure Systems.

It is intentionally narrow in scope:

- Pressure Systems parent-site homepage
- Pressure Systems audit entry path
- LiftIQ product route set under `/liftiq/`
- privacy, metadata, assets, and static deployment configuration

It is not the wider business workspace. Strategy notes, prospect research, operations documents, and archived material stay outside this repo on purpose.

## What this repo is for

Pressure Systems is the parent commercial surface.

The homepage qualifies the right businesses into a Pressure Systems Audit:

- trust repair
- structural website cleanup
- governed next-step scoping

LiftIQ sits inside this same site as the first product track:

- parent brand: Pressure Systems
- flagship product path: LiftIQ
- product stage: governed concept demo and early design-partner conversations

This repo exists to keep that public surface:

- deployable
- honest
- easy to review
- separate from the broader operating system behind it

## Current truth snapshot

As of the current `main` branch:

- this is a static site repo with no framework build step
- GitHub is connected to a Vercel project named `pressuresystems`
- `main` is the production deployment branch
- the site includes the Pressure Systems homepage plus LiftIQ child routes
- the main Pressure Systems audit form submits to the live Formspree endpoint defined in `site-config.js`
- LiftIQ routes use their own existing contact paths and truthful product-stage language

Important deployment note:

- the Vercel project is live and production deploys exist
- custom domains are attached in Vercel
- do not assume DNS is fully cut over without checking the current domain state directly

## Product and brand relationship

This repo should preserve the following hierarchy:

- Pressure Systems is the parent identity and commercial front door
- the Pressure Systems Audit is the lead offer on the homepage
- LiftIQ is the first serious product track under Pressure Systems
- LiftIQ should be presented as real, promising, and bounded
- LiftIQ should not be presented as mature enterprise software if that is not yet true

In practice, that means:

- no inflated claims
- no fake case studies
- no invented integrations
- no production-software theatre
- no parent-brand confusion between Pressure Systems and LiftIQ

## Route map

Current public surface in this repo:

- `/`
- `/privacy-policy.html`
- `/liftiq/`
- `/liftiq/how-it-works/`
- `/liftiq/modules/`
- `/liftiq/design-partner/`
- `/liftiq/contact/`
- `/liftiq/dispatch-blind-spot-diagnostic/`
- `/liftiq/executive-briefing/`
- `/liftiq/sample-preview/`

Canonical public URLs are authored against `https://pressuresystems.au/`, but deployment verification should always confirm what host is currently serving the latest production build.

## Stack

This site is intentionally simple:

- HTML
- CSS
- vanilla JavaScript
- static assets
- Vercel static deployment

Notable implementation details:

- no package.json
- no framework runtime
- no bundler requirement
- no server-side rendering
- no database dependency
- security headers configured in `vercel.json`
- site-level config exposed through `site-config.js`

Typography currently relies on hosted Google Fonts plus system fallbacks:

- IBM Plex Sans
- IBM Plex Serif
- IBM Plex Mono

## Repo structure

```text
pressure-systems-site/
|- index.html
|- styles.css
|- script.js
|- site-config.js
|- vercel.json
|- privacy-policy.html
|- robots.txt
|- sitemap.xml
|- site.webmanifest
|- assets/
|  |- css/
|  |- js/
|  |- logos/
|  |- social/
|- liftiq/
|  |- index.html
|  |- how-it-works/
|  |- modules/
|  |- design-partner/
|  |- contact/
|  |- dispatch-blind-spot-diagnostic/
|  |- executive-briefing/
|  |- sample-preview/
```

## Local development

Because the site is static, local review is straightforward.

Quick options:

1. Open `index.html` directly in a browser for a rough visual pass.
2. Use a simple static server for better route testing.

Examples:

```powershell
python -m http.server 4173
```

or

```powershell
npx http-server -p 4173 -c-1 .
```

Then open:

- `http://127.0.0.1:4173/`
- `http://127.0.0.1:4173/liftiq/`

Use a static server whenever you need to verify route behavior, assets, metadata, or browser interactions more realistically.

## Forms and lead capture

### Pressure Systems homepage audit form

Controlled by:

- `site-config.js`
- `script.js`

Current live behavior:

- `formEndpoint` is set in `site-config.js`
- the homepage form submits directly to Formspree
- direct email remains available as a fallback contact path, not the default submission path

If the endpoint changes later:

1. update `formEndpoint` in `site-config.js`
2. redeploy
3. verify both success and failure states in browser

### LiftIQ routes

LiftIQ pages already carry their own contact paths and should be treated as product-specific surfaces under the Pressure Systems parent brand.

## Deployment workflow

Current deployment shape:

- GitHub repo: `ThePressureAcademy/pressuresystems`
- Vercel project: `pressuresystems`
- production branch: `main`

Operational expectation:

1. branch from `main`
2. make focused changes
3. open a PR
4. verify the Vercel preview
5. merge to `main`
6. confirm the production deployment and target domain behavior

Do not treat a green preview as proof that the custom domain is serving the same thing. Check the live host explicitly when domain state matters.

## Editing rules for this repo

Keep the repo disciplined.

Allowed:

- public-site code
- route content
- metadata
- assets required by the site
- deployment configuration directly tied to this site

Do not add:

- prospect lists
- outreach notes
- private operating documents
- workshop notes
- strategy archives
- random experiments unrelated to the public surface

## Brand and UX rules

This site should feel:

- operator-grade
- calm
- structured
- high-trust
- commercially serious

This site should not feel:

- generic SaaS
- inflated enterprise theatre
- vague innovation language
- agency fluff
- over-claimed product marketing

For LiftIQ specifically:

- keep the product boundary honest
- preserve the read-first, governed-demo framing if that remains true
- do not imply live integrations or production deployment if they do not exist

## Branch and PR expectations

Default branch policy:

- branch from `main`
- use focused, descriptive branch names
- keep PRs narrow enough to review properly

Good examples:

- `codex/pressuresystems-readme-overhaul`
- `codex/liftiq-metadata-fix`
- `codex/homepage-proof-tightening`

Every PR should state:

- what changed
- why it changed
- what was validated
- any truth/risk boundaries still in play

## Related documentation outside the repo

The wider Pressure Systems workspace includes supporting documents that are useful for orientation, but they are not part of the deployable repo.

Useful adjacent references in the parent workspace include:

- `website/repo-rationale.md`
- `website/deployment-readiness.md`
- `website/funnel-architecture.md`
- `operations/PRESSURE_SYSTEMS_DEPLOYMENT_LOG_v1.md`
- `operations/LIFTIQ_PRESSURE_SYSTEMS_MIGRATION_LOG_v1.md`

Treat those as supporting context, not as a substitute for keeping this repo truthful on its own.

## Known realities

This repo is strong when it stays honest about what it is:

- a serious static public site
- a parent brand surface for Pressure Systems
- a controlled product surface for LiftIQ
- a clean GitHub-to-Vercel deployment chain

It is weak when it drifts into:

- overbuilt architecture
- stale documentation
- product overclaim
- blurred parent/product identity

Keep it simple. Keep it true. Keep it deployable.
