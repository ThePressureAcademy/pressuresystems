# LIFTIQ Crane, Counterweight & Transport Planning Research Pack

**Status:** Research only. Not implementation. Treat every number below as
subject to source confirmation before LIFTIQ acts on it.

**Capture date:** 2026-05-11
**Branch:** `claude/crane-transport-research-20260511-042717`
**Scope:** What LIFTIQ needs to know to estimate, at job-creation or
job-import time, (a) whether the selected crane needs additional
counterweight, (b) approximately how much, (c) how many transport movements
the configuration may require, (d) what crew roles to flag, and (e) which
NHVR / Australian road-access reviews to surface — without ever claiming
the system has decided legality or compliance.

---

## 1. Executive summary

### What this pack establishes

1. **The GMK5150L and GMK5150L-1 are different cranes for transport
   purposes.** Per operator brochure correction (2026-05-11): the
   **GMK5150L** documents three travel/assembly states — 10.2 t at
   12 t/axle, **24.0 t at 16.5 t/axle (review-gated)**, and 44.5 t full
   assembly. The **GMK5150L-1** documents 10.2 t at 12 t/axle, **30.9 t
   at 16.5 t/axle**, and 44.5 t full assembly. **LIFTIQ must not
   generalise the 24 t state to the L-1 or the 30.9 t state to the L.**
   Earlier search-corpus evidence conflated the two variants; the brochure
   is the source of truth.
2. **Counterweight states must be modelled in a child table from day
   one.** A single `roadable_counterweight_tonnes` column on a
   `crane_models` parent table collapses these per-variant differences
   into noise and loses the audit trail of which axle-limit regime drove
   a transport flag. Phase 1 ships a `crane_model_travel_states` child
   table; the dispatcher selects the travel state at job time and the
   `counterweight_to_transport_tonnes` calculation derives from the
   selected state, not from the model alone. (CEO decision 2026-05-11.)
3. **NHVR is the source of truth for road access. LIFTIQ must not
   decide legality.** General access width is 2.5 m
   ([nhvr-gma-via-search]); Class 1 SPV cranes are governed by the
   *National Class 1 Special Purpose Vehicle (up to 40 t total mass) Mass
   and Dimension Exemption Notice 2026 (No. 1)*
   ([nhvr-c1spv-notice]); WA and NT do not use NHVR Go (apply direct to
   the state authority) ([mainroadswa]). 2026 HVNL reforms proposing length
   19 m → 20 m and height 4.3 m → 4.6 m are *as of search-result snippets*
   subject to ministerial approval — confirm current status before
   implementing any hard rules in LIFTIQ.
4. **Australian crane hire quoting is consistent across companies.** Core
   quote fields seen across iSeekplant, Cranelift, Felix, Universal,
   Cranecorp, Wanneroo, AOR, AGL, Borger, ABC: site address, load weight,
   pick/set radius, hook height, date/time, access notes, wet vs dry hire,
   crew (operator + dogman + rigger), permits/lift study, traffic
   management, mobilisation/demobilisation, minimum hire period, overtime,
   fuel. LIFTIQ already captures the lift-side fields — the gap is the
   *transport / counterweight / mobilisation* fields.
5. **Counterweight transport in Australia is a real, market-served
   problem.** TRT Australia builds purpose-built crane support
   trailers, including 3-axle counterweight semi-trailers with payloads up
   to ~30 t ([trt-via-search]). NSW formally recognises crane-and-dolly
   combinations under SPV access ([nhvr-nsw-crane-dolly]). Multiple
   hire companies advertise "support truck" / "dolly truck" / "rigging
   truck" line items. The Phase 1 LIFTIQ rule "if counterweight required
   > counterweight carried on crane, then schedule a support transport
   movement" is well-grounded.

### What this pack does not establish

- **No direct access to primary sources.** In this research environment,
  NHVR pages, Manitowoc product pages, Australian crane hire fleet pages,
  and most PDF datasheets returned HTTP 403 to both `WebFetch` and direct
  `curl` requests. All findings below are corroborated through
  search-result extracts that cite the same primary sources, but the
  primary sources were **not** read end-to-end. Confidence ratings reflect
  this. **The user/reader must verify any numeric or regulatory claim
  against the cited URL before treating it as decision-quality input for
  LIFTIQ.**
- No detailed axle-by-axle mass distribution for any crane.
- The L vs L-1 differentiation (24 t for L, 30.9 t for L-1, both at
  16.5 t/axle) is recorded on the operator's brochure-derived authority
  (2026-05-11). The L's 24 t row in the seed is `review_required = true`
  pending a non-restricted-network confirmation against the L brochure
  (`SRC-011`, `SRC-012`).
- No verified current status of the 2026 HVNL/MDL Regulation reforms —
  search snippets indicated they were still "subject to ministerial
  approval" at the moment of search (May 2026); the user noted "1 July
  2026 reform changes are in flight". A dated review of NHVR is required
  before each LIFTIQ release encodes any threshold.

### Recommended Phase 1 implementation verdict

Build a **transport-review flagging layer keyed off model-specific
travel states**, not a one-roadable-value autonomous configurator. LIFTIQ
should:

1. Implement two entities: `crane_models` (parent — one row per exact
   manufacturer × model × variant) and `crane_model_travel_states`
   (child — one row per documented travel state per model, each carrying
   `state_label`, `carried_counterweight_tonnes`, `axle_basis`,
   `roadability_basis`, `source_url`, `source_capture_date`,
   `source_confidence`, `review_required`, `notes`).
2. At job time, the dispatcher must pick the **exact crane model AND
   the travel state** they intend to run. LIFTIQ does not infer.
3. Compute `counterweight_to_transport_tonnes = max(0,
   counterweight_required − selected_state.carried_counterweight_tonnes)`.
   Persist the `selected_state` snapshot on the allocation so the audit
   trail records which state, axle basis, and source supported the
   decision.
4. Surface a `transport_review_required` flag whenever any of: the
   gap > 0; the selected travel state has `review_required = true`; the
   route is over a state border; the job is in WA/NT; the crane model is
   unknown; the model has no travel states defined; or the brief
   mentions any of `float`, `low loader`, `OSOM`, `permit`, `bridge`,
   `restricted access`, `escort`.
5. Never display "compliant", "permit approved", "safe to dispatch", or
   "legal to travel". Use exactly:
   "Road access review required",
   "NHVR / state notice or permit check may be required",
   "Confirm route, vehicle combination, axle masses, and dimensions before
   dispatch".

Detailed scope in §11.

---

## 2. Methodology and source-fetch constraints

### What we tried

For each mandatory source listed in the brief, the researcher attempted:

1. `WebFetch` with the URL and a structured extraction prompt.
2. Where WebFetch returned 403, a follow-up `WebSearch` query targeted at
   the same content.
3. Spot-check with `curl` (via Bash) using a realistic browser User-Agent
   to determine whether the block was at the agent fetcher or at the
   upstream WAF.

### What we observed

| Source category                   | WebFetch | curl | WebSearch result snippets |
| --------------------------------- | -------- | ---- | ------------------------- |
| `nhvr.gov.au` (all pages tried)   | 403      | 403  | Working                   |
| `manitowoc.com` (Grove pages)     | 403      | 403  | Working                   |
| `wgccranes.com.au` PDF            | 403      | 403  | Working                   |
| `raptortechinc.com` PDF           | 403      | 403  | Working                   |
| `cranepedia.com`                  | 403      | 403  | Working                   |
| `universalcranes.com` fleet page  | 403      | 403  | Working                   |
| `transport.nsw.gov.au` heavy veh. | 403      | 403  | Working                   |
| `trtaustralia.com.au`             | 403      | 403  | Working                   |
| `borgercranes.com`                | 403      | 403  | Working                   |

The WAF posture appears uniform across Australian government, manufacturer,
crane-hire, and trailer-manufacturer domains in this sandbox. We could not
read full pages or PDFs.

### What that means for this pack

- Every technical or regulatory claim in §3–§7 is sourced via
  search-result extraction summaries, not via a full read of the page
  cited.
- Where two or more independent search results corroborate the same
  numeric or rule statement (e.g. GMK5150L counterweight 44.5 t), we
  rate the claim **medium-high** confidence.
