# PANTA — Blumen Reception AI + Workspace Pilot

**Status:** v0.1 — architecture pilot  
**Date:** 2026-09-05  
**Scope:** AI communication, structured orchestration, workspace blocks, booking actions, loyalty handoff, location, Instagram/WhatsApp adapters and reminders.  
**Out of scope:** AI Voice, Viber, bulk marketing, commercial pricing.

## 1. Product goal

Build one reliable Digital Reception experience. The customer sees one assistant — **Maria** — while Marysoll engines remain the authority.

Example:

> "Želim da zakažem lasersku sutra u 12:30 ako može."

Expected flow:

1. understand intent/service/date/time;
2. resolve the canonical Blumen service;
3. check live Booking Engine availability;
4. propose only verified slots;
5. ask only for missing identity/contact;
6. confirm through canonical booking with race protection;
7. recover automatically if the slot was taken meanwhile;
8. show booking success + Google Maps directions;
9. award/attach loyalty value to the client identity; registration is required only to redeem it;
10. preserve the same conversation logic on web, Instagram and WhatsApp.

**Invariant:** AI understands and communicates. Marysoll decides what is true and what may be executed.

---

## 2. What we reuse

### Current `marysoll-platform`

Keep as authority:

- Tenant / capability boundaries;
- Service, Salon, Client data;
- current Booking Engine and its concurrency/idempotency rules;
- loyalty domain;
- Event Bus direction;
- Content Composer shared by Newsletter/Education;
- push/in-app infrastructure;
- existing admin AI agents/provider adapters.

Do not create Reception copies of booking, pricing or loyalty rules.

### `MarysollAI`

Port/adapt the parts that already solve booking-specific problems:

- deterministic Serbian/English intent/date/time parser;
- service/city/category semantic matching;
- correction semantics (`replace` / `remove`);
- booking flow state + `flowVersion`;
- block registry validation/recovery idea;
- verified availability;
- `SLOT_TAKEN` recovery;
- AvailabilityWatch / Notify Me + dedupe;
- slot revalidation before notification;
- Google Maps helpers.

Do **not** make browser Zustand/localStorage the omnichannel source of truth.

Do **not** port the old multi-agent Maria→Claudia conversational handoff as the Blumen design.

### `Spiritualized`

Reuse the architecture that makes the tutor conversation feel more stable:

- one visible persona;
- one structured turn;
- strict JSON output contract;
- backend schema validation;
- layered context;
- persistent session/thread;
- model suggests semantic meaning while backend derives trusted values;
- structured result is rendered separately from the chat text.

---

## 3. Why current Marysoll chat must change

Current `src/lib/ai/chat-agent.ts` is a useful prototype but not safe enough for omnichannel Reception:

- services/profile/recent appointments are serialized into the prompt;
- busy slots for the next three days are given to the model as text;
- the model is instructed to "check" availability itself;
- natural prose and JSON block data share the same streamed response;
- only a short history window is used;
- no strong server-side booking conversation state exists.

For Blumen, availability/price/booking must be tool/domain results, not prompt inference.

---

## 4. Why Spiritualized feels better

The main difference is not just the LLM model.

Spiritualized has fewer conversational failure points:

- one persona;
- explicit history;
- prompt composed from clear context layers;
- strict structured response;
- Pydantic validation;
- backend-derived trusted classifications;
- stable session transcript.

MarysollAI solved a harder booking problem and accumulated routing, handoff and recovery branches. Keep its booking reliability ideas, but simplify the visible conversation to **one Maria + deterministic skills**.

---

## 5. Target pipeline

