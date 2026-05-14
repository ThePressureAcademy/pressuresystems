# DispatchTalon LinkedIn Ad Pack

Internal production pack for LinkedIn ad testing.

Brand mark source: `../../assets/logos/dispatchtalon/source/dispatchtalon-locked-brand-board.png`.

## Verdict

Four export-ready DispatchTalon ad concepts were produced for crane, rigging, labour allocation, plant + labour, and transport-supported lifting audiences. The current exports use the locked DispatchTalon ad corner mark from `../../assets/logos/dispatchtalon/dispatchtalon-linkedin-ad-corner-mark.png`.

The ads use available DispatchTalon public screenshots/artifacts where possible. Authenticated portal screenshots for Job Brief Import, SmartRank, Our Business, and crane/counterweight review were not present in the repo/worktrees, so those areas use clearly labelled `Pilot workflow preview` panels. These panels are sanitised synthetic/demo representations based on current product capability, not claims of live customer data.

## Folder Structure

| Folder | Purpose |
|---|---|
| `source-screenshots/` | Sanitised source visual artifacts copied from existing repo/worktrees. |
| `working/` | HTML/CSS ad board used to render the final PNGs. |
| `exports/square/` | 1200 x 1200 LinkedIn image exports. |
| `exports/landscape/` | 1200 x 628 LinkedIn image exports. |
| `exports/vertical/` | Optional 720 x 900 vertical exports. |
| `copy/` | LinkedIn ad copy, variants, rationale, and campaign notes. |
| `qa/` | Claim, privacy, dimension, and final review notes. |

## Source Artifacts Used

| Source file | Use |
|---|---|
| `source-screenshots/demo-01-public-liftiq-page.png` | Actual public DispatchTalon page screenshot from the demo content worktree. |
| `source-screenshots/liftiq-home-og.png` | Current DispatchTalon home OG image from repo assets. |
| `source-screenshots/liftiq-system-og.png` | Current DispatchTalon system OG image from repo assets. |
| `../../assets/logos/dispatchtalon/dispatchtalon-linkedin-ad-corner-mark.png` | Locked DispatchTalon corner mark used in regenerated ad exports. |
| `working/ad-board.html` | Local render board for sanitised screenshot-style ad panels. |

## Ads Created

| Ad | Concept | Primary audience | Message |
|---|---|---|---|
| Ad 1 | Job Intake | Operations managers, dispatch managers, crane/labour hire owners | Rough job notes should become reviewed requirements before allocation. |
| Ad 2 | SmartRank | Dispatch managers, operations managers | Allocation recommendations need visible reasoning. |
| Ad 3 | Operating Modes | Labour suppliers and plant + labour operators | The portal should match the company operating model. |
| Ad 4 | Crane / Transport Review | Crane companies, heavy lift, transport-supported operators | Counterweight, transport, and road-access review flags need a visible trail. |

## Exported Assets

Square:
- `exports/square/ad01-job-intake-1200x1200.png`
- `exports/square/ad02-smartrank-1200x1200.png`
- `exports/square/ad03-operating-modes-1200x1200.png`
- `exports/square/ad04-crane-transport-review-1200x1200.png`

Landscape:
- `exports/landscape/ad01-job-intake-1200x628.png`
- `exports/landscape/ad02-smartrank-1200x628.png`
- `exports/landscape/ad03-operating-modes-1200x628.png`
- `exports/landscape/ad04-crane-transport-review-1200x628.png`

Vertical:
- `exports/vertical/ad01-job-intake-720x900.png`
- `exports/vertical/ad02-smartrank-720x900.png`
- `exports/vertical/ad03-operating-modes-720x900.png`
- `exports/vertical/ad04-crane-transport-review-720x900.png`

## Recommended Campaign Structure

Start with two cold problem-awareness tests:
- Ad 1: Job Intake
- Ad 2: SmartRank / Allocation Clarity

Run Ad 3 as segmentation creative for labour-only versus plant + labour audiences.

Use Ad 4 for narrower crane, heavy lift, and transport-supported lifting audiences where counterweight, plant, support transport, and road-access review are familiar problems.

## Landing Page

Default cold traffic landing page:

`https://pressuresystems.au/liftiq/`

Do not send cold traffic directly to the pilot portal. Use the portal only for invited pilot users.

## Production Notes

- The HTML board is local-only and has no external dependencies.
- The ads do not contain credentials, real tenant data, real worker names, passwords, JWTs, Fly secrets, or tenant admin emails.
- The ads avoid approval, legal, engineering, payroll, and autonomous-dispatch claims.
- The visual style uses charcoal, cream, steel grey, muted rust, and operational UI framing.
