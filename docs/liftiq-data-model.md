# LIFTIQ Phase 1 — Data Model
**Status:** Phase 1 schema definition | May 2026  
**Scope:** Entities, fields, relationships, and decision logic fields required for the pilot operational engine  
**Format:** Conceptual schema — technology-agnostic. Backend implementation determines specific types and constraints.

---

## Entity Overview

```
Company
  └── Users (dispatcher, supervisor, admin, viewer)
  └── Workers (operators, dogmen, riggers, allocators)
       └── Credentials (licences, tickets, inductions)
       └── Fatigue Records (shift history, rest hours)
  └── Jobs (dispatch requirements)
       └── Allocations (decision events)
            └── Audit Events (decision records)
```

---

## 1. Company

The crane company using LIFTIQ. One company = one isolated data environment.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `name` | String | Company trading name |
| `abn` | String | Optional. Australian Business Number. |
| `locations` | String[] | Branch or depot names (e.g. "Perth CBD", "Fremantle Port") |
| `operating_regions` | String[] | States/territories of operation |
| `status` | Enum | `active`, `pilot`, `suspended` |
| `pilot_start_date` | Date | When the pilot commenced |
| `created_at` | Timestamp | |

**Relationships:** Has many Users. Has many Workers. Has many Jobs.

---

## 2. User

A person who logs into LIFTIQ on behalf of a Company.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `company_id` | UUID | FK → Company |
| `name` | String | |
| `email` | String | Login credential |
| `role` | Enum | `admin`, `dispatcher`, `supervisor`, `viewer` |
| `status` | Enum | `active`, `invited`, `deactivated` |
| `created_at` | Timestamp | |
| `last_login_at` | Timestamp | |

**Role permissions (Phase 1):**
- `admin`: full access, user management, company configuration
- `dispatcher`: create jobs, view workers, make allocations
- `supervisor`: view all, cannot allocate
- `viewer`: read-only, pilot observer access (used for founding partner oversight)

---

## 3. Worker

A person who can be allocated to a job. This is the operational record — not the same as a User (a dispatcher may also be a worker; that relationship is handled at company level, not enforced in schema).

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `company_id` | UUID | FK → Company |
| `name` | String | |
| `role` | Enum | `crane_operator`, `dogman`, `rigger`, `traffic_controller`, `supervisor`, `allocator` |
| `employment_type` | Enum | `permanent`, `casual`, `contractor`, `labour_hire` |
| `crane_classes` | String[] | Crane types worker is experienced on (e.g. `["25T", "55T", "130T"]`) |
| `usual_depot` | String | Default dispatch location |
| `contact_number` | String | For dispatcher use only |
| `status` | Enum | `available`, `allocated`, `unavailable`, `on_leave`, `inactive` |
| `availability_note` | String | Free text for current availability context |
| `notes` | String | Operational notes visible to dispatcher |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

**Relationships:** Has many Credentials. Has many Fatigue Records. Has many Allocations.

**Derived fields (computed, not stored):**
- `fatigue_status`: computed from Fatigue Records at time of query (see FatigueGuard rules)
- `smartrank_score`: computed per job at time of ranking (see SmartRank model)
- `credential_blocks`: computed from Credentials vs. Job requirements at time of ranking

---

## 4. Credential

A licence, ticket, induction, or site access item held by a Worker.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `worker_id` | UUID | FK → Worker |
| `company_id` | UUID | FK → Company (for querying) |
| `type` | Enum | See credential types below |
| `identifier` | String | Licence number or reference |
| `issuing_body` | String | e.g. "WorkSafe WA", "MSIC issuer", "Port authority" |
| `issue_date` | Date | |
| `expiry_date` | Date | Null = no expiry |
| `verified` | Boolean | Has the company confirmed this credential is real |
| `attachment_url` | String | Optional. Document upload link. |
| `status` | Enum | `valid`, `expiring_soon`, `expired`, `pending_verification` |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

**Credential types (Phase 1 set):**

| Type | Description |
|------|-------------|
| `high_risk_licence_crane` | State/territory issued HRL — crane operation |
| `high_risk_licence_dogging` | HRL — dogging |
| `high_risk_licence_rigging` | HRL — rigging (basic, intermediate, advanced) |
| `white_card` | General Construction Induction |
| `msic_card` | Maritime Security Identification Card (port access) |
| `site_induction` | Site-specific induction (named site, per record) |
| `client_induction` | Client-specific induction |
| `medical_clearance` | Fitness for duty clearance |
| `drivers_licence` | Class of licence specified in notes |
| `other` | Catchall; description in notes field |

**CredentialGate logic (derived from this entity):**
- `expired`: `expiry_date < today` → HARD BLOCK
- `expiring_soon`: `expiry_date <= today + 30 days` → WARNING
- `missing_required`: credential type required by Job not present in worker's credential set → HARD BLOCK

---

## 5. Fatigue Record

A shift record used to calculate fatigue risk. In Phase 1, entered manually by dispatcher or supervisor. One record per shift worked.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `worker_id` | UUID | FK → Worker |
| `company_id` | UUID | FK → Company |
| `shift_start` | Timestamp | |
| `shift_end` | Timestamp | |
| `shift_length_hours` | Decimal | Calculated from start/end; stored for query performance |
| `shift_type` | Enum | `day`, `night`, `split` |
| `travel_hours` | Decimal | Hours of travel associated with this shift (counts toward load) |
| `self_declared_fatigue` | Boolean | Worker declared fatigue at check-in (optional field; Phase 1 manual entry) |
| `notes` | String | |
| `recorded_by_user_id` | UUID | FK → User |
| `created_at` | Timestamp | |

**FatigueGuard rules (derived from this entity):**