```text
Web / Instagram / WhatsApp / SMS
                 │
                 ▼
          normalizeInbound()
                 │
                 ▼
          ConversationThread
                 │
                 ▼
      Deterministic intent parser
       service/date/time/correction
                 │
        clear ───┴─── ambiguous
          │              │
          │              ▼
          │      Structured AI Planner
          │          JSON + Zod
          └──────┬───────┘
                 ▼
         Reception Orchestrator
                 │
   ┌─────────────┼─────────────────────────┐
   ▼             ▼             ▼           ▼
 Catalog      Booking       Client      Content
 Service      Engine        Identity     / FAQ
   │             │             │           │
   └─────────────┼───────┬─────┴─────┬─────┘
                 ▼       ▼           ▼
              Loyalty  Location  AvailabilityWatch
                 │
                 ▼
         Resolved canonical data
                 │
                 ▼
     Reply Composer / deterministic template
                 │
          strict validation
                 │
                 ▼
           ReceptionTurn
                 │
     ┌───────────┼────────────┐
     ▼           ▼            ▼
 Web Workspace  Meta UI      SMS link
```

---

## 6. One Maria, multiple skills

User-facing assistant:

`Maria Reception`

Backend skills/tools:

- `CatalogSkill`
- `ServiceInfoSkill`
- `BookingSkill`
- `ClientIdentitySkill`
- `LoyaltySkill`
- `LocationSkill`
- `AvailabilityWatchSkill`
- `NotificationSkill`
- `ContentSkill`
- `SafetyPolicy`

A skill is normally deterministic application code, not another LLM persona/call.

Avoid:

`Maria AI → Booking AI → Price AI → Loyalty AI → Notification AI`

That adds latency, token cost, context drift and more failure points.

---

## 7. Structured planner contract

The model may identify intent and raw entities, but it must not be authoritative for price, IDs or slots.

Example shape:

```ts
type ReceptionIntent =
  | "service_info"
  | "price"
  | "availability"
  | "book"
  | "reschedule"
  | "cancel"
  | "notify_when_available"
  | "location"
  | "loyalty"
  | "faq"
  | "human_help";

const ReceptionPlanSchema = z.object({
  intent: z.enum([...]),
  confidence: z.number().min(0).max(1),
  entities: z.object({
    serviceQuery: z.string().optional(),
    dateText: z.string().optional(),
    timeText: z.string().optional(),
    clientCorrection: z.boolean().optional(),
  }),
  operations: z.array(z.enum([
    "RESOLVE_SERVICE",
    "GET_SERVICE_INFO",
    "GET_PRICE",
    "GET_AVAILABILITY",
    "CREATE_BOOKING",
    "GET_EXISTING_APPOINTMENT",
    "RESCHEDULE_APPOINTMENT",
    "CANCEL_APPOINTMENT",
    "CREATE_AVAILABILITY_WATCH",
    "GET_LOCATION",
    "GET_LOYALTY",
    "REQUEST_CONTACT",
    "HUMAN_HANDOFF",
  ])).max(3),
  clarification: z.string().optional(),
});
```

### Fields the model must never own

- tenant/client/service IDs;
- canonical price/duration;
- confirmed slot/start time;
- booking ID/status;
- points balance;
- raw href/action URL.

Server resolves those.

---

## 8. Backend canonicalization

The model may return:

```json
{
  "intent": "availability",
  "entities": {
    "serviceQuery": "cele noge",
    "dateText": "sutra",
    "timeText": "posle 17"
  }
}
```

Server resolves:

```text
serviceQuery
  → tenant-scoped Service resolver
  → canonical serviceId/name/price/duration
  → Booking Engine availability
  → verified slots
```

This follows the strongest existing Marysoll patterns: the model chooses semantic intent/action, while the server enriches and overwrites trusted data.

---

## 9. Reply contract

After canonical tools run, Maria receives only the minimal verified facts needed for the reply.

```ts
const ReceptionReplyDraftSchema = z.object({
  text: z.string().min(1),
  actionRefs: z.array(z.string()).max(4),
  quickReplies: z.array(z.string()).max(3).default([]),
});
```

`actionRefs` can reference only actions already created by the server, e.g.:

```text
availability.current
booking.confirm
client.contact
location.directions
loyalty.claim
watch.create
```

