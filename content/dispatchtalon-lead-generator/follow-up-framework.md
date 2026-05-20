# Follow Up Framework

Internal sales asset. Per band follow up scripts and cadence after a lead completes the Dispatch Readiness Diagnostic.

Companion files:

- `score-logic.md` for band definitions.
- `lead-routing-rules.md` for the operational profile overlay.
- `docs/DISPATCHTALON_LEAD_FUNNEL_SYSTEM.md` for the wider funnel context.

---

## Universal rules across every band

- Reply within 24 hours of a completion landing in the lead sheet.
- Open with their score and band in plain English. Do not lecture.
- One CTA per reply. Discovery call, sample job review, focused pilot scenario, or design partner application, never two of these in the same message.
- Founder voice. First-person. Cody-signed.
- No public pricing in any follow up.
- No claim outside the boundary list.
- The diagnostic is a conversation starter. The follow up is where qualification actually happens.

---

## Band 1. Manual Dispatch Risk (score 0 to 20)

Posture: education first. These leads need to understand the layer DispatchTalon sits in before they can evaluate it.

Cadence:

| Day | Action |
|---|---|
| Day 0 | Personal reply with their result and one observation tied to their lowest scoring question. |
| Day 2 | Send one short link or note that addresses the lowest scoring layer. Not a sales asset. A useful read. |
| Day 7 | Soft invite to a 20 minute diagnostic call. No demo, no slide deck. |
| Day 21 | If no reply, move to nurture. Revisit in 90 days. |

Day 0 reply template:

```
Hi [First name],

Thanks for running the check. You scored [score] which lands in the Manual Dispatch Risk band.

What that usually means in practice: the dispatch decision is made by a person who carries most of it in their head, and the trail behind the decision is thin. That is not a criticism of the dispatcher. It is the most common shape for operators your size.

Your lowest scoring layer was [category]. The most useful next step would be a 20 minute walk through one of your real recent jobs, scoring it together against the same five layers. No demo, no pitch. I will write back with what I would change and what I would leave alone.

If that is worth twenty minutes, reply with two windows that work this week.

Cody
DispatchTalon by Pressure Systems

Decision-support. The dispatcher remains the decision-maker. Pilot-stage.
```

---

## Band 2. Partially Structured (score 21 to 35)

Posture: context-first review. These leads have something working. The conversation is about which layer is exposed, not whether they need a tool.

Cadence:

| Day | Action |
|---|---|
| Day 0 | Personal reply with their result, naming the two highest and two lowest scoring questions. |
| Day 3 | Offer to walk one sample job through DispatchTalon together. Specify it is context-first, not a demo. |
| Day 10 | If no reply, send one observation about the layer they scored lowest on. Soft re-ask. |
| Day 21 | If no reply, move to nurture. Revisit in 60 days. |

Day 0 reply template:

```
Hi [First name],

Thanks for running the check. You scored [score] which lands in Partially Structured.

The pattern this band usually shows: front-of-house structure is fine, the layer behind the decision is where the exposure sits. For your result specifically, [name lowest scoring layer] is where I would look first.

Best next step: send one real recent job through DispatchTalon with me. Context-first, not a demo. Thirty minutes. You bring the job, I show you the parts of the product that map to the layer your score flagged. If it does not map cleanly to your operation, we both know in thirty minutes.

Worth a window this week or next?

Cody
DispatchTalon by Pressure Systems

Decision-support. The dispatcher remains the decision-maker.
```

---

## Band 3. Dispatch Ready but Exposed (score 36 to 48)

Posture: focused pilot scenario. These leads are credible. The conversation moves from interest to scope quickly.

Cadence:

| Day | Action |
|---|---|
| Day 0 | Personal reply with their result and the recommendation of a focused pilot scenario. |
| Day 2 | Send a short scoping note: which allocation window, which workers, which job types, which week. |
| Day 7 | If no reply, one soft re-ask referencing the scoping note. |
| Day 21 | If no reply, move to long term nurture. Quarterly check in only. |

Day 0 reply template:

```
Hi [First name],

Thanks for running the check. You scored [score] which lands in Dispatch Ready but Exposed.

This is the band where most operators look organised from the outside, and the exposure sits in the decisions that did not get recorded. Your result flagged [name lowest scoring layer] as the most likely place to find that exposure.

The most useful next step at this score is a focused pilot scenario on one real allocation window. I would suggest scoping it like this:

- One week of jobs
- Your real workers and credentials
- One allocation pass through DispatchTalon and your existing process, run in parallel
- A short debrief comparing where the two processes agreed and where they did not

If that shape works, I will send a one page scoping note and we lock a window. If you would rather start with a discovery call before scoping, I can do that too.

Cody
DispatchTalon by Pressure Systems

Decision-support. The dispatcher remains the decision-maker.
```

---

## Band 4. Pilot Candidate (score 49 to 60)

Posture: design partner conversation. These leads should be moved through the design partner gates rather than the public funnel.

Cadence:

| Day | Action |
|---|---|
| Day 0 | Personal reply with their result and a direct invite to a design partner scoping call. |
| Day 2 | Send the design partner pack and a calendar link or two specific windows. |
| Day 7 | If no reply, one short re-ask. Then leave it. |
| Day 14 | If no reply, move to long term nurture. Tier A status retained for 90 days. |

Day 0 reply template:

```
Hi [First name],

Thanks for running the check. You scored [score] which lands in Pilot Candidate.

This is the score band where DispatchTalon is most useful as an evaluation-grade test, not an onboarding rescue. Your operation is mature enough to stress the product properly.

The most useful next step is a 30 minute design partner scoping call. On the call I will share the design partner pack, walk through gate criteria, and propose a pilot shape tailored to your operation. If we are a fit on both sides, you move into a structured pilot. If we are not, you walk away with a clearer view of what your current process is already doing well.

Two windows this week:
- [window 1]
- [window 2]

Reply with which works, or send two windows of your own.

Cody
DispatchTalon by Pressure Systems

Decision-support. The dispatcher remains the decision-maker. Pilot-stage.
```

---

## When the operational profile changes the script

The score alone does not pick the script. Combine score with operator profile per `lead-routing-rules.md`. Common overrides:

| Situation | Override |
|---|---|
| Band 1 with under 10 workers and low job volume | Skip the call invite. Send the resource and move to nurture. |
| Band 2 with labour only and 15 to 50 workers | Use Labour Allocation Pilot framing in the Day 3 follow up. |
| Band 3 with plant plus labour and 25 to 100 workers | Use Founding Partner Pilot framing in the Day 2 scoping note. |
| Band 3 or 4 multi-branch or formal evaluation | Use Commercial Pilot framing and slow the cadence. |
| Any band with high support expectation | Add Managed support add on to the scoping note. Flag in the lead sheet. |
| Any band where the lead is not the decision-maker | Ask for an introduction to the decision-maker before progressing past the first reply. |

---

## When to slow down

Speed is not a feature here. Slow the cadence if any of these apply:

- The lead says they are mid-quarter close, mid-tender, or mid-audit.
- The lead has just hired a new dispatcher or ops manager.
- The lead has just bought another tool in this space and is still in evaluation.
- The lead is interstate or in New Zealand and time zone overlap is narrow.

Note the reason in the lead sheet. Resume the cadence on a specific dated trigger, not a vague "later."

---

## When to disqualify cleanly

Mark the lead as not a fit and stop the cadence if any of these apply:

- They want autonomous dispatch with no human in the loop.
- They want a payroll system or a Xero or MYOB replacement.
- They want a permit, compliance, or lift-engineering authority.
- They want a free unlimited support contract.
- Their worker count is under 5 and not growing.

Reply once, kindly, naming why DispatchTalon is not the right fit today. Do not leave them dangling. Close the loop.

---

## Tracking

Every follow up logs into the lead sheet with at minimum:

- Date sent
- Channel
- Script used (band template, override, custom)
- Response within 7 days yes or no
- Next action and dated trigger

If a band's response rate drops below 20 percent over a rolling 20 lead window, rewrite that band's Day 0 template before sending more.
