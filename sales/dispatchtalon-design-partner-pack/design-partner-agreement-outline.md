# Design Partner Agreement Outline

> **This is not legal advice.** This document is a working outline for Pressure Systems and a design partner to align on commercial and operational terms. A qualified lawyer must review and finalise the contractual document before signature on either side. Pressure Systems makes no representation that this outline is fit for any specific jurisdiction or purpose.

**Use:** Hand this to a lawyer alongside the relevant `design-partner-pilot-scope.md` tier as the starting input for the actual agreement. Hand a clean version to the partner as a "here's the shape of the agreement we'll send" preview.

---

## 1. Parties

- **Provider:** Pressure Systems Pty Ltd (or trading entity confirmed by Cody) — provider of DispatchTalon
- **Partner:** {{customer_legal_entity}} — the design partner
- **Effective date:** {{date}}

## 2. Pilot term

- **Partner type:** {{Testing / Labour / Founding / Commercial / Managed add-on}}
- **Term length:** {{14–30 days / 90 days / as scoped}}
- **Start date:** {{date}}
- **End date:** {{date}}
- **Auto-renewal:** None. Continuation requires a written extension or a new commercial agreement.
- **Extension:** By written agreement only.

## 3. Access scope

- DispatchTalon is provided as a hosted multi-tenant service. The partner is provisioned a tenant on Pressure Systems' infrastructure.
- Access is limited to the user count documented in the pilot scope (`design-partner-pilot-scope.md`).
- Access does not include the source code, the database backend, internal scripts, or any other component not surfaced through the user-facing application.
- The partner's login credentials are personal and may not be shared outside the agreed user list.

## 4. Confidentiality

- Each party will treat the other's non-public information as confidential.
- Pressure Systems' confidential information includes the DispatchTalon roadmap, internal pricing not yet published, architecture, source code, and unreleased features.
- The partner's confidential information includes their worker list, customer list, job data, allocation patterns, and operational practice captured during the pilot.
- Confidentiality survives termination of the pilot.

## 5. No reverse engineering

- The partner will not reverse engineer, decompile, copy the user interface, or attempt to recreate DispatchTalon's workflow logic for the purpose of building a competing product.
- This does not restrict the partner from continuing to run their own internal operations or from using software that happens to overlap functionally.

## 6. No copying of workflows

- The partner will not lift the DispatchTalon workflow design (SmartRank factor weights, role-coverage logic, audit-event taxonomy, intake schema, export format) into a competing or substitute product.
- Patterns the partner already operated before the pilot are not restricted.

## 7. No external sharing of login

- Tenant credentials, screenshots of confidential UI areas (e.g. backend admin), and pre-release feature previews must not be shared outside the agreed user list without written consent.
- Public screenshots of the partner's own data inside DispatchTalon (e.g. for internal reporting) are permitted.

## 8. Customer data ownership

- The partner owns all data they input into DispatchTalon during the pilot (workers, jobs, allocations, audit events, exports).
- The partner may export their data at any time during the pilot, and Pressure Systems will provide a full CSV export within five business days of a written request after termination.
- Pressure Systems will retain audit-event metadata sufficient to honour its own legal record-keeping obligations after termination, but not the partner's identifiable operational data unless agreed.

## 9. DispatchTalon IP ownership

- All rights in DispatchTalon (software, brand, design, models, weights, taxonomy, documentation) remain with Pressure Systems.
- Improvements, fixes, and new features released during the pilot — including ones inspired by partner feedback — belong to Pressure Systems.

## 10. Feedback usage rights

- The partner grants Pressure Systems a perpetual, royalty-free right to use anonymised learnings from the pilot to improve DispatchTalon and to describe pilot patterns in DispatchTalon materials.
- Any specific identifying use of the partner's name, customers, jobs, or quoted feedback requires the partner's written consent and may be withdrawn at any time before publication.
- An anonymised case study (Founding / Commercial pilots only) is conditional on partner sign-off at exit review.

## 11. Anonymised learnings

- "Anonymised" means: no partner name, no customer name, no worker name, no job site address, no figures that could uniquely identify the partner.
- Pressure Systems may share anonymised patterns (e.g. "a 30-person crane operator reduced retyping into payroll by X hours/week") without further consent, provided the threshold above is met.

## 12. Support boundaries

- Support is limited to the channel, hours, and monthly cap documented in the pilot scope.
- Outside-hours support is not promised unless a Managed / On-call Support add-on is signed.
- DispatchTalon does not provide 24/7 support during a pilot.
- Support does not include training of staff beyond the included onboarding hours.