Unknown refs never execute.

---

## 10. LLM call budget

### Common booking turn: 0–1 LLM call

Deterministic parser handles service/date/time → domain tools run → one composer call for natural language.

### Button/action turn: 0 LLM calls

Clicking "Potvrdi 12:30" goes directly to the Booking domain. Success/conflict can use canonical templates.

### Ambiguous conversational turn: max 2 LLM calls

Planner → tools → composer.

Provider/model remains replaceable behind a `ReceptionModelProvider` interface. First port the Spiritualized architecture; only then A/B models if conversation quality still fails evals.

---

## 11. Workspace architecture

Create one `WorkspaceHost` that can render the same resolved items in different surfaces:

```ts
type WorkspaceSurface = "inline" | "drawer" | "page";
```

### Desktop

Chat + right-side workspace/drawer.

### Mobile

Bubble opens a full-screen assistant page, e.g.:

`/asistent?thread=<opaque-token>`

### Inline

Use only where the action naturally belongs to the current landing section, e.g. price or calendar.

No business logic changes by surface.

---

## 12. Keep block families separate

Do **not** merge all existing "blocks" into one persistence schema.

### A. Content Composer blocks

Existing authored/persisted content:

- Hero
- Article
- Feature
- ContentSplit
- Pricing
- AffiliateCTA
- Video
- Table
- Callout
- Checklist
- FileDownload
- ImageGallery

Current Marysoll already uses this shared Content Composer across Newsletter and Education. Keep it.

### B. Email blocks

Email-specific presentation:

- Hero
- Text
- Image
- Bullets
- Divider
- CTA

Keep email-specific.

### C. Reception interactive items

New ephemeral runtime UI:

- ServiceList
- ServiceDetails
- ServicePrice
- Availability
- BookingContact
- BookingConfirm
- BookingSuccess
- AppointmentManage
- NotifyMe
- Location
- LoyaltyClaim
- EmbeddedContent

These are conversation/action state, not authored landing content.

---

## 13. Reuse Newsletter/Edu content in Reception

If Blumen has approved content for:

> "Kako da se pripremim za lasersku epilaciju?"

`ContentSkill` can resolve an approved content document and return an `EmbeddedContentItem`.

Workspace then reuses existing `BlockList` / Content Composer renderers for:

- Article;
- Video;
- Checklist;
- Callout;
- Table;
- Gallery;
- download content.

Runtime AI should not regenerate approved specialist content unnecessarily.

---

## 14. Dynamic price is not authored `PricingBlock`

The existing Content Composer `PricingBlock` is presentation content.

Live Blumen service price must come from Service domain.

Use a separate `ServicePriceWorkspaceBlock`, even if it reuses the same design language.

Correct:

```text
AI intent → GET_PRICE(serviceQuery)
→ Service resolver → canonical value
→ ServicePriceWorkspaceBlock
```

Incorrect:

```text
AI → {"price": 4500}
```

---

## 15. Action contract, not React block names

AI should say:

`SHOW_AVAILABILITY`

not:

`AppointmentCalendarBlock`

Server builds the resolved action. Presentation adapters decide how to show it.

Same action can become:

- web: rich Availability block;
- Instagram/WhatsApp: concise text + button/link;
- SMS: short text + signed booking URL.

Business action remains identical.

---

## 16. Proactive Maria after ~2 minutes

Use a deterministic engagement trigger, not an LLM call.

Show after ~120 seconds of **active** time only if no meaningful action occurred.

Meaningful actions:

- service selection;
- booking/calendar open;
- CTA click;
- form start;
- AI open/message;
- completed booking.

Do not show if:

- tab hidden;
- user is typing;
- booking/form/modal active;
- assistant already opened;
- user dismissed it;
- already shown in this session.

Suggested copy on a treatment page:

> "Ako želite, mogu odmah da proverim prvi slobodan termin za ovaj tretman."

Home:

> "Mogu da pomognem oko usluga, cena i slobodnih termina."

