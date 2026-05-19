# Design Partner Success Metrics

**Use:** Set the baseline at kick-off (week 0). Track weekly. Lock the outcome at week 12. The success-metrics record is the artefact that justifies continuation, anonymised case studies, and the next round of design partners.

**Cardinal rule:** A pilot that produces no measured outcomes is not a successful pilot, even if the partner is happy.

---

## Three metric layers

| Layer | What it measures | Who looks at it |
|-------|------------------|-----------------|
| Operational | Did the system actually get used? | Cody + partner ops manager |
| Quality | Did the work get better? | Cody + partner ops manager + dispatcher |
| Commercial | Will the partner pay, continue, refer? | Cody only |

---

## 1. Operational metrics — track weekly

These are the activity vitals. If any of these are at zero for two weeks running, the pilot is in trouble.

| Metric | Target band (90-day pilot) | Source |
|--------|---------------------------|--------|
| Jobs created in DispatchTalon | Labour: 50 total · Founding: 150 · Commercial: 500 | Job intake count |
| Workers imported and active | Labour: ≥80% of agreed cap · Founding/Commercial: ≥70% | Worker register |
| Allocations run | One allocation per job created, minimum | Allocation log |
| Publish allocation previews used | ≥75% of allocations published via DispatchTalon preview | Allocation publish events |
| Audit events recorded | Every allocation, override, warning, block recorded | AuditIQ log |
| CSV exports downloaded | At least weekly during the pilot | Export Centre log |
| Multi-role coverage cases identified | At least one per week if labour mix supports it | SmartRank role-coverage events |

**Baseline capture at kick-off:**
- How many jobs do they run per week today?
- How many workers are on the books?
- How many concurrent allocations on a typical Monday?
- Recording these at kick-off is the only way to compare at exit.

---

## 2. Quality metrics — track weekly, reviewed at week 6 and week 12

These are the metrics that justify a continuation. Capture both a number and a verbatim quote where possible.

### 2.1 Time from rough enquiry to structured job

- **Baseline:** Today, how long does it take to turn a phone enquiry into a job your team can dispatch from?
- **Target:** Time-to-structured-job reduces by week 4 and stays reduced through week 12.
- **Capture method:** Have the dispatcher time three random jobs per week (before/after).

### 2.2 Allocation changes after first publish

- **Baseline:** What % of allocations changed in the 24 hours after first publish before DispatchTalon?
- **Target:** Reduction by week 6. Hold the reduction through week 12.
- **Capture method:** Audit log allocation_changed events compared to first publish.

### 2.3 Warnings and blocks surfaced before dispatch (not after)

- **Baseline:** How many credential or fatigue issues did you historically catch before dispatch vs. after?
- **Target:** Warnings/blocks surface at the allocation step, not the morning of the job.
- **Capture method:** CredentialGate and FatigueGuard event counts per week. Verbatim examples from the dispatcher.

### 2.4 Office retyping reduced

- **Baseline:** How many hours per week does admin spend retyping allocation data into other systems?
- **Target:** Reduction by week 8 once CSV export is in routine use.
- **Capture method:** Ask the admin directly. A rough hour-band estimate is fine; precision is not the point.

### 2.5 Dispatcher confidence

- **Baseline:** On a 1–5 scale, how confident is the dispatcher that the right person is on the right job each day?
- **Target:** Confidence increase by week 6 and held through week 12.
- **Capture method:** Ask the dispatcher every fortnight, capture the number and the reason.

---

## 3. Commercial metrics — captured at the gates only

These determine what happens after week 12. Capture at week 6, refine at week 10, lock at week 12.

| Metric | What "good" looks like at week 12 |
|--------|-----------------------------------|
| Willingness to continue | A clear yes, with named conditions if any |
| Willingness to pay (working assumption) | Continuation price ≥ Labour Allocation Pilot tier monthly |
| Internal champion identified | Specific person named who would defend the spend internally |
| Case study potential | Yes (anonymised at minimum), or yes (named) with consent |
| Referral potential | Names one specific operator they would introduce |

Each of these is a yes/no plus a quote. The quote is the asset.

---

## Pilot success bands at exit

| Band | Operational met? | Quality met? | Commercial met? | Outcome |
|------|------------------|--------------|-----------------|---------|
| **Strong** | All hit | 3+ of 5 improved | Continue + pay + case study + referral | Convert to commercial subscription |
| **Workable** | Mostly hit | 1–2 of 5 improved | Continue + pay, no case study yet | Continue on revised scope |
| **Inconclusive** | Activity low | Mixed | Will think about it | Either restart with new scope or polite exit |
| **Failed** | Activity at zero | No improvement | No continuation | Polite exit with data export. Capture why for the backlog. |

A failed pilot is a learning, not a disaster. The dangerous outcome is a pilot that drifts to inconclusive because no-one measured anything.

---

## Capturing methodology — keep it loose, keep it honest

- Working estimates are fine. Precision is not the point at this stage.
- Capture the partner's own numbers — do not extrapolate or massage.
- Verbatim quotes carry more weight than scored numbers — get the quote.
- If the partner says "I don't know," write that down. Do not guess for them.
- Methodology is documented in the outcome report for Commercial Pilots so the figures can be challenged honestly.

---

## What this is not

- Not a marketing claim generator. Numbers here do not become public until the partner has signed off on a specific quote in writing.
- Not a customer health score. This framework is built to detect whether the product changed an operator's week, not whether the partner is happy.
- Not a substitute for the feedback framework. They feed each other.

---

## Outcome report template (Commercial Pilot only)

```
DispatchTalon Pilot Outcome — {{partner}} — week 13

1. Scope
   - Tier:
   - Worker / user / job / asset caps:
   - Duration:

2. Operational metrics
   - Jobs created: X / target Y
   - Workers active: X / target Y
   - Allocations run: X
   - Publish previews used: X (% of allocations)
   - Audit events: X
   - Exports downloaded: X
   - Multi-role coverage cases: X

3. Quality metrics
   - Time to structured job: baseline → exit
   - Allocation changes after publish: baseline → exit
   - Warnings surfaced pre-dispatch: examples
   - Office retyping reduced: baseline → exit
   - Dispatcher confidence: baseline → exit

4. Commercial outcome
   - Continue: yes / no / conditional
   - Continuation pricing agreed:
   - Internal champion:
   - Case study: yes / no
   - Referrals: names

5. Working dollar value of change (working estimate)
   - Method:
   - Estimate:
   - Confidence:

6. What worked
7. What didn't work
8. What we'd change for the next pilot
9. Joint sign-off (partner + Pressure Systems)
```

This template only applies to Commercial Pilots. Founding Partners get a lighter written summary; Labour Allocation Pilots get a verbal exit review with notes.

---

*Metrics are the product the design-partner programme produces, second only to the live pilots themselves. Treat them with the same discipline as the audit log: write them down at the time, not from memory at the end.*