## 13. No reliance on DispatchTalon for regulated decisions

This is the clause that protects both parties. It must survive.

- DispatchTalon is decision-support software. It surfaces credential conditions, fatigue conditions, and allocation context. **It does not approve a dispatch, certify safety, confirm compliance, or replace the dispatcher's professional judgement.**
- DispatchTalon does not approve permits, oversize/overmass authorisations, route plans, lift plans, pilot/escort requirements, or any other regulated transport or lifting matter. The partner is responsible for all such determinations through their own qualified personnel and the relevant authorities.
- DispatchTalon does not provide compliance, WHS, NHVR, payroll, or legal advice.
- The partner is responsible for all final dispatch and operational decisions.
- This clause is not waivable.

## 14. Limitation of liability

- Pressure Systems' aggregate liability under or in connection with this pilot, however arising, is capped at the total fees paid by the partner under the pilot agreement, except to the extent that liability cannot be limited under applicable law.
- Pressure Systems is not liable for indirect, consequential, special, or punitive damages, including loss of profits, loss of contracts, loss of goodwill, or loss arising from the partner's reliance on a DispatchTalon recommendation as the basis for a dispatch decision.
- The partner's standard indemnity obligations for their use of the service apply per the final agreement.

## 15. Termination

- Either party may terminate for convenience on 30 days' written notice during the pilot. Pre-paid fees beyond the notice period are refunded pro rata; setup fees are non-refundable once setup is complete.
- Either party may terminate immediately for material breach unremedied for 14 days after written notice.
- On termination, partner data is exported within five business days; Pressure Systems then deletes partner-identifiable operational data within 30 days, subject to retention required for its own legal record-keeping.

## 16. Expiry

- The pilot expires at the end of the term.
- If continuation is agreed, a new agreement is signed — pilot terms do not auto-convert to a commercial subscription.

## 17. Pricing (if paid pilot)

- Setup fee, monthly fee, and total are documented per partner type in `design-partner-pilot-scope.md` and incorporated by reference into the final agreement.
- Invoices are issued in {{AUD}}, payable within 14 days unless otherwise agreed.
- Fees are exclusive of GST.
- All pricing is the working model as of the agreement date; future commercial pricing is at Pressure Systems' discretion and will be communicated in writing.

## 18. Governing law

- The final agreement will be governed by the laws of {{jurisdiction — confirm with lawyer; default Queensland or as Cody confirms}}.
- The parties submit to the exclusive jurisdiction of the courts of that jurisdiction.

## 19. Acceptable use

- The partner will not use DispatchTalon to:
  - process data of any person without lawful basis to do so
  - upload malware, attempt to compromise the service, or stress-test infrastructure
  - resell or sub-license access to a third party
  - misrepresent DispatchTalon's capabilities to a third party (in particular: no compliance, payroll, or permit-approval claims)

## 20. Notices

- Notices under the agreement go to the email addresses recorded on the signature page.
- Operational pilot communication may go through the support channel documented in scope; legal notices must go through the email path.

---

## Things this outline does **not** cover, and that the lawyer must address

- Privacy Act 1988 (Cth) obligations as applicable to the partner's data
- Sector-specific or state-specific WHS obligations
- Cross-border data handling if the partner operates outside Australia
- Source escrow (recommended: no escrow at pilot stage; revisit if continuation passes a contract-value threshold)
- Insurance requirements (recommended: confirm Pressure Systems' professional indemnity cover before any Commercial Pilot agreement is signed)
- Service-level commitments — none are made at pilot stage; uptime is best-effort. The lawyer should confirm this is reflected in the final clause.
- Personal data and PII handling specific to worker information
- Dispute resolution mechanism (mediation step before litigation is recommended)

---

## Drafting checklist before sending

- [ ] Partner type confirmed and matches `design-partner-pilot-scope.md`
- [ ] Fees confirmed by Cody (not just copied from the working model)
- [ ] Customer entity name verified
- [ ] Jurisdiction confirmed
- [ ] Lawyer review complete and version signed off
- [ ] Reviewed against `design-partner-pilot-scope.md` for inclusion/exclusion alignment
- [ ] Reviewed against `design-partner-success-metrics.md` for measurement alignment
- [ ] Signature pages prepared (DocuSign or equivalent)
- [ ] Tenant provisioned but **not** released until both signatures are in

---

*This outline is a working tool, not a contract. Do not sign anything based on this document alone. Always have a qualified legal practitioner draft the final agreement and confirm jurisdictional fit.*