**Do not auto-navigate without a user click.**

Desktop click → drawer.  
Mobile click → `/asistent`.

---

## 17. Server-side conversation state

Omnichannel truth must be server-side.

```ts
ConversationThread {
  id;
  tenantId;
  channel;
  externalConversationId?;
  externalUserId?;
  clientProfileId?;
  guestIdentityKey?;
  stateVersion;
  status;
  createdAt;
  updatedAt;
  expiresAt;
}
```

Structured context stores:

- intent;
- service query + canonical service;
- requested date/time window;
- proposed slot;
- booking/appointment ref;
- known contact;
- last action.

Correction must support explicit `replace/remove` semantics.

`stateVersion` rejects stale clicks/actions.

---

## 18. Cross-channel identity

Never ask for data the channel already knows.

### SMS / WhatsApp

Phone is known from transport.

Ask only for other truly required fields.

### Instagram

External Meta identity is known. Ask for phone only if booking policy requires it.

### Web guest

Ask the minimum booking identity required by the domain.

Existing ClientProfile data wins over re-asking.

---

## 19. Blumen booking example

Input:

> "Želim lasersku sutra u 12:30 ako može."

Flow:

1. parser → `book`, laser, tomorrow, 12:30;
2. CatalogSkill resolves exact Blumen service;
3. Booking Engine checks the exact slot.

If free:

> "Može. Termin sutra u 12:30 je slobodan."

Workspace:

`[ Potvrdi 12:30 ]`

If multiple laser services match, show `ServiceList` and ask one narrow clarification.

If no identity data, show `BookingContact` only after a valid slot/action exists.

---

## 20. Race-safe confirmation

`PROPOSE_SLOT` is not a reservation/hold unless the Booking Engine explicitly implements a hold.

On confirm:

- canonical booking create;
- live conflict protection;
- if `SLOT_TAKEN`, automatically fetch alternatives;
- preserve conversation context.

Maria:

> "Taj termin je upravo zauzet. Mogu da ponudim 13:00 ili 14:30."

No generic error dead end.

---

## 21. Guest loyalty

Do not force registration before booking.

After booking:

> "Termin je potvrđen. Ovim terminom ste ostvarili bodove. Sačuvali smo ih uz vaš profil — registrujte se kada želite da ih iskoristite."

Rules:

- earning may be attached to guest ClientProfile/identity;
- points cannot live only in browser state;
- registration verifies/claims the existing client profile;
- redeem requires registered/verified identity;
- booking itself remains guest-friendly.

---

## 22. Booking success + location

After successful booking, Workspace may show:

1. `BookingSuccessBlock`
2. `LocationBlock`
3. `LoyaltyClaimBlock`

Canonical location data should include:

```ts
{
  formattedAddress,
  lat,
  lng,
  googlePlaceId?,
  arrivalInstructions?
}
```

`LocationBlock` offers "Otvori navigaciju" using Google Maps directions.

Do not rely only on free-form Hero location text.

---

## 23. Notify Me

If no suitable slot exists:

> "Trenutno nema termina u tom periodu. Mogu da vas obavestim ako se oslobodi."

Watch stores canonical service/date/time-window/contact/channel + dedupe/expiry.

On `slot_released`:

1. match watch;
2. revalidate slot;
3. only then notify;
4. send a signed booking CTA.

---

## 24. Workspace UI boundary

Suggested folders:

```text
src/components/reception/
  ReceptionBubble.tsx
  ReceptionChat.tsx
  ReceptionWorkspace.tsx
  blocks/
    ServiceListBlock.tsx
    ServiceDetailsBlock.tsx
    ServicePriceBlock.tsx
    AvailabilityBlock.tsx
    BookingContactBlock.tsx
    BookingConfirmBlock.tsx
    BookingSuccessBlock.tsx
    AppointmentManageBlock.tsx
    AvailabilityWatchBlock.tsx
    LocationBlock.tsx
    LoyaltyClaimBlock.tsx
    EmbeddedContentBlock.tsx
```