- Where a single result cites a number (e.g. "24 t on board" for the
  GMK5150L), we rate it **low-medium** and explicitly flag it.
- Regulatory claims (NHVR limits, OSOM thresholds, pilot rules) are
  rated **medium at best**. They must be verified on the cited NHVR /
  state authority page before being encoded as LIFTIQ rules.
- Every cited URL is preserved in `research/liftiq-crane-transport-source-register.csv`
  so the user can verify on their own network.

This is the honest evidence bar this pack can stand on. It is sufficient
for Phase 1 *scoping*. It is not sufficient for Phase 1 *automation* of
permit decisions, which the recommended scope explicitly avoids.

---

## 3. Crane configuration model

### 3.1 Core principle — model-specific travel states

LIFTIQ models cranes as **(parent crane_model) → (child travel_states)**.
A single "roadable counterweight" value per crane_model is forbidden by
this design. Each documented travel state is its own row carrying its
own axle basis, source, confidence, and `review_required` flag.

This matters because the GMK5150L and GMK5150L-1 share a model family
but have **different per-variant travel states** at the 16.5 t/axle
regime. Modelling a single roadable value per model would conflate them.

### 3.2 Grove GMK5150L / GMK5150L-1 — parent records and travel states

#### Parent record: GMK5150L

| Field | Value | Confidence | Source |
| ----- | ----- | ---------- | ------ |
| Nominal capacity | 150 t (175 USt) | High | [cranepedia][cp-gmk5150l], [Manitowoc][mc-gmk5150l], [CraneMarket][cm-gmk5150l], [LECTURA][lectura-gmk5150l] |
| Max counterweight (assembled) | 44.5 t | High | Multi-source |
| Width | 2.75 m | Medium | [Construction Equipment][ce-gmk5150] |
| Main boom | 12.8 m – 60 m | High | [cranepedia][cp-gmk5150l] |
| Bi-fold swingaway jib | 11.2 / 17.8 m, hydraulic offset, luffing 0°–50° | High | [cranepedia][cp-gmk5150l] |
| Axle configuration | 5-axle, 10×6×10 drive (10×8×10 opt.) | High | [cranepedia][cp-gmk5150l] |
| Engine | Mercedes-Benz OM471LA, 390 kW | Medium | [cranepedia][cp-gmk5150l] |
| Production years | 2016 – 2021 | Medium | [LECTURA][lectura-gmk5150l] |

#### Travel states for GMK5150L

| State | Carried CW | Axle basis | Confidence | Review required | Notes |
| ----- | ---------- | ---------- | ---------- | --------------- | ----- |
| 12 t/axle taxi | 10.2 t | 12 t/axle | Medium | No | Multi-source corroborated; safe taxi state |
| 16.5 t/axle reduced heavy-roadable (planning) | **24.0 t** | 16.5 t/axle | Low-medium | **Yes** | Per operator brochure correction; exact-model attribution between L and L-1 not crystal-clear in our search corpus. Confirm against the L brochure before driving automation. |
| Full assembly (not roadable single state) | 44.5 t | N/A | High | No | Assembled on site after counterweight transport arrives |

#### Parent record: GMK5150L-1

| Field | Value | Confidence | Source |
| ----- | ----- | ---------- | ------ |
| Nominal capacity | 150 t (175 USt) | High | Multi-source |
| Max counterweight (assembled) | 44.5 t | High | Multi-source |
| Width | 2.75 m (assumed inherits from L) | Medium | Inferred |
| Main boom | 12.8 m – 60 m (per product page) | High | [Manitowoc][mc-gmk5150l-1] |
| Engine | Single-engine EUROMOT 5 / Tier 4 final concept | Medium | [Kirby-Smith][kirbysmith-gmk5150l-1] |
| Production years | 2021 – 2026 | Medium | [LECTURA][lectura-gmk5150l-1] |

#### Travel states for GMK5150L-1

| State | Carried CW | Axle basis | Confidence | Review required | Notes |
| ----- | ---------- | ---------- | ---------- | --------------- | ----- |
| 12 t/axle taxi | 10.2 t | 12 t/axle | Medium | No | Same value as L variant at this axle limit |
| 16.5 t/axle reduced heavy-roadable | **30.9 t** | 16.5 t/axle | Medium | No | Per operator-confirmed brochure attribution to the L-1 variant. **Do not generalise to the L variant.** |
| Full assembly (not roadable single state) | 44.5 t | N/A | High | No | Same total assembly weight |

### 3.3 What this means for LIFTIQ

- Two LIFTIQ rows in `crane_models`: one for L, one for L-1.
- Three rows in `crane_model_travel_states` for the L; three for the L-1.
- The L's 24 t row is `review_required = true` (planning state, exact-model
  attribution open).
- The L-1's 30.9 t row is `review_required = false` (multi-source,
  variant-attributed).
- Sharing or copying counterweight states between the L and L-1 is
  prohibited by the data model — the dispatcher/admin must source-cite
  each state per variant.

### 3.4 Comparable 100 t – 250 t all-terrain cranes

| Model | Capacity | Max CW | Boom | Travel-state seeding | Sources |
| ----- | -------- | ------ | ---- | -------------------- | ------- |
| Grove GMK4100L-1 | 100 t (110 USt) | 26.2 t | 60 m main + 18 m swing-away (+8 m ext) | 1 row, **review-gated** — per-axle-limit basis not extracted | [cranepedia][cp-gmk4100l-1], [CraneMarket][cm-gmk4100l-1], [Bigge][bigge-gmk4100l-1] |
| Liebherr LTM 1150-5.3 | 150 t | not extracted | 66 m main (longest in class) | 1 row at 12 t/axle = 9 t carried, **review-gated** (single source) | [Liebherr][liebherr-ltm-1150-5-3-via-search], [cranepedia][cp-ltm-1150-5-3] |
| Liebherr LTM 1160-5.2 | 200 USt / 180 mt | not extracted | 13.1 – 62 m main; VarioBallast | **0 rows seeded** — roadable ballast value not cleanly extracted; counterweight automation review-gated for this model | [Liebherr][liebherr-ltm-1160-5-2-via-search], [CraneMarket][cm-ltm-1160-5-2] |
| Liebherr LTM 1100-5.2 | 100 t | 35 t | ~52 m main, 32–62 ft swing-away offset jib | **0 rows seeded** — roadable counterweight not extracted; review-gated | [CraneMarket][cm-ltm-1100-5-2], [LECTURA][lectura-ltm-1100-5-2] |
| Tadano AC 5.220L-1 | 220 t | 70.2 t | 78 m main (99 m optional) | **0 rows seeded** — carried counterweight in 12 t/axle config not extracted; review-gated | [Tadano US/CAN][tadano-ac-5-220l-1], [Bigge][bigge-ac-5-220l-1] |

LTM 1160-5.2 was added per operator request; LTM 1100-5.2 retained as
secondary 100-class Liebherr comparable. Both are seeded as parent
records with no travel states — the absence of a child row is the
explicit signal to the LIFTIQ rules engine that automation must defer to
manual review for these models.

Confidence on each parent record: **medium** — single or dual-source via
WebSearch, no direct primary-page read.

### 3.5 What LIFTIQ should encode

See §8 for the full schema. The key principle: **per-variant parent
record + per-state child rows + per-row source citation + per-row
review_required gate**.

---

## 4. Counterweight package model

### 4.1 The brief's "24 t vs 44.5 t" example — verdict (revised 2026-05-11)

The brief asks LIFTIQ to validate the example: *"A Grove GMK5150L /
GMK5150L-1 is a 150t all-terrain crane. For some jobs it may operate as a
'100t-class' solution with a reduced counterweight package, e.g. 24t
counterweight rather than full 44.5t, reducing transport requirements."*

**Revised findings (per operator brochure correction 2026-05-11):**

The example holds **for the GMK5150L variant specifically, not for the
GMK5150L-1.** The two variants document different reduced
heavy-roadable states at 16.5 t/axle, and LIFTIQ must not generalise
either value to the other variant.

```
GMK5150L (original variant, production 2016-2021):
  10.2 t  carried, at 12 t/axle           [taxi state]            multi-source
  24.0 t  carried, at 16.5 t/axle         [planning state]        single-search-summary, REVIEW-GATED
  44.5 t  full assembly                                            multi-source

GMK5150L-1 (successor variant, production 2021-2026):
  10.2 t  carried, at 12 t/axle           [taxi state]            multi-source
  30.9 t  carried, at 16.5 t/axle         [reduced heavy-roadable] multi-source for L-1
  44.5 t  full assembly                                            multi-source
```

