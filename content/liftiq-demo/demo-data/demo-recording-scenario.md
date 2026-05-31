# LIFTIQ Demo Recording Scenario

Use this order after running `node src/scripts/seed-demo-dataset.js` on the target database.

## Primary Walkthrough

1. Start on the public LIFTIQ page, then open the portal.
2. Sign in to the `LIFTIQ Demo / Internal` tenant. Do not record password entry.
3. Show the dashboard and metrics.
4. Open Workers and show the 10 synthetic demo workers.
5. Open Riley Hayes for counterweight/mobile-crane preference signals.
6. Open Jordan Ellis or Blake Warren for FatigueGuard context.
7. Open Jobs and select `Brisbane Rooftop Plant Lift` for a clean job-intake example.
8. Open `Pinkenba Counterweight Transport Lift` for GMK5150L 24.0t travel state vs 44.5t required counterweight.
9. Open `Lytton Pipe Rack Lift` or `Port Access Mobile Crane Job` for GMK5150L-1 30.9t travel-state distinction and road-access review flags.
10. Use `Eagle Farm Container Repositioning` for a clean SmartRank run with minimal blocks.
11. Use `Ipswich Transformer Placement` for a CredentialGate hard-block example.
12. Use `Night Shift Shutdown Rigging Support` for FatigueGuard warning/block examples.
13. Use `Schedule Conflict Test Lift` to show overlap against the allocated `Brisbane Rooftop Plant Lift` window.
14. Open Audit to show worker import, job import, counterweight assessment, transport requirement, SmartRank, allocation, warning, and preference activity.
15. Return to Metrics for proof view.

## Best Jobs By Clip

| Clip | Use this job | Why |
| --- | --- | --- |
| Rough job note to structured job | Brisbane Rooftop Plant Lift | Clean job brief and schedule fields. |
| Counterweight transport review | Pinkenba Counterweight Transport Lift | GMK5150L 24.0t travel state vs 44.5t required counterweight. |
| Model-specific travel state | Port Access Mobile Crane Job | GMK5150L-1 uses the 30.9t reduced heavy-roadable state. |
| Clean SmartRank | Eagle Farm Container Repositioning | Simple Franna job with clear preference signals. |
| CredentialGate | Ipswich Transformer Placement | Requires crane, dogging, and rigging credentials. |
| FatigueGuard | Night Shift Shutdown Rigging Support | Shows fatigue warning/block context. |
| Schedule conflict | Schedule Conflict Test Lift | Overlaps with an existing Tom Mercer allocation. |
| Audit proof | Any seeded job | Audit has synthetic events for imports, assessments, allocations, warnings, and metrics. |

## Claim Boundary

Use: "review required", "decision-support", "dispatcher remains the decision-maker", and "confirm before dispatch".

Do not say: "approved", "compliant", "legal to travel", "safe to dispatch", "engineered lift confirmed", or "autonomous dispatch".