Blocks render typed payload and emit semantic events only.

No API/business logic inside UI components.

---

## 25. Workspace events

Examples:

```ts
type WorkspaceEvent =
  | { type: "SELECT_SERVICE"; serviceId: string }
  | { type: "SELECT_SLOT"; slotRef: string; stateVersion: number }
  | { type: "SUBMIT_CONTACT"; payload: ContactInput }
  | { type: "CONFIRM_BOOKING"; intentRef: string; stateVersion: number }
  | { type: "CREATE_WATCH"; watchRef: string }
  | { type: "OPEN_DIRECTIONS"; locationRef: string }
  | { type: "START_REGISTRATION"; clientRef: string };
```

Server validates tenant/thread/state/version before execution.

---

## 26. Instagram and WhatsApp are adapters

Do not build `InstagramAI`, `WhatsAppAI`, `WebsiteAI`.

They all use the same:

`ConversationThread → Reception Orchestrator → domain tools`

Normalize provider payload first:

```ts
interface InboundReceptionMessage {
  tenantId: string;
  channel: "web" | "instagram" | "whatsapp" | "sms";
  externalConversationId?: string;
  externalUserId?: string;
  text: string;
  receivedAt: string;
  capabilities: {
    buttons: boolean;
    richCards: boolean;
    links: boolean;
  };
}
```

Provider webhook raw payload never goes directly into the AI layer.

---

## 27. Cross-channel continuation

A WhatsApp/Instagram reply may link to Blumen's site.

Signed link contains only an opaque action/thread reference + TTL.

When opened, web resumes the same intent:

> "Tražili ste lasersku epilaciju sutra u 12:30."

Before confirmation, live availability is checked again.

---

## 28. Notifications/reminders

Current Marysoll reminder code already has an important good invariant: atomic claim/dedupe before sending push/in-app reminders.

Generalize that behavior.

Supported channel vocabulary:

```text
in_app
push
email
sms
whatsapp
instagram
```

But a channel is used only if `ChannelEligibility` says it is valid.

Eligibility checks:

- contact/identity available;
- permission/opt-in;
- provider messaging rules/window/templates;
- push subscription;
- tenant usage budget;
- channel health/preferences.

---

## 29. Do not send every reminder everywhere

Wrong:

`email + push + SMS + WhatsApp + Instagram`

for every event.

Pilot principle:

- web confirmation UI always;
- reply in the channel where the booking happened;
- registered client: in-app/push first;
- guest: choose one suitable paid/contact channel;
- another paid channel only as fallback;
- Instagram reminder only when platform/conversation state permits it.

This protects both UX and the $49 early-adopter cost envelope.

---

## 30. Notification delivery ledger

Use per-channel delivery state instead of one global boolean:

```ts
NotificationDelivery {
  tenantId;
  eventId;
  appointmentId?;
  clientProfileId?;
  eventType;
  bucket?;
  channel;
  provider;
  status;
  dedupeKey;
  providerMessageId?;
  providerCost?;
  currency?;
  attempt;
  createdAt;
}
```

Dedupe key includes:

`tenant + event + recipient + channel + bucket`

Two parallel workers must still produce one delivery.

---

## 31. Event-driven direction

Target:

```text
Booking Engine
  ├─ booking.created
  ├─ appointment.changed
  ├─ appointment.cancelled
  └─ slot.released
          │
          ▼
       Event Bus
          │
          ▼
Notification Orchestrator
          │
   ChannelEligibility
          │
 push / email / SMS / WA / IG / in-app
```

Existing cron can remain the pilot scheduler for `appointment.reminder_due`, but it must not become the place where every provider rule is hardcoded.

---

## 32. Standard notifications do not need AI

Do not spend tokens to generate:

> "Termin je sutra u 12:30."

Use canonical tenant-branded templates for:

