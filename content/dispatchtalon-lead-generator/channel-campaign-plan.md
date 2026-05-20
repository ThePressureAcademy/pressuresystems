# Dispatch Readiness Diagnostic - Channel Campaign Plan

**Internal sales asset.** How the diagnostic plugs into each channel, with the hook, primary CTA, secondary CTA, UTM convention, and cadence.

---

## Channel matrix

| Channel | Primary use | Cadence | UTM source |
|---|---|---|---|
| LinkedIn | Authority posts + carousels | 2 posts / week | `linkedin` |
| Instagram | Carousel + story + DM keyword | 1 carousel / week | `instagram` |
| WhatsApp | Warm operator direct | As needed | `whatsapp` |
| Email | Operations managers | Monthly sequence | `email` |
| Website | Homepage tile | Permanent | `homepage` |
| Sales calls | Live during discovery | Every call | `salescall` |
| Warm industry outreach | Founder-led, in person / phone | Weekly | `warmindustry` |
| Interstate / NZ outreach | Founder-led, named operators | Quarterly bursts | `warm-au-other` / `warm-nz` |

UTM template:

```
?utm_source=<channel>&utm_medium=<post|dm|email|tile|call>&utm_campaign=drd-v1&utm_content=<asset_id>
```

Example for LinkedIn post 1:

```
?utm_source=linkedin&utm_medium=post&utm_campaign=drd-v1&utm_content=fourroles
```

---

## LinkedIn

**Goal:** Build operator-level credibility and drive diagnostic completions from a known professional context.

**Hook bank:**

- A job may need four roles, not four people.
- OneNote captures the conversation. DispatchTalon structures the decision.
- If your dispatch decision lives in one person's head, the risk is not the note. It is the missing trail.
- Before you add another dispatcher, check whether your role coverage is structured.
- Dispatch is not just who is free. It is who is suitable, credentialed, available, and reviewable.

**Primary CTA:** "Comment TALON or take the Dispatch Readiness Diagnostic - link in profile."

**Secondary CTA:** "DM me your current dispatch method - I'll send a 2-sentence read."

**Cadence:**

- 2 posts / week minimum.
- 1 carousel / fortnight.
- 1 founder-voice longer-form / month.

**Rules:**

- No emojis in the hook line.
- No "We're so excited to announce…" language.
- Always link to diagnostic, not to a generic homepage.
- Reply to every operator comment within 24h.

---

## Instagram

**Goal:** Brand awareness in the industrial space and DM-keyword qualified leads.

**Formats:**

- Carousel (7–9 slides) on the wedge. See `instagram-carousel-scripts.md`.
- Story sequence ending with a poll: "Is your dispatch process structured?" → Yes / Sort of / No.
- Reel adaptation of the carousel for reach (optional, lower priority).

**Primary CTA:** "DM TALON for the diagnostic."

**Why DM keyword over link-in-bio:** Lower friction *and* a captured conversation thread for follow-up.

**Cadence:**

- 1 carousel / week.
- 2–3 story posts / week.
- DM auto-reply not required; manual reply within 24h is fine at current volume.

**Rules:**

- No stock hard hats.
- No fake compliance badges.
- Carousel slide 1 must contain the hook; slide 2 must contain the wedge.

---

## WhatsApp

**Goal:** Warm operator direct contact. Highest conversion channel, smallest reach.

**Use only with:** named operators in the warm list, industry mates, ops managers you've met or been introduced to. **Not for cold outreach.**

**Three scripts in `whatsapp-outreach-scripts.md`:**

1. Warm operator contact
2. Existing industry mate
3. Operations manager / supervisor

**Primary CTA:** "Want me to send you the 3-minute check?"

**Cadence:** As-needed. No mass-send. Send to 5–10 per week max in a focused burst.

**Rules:**

- Short. No paragraphs.
- No marketing language.
- Always lead with context-first ("I built a 3-minute check…"), never with a pitch.
- If they reply with interest, send the link with one sentence of context - not a wall of text.

---

## Email

