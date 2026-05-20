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

Stack in use: Squarespace and Vercel only. No Cloudflare, no third party DNS host.

- The domain `dispatchtalon.com` is managed in Squarespace (either purchased through Squarespace Domains or transferred there). Squarespace is the DNS host.
- Vercel is the deployment target.

Do not guess DNS values. Vercel will display the exact records during Phase 5 step 8. The general shape will be:

- An A record on the apex (`@`) pointing at a Vercel anycast IP that Vercel shows you.
- A CNAME record on `www` pointing at a Vercel managed hostname that Vercel shows you.

If Vercel shows you different record types (for example a TXT record for verification), add those too, exactly as displayed. Squarespace's DNS panel supports A, CNAME, MX, TXT, AAAA, NS, and SRV records, which covers everything Vercel will ask for.

Manual DNS sequence:

1. Add `dispatchtalon.com` to the Vercel project (already covered in Phase 5 step 8).
2. Add `www.dispatchtalon.com` to the same Vercel project.
3. In Vercel, copy each DNS record exactly. Note: type (A, CNAME, TXT), host (or name), value, and any TTL.
4. Open Squarespace. Steps 5 to 8 are the Squarespace specific path.
5. In Squarespace, go to **Settings, Domains**, click `dispatchtalon.com`, then click **DNS Settings** (sometimes labelled **DNS** or **Advanced DNS Settings**).
6. Remove any pre-set Squarespace site records that conflict with Vercel's records. Specifically: if the apex `@` already has an A record pointing somewhere else, edit it to Vercel's IP. If there is an existing `www` CNAME pointing at a Squarespace target, change it to Vercel's CNAME target. Keep any MX, TXT, or other records that you actually use (for example email forwarding).
7. Add the Vercel A record on `@`. Add the Vercel CNAME record on `www`. Add any TXT verification record Vercel provided. Save.
8. Wait for Vercel to mark both `dispatchtalon.com` and `www.dispatchtalon.com` as **Valid Configuration**. Usual time is 5 to 60 minutes. Worst case is 24 hours.
9. Confirm HTTPS is automatically provisioned. Vercel issues TLS certificates once DNS resolves.
10. Confirm `/diagnostic/` loads at the live URL.
11. Run a test submission. See Phase 8.
12. Confirm the Formspree inbox receives the result.

## 7. Squarespace Specific Notes

A few Squarespace quirks to know before touching the DNS panel.

- **Do not use "Connect Domain to a Squarespace Site" for dispatchtalon.com.** That flow auto-populates Squarespace's own A and CNAME values and will overwrite the Vercel records the next time Squarespace re-applies the preset. If Squarespace prompts you to "use this domain for a Squarespace site," dismiss the prompt. The domain should remain a manually managed DNS zone.
- **Squarespace's apex record is editable.** Unlike some DNS hosts, Squarespace allows an A record directly on `@`. That is what Vercel needs. Do not look for ALIAS or ANAME options. A record on `@` with Vercel's value is correct.
- **TTL is fine at default.** Squarespace defaults are acceptable. If a TTL field is presented, accept the default unless Vercel specifies otherwise.
- **DNS propagation visibility.** Squarespace does not show a "propagation complete" indicator. Use Vercel's domain status page as the source of truth. When Vercel shows **Valid Configuration**, the domain is live for that record.
- **Do not delete unrelated TXT records.** If Cody or anyone else has set TXT records for email DKIM, SPF, or domain verification on other services, leave them alone. Only add, change, or remove the records named in step 6 and 7 above.
- **MX records for email.** This launch does not touch email routing. If Squarespace already has MX records for an email provider (Google Workspace, Microsoft 365, Squarespace Email Campaigns), leave them.

Rollback inside Squarespace:

1. Open the same **DNS Settings** panel.
2. Remove the Vercel A record on `@` and the Vercel CNAME on `www`.
3. Optionally restore the Squarespace site defaults by re-running "Connect Domain to a Squarespace Site" (only if you genuinely want the domain back on a Squarespace surface).
4. The domain will stop resolving to Vercel within minutes. The diagnostic file remains available via the Vercel preview URL.

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
| DNS misconfiguration | In Squarespace DNS Settings, remove the Vercel A record on `@` and the Vercel CNAME on `www`. The domain stops resolving to Vercel within minutes. The diagnostic file remains available via the Vercel preview URL. |
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
