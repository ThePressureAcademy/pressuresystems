# DispatchTalon SMS Allocation Notification Architecture

## Phase 1: Manual Publish

DispatchTalon keeps allocation communication internal until a dispatcher intentionally publishes it. Selecting a worker creates the internal allocation decision only. It does not send an SMS.

The Phase 1 workflow is:

1. Dispatcher selects a worker through SmartRank.
2. Job detail shows the allocation as notification draft.
3. Dispatcher clicks **Publish allocation**.
4. DispatchTalon generates a server-side SMS preview.
5. Dispatcher copies the message and sends it manually from their phone or company channel.
6. Dispatcher marks the allocation as manually published.
7. DispatchTalon stores a notification snapshot and writes audit events.

Phase 1 audit events:

- `allocation_publish_previewed`
- `allocation_published_manual`

No external SMS provider is called in Phase 1.

## Phase 2: SMS Provider Send

Future provider sending should remain behind an explicit environment gate and provider abstraction. The route exists as a disabled placeholder and should not send until provider credentials, retry policy, observability, and failure handling are implemented.

Required secrets:

- `SMS_PROVIDER`
- `SMS_API_KEY`
- `SMS_API_SECRET`
- `SMS_SENDER_ID`
- `SMS_PROVIDER_ENABLED`

Provider options to assess:

- Twilio
- MessageMedia
- Telstra Messaging
- ClickSend

Provider adapters should expose a small interface:

```js
sendSms({ to, body, companyId, jobId, allocationId, notificationId })
```

The adapter must return a provider message id, provider name, and send status without exposing secrets in logs or API responses.

## Phase 3: Worker Replies

Worker acknowledgements and declines should be handled through inbound SMS webhooks.

Initial reply handling:

- `YES`, `Y`, `CONFIRM` -> `acknowledged`
- `NO`, `N`, `DECLINE` -> `declined`
- anything else -> store response for dispatcher review

Inbound webhooks must verify provider signatures or shared secrets before updating records.

## Phase 4: Secure Worker Detail Link

A future secure link may allow the worker to view allocation details and acknowledge/decline without a public worker portal.

Required design constraints:

- Short-lived signed token.
- Company, job, allocation, and worker scoped.
- No public enumeration.
- No client names or private notes unless explicitly enabled for worker view.
- Revoked when allocation is cancelled or changed.

## Data Model

`allocation_notifications` records the communication snapshot:

- company id
- allocation id
- job id
- worker id
- channel
- status
- recipient phone
- message snapshot
- provider metadata
- sent/delivered/responded timestamps
- created by user

Allowed statuses:

- `draft`
- `previewed`
- `published_manual`
- `queued`
- `sent`
- `delivered`
- `failed`
- `acknowledged`
- `declined`
- `cancelled`

## Webhook Design

Inbound provider webhooks should:

1. Verify provider authenticity.
2. Resolve `provider_message_id` or signed metadata to `allocation_notifications`.
3. Tenant-scope all updates by stored company id.
4. Store response text only where operationally required.
5. Write an audit event with response classification, not marketing metadata.

## Compliance Boundaries

Operational allocation notifications must stay transactional. Do not include marketing copy, promotional offers, upsells, or unrelated messages. If promotional content is added, spam and marketing-message rules may apply.

DispatchTalon must not claim safety, permit, compliance, legal road access, or engineering approval from the notification workflow. The SMS is a dispatch communication, not a compliance determination.

## Audit

Audit records should identify:

- who previewed the message
- who marked it published
- allocation id
- job id
- worker id
- whether a mobile number was present
- provider status when future sending is enabled

Audit payloads should avoid storing SMS provider credentials or unnecessary private message metadata.