**Goal:** Operations managers and named-contact owners who don't live on LinkedIn.

**Sequence:** 4 emails. See `email-sequence.md`.

1. Context-first intro
2. Role coverage problem
3. Audit / office handoff
4. Invite to diagnostic / discovery call

**Primary CTA in each:** the diagnostic link (with UTM).

**Cadence:**

- 7-day intervals between emails.
- Pause sequence if the lead replies.
- Max 4 emails per lead. No multi-month drip.

**Rules:**

- No public pricing.
- No "Are you the right person to talk to?" subject lines.
- Subject line should pass the operator-on-a-Friday-afternoon test.

---

## Website

**Goal:** Capture inbound interest at the moment of intent.

**Placement:**

- Homepage tile labelled "Check your dispatch readiness" linking to the diagnostic.
- Footer link "Dispatch Readiness Diagnostic".
- Optional: a dedicated `/diagnostic/` route if site config supports it.

**Rules:**

- Tile copy stays inside claim boundaries.
- No public pricing on the tile or the diagnostic landing page.
- Tile UTM: `?utm_source=homepage&utm_medium=tile&utm_campaign=drd-v1`.

---

## Sales calls

**Goal:** Use the diagnostic *during* discovery to structure the conversation.

**How to run it live:**

1. Open the diagnostic on screen share or send the link mid-call.
2. Have the operator answer the 15 questions out loud. You score with them.
3. Result page becomes the conversation. Don't pitch - read the band content together.
4. The recommended action becomes the next-step ask.

**Rules:**

- Do not coach the operator's answers. Let them score honestly.
- Capture the result summary into the lead sheet immediately.
- If the operator's score doesn't match how they describe their operation, that gap is the conversation.

---

## Warm industry outreach (founder-led)

**Goal:** Trade contacts, industry peers, and known operators within Cody's network.

**Approach:**

- Phone call or coffee first. Diagnostic shared after a real conversation.
- Treat the diagnostic as a *gift* - "this might be useful for you" - not a sales asset.
- If they pass it on to a peer, that referral is the highest-value lead in the funnel.

**Rules:**

- Never mass-send to warm contacts.
- Always personalise the share message.
- Capture referrals into the lead sheet with `source = warmindustry-referral`.

---

## Interstate (AU) and New Zealand outreach

**Goal:** Extend beyond Cody's direct geographic network.

**Approach:**

- Pre-identify 5–10 named operators per state / NZ region before any send.
- Use the warm-industry framing wherever possible (mutual contact, sector overlap).
- For genuine cold: lead with the wedge ("Most operators we talk to allocate four people for a job that needs four roles") and a link to the diagnostic, not a pitch.
- WhatsApp is acceptable for NZ operators only if you have a phone number from a warm intro.

**Rules:**

- Time-zone aware sending. No 6am cold messages.
- Track interstate / NZ leads with UTM `warm-au-other` or `warm-nz` so completion rates can be compared.
- Don't run more than one geographic burst at a time - protects founder follow-up capacity.

---

## Cross-channel rules

1. **One CTA per asset.** Pick diagnostic or discovery call - not both - for any single post or message.
2. **Always UTM-tag.** Untagged links are invisible in the lead sheet review.
3. **Founder voice only.** Until commercialisation sign-off (`docs/DISPATCHTALON_COMMERCIALISATION_SIGNOFF.md`), all sales output is Cody-voiced.
4. **No paid promotion** until 30 organic completions and at least 3 booked discovery calls.
5. **Reply windows:** LinkedIn 24h, Instagram DM 24h, WhatsApp 4h (during waking hours), email 48h. Respect these or pause the channel.

---

## Weekly review cadence

Every Monday:

1. Pull all diagnostic completions from the past 7 days.
2. Bucket by UTM source.
3. Move Tier-A completions into the first-five lead sheet.
4. Compare predicted band vs. discovery-call reality for any leads who progressed.
5. Update this file if a channel-specific pattern emerges.

If a channel produces zero qualified completions for 3 consecutive weeks, pause it and re-evaluate.
