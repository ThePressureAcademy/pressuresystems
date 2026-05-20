# DispatchTalon - Dispatch Readiness Diagnostic Funnel

**Internal & sales-asset use. Not for public distribution outside DispatchTalon channels.**

This folder contains the full DispatchTalon lead-generation funnel system, anchored on a 3-minute self-assessment called the **Dispatch Readiness Diagnostic**.

| Field | Value |
|---|---|
| Last reviewed | 2026-05-20 |
| Owner | Cody / Pressure Systems |
| Status | Pilot-stage funnel - usable now; refine after first 30 completions |
| Companion docs | `docs/DISPATCHTALON_LEAD_FUNNEL_SYSTEM.md`, `docs/DISPATCHTALON_AGENT_SKILL.md`, `docs/dispatchtalon-design-partner-gate-criteria.md`, `sales/dispatchtalon-design-partner-pack/` |

---

## What's in this folder

| File | Purpose |
|---|---|
| `dispatch-readiness-diagnostic.html` | Standalone HTML artifact. The lead magnet itself. Mobile-first. No external CDN dependencies. |
| `diagnostic-question-bank.md` | The 15 questions, 5 categories, full option set with score values, and rationale per question. |
| `score-logic.md` | Scoring rules, band thresholds, result page logic, and pilot-type mapping. |
| `channel-campaign-plan.md` | How the funnel is used across LinkedIn, Instagram, WhatsApp, email, the website, sales calls, and warm interstate / NZ outreach. |
| `linkedin-posts.md` | 5 LinkedIn post drafts plus carousel adaptations. |
| `instagram-carousel-scripts.md` | 3 Instagram carousel scripts (7–9 slides each) plus story sequence prompts. |
| `whatsapp-outreach-scripts.md` | 3 WhatsApp scripts for warm operators, industry mates, and ops managers. |
| `email-sequence.md` | 4-email context-first sequence. |
| `follow-up-framework.md` | Per-band follow-up scripts and cadence. |
| `lead-routing-rules.md` | How completed diagnostics map to pilot type and next action. |

---

## Core wedge

> **A job may need four roles, not four people.**

Secondary wedge:

> **DispatchTalon allocates role coverage, not just names on a roster.**

Both wedges drive every asset in this folder.

---

## How the funnel works

1. **A prospect sees a post / DM / message / email / homepage tile** with a hook tied to the wedge.
2. **They open the diagnostic** (web or shared link).
3. **They answer 15 questions** across 5 categories - Job intake, Worker / role / credential visibility, Multi-role coverage, Dispatch control, Audit / office handoff.
4. **They see a score (0–60), a readiness band, and a recommended next action.**
5. **They send their dispatch context** - name, company, role, contact, dispatch method, workers/personnel, assets/plant, weekly jobs, main pain. No pricing, no demo request.
6. **Cody triages the context**, scores against the lead funnel system, and replies with a fit assessment + next step (discovery call, sample-job review, pilot scenario, design-partner application, or nurture).
7. **The lead enters the first-five lead sheet** if Tier A and Gate ≥ 2 per `docs/DISPATCHTALON_LEAD_FUNNEL_SYSTEM.md`.

The diagnostic does not replace the discovery call. It qualifies who should get one.

---

## Where to host the diagnostic

Pick one and link consistently across channels:

- **Repo-hosted** (recommended initial path): publish `dispatch-readiness-diagnostic.html` under the existing site at e.g. `/diagnostic/` or `/dispatchtalon/diagnostic/`. Confirm route with site config before linking publicly.
- **Subdomain or short link**: e.g. `diagnostic.dispatchtalon.app` (only if domain is owned and configured - verify with Cody before promoting).
- **Direct file share** for early warm outreach: send the link directly to specific operators. Do not paste it into public posts until form endpoint is configured.

---

## Form endpoint (wired)

The HTML form `action` is wired to the Pressure Systems Formspree project:

```
<form id="leadForm" action="https://formspree.io/f/xzdyappr" method="POST">
```

Submissions go directly to the configured Formspree inbox. If the endpoint is unreachable at submit time, the form falls back to a `mailto:` draft so no submission is silently lost.

The hidden fields posted with every submission:

- `result_band`, `score`, `selected_answers`, `timestamp`, `source_channel`
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` (parsed from the URL)

Rotation rule:

- If the Formspree endpoint is rotated or replaced, update the `action` attribute on the form in `dispatch-readiness-diagnostic.html` and this README in the same PR.
- Do not put the Formspree project token in any other file, marketing asset, or doc.
- The endpoint string itself is not a secret (it is delivered to every visitor by the rendered HTML), but treat it as a configuration value, not as content.

Alternative if Formspree is replaced with a custom backend later:

- Server must accept `POST` `application/x-www-form-urlencoded` and return a redirect or `2xx`.
- The fallback `mailto:` flow in the script handles unreachable endpoints automatically.

---

## Branding and visual style

- Dark graphite background (`#16191d`) aligned with the locked DispatchTalon palette in `docs/brand/dispatchtalon-brand-guide.md`.
- Cream text (`#ece6d3`).
- Rust accents (`#b8552d`) on CTAs and decision nodes.
- Steel grey card surfaces (`#23282f`).
- The approved DispatchTalon brand mark is embedded inline in the HTML header and footer as a base64 PNG (sourced from `assets/logos/dispatchtalon/dispatchtalon-favicon-64.png`). The browser tab favicon uses `dispatchtalon-favicon-32.png` embedded the same way.
- Typographic lockup uses "DispatchTalon" cream wordmark plus "by Pressure Systems" steel grey subline.
- Subtle `DispatchTalon . DRD v1` watermark, no boxed logo tile, no LIFTIQ mark, no rejected concept marks.
- No CDN dependencies. Everything inlined into the single HTML.

Do not introduce stock hard hat photos, fake compliance badges, generic AI graphics, em dashes, or unauthorised SVG redrawings of the brand mark.

---

## Claim boundaries (do not break these)

The diagnostic and every supporting asset must preserve:

**Do not claim:** compliance approval · permit approval · legal road access approval · lift-engineering approval · autonomous dispatch · payroll-ready · invoice-ready · Xero integrated · MYOB integrated · live SMS sending · guaranteed incident prevention · legal/trademark clearance.

**Approved terms:** decision support · dispatcher remains the decision-maker · review before dispatch · structured allocation · role coverage · conservative headcount · suggested minimum headcount · review required · audit trail · CSV office handoff · manual SMS preview/copy/manual publish · export-first workflow · pilot-stage.

---

## How Cody should use this

1. Get the form endpoint configured and link the diagnostic from the homepage.
2. Start with LinkedIn post 1 (the four-roles wedge). Pin it. Use it as the primary CTA driver.
3. Send the WhatsApp warm-operator script to the first 10 names on the warm list.
4. Run the email sequence to the next 20 named operations managers in the lead sheet.
5. After 30 diagnostic completions, run a lessons-learned review against this folder and update the question bank and follow-up scripts.

Do not run paid acquisition on the diagnostic until the warm channel has produced at least three discovery calls.

---

## Known limitations

- Diagnostic scoring is **self-reported**. It is a structuring aid, not an objective audit.
- The diagnostic is **not** a legal, compliance, permit, or engineering assessment.
- **No public pricing** appears anywhere in the artifact. Pricing conversation happens after discovery.
- The diagnostic **does not replace** the discovery call. It qualifies it.
- Form endpoint **must be configured** before public promotion.
- Brand is **DispatchTalon**. LIFTIQ is legacy route only - do not surface it in any new asset.