- booking confirmation;
- reminder;
- appointment changed;
- slot released;
- missed-call redirect.

AI is for conversation, not deterministic system notifications.

---

## 33. AI validation pipeline

Every model response:

```text
structured/JSON mode
→ JSON parse
→ Zod validation
→ semantic validation
→ allowlist refs
→ domain canonicalization
→ execute
```

If invalid:

1. at most one controlled repair attempt;
2. otherwise deterministic safe fallback;
3. never execute partially parsed actions.

---

## 34. Data after intent

Do not put all salon data into every prompt.

```text
message
→ intent
→ fetch only needed data
→ minimal verified context
→ reply
```

"Koja vam je adresa?" does not need appointment history.

"Imate li laser sutra?" does not need Newsletter analytics.

This reduces tokens, latency, privacy exposure and prompt confusion.

---

## 35. Golden Blumen conversation evals

Before Instagram/WhatsApp, create 50–100 test turns from real/anonymized salon messages plus edge cases.

Must include:

- price questions;
- service ambiguity;
- exact/relative date and time;
- "posle 5", "oko 12", "prvi slobodan";
- corrections: "ne noge, pazuh", "ipak subota";
- follow-ups: "a koliko traje?", "može onda taj";
- no slots + Notify Me;
- race conflict;
- guest/known phone/Instagram identity;
- reschedule/cancel;
- location;
- preparation/contraindication questions.

Metrics:

```text
intent_correct
service_resolution_correct
date_time_correct
asked_only_missing_fields
canonical_price_used
canonical_availability_used
no_hallucinated_slot
correct_workspace_action
conversation_naturalness
no_dead_end
no_duplicate_question
```

Hard failures:

- wrong booking;
- wrong price;
- invented availability;
- wrong tenant data;
- unvalidated action execution.

---

## 36. Observability

Per turn track:

- tenant/thread/channel;
- parser resolved yes/no;
- planner/composer calls;
- intent;
- latency;
- token usage;
- domain actions;
- rendered workspace items;
- fallback/validation failure.

Per external message track provider cost/status.

This is required to know whether the early-adopter plan is financially sustainable.

---

## 37. Suggested code boundary

```text
src/lib/reception/
  contracts/
  parsing/
  context/
  orchestration/
  skills/
  presentation/
  channels/
  policies/
```

Pilot only. Do not start a broad engine rewrite for one tenant.

When a second/third tenant confirms the same pattern, extract stable transport/notification contracts into the planned engine/package boundary.

---

## 38. Reuse matrix

| Source | Part | Decision |
|---|---|---|
| Current Marysoll | Content Composer schema/renderer | reuse |
| Current Marysoll | Newsletter/Education shared content blocks | reuse |
| Current Marysoll | landing AI strict JSON + Zod + server CTA resolution | reuse pattern strongly |
| Current Marysoll | current chat prose + JSON stream | replace for Reception |
| Current Marysoll | Booking Engine | authority |
| Current Marysoll | reminder atomic claim | reuse invariant |
| MarysollAI | deterministic parser | port/adapt |
| MarysollAI | semantic catalog matching | port/adapt |
| MarysollAI | correction + flowVersion | port server-side |
| MarysollAI | block registry/recovery | adapt to Action/Workspace registry |
| MarysollAI | AvailabilityWatch/revalidation | port to current architecture |
| MarysollAI | Maps helpers | reuse/port |
| MarysollAI | Maria→Claudia user conversation handoff | do not port |
| Spiritualized | one persona / structured turn | reuse pattern |
| Spiritualized | layered context | reuse pattern |
| Spiritualized | schema validation + backend derivation | reuse pattern |
| Spiritualized | tutor-specific grammar logic | do not port |

---

## 39. Pilot phases

### R0 — Contracts

Build:

- `ReceptionPlanSchema`
- `ReceptionReplyDraftSchema`
- `ReceptionWorkspaceItem`
- `WorkspaceEvent`
- `InboundReceptionMessage`
- `NotificationDelivery`

