# LIFTIQ Homepage Content Audit

Date: 2026-05-10  
Repo audited: `C:\Users\raymo\OneDrive\Documents\GitHub\pressuresystems`  
Live surfaces checked: [https://pressuresystems.au/liftiq/](https://pressuresystems.au/liftiq/), [https://pressuresystems.au/](https://pressuresystems.au/)  
Scope: audit only. No homepage implementation files changed.

## 1. Executive verdict

The public LiftIQ homepage is materially behind the current product state.

It is still positioned as a governed concept demo with no backend, no persisted audit layer, and no live operational workflow. That is no longer accurate after the live pilot backend, dispatcher console, worker import, task preferences, adaptive learning signals, allocation audit events, and pilot metrics work now present in the product.

This is primarily an underclaim and truth-drift problem, not a hype problem. The current public site is still commercially careful, but it is now too careful in the wrong places and hides pilot-critical capability that should be visible to founding-partner prospects and invited pilot users.

The next implementation PR should update the LiftIQ homepage and supporting public pages so they:

- position LiftIQ as a fatigue-aware, credential-aware dispatch intelligence layer
- reflect the live pilot console and import workflow accurately
- preserve the no-autonomy, no-compliance-guarantee boundary
- introduce a clear but secondary pilot portal access path
- keep founder/discovery CTAs primary for cold traffic

## 2. Current homepage positioning assessment

The current homepage still presents LiftIQ as an early front-end concept rather than an active pilot product surface.

Confirmed repo and live-page examples:

- `liftiq/index.html` still says `Current stage: governed concept demo and early product foundation. No live integrations. No dispatch replacement claims.`
- `liftiq/index.html` still says `The current governed demo is front-end only.`
- `liftiq/index.html` still says `No backend, no production permissions model, and no live integrations.`
- `liftiq/how-it-works/index.html` still says `The current demo is still a front-end concept with deterministic seeded logic.`
- `liftiq/how-it-works/index.html` still says `One governed demo. No backend.`
- `liftiq/how-it-works/index.html` still says `Preview event log only, not a persisted audit store.`
- `index.html` still describes LiftIQ as `Current stage: governed concept demo and design-partner conversations.`

Those statements were truthful at the earlier concept-demo stage. They are no longer the right public truth for the current pilot product state.

What the homepage currently gets right:

- it keeps Pressure Systems as the parent commercial identity
- it does not oversell compliance, autonomy, or ERP scope
- it keeps discovery CTAs commercially clean
- it keeps LiftIQ distinct from payroll, finance, and broad systems-replacement claims

What it gets wrong now:

- it understates real pilot capabilities
- it does not surface the dispatcher console or portal access at all
- it does not explain import onboarding, worker records, or audit-backed allocation flow
- it still frames audit logic as preview-only
- it does not reflect the explainable adaptive preference layer now in the product

## 3. Missing upgraded features

The homepage and supporting LiftIQ pages are missing these now-real product capabilities:

- Dispatcher pilot console
- Worker database entry
- CSV employee import
- TSV copy/paste spreadsheet import from Excel or Google Sheets
- Worker credentials
- Fatigue records
- Job creation
- Explainable SmartRank recommendations
- CredentialGate hard blocks before allocation
- FatigueGuard warnings and hard blocks before allocation
- Allocation confirmation with override reasons for warning or lower-ranked selections
- Append-only allocation-level audit trail
- Pilot metrics / proof view
- Task-specific star preferences
- Imported, manual, and learned worker preference sources
- Adaptive learning from dispatcher-approved allocation patterns
- Explainable score breakdowns that show preference contribution
- Explicit product rule that preference signals never override hard blocks

These are not minor feature omissions. They change the public story from concept-demo software to pilot-validated dispatch intelligence with live browser workflow.

## 4. Overclaim / legal-risk language

The current public site does not have a major overclaim problem. Its main problem is stale underclaim language.

That said, the next implementation PR must keep these boundaries explicit:

- Do not say `AI chooses the safest worker.`
- Do not say `Compliance approved.`
- Do not say `WHS guaranteed.`
- Do not say `Automatically prevents incidents.`
- Do not say `Replaces Fleet Cost & Care.`
- Do not say `Fully autonomous dispatch.`
- Do not say `Payroll-ready.`
- Do not say `Enterprise-grade compliance.`
- Do not say `Legally defensible` unless narrowly qualified in a future governed context.

Public-safe claim set for the next PR:

- `Dispatcher remains the decision-maker.`
- `Explainable crew-fit recommendations.`
- `Credential and fatigue checks before allocation.`
- `Allocation-level audit trail.`
- `Import workers from CSV or pasted spreadsheet data.`
- `Learns from dispatcher-approved allocation patterns.`
- `Preference signals are visible and explainable.`
- `Hard blocks still override preference signals.`
- `Built for founding-partner pilot validation.`

## 5. Required public copy changes

The public copy should shift from `concept demo` language to `founding-partner pilot` language.

Required copy moves:

1. Replace `governed concept demo` messaging on the homepage with `founding-partner pilot` messaging.
2. Replace `front-end only` and `no backend` statements with accurate phase-boundary language:
   - live pilot workflow exists
   - dispatcher remains the decision-maker
   - no autonomous dispatch
   - no payroll / invoicing / ERP claims
3. Replace `preview event log` language with `append-only allocation-level audit trail`.
4. Add worker onboarding language:
   - CSV import
   - pasted spreadsheet import
   - manual worker entry
5. Add recommendation-language upgrades:
   - explainable SmartRank score breakdowns
   - credential and fatigue checks before allocation
   - visible warnings and hard blocks
6. Add adaptive preference language carefully:
   - learns from dispatcher-approved allocation patterns
   - manual, imported, and learned preference signals are visible
   - hard blocks still override preference signals
7. Keep discovery-path copy, but separate it from pilot-user access.

## 6. Recommended CTA structure

Recommended public CTA hierarchy:

1. Primary CTA for cold traffic:
   - `Book a LiftIQ Discovery Call`
2. Secondary CTA for cautious buyers:
   - `Send context first`
3. Tertiary CTA for existing invited pilot users:
   - `Pilot portal access`

Reasoning:

- Discovery should remain the main conversion path for net-new operators.
- The public site should not behave like a generic app-login landing page.
- Existing pilot users still need an obvious route to the live console.
- The portal route should be visible, but clearly framed as an invited or existing-user path.

## 7. Portal access placement recommendation

Portal access is currently absent from the public LiftIQ surface. That is now a usability gap.

Recommended placement:

- Header utility CTA visible after page load:
  - label: `Pilot portal access`
  - destination: `https://liftiq-pilot.fly.dev/console/`
- Hero microcopy or sub-CTA:
  - `Existing pilot user? Open the pilot portal.`
- Bottom CTA panel:
  - small tertiary link: `Already in the pilot? Open the portal`

Portal access should not replace the primary founding-partner CTA. It should sit alongside it as a clearly bounded path for existing pilot users and invited partner teams.

## 8. Homepage section-by-section audit

### Metadata / SEO

Current issue:

- `liftiq/index.html` meta description, Open Graph description, and Twitter description still describe LiftIQ as a concept demo and early product foundation.

Required change:

- Update metadata to reflect pilot-stage dispatch intelligence, import onboarding, explainable recommendations, and audit-backed allocation workflow.

### Header / navigation

Current issue:

- Navigation exposes `Design partner`, `Send context first`, and `Book a LiftIQ Discovery Call`.
- It does not expose the pilot portal.

Required change:

- Keep discovery-path actions.
- Add a clearly visible tertiary `Pilot portal access` action.

### Hero

Current issue:

- Hero chip and microcopy still anchor LiftIQ as `Design-partner stage` and `governed concept demo`.

Required change:

- Reframe hero around founding-partner pilot validation.
- Keep the decision-support boundary clear.

### Problem framing section

Current issue:

- The operational pain framing is still sound.
- It does not bridge clearly enough into the now-live workflow.

Required change:

- Keep the problem framing.
- Add explicit transition into worker import, credential checks, fatigue checks, explainable ranking, override capture, and audit trail.

### Product definition section

Current issue:

- `The current governed demo is front-end only.` is now false.

Required change:

- Replace with a current-state product definition:
  - browser-based dispatcher pilot console
  - imported or manually entered workers
  - explainable crew-fit recommendation layer
  - auditable allocation confirmation

### Module / capability section

Current issue:

- Homepage capability panels are too high-level and omit current pilot mechanics.

Required change:

- Add concrete pilot capabilities:
  - worker import and onboarding
  - credentials and fatigue records
  - jobs and SmartRank
  - warnings, hard blocks, and override reasons
  - audit trail and pilot metrics
  - task-star and learned preference signals

### Truth / boundary section

Current issue:

- The current truth box still says `No backend` and `no live integrations`.

Required change:

- Replace with a live-pilot truth box such as:
  - live pilot console exists
  - dispatcher remains the decision-maker
  - no autonomous allocation
  - no payroll / invoicing / FCC replacement claims
  - no legal or WHS guarantee claims

### Bottom CTA panel

Current issue:

- Only discovery CTAs are available.

Required change:

- Keep the current discovery CTAs.
- Add a tertiary portal-access path for existing pilot users.

### Footer

Current issue:

- Footer repeats stale `governed concept demo and early product foundation` language.

Required change:

- Update footer to concise pilot-stage truth:
  - fatigue-aware, credential-aware dispatch intelligence layer
  - founding-partner pilot validation

### Supporting page: `liftiq/how-it-works/index.html`

Current issue:

- This page is now materially inaccurate because it says there is no backend and no persisted audit store.

Required change:

- Rewrite the current-state explanation around the actual workflow:
  - import or create workers
  - record credentials and fatigue
  - create jobs
  - run explainable SmartRank
  - confirm allocation
  - capture override reason where needed
  - write append-only audit events
  - use pilot metrics for proof

### Supporting page: `liftiq/modules/index.html`

Current issue:

- Module statuses still treat `CredentialGate` and `AuditIQ` as partially demonstrated.
- `AuditIQ` still says no persistence exists.
- Named-only future modules are mixed into the page in ways that can distract from current pilot truth.

Required change:

- Upgrade current pilot-backed modules accurately.
- Separate current modules from future ideas more sharply.

### Supporting pages: contact / design-partner / briefing / diagnostic

Current issue:

- These pages still repeat `governed concept demo and early product foundation`.

Required change:

- Refresh them to `founding-partner pilot` language while preserving bounded-claims discipline.

### Root Pressure Systems homepage

Current issue:

- The main homepage still describes LiftIQ as a concept-demo design-partner track.

Required change:

- Update the root homepage LiftIQ snippet so it matches the pilot-stage truth while still keeping Pressure Systems as the parent offer.

## 9. Exact suggested replacement copy

### Homepage meta description

Replace with:

`LiftIQ is a fatigue-aware, credential-aware dispatch intelligence layer for crane and lifting operations. Import workers from CSV or pasted spreadsheet data, run explainable crew-fit recommendations, confirm allocations with visible checks, and keep an allocation-level audit trail.`

### Homepage hero eyebrow / stage label

Replace with:

`Founding-partner pilot`

### Homepage hero headline

Replace with:

`Explainable dispatch intelligence for crane and lifting operations`

### Homepage hero supporting copy

Replace with:

`LiftIQ helps dispatch teams import worker records, check credentials and fatigue before allocation, compare explainable crew-fit recommendations, capture override reasons when needed, and keep an allocation-level audit trail. Dispatcher remains the decision-maker.`

### Homepage hero microcopy

Replace with:

`Built for founding-partner pilot validation. No autonomous dispatch. No payroll or invoicing claims. Hard blocks still override preference signals.`

### Homepage capability section intro

Replace with:

`LiftIQ is a browser-based dispatcher pilot console for allocation-heavy crane and lifting workflows. Teams can onboard workers from CSV or pasted spreadsheet data, maintain credential and fatigue records, create jobs, run SmartRank recommendations, confirm allocations, and review audit-backed pilot metrics.`

### Homepage capability bullets or cards

Use this copy set:

- `Import workers from CSV or pasted spreadsheet data`
- `Track worker credentials and fatigue records before allocation`
- `Run explainable SmartRank recommendations with visible score breakdowns`
- `Show CredentialGate hard blocks and FatigueGuard warnings before allocation`
- `Require override reasons for warning or lower-ranked selections`
- `Keep an append-only allocation-level audit trail`
- `Learn from dispatcher-approved allocation patterns`
- `Show manual, imported, and learned preference signals`
- `Keep hard blocks above preference signals`

### Homepage public-truth section

Replace with:

`Current pilot truth`

- `Live founding-partner pilot console`
- `Dispatcher remains the decision-maker`
- `Explainable recommendation layer, not autonomous dispatch`
- `Credential and fatigue checks before allocation`
- `Allocation-level audit trail and pilot metrics`
- `No payroll, invoicing, or FCC-replacement claim on this page`
- `No WHS or legal-compliance guarantee claim on this page`

### Homepage pilot portal utility copy

Add:

`Existing pilot user? Open the pilot portal.`

### CTA labels

Use:

- Primary: `Book a LiftIQ Discovery Call`
- Secondary: `Send context first`
- Tertiary: `Pilot portal access`

### Root homepage LiftIQ snippet

Replace the stage copy with:

`Current stage: founding-partner pilot. LiftIQ is a fatigue-aware, credential-aware dispatch intelligence layer with explainable crew-fit recommendations, allocation-level audit trail, and bounded pilot workflow for crane and lifting operations.`

## 10. Merge recommendation

Recommendation: do not merge another content-light LiftIQ marketing pass until the public copy is updated to match the pilot product truth.

The next implementation PR should be a scoped public-site truth-alignment pass, not a redesign. It should preserve the current commercial hierarchy and simply close the truth gap between:

- the live pilot backend and console
- the public homepage copy
- the supporting LiftIQ route pages
- the root Pressure Systems LiftIQ product-track snippet

Files that should be changed in the next implementation PR:

- `liftiq/index.html`
- `liftiq/how-it-works/index.html`
- `liftiq/modules/index.html`
- `liftiq/contact/index.html`
- `liftiq/design-partner/index.html`
- `liftiq/dispatch-blind-spot-diagnostic/index.html`
- `liftiq/executive-briefing/index.html`
- `index.html`
- `assets/css/liftiq.css` if a new tertiary portal CTA needs styling support
- `site-config.js` only if the portal URL is promoted into shared configuration

Optional follow-on files if metadata assets are centrally managed elsewhere:

- social-card source files or Open Graph asset notes, if the image-alt or supporting share text is governed separately
