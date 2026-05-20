# Dispatch Readiness Diagnostic - Score Logic

**Internal sales asset. Companion to `dispatch-readiness-diagnostic.html` and `diagnostic-question-bank.md`.**

This file is the authoritative source for scoring, bands, result-page logic, and pilot-type mapping. Change here first, mirror into the HTML.

---

## Scoring

- Each of 15 questions scores **0–4**.
- Total score range: **0–60**.
- Unanswered questions score 0. (The UI forces an answer before advancing, so this should not occur in practice.)
- Score is computed client-side at the end of the questionnaire.

```
score = Σ (selected_option.score for each question)
```

---

## Bands

| Band | Score | Label | Posture |
|---|---|---|---|
| 1 | 0–20 | Manual Dispatch Risk | Education first |
| 2 | 21–35 | Partially Structured | Context-first review |
| 3 | 36–48 | Dispatch-Ready but Exposed | Focused pilot scenario |
| 4 | 49–60 | Pilot Candidate | Design partner conversation |

Edge handling: a score that falls exactly on a band boundary uses the **upper** band's logic (e.g. 20 → Band 1, 21 → Band 2). The HTML implementation uses `min ≤ score ≤ max` with non-overlapping ranges.

---

## Per-band result content

### Band 1 - Manual Dispatch Risk (0–20)

| Field | Content |
|---|---|
| Meaning | Your dispatch process depends heavily on people remembering the right details at the right time. The note isn't the risk - the missing trail is. |
| Main risk | If your dispatcher is sick, leaves, or has one bad day, the cost is real. Audit reconstruction is slow or impossible. |
| DispatchTalon fit | DispatchTalon would give you a structured intake, role coverage suggestions, and an audit trail - without replacing the dispatcher's judgement. |
| Recommended action | Book a 20-minute diagnostic call to walk through a real recent job. |
| Suggested pilot type | Testing Partner |

### Band 2 - Partially Structured (21–35)

| Field | Content |
|---|---|
| Meaning | Some structure exists, but key decisions still rely on manual checking, memory, or disconnected notes. |
| Main risk | Multi-role coverage and credential checks are the most likely exposure. The decision happens, but the trail behind it is thin. |
| DispatchTalon fit | DispatchTalon would structure the layer that's currently in your head - role coverage, credential surfacing, and reviewable publish. |
| Recommended action | Send a sample job through DispatchTalon together - context-first, not a demo. |
| Suggested pilot type | Labour Allocation Pilot (or Testing Partner if small) |

### Band 3 - Dispatch-Ready but Exposed (36–48)

| Field | Content |
|---|---|
| Meaning | Your operation has structure, but role coverage, credential checks, publish control, audit, or exports may still be exposed. |
| Main risk | You probably look organised from the outside. The exposure is in the decisions that didn't get recorded. |
| DispatchTalon fit | DispatchTalon would close the audit and role-coverage layer over the structure you already have. |
| Recommended action | Run a focused pilot scenario on a real allocation window. |
| Suggested pilot type | Founding Partner Pilot |

### Band 4 - Pilot Candidate (49–60)

| Field | Content |
|---|---|
| Meaning | Your process is mature enough to test DispatchTalon against real allocation pressure. |
| Main risk | The remaining risk is invisible to you because your structure masks it. DispatchTalon will surface the edge cases your current system absorbs silently. |
| DispatchTalon fit | DispatchTalon would be an evaluation-grade test, not an onboarding rescue. |
| Recommended action | Apply for a Design Partner Pilot. Bring a defined scope and a sponsor. |
| Suggested pilot type | Commercial Pilot (or Founding Partner if multi-branch) |

---

## Pilot-type mapping (post-context)

Once the lead has submitted their context, pilot type is refined using both score and operational profile. See `lead-routing-rules.md` for the full matrix. Summary:

| Score band | Workers / personnel | Plant | Weekly jobs | Likely pilot |
|---|---|---|---|---|
| Band 1 | < 10 | any | low | Testing Partner / nurture |
| Band 1 | 10–40 | any | medium | Testing Partner |
| Band 2 | 15–50 | labour-only | medium | Labour Allocation Pilot |
| Band 2 | 25–100 | plant + labour | medium | Labour Allocation Pilot → Founding Partner |
| Band 3 | 25–100 | plant + labour | high | Founding Partner Pilot |
| Band 3 | multi-branch | any | high | Commercial Pilot |
| Band 4 | any | any | any | Commercial Pilot (Founding Partner if multi-branch) |
| Any | high support expectation | any | any | + Managed support add-on |

---

## Copyable summary format

The result page exposes a copyable summary that mirrors what gets submitted to the form. Format:

```
DispatchTalon - Dispatch Readiness Diagnostic
Score: <score>/60  ·  Band: <band name>

Main risk: <band.risk>
DispatchTalon fit: <band.fit>
Recommended next: <band.action>
Suggested pilot type: <band.pilot>

Answers:
  1. <Q1 title> → <selected label>
  2. <Q2 title> → <selected label>
  ...
  15. <Q15 title> → <selected label>
```

This format is used for:

- The `Copy result summary` button.
- The `Share result text` button (`navigator.share` where available, clipboard fallback).
- The `mailto:` body when no form endpoint is configured.

---

## What's NOT in the score

To preserve claim boundaries, the score does **not** factor in:

- Whether the operator's credentials are legally valid.
- Whether their lift plans, SWMS, or permits are compliant.
- Whether they would pass a regulator audit.
- Whether their pricing or invoicing is correct.
- Whether their payroll or finance integrations are sound.

The score is a structuring aid. The band names use the word "risk" only in the operational sense (exposure of the dispatch decision), not the regulatory sense.

---

## Calibration

After the first 30 completions:

1. Plot score distribution.
2. Check for clustering at boundaries - if too many leads land at 20 or 35, options need refinement.
3. Compare predicted band to fit assessment after discovery call. If predicted Band 3+ leads consistently turn out to be Band 2 in reality, sharpen Q9 and Q15 first.
4. Update this file and the question bank, then mirror into the HTML.

Do not re-run calibration more than once per 30 completions. Smaller samples produce noise, not signal.