**Gate:** invalid AI output cannot call an engine.

### R1 — Parser + canonical skills

Port/adapt date/time/correction/service parsing. Wire Service, Booking availability and location.

**Gate:** common Blumen booking utterances no longer use prompt-based availability.

### R2 — Structured Maria

Implement:

`parse → optional planner → tools → compose → validate → ReceptionTurn`

Add server thread/context and safe fallback.

**Gate:** golden web evals pass hard invariants.

### R3 — Workspace

Build bubble + drawer + page + interactive registry and embedded Content Composer blocks.

**Gate:** same resolved action works in inline/drawer/page without duplicated business logic.

### R4 — Booking + loyalty + maps

Full guest flow with race recovery and registration-to-redeem.

### R5 — Notification Orchestrator

Generalize reminders, delivery ledger, paid channel budget and channel eligibility.

### R6 — Instagram + WhatsApp

Connect provider adapters only after web Reception is stable.

**Gate:** same test scenario produces the same canonical booking outcome on web/Instagram/WhatsApp.

### R7 — Proactive Maria

Add the two-minute no-action trigger and measure assistant-open → booking conversion.

---

## 40. Hard non-goals

- AI Voice;
- Viber;
- multiple user-facing conversational agents;
- LLM-calculated availability;
- LLM-generated prices;
- raw LLM href;
- React block names as business contract;
- forced registration before booking;
- every reminder on every channel;
- bulk marketing;
- broad Content Composer rewrite;
- broad Booking Engine rewrite.

---

## 41. Final decision

For Blumen build:

> **One Persona + Deterministic Parser + Structured Planner + Canonical Skills + Validated Reply + Surface/Channel Adapters**

Not:

> "chatbot with a huge salon prompt."

Web receives the richest Workspace.

Instagram and WhatsApp are transports into the same thread and the same Marysoll source of truth.

Existing Newsletter/Education Content Composer stays the shared renderer for authored content.

Reception gets a separate interactive Workspace item contract.

Booking remains the only authority for slots/appointments. Loyalty remains the authority for points. Notification policy decides the appropriate channel by eligibility, consent, reliability and cost.

## 42. Reviewed implementation references

### Current Marysoll

```text
src/lib/ai/chat-agent.ts
src/lib/ai/orchestrator.ts
src/lib/ai/agents/landingPageAgent.ts
src/lib/content/schemas/landing-blocks.ts
src/lib/content/registry/blockRegistry.ts
src/components/content-composer/BlockList.tsx
src/components/content-composer/PreviewRenderer.tsx
src/components/education/EducationContentEditor.tsx
src/components/email-blocks/*
src/lib/reminders/sendDueReminders.ts
src/app/api/cron/reminders/route.ts
```

### MarysollAI

```text
src/lib/intent/parseIntent.ts
src/lib/ai/block-registry.ts
src/lib/ai/block-orchestrator.ts
src/lib/ai/booking-flow-state.ts
src/lib/ai/booking/booking-block-data.ts
src/lib/availability/generateVerifiedSlots.ts
src/lib/availability/revalidateMatchedSlot.ts
src/app/api/waitlist/route.ts
src/app/api/booking/route.ts
src/lib/geo/maps.ts
docs/ai/agent-improvement-plan.md
```

### Spiritualized

```text
backend/app/orchestrator.py
backend/app/prompt_builder.py
backend/app/schemas.py
backend/app/agents.py
frontend/src/components/Conversation.tsx
frontend/src/components/TutorMessage.tsx
frontend/src/types/tutor.ts
```

## 43. First engineering action

Before Meta webhooks:

1. create Reception schemas/contracts;
2. create Workspace item registry;
3. port deterministic parser;
4. wire Booking/Service/Identity tools;
5. implement server `ConversationThread`;
6. replace prose+embedded-JSON chat contract with structured turns;
7. run Blumen golden eval set;
8. only then add Instagram/WhatsApp adapters.