**Why we trust the L vs L-1 split:** The operator brochure correction
(2026-05-11) resolves the contradiction we observed across our search
corpus, where some sources cited "24 t on board" and others "30.9 t at
16.5 t/axle" for "the GMK5150L". The cleanest explanation is that the
search summaries conflated the two variants. The brochures separate
them. LIFTIQ's data model should preserve that separation.

**Why the 24 t row is review-gated:** Our environment could not
directly fetch any Manitowoc PDF (HTTP 403). The 24 t value attaches to
the L variant on the user's authority. Until the L brochure is
re-confirmed on a non-restricted network, any LIFTIQ rule that uses the
24 t value should display the source URL and "REVIEW REQUIRED — confirm
on Manitowoc GMK5150L brochure" alongside the result.

**Why the 7.9 t "boom-over-front" figure is excluded from the seed:**
Single source ([heavyequipmentguide-via-search]); definition of
"boom-over-front <12 t/axle" relative to the documented 10.2 t at 12 t/axle
taxi state is unclear. We've recorded it in the source register
(`SRC-008`, review-gated) but not seeded it as a travel state.

### 4.2 What LIFTIQ does at job time

For each job, the dispatcher (or import flow) provides:

- **The exact crane model** (a `crane_models` row).
- **The selected travel state** (a `crane_model_travel_states` row tied
  to that model). If the model has no travel states, LIFTIQ surfaces
  "manual transport review required" and does not compute.
- **The counterweight required by the lift study** (an input or
  imported value; LIFTIQ does not derive this from a load chart in
  Phase 1).

LIFTIQ then computes:

```
counterweight_to_transport_tonnes
  = max(0, counterweight_required - selected_state.carried_counterweight_tonnes)
```

If `selected_state.review_required = true`, LIFTIQ surfaces the result
*and* the review gate. The dispatcher cannot dismiss the gate without
acknowledging it, and the acknowledgment is recorded as an audit event.

### 4.3 Consequences in the rules engine

- A model with no travel states (LTM 1160-5.2, LTM 1100-5.2, AC 5.220L-1
  in the current seed) cannot be auto-allocated through the transport
  flow. The dispatcher gets a "manual transport review required" prompt
  with a link to the model's source URL.
- A model with one or more travel states still requires the dispatcher
  to select WHICH state at job time. LIFTIQ does not auto-pick.
- The selected state is snapshotted onto the allocation record so the
  audit trail can answer "which travel state and source supported this
  decision?" months later, even if the seed data has since been edited.

### 4.4 What the documented Grove numbers mean operationally (per variant)

#### GMK5150L (the original L variant)

| Carried CW | Axle basis            | Confidence  | Transport implication |
| ---------- | --------------------- | ----------- | --------------------- |
| 10.2 t     | 12 t/axle             | Medium      | Standard general-access jurisdictions; small CW gap if lift requires more |
| 24.0 t     | 16.5 t/axle (review)  | Low-medium  | Class 1 SPV access; planning-state attribution to L variant pending brochure confirmation |
| 44.5 t     | N/A (full assembly)   | High        | All CW arrives at site; normally split across crane + ≥1 support load |

#### GMK5150L-1 (the successor variant)

| Carried CW | Axle basis            | Confidence  | Transport implication |
| ---------- | --------------------- | ----------- | --------------------- |
| 10.2 t     | 12 t/axle             | Medium      | Standard general-access jurisdictions |
| 30.9 t     | 16.5 t/axle           | Medium      | Class 1 SPV access; reduced heavy-roadable state for L-1 |
| 44.5 t     | N/A (full assembly)   | High        | All CW arrives at site; normally split across crane + ≥1 support load |

**These tables are not interchangeable.** The 24 t row belongs to the
L; the 30.9 t row belongs to the L-1. LIFTIQ enforces this through the
`crane_model_id` FK on `crane_model_travel_states` — a travel state
cannot be referenced from a job that selected a different crane_model.

The 7.9 t "boom-over-front <12 t/axle" figure (single source,
[heavyequipmentguide-via-search]) is **not** seeded as a travel state.
It's recorded in the source register (`SRC-008`, review-gated) and can
be promoted to a real row only after the brochure clarifies its
relationship to the 10.2 t at 12 t/axle taxi state.

This per-variant table set is the basis of the rule engine in §9.

---

## 5. Transport requirement model

### 5.1 What Australian crane companies actually transport

Across the WebSearch corpus we found these transport asset types
referenced by Australian providers:

- **Counterweight semi-trailer / crane support trailer** — purpose-built
  for ballast and crane components. TRT Australia 3-axle units described
  as supporting payloads up to ~30 t with low tare
  ([trt-via-search][trt-via-search]).
- **Flatbed / drop-deck / low loader / float** — for boom-mounted
  attachments, jib sections, or counterweight that cannot fit a standard
  semi.
- **Dolly truck / boom dolly** — distributes long-boom load across an
  additional set of wheels; explicitly recognised in NSW as part of a
  "crane-and-dolly" SPV combination ([nhvr-nsw-crane-dolly]).
- **Rigging truck / support truck** — separate vehicle for slings, hooks,
  shackles, blocks, mats, packing, fly-jib sections.
- **Pilot / escort vehicles** — required above certain widths; thresholds
  in §6.

### 5.2 LIFTIQ transport-requirement rule (Phase 1)

```
INPUT
  counterweight_required_tonnes        (number, may be unknown)
  carried_counterweight_tonnes         (number, fleet-specific)
  brief.travel_required                (bool)
  brief.transport_loads_specified      (number, optional)
  job.crane_class_required             (string)
  job.has_lift_study                   (bool)

DERIVE
  counterweight_to_transport_tonnes =
    max(0, counterweight_required − carried_counterweight)
      when counterweight_required is known.
    Otherwise = unknown.

  requires_counterweight_transport = counterweight_to_transport_tonnes > 0

  estimated_transport_loads (HINT ONLY, not a quote):
    If counterweight_to_transport_tonnes is unknown → unknown.
    If counterweight_to_transport_tonnes ≤ assumed_semi_payload_threshold_t
        (configurable per company, default UNSET — must be set with source)
      → 1 likely load (subject to fleet confirmation).
    Else → "≥2 loads or heavy haulage review".

  support_truck_required = requires_counterweight_transport
                           OR brief.travel_required
                           OR job.crane_class_required ≥ 100t

  transport_review_required =
    requires_counterweight_transport
    OR job.crane_unknown
    OR job.in_WA OR job.in_NT
    OR brief.mentions("float|low loader|OSOM|permit|restricted access")
    OR carried_counterweight_tonnes_source_confidence < high
```

The point of `estimated_transport_loads` being a **hint, not a quote**:
LIFTIQ surfaces "1 load likely / multiple loads likely / heavy-haulage
review" to the dispatcher, who confirms with their transport sub-contractor.
LIFTIQ does not bind the operator to a number.

`assumed_semi_payload_threshold_t` is intentionally not seeded. The brief
explicitly warned "Do not hardcode payload values unless sourced." TRT's
~30 t counterweight semi figure is the only data point we found, and it
is one supplier. Each LIFTIQ customer should set this per their actual
fleet/contractor combinations.

### 5.3 Crew implications

If `requires_counterweight_transport`, LIFTIQ should add to the job's
crew roster a *transport-side* role set:

- **Truck driver** (likely 1 per load).
- **Rigger** (1, often shared between crane and transport; check role
  matrix).
- **Crane operator** is required to assemble counterweight on site.
- **Dogman** is required for assembly lifts.

LIFTIQ already maps `crew_roles_required` per job — extending that with
transport-driver and pilot-vehicle-driver roles is a small data-model
extension, not a new system. See §8.

---

## 6. NHVR / Australian road access considerations

### 6.1 The boundary LIFTIQ must respect

LIFTIQ is decision *intelligence*. It is not a permit issuer, route
planner, or compliance authority. Every NHVR / state authority claim
below is subject to direct verification before LIFTIQ encodes it as a
hard rule. The language LIFTIQ surfaces to the dispatcher must remain in
the "review required" register, never the "approved" register:

