# DispatchTalon Assisted Source Document Upload

## Purpose

Assisted Source Document Upload reduces pilot onboarding friction by letting authenticated pilot users upload the records they already have for DispatchTalon team review.

CSV remains the cleanest and fastest import format. PDF, Word, Excel, roster, credential, equipment, image, and internal report uploads are for assisted pilot setup review when the source data is not already clean.

## Product Boundary

This workflow is assisted setup, not live import.

- Uploaded files are not parsed into live records by this feature.
- Uploaded files do not create workers, assets, credentials, jobs, allocations, or catalogue selections.
- Human review is required before any information is structured for pilot use.
- Users must confirm any structured data before it is added to the pilot setup.
- Review status means the DispatchTalon team has moved the source document through the setup queue; it is not a compliance, permit, engineering, safety, payroll, invoice, or road-access approval.

## Current MVP

This release implements Option B: secure upload MVP.

- Authenticated users can upload source documents.
- Uploads are tenant-scoped.
- Metadata is stored in `source_uploads`.
- Files are stored outside public static paths.
- New uploads start as `pending_review`.
- Internal admin users can view the review queue, download files, and update review status.
- No extraction or review-before-save table is built in this pass.

## Accepted File Types

Allowed during pilot:

- `.csv`
- `.xlsx`
- `.xls`
- `.pdf`
- `.doc`
- `.docx`
- `.png`
- `.jpg`
- `.jpeg`
- `.webp`

Rejected:

- executables
- scripts
- archives such as ZIP
- unknown file types
- files that fail extension, MIME, or basic file-signature validation

## Upload Limits

Pilot limits:

- 10MB per file
- 5 files per upload batch
- 50MB total active source-document storage per tenant

If a tenant needs more space, review the request manually before raising the limit.

## Privacy And Security

Uploads may contain private worker or business information.

The current implementation:

- requires authentication
- ties each upload to `company_id` / tenant
- records uploader ID and email server-side
- stores original filename, private stored key, file size, MIME type, extension, category, notes, timestamps, and review status
- does not place files in public web directories
- does not expose private file URLs to the client
- restricts download to internal admin users
- sanitises filenames
- validates extension, MIME type, and basic file signature
- prevents path traversal through generated storage keys
- handles duplicate filenames by storing UUID-based keys
- logs only metadata in audit events, not file contents
- supports soft deletion/removal from the active review queue

Storage defaults to a private `source-uploads` directory beside the configured SQLite database path. On Fly this resolves beside `/data/liftiq.db`, which keeps uploaded source files on the mounted private app volume rather than in public console assets.

## Review Statuses

Supported status values:

- `pending_review`
- `under_review`
- `needs_clarification`
- `ready_for_structuring`
- `structured`
- `rejected`
- `deleted`

Status updates are for queue visibility only. They do not publish or save extracted data into live DispatchTalon records.

## Future Review-Before-Save Path

Future work must follow this sequence:

1. Upload source document.
2. Extract suggested workers, assets, credentials, or setup data.
3. Show a preview table.
4. User confirms or corrects suggested data.
5. Save confirmed data only.

Never build:

`Upload document -> save guessed data into live system`

## Claim Safety

Do not describe this feature as:

- instant import
- AI import
- upload and save
- compliance upload
- verified credential import
- fully extracted
- guaranteed accurate

Use:

- source document for pilot setup review
- assisted import
- review required
- team-assisted setup
- suggested data only
- human review before use
- not saved to live records until confirmed
