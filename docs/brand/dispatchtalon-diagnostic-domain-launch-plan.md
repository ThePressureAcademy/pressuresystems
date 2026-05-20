# DispatchTalon Diagnostic Domain Launch Plan

Internal launch plan. Pilot stage. Not for public distribution.

| Field | Value |
|---|---|
| Owner | Cody / Pressure Systems |
| Last reviewed | 2026-05-20 |
| Scope | Bring dispatchtalon.com/diagnostic/ live as the standalone lead-generation surface for the Dispatch Readiness Diagnostic. Nothing else moves. |
| Companion files | `content/dispatchtalon-lead-generator/`, `docs/DISPATCHTALON_LEAD_FUNNEL_SYSTEM.md`, `docs/brand/dispatchtalon-brand-guide.md` |
| Claim boundary | DispatchTalon is decision support. No compliance, permit, legal road access, lift engineering, autonomous dispatch, payroll, invoice, Xero, MYOB, or live SMS sending claims. |

---

## 1. Purpose

Make `https://dispatchtalon.com/diagnostic/` the canonical lead-generation URL for the Dispatch Readiness Diagnostic. Use it across LinkedIn, Instagram, WhatsApp, email, sales calls, and warm interstate or New Zealand outreach. Keep everything else exactly where it is today.

## 2. Why Diagnostic-First

Full domain migration carries risk that the project cannot absorb right now.

- The product application still lives at `https://liftiq-pilot.fly.dev/console/`. Re-pointing it is a tenant, auth, and security project, not a marketing project.
- The public marketing surface still lives at `https://pressuresystems.au/liftiq/`. Re-pointing it touches existing inbound links, screenshots, and any indexed pages.
- The diagnostic is the only asset that benefits from a clean DispatchTalon-branded URL today. Every other surface gains nothing this week from being moved.

Doing diagnostic-first means dispatchtalon.com starts paying brand rent immediately while the rest of the product is left untouched. When a paying design partner asks for the rest to move, do the rest then.

## 3. Current Route Architecture

| Surface | Live URL today | Owner |
|---|---|---|
| Public marketing | `https://pressuresystems.au/liftiq/` | Existing Vercel project |
| Product portal / app | `https://liftiq-pilot.fly.dev/console/` | Fly app |
| Diagnostic (lead generation) | Not deployed publicly. File only: `content/dispatchtalon-lead-generator/dispatch-readiness-diagnostic.html` | Repo |
| Domain `dispatchtalon.com` | Registered, not pointed | Registrar |

## 4. Target Route Architecture

| Surface | Target URL after this launch | Change |
|---|---|---|
| Public marketing | `https://pressuresystems.au/liftiq/` | No change |
| Product portal / app | `https://liftiq-pilot.fly.dev/console/` | No change |
| Diagnostic | `https://dispatchtalon.com/diagnostic/` | New, standalone Vercel project rooted at `content/dispatchtalon-lead-generator/` |
| Domain `dispatchtalon.com` apex | 302 redirect to `/diagnostic/` | New |

What does not change:

- The Fly app keeps its name and route.
- The existing main Vercel project keeps its `/liftiq/` route.
- No backend, env identifier, portal logic, or tenant data is touched.

## 5. Vercel Setup Steps

Run these in order. Each step is independent and reversible.

1. In Vercel, click **Add New, Project** and connect the existing `ThePressureAcademy/pressuresystems` repo.
2. When prompted for **Root Directory**, set it to `content/dispatchtalon-lead-generator`. This is the most important field. If it is wrong, the diagnostic will not serve.
3. Framework Preset: **Other** (static).
4. Build Command: leave blank.
5. Output Directory: leave blank. Vercel will serve files from the root directory you set.
6. Project Name: `dispatchtalon-diagnostic` or similar. The name only affects the Vercel UI.
7. Deploy. The first deploy should produce a `*.vercel.app` preview URL. Open it and confirm the diagnostic renders.
8. In Project, Settings, Domains, add `dispatchtalon.com`.
9. Add `www.dispatchtalon.com`. Set it to redirect to `dispatchtalon.com` so the apex is canonical.
10. Vercel will display the exact DNS records required. Copy them. Do not invent records. See Phase 6 for where to paste them.

The `vercel.json` inside `content/dispatchtalon-lead-generator/` already declares:

- A rewrite from `/diagnostic` and `/diagnostic/` to `/dispatch-readiness-diagnostic.html`.
- A 302 redirect from `/` to `/diagnostic/`.
- Standard security headers including HSTS.

No additional Vercel configuration is required.

## 6. DNS Setup Steps

Do not guess DNS values. Vercel will display the exact records during step 8 above. The general shape will be one of:

- An A record on the apex pointing at a Vercel anycast IP.
- A CNAME record on `www` pointing at a Vercel-managed hostname.

Manual DNS sequence:

1. Add `dispatchtalon.com` to the Vercel project (already covered in Phase 5 step 8).
2. Add `www.dispatchtalon.com` to the same Vercel project.
3. Copy the Vercel-provided DNS records exactly. Note the type (A or CNAME), name, value, and TTL.
4. Open the DNS provider chosen in Phase 7 below.
5. Add the records exactly as displayed. If the provider asks for a TTL and Vercel did not specify one, use `auto` or `3600`.
6. Wait for Vercel to mark both domains as **Valid Configuration**. Usual time is 5 to 60 minutes. Worst case is 24 hours.
7. Confirm HTTPS is automatically provisioned. Vercel issues TLS certificates once the DNS resolves.
8. Confirm `/diagnostic/` loads at the live URL.
9. Run a test submission. See Phase 8.
10. Confirm the Formspree inbox receives the result.