- **Use:** "Road access review required",
  "NHVR / state notice or permit check may be required",
  "Confirm route, vehicle combination, axle masses, and dimensions
  before dispatch".
- **Do not use:** "Permit approved", "Compliant", "Legal to travel",
  "Safe to dispatch".

### 6.2 Prescribed mass / dimension thresholds for a General Access Vehicle

These are the values that LIFTIQ may treat as *seed assumptions* for
flagging — every value must be re-checked against the cited NHVR page
before LIFTIQ encodes a hard threshold.

| Limit | Stated value | Source (search snippet) | Confidence |
| ----- | ------------ | ------------------------ | ---------- |
| Width | 2.5 m (excluding mirrors, signalling, anti-skid, CTIS, curtain-side devices, with overall ≤2.55 m) | [NHVR General Access via search][nhvr-gma-via-search] | Medium |
| Width substantial breach threshold | >40 mm excess of max | [NHVR General Access via search][nhvr-gma-via-search] | Low (single search snippet) |
| Height (current) | 4.3 m | [NHVR / reform via search][nhvr-reform] | Low (mixed in with reform discussion) |
| Length (current) | 19 m | [NHVR / reform via search][nhvr-reform] | Low (single snippet) |
| Proposed reform: height | 4.6 m | [NHVR / reform via search][nhvr-reform] | Low — "subject to ministerial approval" per snippet |
| Proposed reform: length | 20 m | [NHVR / reform via search][nhvr-reform] | Low — same |

**LIFTIQ implementation guidance:** Encode these as *config*, not
constants in code. The 2026 reform status is the kind of moving target
that should never be hard-coded.

### 6.3 Class 1 Special Purpose Vehicle (mobile crane) — width and pilots