Compute these at time of SmartRank query against the most recent records:

| Rule | Condition | Action |
|------|-----------|--------|
| Insufficient rest | Hours since `shift_end` of last record < 10 | HARD BLOCK |
| Weekly hour limit | Sum of `shift_length_hours` in current week ≥ 48 | HARD BLOCK |
| Weekly hour warning | Sum of `shift_length_hours` in current week ≥ 44 | WARNING |
| Consecutive days | Days with at least one shift record ≥ 5 (configurable) | WARNING |
| Night-to-day shift | Last shift type was `night` and next job is day shift with < 12 hours gap | WARNING |
| Self-declared fatigue | `self_declared_fatigue = true` on last shift | WARNING |

"Current week" = Monday 00:00 to Sunday 23:59 in company's local timezone.

---

## 6. Job

A dispatch requirement. What needs to happen, when, where, with what crew and equipment.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `company_id` | UUID | FK → Company |
| `reference` | String | Internal job reference or client PO |
| `client_name` | String | |
| `site_name` | String | |
| `site_location` | String | Address or GPS reference |
| `date` | Date | |
| `shift_start_time` | Time | |
| `shift_type` | Enum | `day`, `night`, `split` |
| `estimated_duration_hours` | Decimal | |
| `crane_class_required` | String | e.g. "55T", "130T" |
| `crew_roles_required` | JSON | e.g. `[{"role": "crane_operator", "count": 1}, {"role": "dogman", "count": 2}]` |
| `required_credentials` | String[] | List of credential types required for this job |
| `site_conditions` | String[] | e.g. `["port_access", "night_work", "confined_space"]` |
| `lift_risk_level` | Enum | `routine`, `complex`, `critical` |
| `travel_required` | Boolean | |
| `travel_hours_estimated` | Decimal | |
| `notes` | String | |
| `status` | Enum | `draft`, `open`, `allocated`, `in_progress`, `complete`, `cancelled` |
| `created_by_user_id` | UUID | FK → User |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

---

## 7. Allocation

The decision event. One record per crew member allocated to a job.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `job_id` | UUID | FK → Job |
| `worker_id` | UUID | FK → Worker |
| `company_id` | UUID | FK → Company |
| `allocated_by_user_id` | UUID | FK → User (dispatcher) |
| `smartrank_position` | Integer | What position in the ranking the selected worker held (1 = top-ranked) |
| `smartrank_score` | Decimal | Score at time of selection |
| `smartrank_snapshot` | JSON | Full score breakdown at time of selection (preserved for audit) |
| `active_warnings` | JSON | All warnings present at time of selection |
| `active_blocks_on_others` | JSON | Summary of blocks on other workers reviewed before selection |
| `override_reason` | String | Required if warnings were active at selection |
| `status` | Enum | `confirmed`, `changed`, `cancelled` |
| `allocated_at` | Timestamp | |
| `updated_at` | Timestamp | |

**Key invariant:** `smartrank_snapshot` must capture the full score breakdown as it existed at the moment of allocation. This record cannot be retroactively modified by changes to scoring weights.

---

## 8. Audit Event

Every meaningful decision or system event. This is AuditIQ's persistence layer.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `company_id` | UUID | FK → Company |
| `event_type` | Enum | See event types below |
| `user_id` | UUID | FK → User (who triggered the event) |
| `worker_id` | UUID | FK → Worker (if applicable) |
| `job_id` | UUID | FK → Job (if applicable) |
| `allocation_id` | UUID | FK → Allocation (if applicable) |
| `payload` | JSON | Full event context (recommendation shown, decision made, warnings, blocks, reason) |
| `timestamp` | Timestamp | Immutable once written |

**Event types:**

| Type | Description |
|------|-------------|
| `smartrank_generated` | SmartRank ranking run for a job |
| `credential_block_applied` | Worker blocked due to missing or expired credential |
| `fatigue_block_applied` | Worker blocked due to fatigue hard rule |
| `fatigue_warning_triggered` | Worker warned but not blocked |
| `allocation_confirmed` | Dispatcher confirmed an allocation |
| `allocation_changed` | Dispatcher changed a confirmed allocation |
| `warning_acknowledged` | Dispatcher acknowledged a warning and provided reason |
| `non_top_ranked_selected` | Dispatcher selected worker ranked below position 1 |
| `credential_expiry_alert` | System generated a credential expiry alert |
| `job_created` | New job entered into system |
| `job_status_changed` | Job status updated |

**Immutability rule:** Audit events are append-only. No update or delete path on this table. Corrections are made by new events, not by modifying existing records.

---

## Relationship Summary

```
Company (1)
  ├── Users (many)
  ├── Workers (many)
  │    ├── Credentials (many per worker)
  │    └── Fatigue Records (many per worker)
  └── Jobs (many)
       └── Allocations (many per job, one per role/crew slot)
            └── [references Worker, User]

Audit Events (many per Company)
  └── [references User, Worker, Job, Allocation as applicable]
```

---

## IF / THEN Rules for Schema Integrity

**If** a field is required to answer "why was this person selected?" — **include it.**  
**If** a field is required to answer "why was this person blocked?" — **include it.**  
**If** a field is required to answer "who overrode the recommendation?" — **include it.**  
**If** a field only serves payroll, invoicing, or quoting — **exclude from Phase 1.**  
**If** a derived value changes over time (score, fatigue status) — **snapshot it at the moment of allocation.** Do not recalculate retrospectively.  
**If** an audit event is written — **do not allow it to be updated or deleted.** Append only.

---

*This document is the Phase 1 data model. Changes must be reviewed against the PRD (`strategy/liftiq-phase1-prd.md`) to confirm they remain within Phase 1 scope.*