## 7. Cloudflare vs Registrar DNS Options

Pick one. Both are acceptable.

| Option | Pros | Cons |
|---|---|---|
| **Cloudflare DNS** | Free CDN and TLS termination in front of Vercel. Fast DNS. Strong tooling for later record changes. Easier rollback. | Adds a second account to manage. Requires nameserver change at the registrar. |
| **Registrar DNS** | One fewer account. Records live where the domain lives. | DNS performance varies by registrar. Limited tooling. No CDN. |

Recommendation: **Cloudflare DNS**. The fastest path to a stable, cached, fully TLS-terminated URL.

To switch the domain to Cloudflare DNS:

1. Create a free Cloudflare account.
2. Add `dispatchtalon.com` as a site.
3. Cloudflare will display two assigned nameservers.
4. Log into the registrar where dispatchtalon.com was purchased.
5. Replace the registrar nameservers with the two Cloudflare nameservers.
6. Wait for Cloudflare to confirm the domain is **Active**. Usually 5 to 60 minutes.
7. Then proceed with Phase 6 step 5, adding the Vercel records inside Cloudflare DNS.

If Cloudflare is not available, skip this section and add records directly at the registrar in Phase 6.

## 8. Formspree Test Steps

The form action is already wired to `https://formspree.io/f/xzdyappr`.

1. Open `https://dispatchtalon.com/diagnostic/` in a private browser window.
2. Answer all 15 questions with any answers.
3. Click through to the result page.
4. Click **Send my dispatch context**.
5. Fill the form with test values (name `Test Run`, company `Test`, role `Owner`, email a real address you control).
6. Tick the consent checkbox.
7. Submit.
8. Check the Formspree inbox for project `xzdyappr`.
9. Confirm the submission contains: `result_band`, `score`, `selected_answers`, `timestamp`, `source_channel`, and the lead capture fields.
10. If the Formspree project requires email verification on first submission, complete that step.

If the submission does not arrive within 5 minutes:

- Check the browser console for network errors on the Formspree POST.
- Confirm the form action on the deployed page matches `https://formspree.io/f/xzdyappr`.
- Confirm the email you submitted is not blocked by your inbox spam filter.
- The fallback `mailto:` flow only triggers when the action attribute is empty or matches the current page URL. Verify by inspecting the live HTML.

## 9. UTM Test Steps

UTM capture is the only way to attribute completions to channels. Test it before promoting the URL.

1. Open `https://dispatchtalon.com/diagnostic/?utm_source=linkedin&utm_medium=post&utm_campaign=drd-v1&utm_content=test-utm` in a private browser window.
2. Complete the diagnostic and submit.
3. In the Formspree inbox, open the submission.
4. Confirm the following hidden fields are populated:
   - `utm_source = linkedin`
   - `utm_medium = post`
   - `utm_campaign = drd-v1`
   - `utm_content = test-utm`
   - `source_channel = linkedin` (or the value of `utm_source`, with a fallback to `document.referrer` or `direct`)
5. Repeat with one more channel value (for example `utm_source=whatsapp&utm_medium=dm&utm_content=warmop`) to confirm the values are not cached or hard-coded.
6. Update the channel campaign plan in `content/dispatchtalon-lead-generator/channel-campaign-plan.md` if any UTM value drifts from the documented convention.

## 10. Rollback Plan

This launch is reversible at every step.

| Failure mode | Rollback |
|---|---|
| Diagnostic does not render on dispatchtalon.com | Remove the custom domain from the Vercel project. The repo file remains untouched. Use the Vercel preview URL for warm sends until fixed. |
| DNS misconfiguration | Restore previous nameservers at the registrar (if Cloudflare was added) or remove the added records (if registrar DNS was used directly). |
| Formspree endpoint fails | The script-level `mailto:` fallback still produces an email draft. Update the `action` in `dispatch-readiness-diagnostic.html` to a backup endpoint and redeploy. |
| Brand or claim drift detected after launch | Update the file in the repo, push, Vercel auto-deploys. No infrastructure change required. |
| Domain itself is compromised or needs to be paused | Pause the Vercel deployment or remove the domain assignment. The diagnostic file remains available via the Vercel preview URL for warm channels. |

The repo, the existing `/liftiq/` route, and the Fly portal are not touched by this launch. None of them are at risk in any rollback scenario.

## 11. What Not To Migrate Yet

Hard list. Do not touch these as part of this launch.

- The public marketing site at `https://pressuresystems.au/liftiq/`. Leave unchanged.
- The Fly portal at `https://liftiq-pilot.fly.dev/console/`. Leave the app name, env vars, and route unchanged.
- The `LIFTIQ` legacy identifiers in route, deployment, environment variables, filenames, and historical traceability paths. These are stability anchors for the existing pilot and tooling.
- Any DNS for `pressuresystems.au`. This domain is unrelated to this launch.
- The Fly app DNS. The portal stays where it is.
- The root `vercel.json` for the main project. Its security headers stay as they are. The diagnostic project has its own `vercel.json` inside `content/dispatchtalon-lead-generator/`.

Trigger for moving any of these later:

- A paying design partner explicitly requests the product to live at dispatchtalon.com, or
- Inbound from dispatchtalon.com exceeds inbound from the current site for two consecutive weeks, or
- A specific business event (investor demo, regulator query, partner integration) requires the brand URL on a non-diagnostic surface.

Until one of those triggers fires, this launch is the end of the current scope.