| Width band | Pilot requirement (per WebSearch summary) | Source |
| ---------- | ----------------------------------------- | ------ |
| ≤ 3.1 m | No pilots required (and mobile crane may travel sunset to sunrise) | [NHVR Class 1 SPV 2026 No.1 / Operator's Guide via search][nhvr-c1spv-notice] |
| > 3.1 m and ≤ 3.5 m | 2 pilots | [NHVR Class 1 SPV 2026 No.1 via search][nhvr-c1spv-notice] |
| > 3.5 m | Out of scope of this notice — separate permit/OSOM review | (not in search snippet, infer from notice structure) |

A 2.75 m wide GMK5150L is comfortably in the "≤3.1 m, no pilots" band on
width alone — but width is one of several conditions and route, mass,
and time-of-day still need a review.

The current governing instrument is the **National Class 1 Special
Purpose Vehicle (up to 40 t total mass) Mass and Dimension Exemption
Notice 2026 (No. 1)** — URL slug `C2026G00055` ([nhvr-c1spv-notice]).
LIFTIQ should reference this notice by name and slug in any
transport-review prompt; let the dispatcher open it and confirm.

### 6.4 State exclusions and special schemes

LIFTIQ rule: **if job is in WA or NT, always show "apply via state
authority — NHVR Go does not service this jurisdiction"**. This is per
search-result summaries of NHVR / Main Roads WA pages
([mainroadswa][mainroadswa], [nhvr-c1spv-notice][nhvr-c1spv-notice]).

State-specific schemes that LIFTIQ should be aware of and may surface as
"applicable scheme: …" hints (but never auto-decide):

- **NSW** — Class 1 All-Terrain Mobile Crane and Dolly Combination —
  vehicles must enrol in IAP or TMA; operators self-declare configuration
  prior to travel ([nhvr-nsw-crane-dolly]).
- **NSW** — IAP/TMA telematics monitoring schemes apply for SPV mobile
  cranes ([nhvr-nsw-crane-dolly][nhvr-nsw-crane-dolly], [tca-tma][tca-tma-spv]).
- **VIC** — *Victoria's 6-to-9-axle all-terrain mobile crane network* via
  NHVR permit, GVM ≤ 108 t, no per-route bridge assessment on the
  published network ([vicroads-crane-network]).
- **QLD** — Class 1 Mobile Crane SPV stage of the Class 1 Heavy Vehicle
  Access Regime (Stage 2/3); telematics under TMA mandatory in future
  ([qld-tmr-class1]).
- **SA** — *South Australia Class 1 2-Axle up to 28 t Articulated
  Steering Crane Mass and Dimension Exemption Notice 2026 (No. 1)*
  (`C2026G00060`) and *South Australia Class 1 6-Axle to 9-Axle Crane Mass
  and Dimension Exemption Notice 2026 (No. 1)* (`C2026G00062`)
  ([nhvr-sa-2axle][nhvr-sa-2axle], [nhvr-sa-6to9axle][nhvr-sa-6to9axle]).
- **WA** — Main Roads WA RAV/Permit Order Scheme. Restricted Access
  Vehicle (RAV) framework; apply directly, not via NHVR Go.
- **NT** — Apply directly, not via NHVR Go.

### 6.5 What LIFTIQ shows the dispatcher (proposed copy)

| Condition | Banner / label LIFTIQ surfaces |
| --------- | ------------------------------ |
| Counterweight transport required | "Counterweight transport required — confirm support trailer and crew before dispatch." |
| Crane crosses state border | "Multi-jurisdiction transport — confirm permit/notice coverage in each state before dispatch." |
| Job in WA or NT | "WA/NT route — apply via state road authority (NHVR Go does not service this jurisdiction)." |
| Crane width >3.1 m claimed | "Width >3.1 m — Class 1 SPV pilot review required (per Notice 2026 No. 1)." |
| Brief mentions float/low loader/restricted access | "Brief indicates restricted-access transport — NHVR / state route check required." |
| Crane model unknown to LIFTIQ | "Crane model not in fleet register — manual transport review required." |

None of these say "approved", "compliant", or "safe". All push the
decision back to the dispatcher with the right cue.

---

## 7. Australian crane hire quoting patterns

### 7.1 Fields seen across multiple Australian crane hire / aggregator pages

Aggregator and individual hire pages reviewed via WebSearch:
**iSeekplant** ([iseekplant][iseekplant-crane-hire]),
**Cranelift.au** ([cranelift][cranelift-rates]),
**Felix.net** ([felix][felix-rates]),
**Universal Cranes** ([universalcranes][universal-fleet]),
**Cranecorp Australia** ([cranecorp][cranecorp-services]),
**Wanneroo Crane Hire** ([wanneroo][wanneroo-prices]),
**AOR Cranes** ([aor][aor-wet-dry]),
**HiLine Cranes** ([hiline][hiline-sydney]),
**AGL Cranes** ([agl][agl-allterrain]),
**Borger Cranes** (fleet pages — could not be fetched but appear in
search corpus),
**ABC Crane Hire** ([abc][abc-budget-2026]).

### 7.2 Quote field summary

| Field | Seen on (≥) | Why it matters | LIFTIQ recommendation |
| ----- | ----------- | -------------- | --------------------- |
| Crane size / class | All sources | Drives every downstream cost and the SmartRank fleet match | Already in LIFTIQ job model (`crane_class_required`) |
| Lift weight (per pick) | Felix, iSeekplant, Cranelift | Sizes the crane | Add `lift_weight_tonnes` (per-pick or job-max) |
| Radius (per pick) | Felix, iSeekplant, Universal | With lift weight, determines whether the picked crane has the capacity | Add `radius_m` |
| Hook height / reach | Universal, Felix | Determines boom and jib config | Add `hook_height_m` |
| Site address | All sources | Drives mobilisation distance and access review | Already implicitly in job model — promote to required field |
| Site access notes (driveway, overhead power, ground bearing) | All sources | Drives crane class choice and lift study trigger | Add `site_access_notes` free-text + a structured `access_constraints` enum (overhead_power, narrow_access, soft_ground, restricted_height, restricted_width) |
| Wet hire vs dry hire | AOR, Cranecorp, Cranelift | Drives crew allocation logic | Add `hire_type` (wet/dry); default wet |
| Operator + dogman + rigger | All sources ("99% wet hire includes these") | Crew roster auto-populated from this | LIFTIQ already supports crew roles; just default operator+dogman for wet hire |
| Lift study / engineered lift plan | Cranecorp, AOR, Cranelift | "Critical lift" trigger; extra cost; extra time | Add `lift_study_required` bool + `lift_risk_level` already in job model |
| Permits (council, road, OSOM) | All sources | Extra cost, extra lead time, mandatory for some routes | Add `permit_review_required` bool (auto-set from transport rules) |
| Traffic management | Cranecorp, Cranelift, Universal | Extra subcontractor cost | Add `traffic_management_required` bool |
| Travel / mobilisation distance | All sources | Mileage-based cost; bundles with state-border review | Compute from `site_address` and crane depot; manual override allowed |
| Demobilisation | All sources | Same as mobilisation, end-of-job | Same field |
| Minimum hire period (e.g. 3–4 h or 2 h wet, 1 mo dry) | Cranecorp, Cranelift | Quote floor | Add `min_hire_period_hours` per fleet entry (not per job) |
| Standby time | Felix, Cranelift | Hourly accumulator when crane is on-site idle | Phase 1: capture as free-text or scheduled hours; Phase 2: structured |
| Overtime / weekend / night | Felix, Cranelift, AOR | Premium rates | Add `shift_type` already in job; default day shift; night/weekend triggers premium flag |
| Fuel | Felix, Cranelift | Often a line item, often GST-relevant | Phase 1: out of scope for LIFTIQ; flag during transport review |
| GST | Felix | All quotes must state it | Out of scope for LIFTIQ Phase 1 |
| Number of picks | iSeekplant | Drives hours on site | Already implicit; can be a derived metric |

### 7.3 What LIFTIQ does NOT need to capture in Phase 1

- Day rates and hourly rates (we are not a quote engine in Phase 1).
- Fuel surcharges.
- GST handling.
- Subcontractor margin allocation.

LIFTIQ's value is in the *configuration and dispatch decision*, not the
quoting math. Stay on that side of the line for Phase 1.

---

## 8. Data fields LIFTIQ should capture (Phase 1 scope)

The following supplements the existing Phase 1 schema (Company, Worker,
Credential, Fatigue, Job, Allocation, AuditEvent, Metrics). All new
fields below are *optional* in Phase 1 — if the dispatcher leaves them
blank, LIFTIQ does not infer; it shows the "Counterweight not assessed"
/ "Transport review required" labels as appropriate.

### 8.1 `crane_models` (parent entity, new)

One row per exact manufacturer × model × variant. **No** roadable or
carried counterweight columns at this level — those live in the child
table. The parent holds only attributes that don't vary by travel state.

```
crane_models
  id                                  PK         e.g. "crane.grove.gmk5150l-1"
  manufacturer                        text       e.g. "Grove"
  model                               text       e.g. "GMK5150L-1"
  variant                             text       e.g. "L-1"  (nullable for original variants)
  nominal_capacity_tonnes             real
  max_counterweight_tonnes            real       full-assembly total (NOT roadable)
  transport_length_m                  real       nullable
  transport_width_m                   real       nullable
  transport_height_m                  real       nullable
  gross_vehicle_weight_tonnes         real       nullable
  axle_count                          integer
  axle_configuration_notes            text
  production_years                    text
  notes                               text
  source_url                          text       REQUIRED
  source_capture_date                 date       REQUIRED
  source_confidence                   text       high | medium | low
  review_required                     boolean    true if ANY parent attribute is below medium confidence
  created_at                          timestamp
  updated_at                          timestamp
```

### 8.2 `crane_model_travel_states` (child entity, new — CEO decision 2026-05-11)

One row per documented travel state per crane_model. Each row carries
its own source citation and review gate. **Phase 1 ships this child
table from day one** — collapsing travel states into a single
roadable column on `crane_models` is forbidden by the data model
because it loses per-variant per-axle-limit distinctions and breaks the
audit trail.

```
crane_model_travel_states
  id                                  PK
  crane_model_id                      FK → crane_models  (NOT NULL)
  state_label                         text       e.g. "12 t/axle taxi configuration"
  carried_counterweight_tonnes        real       NOT NULL
  axle_basis                          text       e.g. "12 t/axle", "16.5 t/axle", "N/A"
  roadability_basis                   text       free text describing the road regime
  source_url                          text       REQUIRED
  source_capture_date                 date       REQUIRED
  source_confidence                   text       high | medium | low | low-medium
  review_required                     boolean    REQUIRED — true gates LIFTIQ automation
  notes                               text       free text — must explain any review gate
  created_at                          timestamp
  updated_at                          timestamp

  UNIQUE (crane_model_id, state_label)
```

A model with **zero** travel-state rows is not auto-eligible for
counterweight-transport calculation. The rules engine treats absence as
"manual transport review required" (see R1, R2, R11 in §9).

### 8.3 `JobCraneRequirement` (new entity, 1:1 with Job)

The job-side requirement carries *snapshots* of the selected travel
state so audit trails survive future edits to the seed data.

```
JobCraneRequirement
  id                                              PK
  job_id                                          FK → Job
  crane_model_id                                  FK → crane_models           (nullable)
  selected_travel_state_id                        FK → crane_model_travel_states (nullable)
  -- Snapshots from the selected travel state at decision time:
  selected_state_label                            text         (snapshot)
  selected_state_carried_counterweight_tonnes     real         (snapshot)
  selected_state_axle_basis                       text         (snapshot)
  selected_state_source_url                       text         (snapshot)
  selected_state_source_confidence                text         (snapshot)
  selected_state_review_required                  boolean      (snapshot)

  crane_class                                     text         (free, used when model unknown)
  required_capacity_tonnes                        real         (nullable, from lift study)
  lift_weight_tonnes                              real         (nullable)
  radius_m                                        real         (nullable)
  hook_height_m                                   real         (nullable)
  counterweight_required_tonnes                   real         (nullable; from lift study)
  counterweight_to_transport_tonnes               real         (derived; nullable)
  requires_counterweight_transport                boolean
  support_truck_required                          boolean
  estimated_transport_loads                       integer      (nullable hint, not authoritative)
  transport_review_required                       boolean
  route_review_required                           boolean
  osom_review_required                            boolean
  permit_review_required                          boolean
  site_access_notes                               text
  setup_notes                                     text
  manual_review_reason                            text         REQUIRED when any *_review_required = true
  created_at                                      timestamp
  updated_at                                      timestamp
```

### 8.4 `TransportRequirement` (new entity, 1:N from Job)

```
TransportRequirement
  id                                  PK
  job_id                              FK → Job
  transport_type                      text   one of: counterweight, support, dolly,
                                              flatbed, low_loader, float, pilot, escort, other
  load_description                    text
  estimated_tonnes                    real   nullable
  vehicle_type                        text   e.g. "3-axle counterweight semi-trailer"
  driver_required                     boolean
  rigger_required                     boolean
  pilot_or_escort_review              boolean
  nhvr_review_required                boolean
  state_authority_review_required     boolean
  notes                               text
  created_at                          timestamp
  updated_at                          timestamp
```

### 8.5 Read-only audit events the Phase 1 backend should append

Extend the existing `audit_events.event_type` enum with:

- `crane_model_assigned`                       (payload: crane_model_id, source_url)
- `crane_unknown_flagged`                      (payload: free-text crane_class supplied)
- `travel_state_selected`                      (payload: state_id, snapshot)
- `travel_state_not_selected_flagged`          (payload: crane_model_id)
- `model_has_no_travel_states_flagged`         (payload: crane_model_id, source_url)
- `selected_state_review_gate_acknowledged`    (payload: snapshot, manual_review_reason)
- `counterweight_estimated`                    (payload: required, carried, to_transport)
- `counterweight_assessment_missing`           (payload: job_id)
- `transport_review_flagged`                   (payload: trigger_rule, manual_review_reason)
- `route_review_flagged`
- `osom_review_flagged`
- `state_authority_review_flagged`
- `pilot_review_flagged`

Payload should include the values that drove the flag (crane_model_id,
selected travel state snapshot, counterweight required/carried/to_transport,
axle basis, source URLs, source confidence, manual review reason where
applicable). The append-only invariant from PR #8 must be preserved.

---

## 9. Rules engine assumptions (Phase 1)

The rules below are intentionally conservative. Every "review" rule
exists because LIFTIQ should never silently approve a marginal case. All
counterweight rules now key off the **selected travel state**, not the
crane_model alone.

```
R1.  IF jcr.crane_model_id IS NULL
     THEN flag crane_unknown_flagged
     AND  set transport_review_required = true
     AND  set manual_review_reason = "Crane model not in fleet register"
     AND  show "Crane model not in fleet register — manual transport review required."

R2.  IF jcr.counterweight_required_tonnes IS NULL
     THEN set counterweight_assessment_missing = true
     AND  show "Counterweight not assessed."

R3.  IF jcr.crane_model_id IS NOT NULL
     AND jcr.selected_travel_state_id IS NULL
     THEN flag travel_state_not_selected
     AND  set transport_review_required = true
     AND  set manual_review_reason = "Travel state not selected for the chosen crane model"
     AND  show "Select a travel state for this crane (taxi vs reduced heavy-roadable
              vs full assembly) before counterweight transport can be estimated."

R4.  IF jcr.crane_model_id IS NOT NULL
     AND model has zero travel_state rows
     THEN flag model_has_no_travel_states
     AND  set transport_review_required = true
     AND  set manual_review_reason = "Crane model has no documented travel states"
     AND  show "This model has no documented travel states — manual transport review required."

R5.  IF jcr.counterweight_required_tonnes
     >  jcr.selected_state_carried_counterweight_tonnes  (snapshot)
     THEN set requires_counterweight_transport = true
     AND  set counterweight_to_transport_tonnes = required − selected_state.carried
     AND  append TransportRequirement(transport_type='counterweight',
                                      estimated_tonnes=to_transport)
     AND  set support_truck_required = true.

R6.  IF jcr.selected_state_review_required = true   (snapshot)
     THEN set transport_review_required = true
     AND  set manual_review_reason = "Selected travel state is review-gated (see source: <url>)"
     AND  show "Counterweight value for this travel state is review-gated —
              confirm against source brochure before dispatch."

R7.  IF jcr.crane_class hints OSOM (e.g. ≥130 t)
     OR  model.transport_width_m > 2.5
     OR  model.transport_height_m > 4.3
     OR  model.gross_vehicle_weight_tonnes > 42.5  (general access GCM proxy — verify)
     THEN set osom_review_required = true
     AND  show "NHVR / state notice or permit check may be required."

R8.  IF model.transport_width_m > 3.1
     THEN set pilot_review = true
     AND  show "Width >3.1 m — Class 1 SPV pilot review required (per
              Notice 2026 No. 1)."

R9.  IF job.site_location is in WA or NT
     THEN set state_authority_review_required = true
     AND  show "WA/NT route — apply via state road authority (NHVR Go
              does not service this jurisdiction)."

R10. IF brief.notes contains any of {"float", "low loader", "counterweight",
                                     "transport", "restricted access",
                                     "OSOM", "permit", "bridge", "escort"}
     THEN set transport_review_required = true.

R11. IF requires_counterweight_transport
     THEN job.schedule must include a mobilisation_window
                                AND a demobilisation_window.

R12. IF transport_review_required OR osom_review_required
        OR state_authority_review_required OR jcr.selected_state_review_required
     THEN AuditIQ event emitted at SmartRank time AND at allocation time
     AND  the allocation cannot complete until the dispatcher has
          recorded a `manual_review_reason`.
```

Every rule above is *gated*, not *deciding*. LIFTIQ flags the dispatcher;
the dispatcher confirms.

### Why the travel-state child table changes the rules

- R3 / R4 are entirely new and exist because the data model now
  distinguishes between (a) "crane model unknown", (b) "crane model
  known, travel state not selected", and (c) "crane model known, has no
  travel states defined". Each needs a different prompt.
- R5 / R6 reference `selected_state.carried_counterweight_tonnes` and
  `selected_state.review_required`, both as snapshots on the
  `JobCraneRequirement` row. This is what gives the audit trail its
  "which travel state and source supported this decision?" answer
  months later.
- R12 hard-stops the allocation when any review flag is set without a
  recorded reason. The dispatcher must type why they're proceeding, and
  that reason becomes part of the immutable audit record.

### Notable defaults

- `assumed_semi_payload_threshold_t` — **no default**. Must be set per
  fleet/contract (e.g. 30 t for TRT 3-axle CW semi if the company uses
  TRT trailers).
- 12 t/axle vs 16.5 t/axle "default" axle limit — **no default**. Each
  travel-state row carries its own `axle_basis`; the dispatcher's choice
  of state implies the axle limit.
- "1 load vs multiple loads" — only computed if payload threshold is
  set; otherwise show "Number of transport loads not estimated."

---

## 10. Risk / uncertainty notes

| Risk | Why it matters | Mitigation in Phase 1 |
| ---- | -------------- | --------------------- |
| WebFetch could not access any primary sources in this environment. | Every spec/regulation in this pack is derived from search-result extracts, not full-page reads. | Source URLs preserved in `liftiq-crane-transport-source-register.csv`. Customer / developer must verify on their own network before encoding any number as a constant. |
| The GMK5150L's 24 t at 16.5 t/axle is attributed to the L variant on operator authority, not on a directly-fetched brochure. | Could mislead automation if the L brochure actually documents a different value. | Travel-state row `review_required = true`. R6 will surface the gate; dispatcher must record a reason. |
| The GMK5150L-1's 30.9 t at 16.5 t/axle is multi-source via search summaries but the L-1 brochure was not directly readable. | Could be wrong on a future spec revision. | Verified against an Australian-hosted Grove product guide (URL `SRC-011`) at the next non-restricted access; until then, LIFTIQ accepts but logs the source URL on the snapshot. |
| LTM 1160-5.2 has no clean roadable-ballast number in our search corpus. | Can't drive automation. | Seeded as parent only, **0 travel-state rows**. R4 will surface "no travel states defined" gate when the dispatcher selects this model. |
| LTM 1100-5.2 max counterweight (35 t) extracted but no roadable basis. | Same as above. | Same — parent only, no travel states, R4 path. |
| Tadano AC 5.220L-1 cited "stays under 12 t axle load limit" but carried CW value not extracted. | Same. | Same — parent only, no travel states. |
| Grove GMK4100L-1 has 0.8–26.2 t counterweight range documented but no per-axle-limit basis. | The seed has a single `(unspecified axle basis)` travel-state row marked review-gated; rule R6 will surface the gate. | Per-axle-limit travel states need to be confirmed against the GMK4100L-1 brochure on next access. |
| 2026 HVNL/MDL reforms (length 19 m → 20 m, height 4.3 m → 4.6 m) are described in search snippets as "subject to ministerial approval"; the user notes "1 July 2026 reform changes are in flight". | Hard-coding reform values could be wrong on the day they go live or are deferred. | Encode all thresholds as config, not code. Add a `regulation_effective_date` column on any threshold row. Schedule a dated review of NHVR before each LIFTIQ release. |
| State-by-state divergence (WA, NT, SA notices, NSW IAP/TMA, QLD HVAMS staging, VIC 6-to-9-axle network). | A single national rule will miss cases. | LIFTIQ defers to a "state_authority_review_required" prompt rather than deciding state-by-state automatically. |
| OSOM permit decisions involve route, axle mass, bridge ratings, and time-of-day. | LIFTIQ cannot model bridges or route conditions in Phase 1. | LIFTIQ flags "route review required" and never claims a permit is in place. |
| Pilot/escort thresholds may change between notices. | The 3.1 m / 3.5 m thresholds are from search snippets of one notice. | Cite Notice 2026 No. 1 by slug; do not strand the rule from its source. |
| The Liebherr LTM 1150-5.3 "9 t ballast on public roads" figure is single-source. | If this seeds an automated rule it could mislead. | Travel-state row `review_required = true`. R6 will surface the gate. |
| GMK5150L gross vehicle weight could not be reliably extracted. | Without GVM we cannot fully reason about general-access compliance. | GVM left nullable in `crane_models`; rule R7 uses other proxies. |
| Manitowoc "boom-over-front 7.9 t at <12 t/axle" figure is single-source and may reflect a *different* configuration definition than 10.2 t at 12 t/axle. | Surfaces a real ambiguity in how "carried counterweight" is defined across documents. | Not seeded as a travel state. Captured in source register `SRC-008` as review-gated; can be promoted to a real travel-state row only after the brochure clarifies its relationship to the 10.2 t taxi state. |
| Support-load count remains an estimate-only hint until the nominated support vehicle/trailer combination is known per customer/contract. | A wrong default load count could trigger over- or under-mobilisation. | `assumed_semi_payload_threshold_t` has no default in the seed; each LIFTIQ customer sets it themselves with a source. |

---

## 11. Recommended Phase 1 implementation scope

### In scope

1. **`crane_models` parent entity** per §8.1 — one row per exact
   manufacturer × model × variant. Seeded from
   `liftiq-crane-model-seed-data.csv` (7 rows in the current seed:
   GMK5150L, GMK5150L-1, GMK4100L-1, LTM 1150-5.3, LTM 1160-5.2,
   LTM 1100-5.2, AC 5.220L-1). Every parent row carries
   `source_url`, `source_capture_date`, `source_confidence`, and
   `review_required`.
2. **`crane_model_travel_states` child entity** per §8.2 — one row per
   documented travel state per crane model. Seeded from
   `liftiq-crane-model-travel-states.csv` (8 rows in the current seed,
   covering only the models with reliable per-state values: GMK5150L (3),
   GMK5150L-1 (3), GMK4100L-1 (1 review-gated), LTM 1150-5.3 (1
   review-gated)). Models with no travel-state rows force R4's "manual
   review required" path. **No travel state may share carried-CW values
   across model variants** — that's enforced by the data model
   (separate `crane_model_id` FKs per variant).
3. **`JobCraneRequirement` entity** as in §8.3, attached 1:1 to the
   existing `Job`. The dispatcher must select both a crane_model AND a
   travel_state at job time; the snapshots of the selected state's
   `carried_counterweight_tonnes`, `axle_basis`, `source_url`,
   `source_confidence`, and `review_required` are written onto the row
   so the audit trail survives future seed-data edits.
4. **`TransportRequirement` entity** as in §8.4, attached 1:N to Job.
   Auto-created by Rules R5/R7/R8/R9/R10 with the dispatcher able to
   accept or edit.
5. **Rules engine R1–R12** in §9. All rules are *flag-and-surface*, none
   are *decide-and-act*. R12 hard-stops allocation when any review flag
   is set without a recorded `manual_review_reason`.
6. **Audit events** extended per §8.5. Every flag emission and every
   review-gate acknowledgment is auditable (append-only per the existing
   AuditIQ invariant from PR #8).
7. **UI surfacing copy** per §6.5 — review-register language only, no
   approval-register language. Pilot UI (currently PR #9 work-in-progress)
   gains a "Crane & Transport" tab on the job detail screen with a
   travel-state selector wired to `crane_model_travel_states`.
8. **Source-citation discipline** — *every* numeric value on every
   parent or child row carries a `source_url` and `source_capture_date`.
   The two seed CSVs demonstrate the pattern. New rows must follow it.

### Out of scope for Phase 1 (defer to Phase 2 or later)

- Automated load-chart consumption (parse Manitowoc PDFs → derive
  counterweight at radius/boom).
- Route planning, bridge rating, ground-bearing analysis.
- Permit application workflow integration with NHVR Go or state portals.
- Pricing / quoting math (day rates, hourly rates, fuel, GST).
- Lift-plan / engineered lift-study generation.
- Telematics integration (IAP / TMA).
- Real-time mass-on-axle readings.
- Auto-selection of a travel state — the dispatcher always picks.
- Sharing a travel state between crane variants by reference — each
  variant carries its own rows.
- Auto-decisioning of any "compliant" / "approved" / "safe" verdict —
  permanently out of scope under the strategic boundary.

### Acceptance criteria for Phase 1 release of this feature

1. A dispatcher can attach a `crane_model` AND a `crane_model_travel_state`
   to a job and see, at SmartRank time, whether counterweight transport
   is required given the selected state's `carried_counterweight_tonnes`.
2. The dispatcher sees explicit review prompts (R1–R12) and cannot
   confirm an allocation when any review gate is open without recording
   a `manual_review_reason`.
3. Every flag is recorded as an append-only AuditEvent with the values
   that drove it, including the snapshot of the selected travel state.
4. Every numeric assumption is traceable to a `source_url` on either
   the originating parent or child row.
5. No screen, label, banner, or copy says "compliant" / "approved" /
   "safe to dispatch" / "legal to travel".
6. A model with zero travel-state rows (LTM 1160-5.2, LTM 1100-5.2,
   AC 5.220L-1 in the current seed) cannot complete the transport flow
   without manual review.

---

## 12. Sources table (summary; full register in CSV)

[cp-gmk5150l]: https://cranepedia.com/spec/all-terrain-crane/grove-gmk5150l/
[cp-gmk4100l-1]: https://cranepedia.com/spec/all-terrain-crane/grove-gmk4100l-1/
[cp-ltm-1150-5-3]: https://cranepedia.com/spec/all-terrain-crane/liebherr-ltm-1150-5-3/
[cm-gmk5150l]: https://cranemarket.com/specs/grove/gmk5150l
[cm-gmk4100l-1]: https://cranemarket.com/specs/grove/gmk4100l-1
[cm-ltm-1100-5-2]: https://cranemarket.com/specs/liebherr/ltm-1100-5-2
[mc-gmk5150l]: https://www.manitowoc.com/grove/all-terrain-cranes/gmk5150l
[mc-gmk5150l-search]: https://www.manitowoc.com/sites/default/files/media/divers/file/2020-01/GMK5150L-Product-Guide-Metric.pdf
[lectura-gmk5150l]: https://www.lectura-specs.com/en/model/cranes/all-terrain-cranes-grove/gmk5150l-1165923
[lectura-gmk5150l-1]: https://www.lectura-specs.com/en/model/cranes/all-terrain-cranes-grove/gmk5150l-1-11763429
[lectura-ltm-1100-5-2]: https://www.lectura-specs.com/en/model/cranes/all-terrain-cranes-liebherr/ltm-1100-5-2-1148030
[bigge-gmk4100l-1]: https://www.bigge.com/crane-information/grove-gmk4100l-1/
[bigge-ac-5-220l-1]: https://www.bigge.com/crane-information/tadano-ac-5-220l-1/
[liebherr-ltm-1150-5-3-via-search]: https://www.liebherr.com/en-int/mobile-and-crawler-cranes/mobile-cranes/ltm-mobile-cranes/ltm-1150-5-3-5387264
[liebherr-ltm-1160-5-2-via-search]: https://www.liebherr.com/en-int/mobile-and-crawler-cranes/mobile-cranes/ltm-mobile-cranes/ltm-1160-5-2-5387265
[cm-ltm-1160-5-2]: https://cranemarket.com/specs/liebherr/ltm-1160-5-2
[mc-gmk5150l-1]: https://www.manitowoc.com/grove/all-terrain-cranes/gmk5150l-1
[tadano-ac-5-220l-1]: https://group.tadano.com/uscan/en/lifting-equipment/all-terrain-cranes/ac-5-220l-1/
[kirbysmith-gmk5150l-1]: https://www.kirby-smith.com/products/details/grove-gmk5150l1
[ce-gmk5150]: https://www.constructionequipment.com/home/product/10751634/grove-grove-gmk5150-gmk5150l-all-terrain-cranes
[heavyequipmentguide-via-search]: https://www.heavyequipmentguide.ca/article/25756/grove-gmk5150l-and-gmk5250l-make-north-american-debut

[nhvr-gma-via-search]: https://www.nhvr.gov.au/road-access/mass-and-dimension/general-access-vehicle
[nhvr-dim]: https://www.nhvr.gov.au/road-access/mass-and-dimension/dimension-requirements
[nhvr-mass]: https://www.nhvr.gov.au/road-access/mass-and-dimension/mass-limits
[nhvr-osom]: https://www.nhvr.gov.au/road-access/access-management/applications/oversize-overmass
[nhvr-c1spv-notice]: https://www.nhvr.gov.au/C2026G00055-national-class-1-special-purpose-vehicle-up-to-40t-mass-mass-and-dimension-notice-2026-no1-operators-guide
[nhvr-reform]: https://www.nhvr.gov.au/road-access/mass-dimension-and-loading
[nhvr-hvnl-reform]: https://www.nhvr.gov.au/law-policies/hvnl-reform-implementation
[nhvr-pilot-permit]: https://www.nhvr.gov.au/road-access/mass-dimension-and-loading/classes-of-heavy-vehicles/providing-permit-copies-to-pilot-and-escort-vehicle-drivers
[nhvr-spv-permit]: https://www.nhvr.gov.au/road-access/access-management/applications/special-purpose-vehicle-permit
[nhvr-nsw-crane-dolly]: https://www.nhvr.gov.au/files/media/document/456/202406-1080-nsw-class1-all-terrain-mobile-crane-and-dolly-combination-operators-guide_0.pdf
[nhvr-sa-2axle]: https://www.nhvr.gov.au/C2026G00060-south-australia-class-1-2-axle-up-to-28t-articulated-steering-crane-mass-and-dimension-notice-2026-no1-operators-guide
[nhvr-sa-6to9axle]: https://www.nhvr.gov.au/C2026G00062-south-australia-class-1-6-axle-to-9-axle-crane-mass-and-dimension-exemption-notice-2026-no1-operators-guide
[tca-tma-spv]: https://tca.gov.au/scheme/tma-special-purpose-vehicle-monitoring-schemes-nsw/
[vicroads-crane-network]: https://www.vicroads.vic.gov.au/business-and-industry/heavy-vehicle-industry/heavy-vehicle-map-networks-in-victoria/cl1-spv-osom
[vicroads-crane-info]: https://www.vicroads.vic.gov.au/-/media/files/documents/business-and-industry/heavy-vehicle-maps/information-sheet---crane-network.ashx
[qld-tmr-class1]: https://www.tmr.qld.gov.au/business-industry/heavy-vehicles/class-1-heavy-vehicle-access-regime/heavy-vehicle-industry/vehicles-included
[mainroadswa]: https://www.mainroads.wa.gov.au/heavy-vehicles/permit-order-scheme/
[transport-nsw-mobile-crane]: https://www.transport.nsw.gov.au/operations/roads-and-waterways/business-and-industry/heavy-vehicles/road-access/mobile-cranes

[trt-via-search]: https://www.trtaustralia.com.au/trailers/crane-trailers/crane-support-trailers/
[austate-cw-trailers]: https://www.austateservices.com.au/counterweight-trailers
[iseekplant-crane-hire]: https://www.iseekplant.com.au/crane-hire
[cranelift-rates]: https://cranelift.au/crane-hire-rates-australia/
[felix-rates]: https://www.felix.net/project-news/crane-hire-rates-in-australia-a-comprehensive-guide
[universal-fleet]: https://universalcranes.com/our-fleet/
[cranecorp-services]: https://www.cranecorpaustralia.com.au/services/crane-hire/
[wanneroo-prices]: https://wanneroocranehire.com.au/crane-hire-perth/crane-hire-prices/
[aor-wet-dry]: https://aorcranes.com.au/dry-hire-and-wet-hire-in-crane-rental/
[hiline-sydney]: https://www.hilinecranes.com.au/
[agl-allterrain]: https://www.aglcranes.com.au/all-terrain-crane-hire
[abc-budget-2026]: https://www.abccranehire.com.au/planning-your-2026-build-how-to-budget-for-crane-hire-early/
[australiancranes-guide]: https://australiancranes.com.au/the-complete-guide-to-all-terrain-crane-hire-in-australia/

The full register (URL, source type, capture date, what was extracted,
confidence) lives in `research/liftiq-crane-transport-source-register.csv`.

---

## Final answer format (per brief)

### Executive verdict
LIFTIQ can usefully estimate counterweight transport needs at job-creation
time using a small flag-and-surface rules engine over a CraneModel /
JobCraneRequirement / TransportRequirement triplet. It must never claim
permit, compliance, or legality. It must source-cite every number it
displays. The Phase 1 increment described in §11 is implementable
against the existing Phase 1 backend with no new external integrations.

### Key researched rules
R1–R10 in §9. Every rule is gated and flag-only.

### Grove GMK5150L / GMK5150L-1 finding
Confirmed: 150 t capacity, 44.5 t total counterweight, 10.2 t roadable at
12 t/axle, 30.9 t roadable at 16.5 t/axle, 5-axle, 2.75 m wide, 60 m main
boom. The "24 t reduced counterweight" example in the brief is supported
by a single WebSearch hit and is not a manufacturer-published package;
LIFTIQ should model the documented configurations (10.2 / 30.9 / 44.5 t)
and treat 24 t as a *plausible operator-configured intermediate value*
requiring per-fleet source confirmation.

### NHVR boundary
LIFTIQ defers all permit / OSOM / route / pilot-escort decisions to the
NHVR portal, state authorities (WA/NT direct), and the named notices
(Class 1 SPV Notice 2026 No. 1; SA notices C2026G00060 and C2026G00062).
LIFTIQ surfaces "Road access review required" / "NHVR / state notice or
permit check may be required" and stops there.

### Australian quote pattern summary
The market is consistent on: crane class, lift weight, radius, hook
height, site address, access notes, wet-vs-dry hire, crew, lift study,
permits, traffic management, mobilisation/demobilisation, minimum hire,
overtime, fuel. LIFTIQ already covers the lift side. The gap is the
*transport-and-counterweight* side, addressed by the new entities and
rules in §8 and §9.

### Recommended LIFTIQ implementation scope
See §11. Build the CraneModel / JobCraneRequirement / TransportRequirement
trio, R1–R10 rules, and review-register UI copy. Do not build
load-chart parsing, route planning, permit workflow, or pricing math.

### Source files created
- `research/liftiq-crane-counterweight-transport-research.md` (this file)
- `research/liftiq-crane-model-seed-data.csv` (parent — `crane_models`)
- `research/liftiq-crane-model-travel-states.csv` (child —
  `crane_model_travel_states`, new in this revision)
- `research/liftiq-crane-transport-source-register.csv`

### Open questions / low-confidence areas
1. Confirmation against the GMK5150L Manitowoc brochure (`SRC-011`,
   `SRC-012`) that the 24 t at 16.5 t/axle travel state belongs to the
   L variant and not the L-1.
2. Confirmation against the GMK5150L-1 Manitowoc brochure that the
   30.9 t at 16.5 t/axle state is documented for the L-1 variant.
3. Current legal status of the 2026 HVNL/MDL Regulation reforms
   (length 19 m → 20 m; height 4.3 m → 4.6 m); user noted "1 July 2026
   reform changes are in flight".
4. Roadable ballast value(s) for the LTM 1160-5.2 (currently 0
   travel-state rows) so the model can move from review-only to
   automation-eligible.
5. Roadable counterweight basis for LTM 1100-5.2, AC 5.220L-1, and
   GMK4100L-1 (per-axle-limit rows) — all currently review-gated.
6. Exact axle-by-axle GVM for the GMK5150L and GMK5150L-1.
7. Australian typical counterweight-semi-trailer payload bracket — TRT
   3-axle ~30 t is one data point. Each LIFTIQ customer should set
   `assumed_semi_payload_threshold_t` themselves per their fleet contract.
8. Whether QLD's HVAMS Stage 2/3 for Class 1 Mobile Crane SPVs is in
   force at the time of LIFTIQ implementation.
9. NHVR pilot/escort thresholds for cranes wider than 3.5 m.

### Next Codex build prompt inputs
- DDL for `crane_models` + `crane_model_travel_states` +
  `JobCraneRequirement` + `TransportRequirement` (extend
  `backend/src/schema.sql`).
- Seed migration from `research/liftiq-crane-model-seed-data.csv` AND
  `research/liftiq-crane-model-travel-states.csv` into the two new
  tables.
- Pure-function rule engine `backend/src/services/transport-review.js`
  implementing R1–R12 with the same testability stance as
  `credential-gate.js` and `fatigue-guard.js` from PR #8. Rule input
  must be `(job, jcr_with_state_snapshot)`, never the live travel-state
  row, so audit history survives seed edits.
- Audit-event type additions per §8.5 (extend the `event_type` CHECK
  constraint and add tests).
- Pilot UI surfacing copy from §6.5 added to the job detail screen
  (extends the PR #9 work currently stashed). Travel-state selector
  must be required when a crane_model is chosen.
- Tests with sourced fixtures only — no fabricated counterweight values.
  Travel-state child rows seed every fixture; tests asserting R3/R4/R6
  must use the review-gated rows from `liftiq-crane-model-travel-states.csv`.
