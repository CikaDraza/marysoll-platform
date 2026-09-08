# PANTA — Blumen Digital Reception Pilot

**Status:** Draft v0.1 — feasibility / product boundary  
**Date:** 2026-09-05  
**Pilot tenant:** Blumen Beauty & Hair Studio, Niš  
**Commercial hypothesis:** first month $19, then $49/month as early-adopter price  
**Primary outcome:** reduce manual phone/DM booking by moving clients to Blumen's own Marysoll booking funnel.

---

## 1. Problem we are solving

Blumen does not primarily need another calendar. The business problem is:

> Clients call, send Instagram/WhatsApp/SMS messages, ask for prices and free slots, and the owner still answers and manually creates appointments.

The pilot must change that behavior.

Target flow:

```text
PHONE / SMS / INSTAGRAM / WHATSAPP
              │
              ▼
     Digital Reception layer
              │
     ┌────────┴─────────┐
     │                  │
simple redirect      real question
     │                  │
     ▼                  ▼
booking URL        Marysoll AI
                       │
                       ▼
                 Marysoll facts/tools
                 - salon facts
                 - services/prices
                 - availability
                 - booking intent
                       │
                       ▼
                 signed booking CTA
                       │
                       ▼
                atomic re-check
                       │
              ┌────────┴────────┐
              │                 │
           free             no longer free
              │                 │
              ▼                 ▼
          confirmed        alternatives
```

The owner can still create a manual guest appointment as an exception, but the system must not make that the default operating flow.

---

## 2. Product principle

### AI = conversation and intent understanding
### Marysoll = source of truth

The assistant may understand:

- which treatment the client means;
- whether the client is asking for price, duration, preparation or availability;
- approximate preferred day/time;
- whether the user wants to book, reschedule, cancel or ask a question.

The assistant must **not invent**:

- service price;
- duration;
- working hours;
- staff/resource availability;
- appointment availability;
- cancellation rules;
- discount/loyalty values;
- booking success.

All facts come from canonical Marysoll data and domain functions.

---

## 3. Feasibility verdict by channel

| Channel | Pilot feasibility | Recommendation |
|---|---|---|
| Blumen website / Marysoll chat | **YES** | Core channel; implement first |
| Instagram Professional DM | **YES** | Official Instagram Messaging API + webhooks; client must initiate the conversation |
| WhatsApp Business | **YES** | Direct Meta WhatsApp Cloud API preferred; avoid unnecessary BSP monthly fees |
| SMS | **YES, provider-dependent** | Use API-capable SMS provider; transport cost is metered |
| Missed-call → SMS | **CONDITIONAL** | Requires carrier/VoIP/telephony event or current CRM/provider API; ordinary mobile plan alone is not enough |
| Viber Business | **TECHNICALLY YES, ECONOMICALLY NO for $49 pilot** | Keep out of included pilot; current Viber commercial minimums exceed the entire Marysoll plan |
| AI voice receptionist | **YES later, NOT pilot** | Opposes the initial goal of retraining clients away from calls and adds telephony cost/complexity |

### Important terminology

We are **not integrating “Meta AI” into Marysoll**.

We integrate **Marysoll's AI assistant** with Meta's official Instagram and WhatsApp messaging APIs. Meta is the communication transport; Marysoll owns the salon knowledge, booking actions, policy and AI orchestration.

---

## 4. What the current Marysoll code already gives us

The current repository already has useful foundations:

- multi-tenant Tenant model and per-tenant `aiSettings`;
- client-facing AI endpoint;
- DeepSeek-based chat agent;
- services, salon profile and appointment data;
- canonical beauty booking request resolution;
- extracted Booking availability core;
- Event Bus foundation;
- PWA/web-push infrastructure;
- documented future Notification Engine boundary.

Relevant repository locations:

```text
src/app/api/ai/conversation/route.ts
src/lib/ai/chat-agent.ts
src/lib/ai/agents.ts
src/models/Tenant.ts
src/lib/booking/*
packages/booking-engine/*
docs/ARHITEKTURA-ENGINES.md
docs/PANTA-BOOKING-CRM-ARC.md
```

This means the pilot is **not a greenfield project**.

---

## 5. Critical gap in the current AI assistant

The current `src/lib/ai/chat-agent.ts` is useful as a prototype but is **not safe enough for omnichannel booking**.

Today it:

1. loads services and salon profile from MongoDB;
2. loads recent non-cancelled appointments;
3. serializes busy slots for only the next three days into the system prompt;
4. asks the LLM to “check busy slots before proposing a booking”.

That is not the same as using Booking Engine as authority.

### Required change

Replace prompt-based availability inference with explicit tools/actions:

```ts
getSalonFacts()
searchServices(query)
getServiceDetails(serviceId)
getAvailability({ serviceId, dateRange, resourceId? })
createBookingIntent(...)
confirmBookingIntent(...)
getBookingStatus(...)
```

The LLM may decide **which tool to call**, but it never calculates availability itself.

`getAvailability()` must call the canonical Marysoll availability logic.

`confirmBookingIntent()` must perform an atomic availability re-check before creating the appointment.

### Hard invariant

> A text generated by the AI must never be sufficient to create or reserve a slot.

Only the Booking domain may do that.

---

## 6. Booking intent and one-click confirmation

For Instagram, WhatsApp and SMS, the preferred conversion path is not a long form.

Example:

```text
Client:
"Imate li cele noge u petak posle 17?"

AI:
"Prvi slobodan termin za [service] je petak u 18:00.
[ Potvrdi termin u 18:00 ]"
```

The button points to a signed Marysoll URL.

### BookingIntent

Minimal concept:

```ts
BookingIntent {
  tenantId
  channel
  externalConversationId
  clientId?
  normalizedPhone?
  serviceId
  requestedDate
  proposedStart
  status: "pending" | "confirmed" | "expired" | "unavailable"
  expiresAt
  idempotencyKey
  tokenHash
}
```

The signed link contains only an opaque intent reference/token, not raw client data.

On click:

1. validate signature + TTL;
2. load intent tenant-scoped;
3. atomic availability re-check;
4. if still free → canonical booking create;
5. if no longer free → do **not** create; show next alternatives;
6. mark intent idempotently.

This gives the “one click to confirm” experience without allowing race-condition double booking.

---

## 7. Blumen website / booking funnel

The existing Blumen brand should be preserved. The pilot is not a generic website redesign.

The structural change is the funnel:

### Current undesirable behavior

```text
website → contact / phone / WhatsApp → owner → manual booking
```

### Target behavior

```text
website → service → live availability → booking
```

Recommended top-of-page hierarchy:

1. Blumen brand / key treatment proposition;
2. **Zakaži termin** primary CTA;
3. service selector;
4. earliest availability;
5. treatment information, trust, gallery, FAQ;
6. contact as fallback — not as the booking mechanism.

Phone copy should no longer teach users “Pozovite za zakazivanje”.

---

## 8. Missed-call flow

The first telephone automation should be deliberately simple.

```text
incoming call
   │
no answer / configured call condition
   │
telephony webhook
   │
Marysoll dedupe / cooldown
   │
SMS
   ▼
"Zakazivanje termina je online:
[Blumen booking URL]"
```

### Do not promise “exactly after two rings” until provider discovery

The technically reliable trigger is a call state such as:

- no answer;
- busy;
- rejected;
- missed.

Whether it can fire after exactly two rings depends on the carrier/VoIP provider.

### Discovery requirement

Before implementation we need from Blumen:

- mobile operator;
- tariff/business package;
- number that must remain public;
- existing CRM/SMS provider;
- whether the number can be forwarded;
- whether the provider exposes inbound call and SMS webhooks/APIs.

If his current provider already supplies 5 RSD SMS and a usable API, we should reuse it rather than migrate purely for technical convenience.

---

## 9. Instagram integration

Target:

```text
Instagram user → DM → Meta webhook → Marysoll channel adapter
→ policy/router → AI/tool calls → Meta Send API → user
```

Requirements:

- Instagram Professional account;
- Meta app;
- appropriate Instagram business messaging permissions;
- webhook endpoint;
- Advanced Access before serving accounts that are not owned/managed by the app developer;
- tenant-specific account/token connection;
- webhook signature/event validation and idempotency.

Important platform rule:

> The Instagram user must initiate the conversation before the business can use the Send API for that recipient.

This fits Blumen well: the system is intended to answer people who already DM the salon, not to cold-DM the client's database.

---

## 10. WhatsApp integration

Preferred pilot approach:

**Meta WhatsApp Cloud API directly**, with Blumen owning/connecting the WhatsApp Business Account.

Target:

```text
customer WA → Meta webhook → Marysoll
→ AI/tools → WhatsApp reply
```

### Policy boundary

- User-initiated conversations can be automated during the customer-service window.
- Business-initiated communication outside that window requires an approved template.
- Proactive WhatsApp contact requires appropriate opt-in.
- Automation must have a clear human/escalation path.

### October 1, 2026 cost change

From 2026-10-01 Meta is introducing charges for service replies after a monthly free allowance and charging utility messages inside the 24-hour window as well.

For Serbia, current rate-card mapping is **Rest of Central & Eastern Europe**. The currently published October reference rate is approximately:

- utility / authentication / service: **€0.0175 per delivered message**
- marketing: **€0.0712 per delivered message**

The pilot should therefore optimize for:

1. short answers;
2. one useful CTA instead of long multi-message chats;
3. website handoff as soon as the user can self-serve;
4. no unnecessary marketing messaging.

---

## 11. Viber decision

Do **not** include Viber in the $49 Blumen pilot.

Current Viber commercial terms for Serbia make this uneconomic for a single early adopter:

- Viber Chatbot: around **€100 monthly license**, plus chatbot-initiated messaging charges;
- Viber Business Messages: around **€115 monthly minimum commitment** for Serbia.

Either number alone is above the complete Marysoll subscription.

Decision:

> Keep a Viber adapter in the future provider contract, but do not onboard a Viber sender until a tenant pays for it separately or enough tenants justify a shared commercial arrangement.

No unofficial personal-Viber automation.

---

## 12. AI provider and cost

Marysoll currently uses DeepSeek for client chat.

### Immediate maintenance requirement

The repository still declares:

```ts
model: "deepseek-chat"
```

DeepSeek deprecated the legacy `deepseek-chat` / `deepseek-reasoner` names in July 2026 in favor of the V4 model family.

Before this pilot becomes production-critical, move the chat adapter to the supported model name, currently:

```text
deepseek-v4-flash
```

and add provider/model configuration rather than hard-coding the commercial model into booking-domain behavior.

### Cost envelope

Use **responses/turns + internal token budget**, not “unlimited AI”.

Proposed Blumen early-adopter allowance:

- **1,000 AI assistant replies / month**
- internal guardrail: **up to ~6M input + 0.6M output tokens/month**, or a **$5 AI-cost cap**, whichever is reached first;
- simple deterministic replies should bypass the LLM when possible.

At current DeepSeek V4-Flash peak pricing, this is still only a few dollars of AI cost per month under normal short customer conversations.

AI is therefore **not the primary variable-cost risk**. SMS/WhatsApp transport is.

---

## 13. $49 early-adopter economic envelope

### Billing

```text
Month 1        $19   pilot / onboarding period
After launch   $49   Blumen early-adopter recurring price
```

Paddle public pay-as-you-go fee is currently 5% + $0.50 per checkout transaction.

At $49:

```text
Gross subscription                    $49.00
Approx. Paddle fee                     -$2.95
Net before infra/communications        $46.05
```

### Recommended included usage

Do **not** promise unlimited SMS or unlimited third-party messaging.

For Blumen v0.1:

```text
Marysoll product                         included
Website + booking                        included
Instagram Digital Reception              included
WhatsApp Digital Reception               included
Website AI assistant                     included

AI allowance                             1,000 replies/month
Communication transport credit           1,500 RSD/month
```

At Blumen's stated current SMS cost of roughly 5 RSD, 1,500 RSD is equivalent to:

```text
~300 SMS segments/month
```

But the credit is better than a hard SMS count because the same budget can later cover:

- SMS;
- paid WhatsApp utility/service messages;
- provider surcharges.

Instagram DM transport does not consume this SMS/WhatsApp transport credit unless Meta later introduces a direct messaging charge.

### Why 1,500 RSD

It is large enough to make the pilot useful but small enough that a $49 subscription does not become a telecom resale loss.

Illustrative worst-case monthly envelope:

```text
Paddle                              ~$2.95
Transport credit                    ~1,500 RSD
AI                                   <= $5 guardrail
Shared infra allocation              controlled/shared
Remaining margin                     still positive for early adopter
```

This is intentionally an early-adopter margin, not the eventual public Marysoll price.

### Overage

For the pilot:

- no surprise invoice;
- usage warning at 70%, 90%, 100%;
- at 100%: salon approves/top-ups transport credit, or channel falls back to free/self-service routes;
- no Marysoll-funded unlimited usage.

Longer term use a **Communication Wallet**.

---

## 14. The 3,000-client migration

The existing client database is strategically valuable.

### Migration sequence

1. import;
2. normalize phones/emails;
3. deduplicate;
4. map known history if export supports it;
5. validate consent/communication basis;
6. test booking funnel with a small group;
7. announce the new booking process.

A one-time SMS to all 3,000 clients at 5 RSD/segment would be approximately:

```text
15,000 RSD
```

This is **not included** in the $49 monthly subscription.

It is a tenant-funded migration campaign/transport expense.

Message should be operational, concise and booking-focused rather than promotional.

---

## 15. Minimum data model for the pilot

Do not put provider state directly into random UI components.

Suggested application/infrastructure boundaries:

```text
DigitalReceptionConfig
ChannelConnection
ConversationThread
ConversationMessage / minimal audit event
BookingIntent
CommunicationUsageLedger
```

### DigitalReceptionConfig

```ts
{
  tenantId,
  enabled,
  onlineBookingOnly,
  aiEnabled,
  channels: {
    website,
    instagram,
    whatsapp,
    sms
  },
  missedCallReplyEnabled,
  monthlyTransportBudget,
  monthlyAiReplyLimit
}
```

### ChannelConnection

Provider-specific connection metadata:

```ts
{
  tenantId,
  channel,
  provider,
  externalAccountId,
  status,
  tokenReference/encryptedCredential,
  connectedAt,
  lastHealthCheckAt
}
```

### CommunicationUsageLedger

Every external cost is attributable:

```ts
{
  tenantId,
  channel,
  direction,
  provider,
  externalMessageId,
  usageType,
  providerCost,
  currency,
  aiInputTokens?,
  aiOutputTokens?,
  createdAt
}
```

This ledger is the basis for future Communication Wallet and plan limits.

---

## 16. Architecture fit with the existing Panta plan

Do not start a broad T4 AI / T6 Notification rewrite just to launch Blumen.

The existing architecture already says:

```text
Booking → Event Bus → Notification
```

and reserves:

- AI Core / AI Skills;
- Notification Engine;
- Event Bus fan-out.

### Pilot rule

Create the smallest clean composition layer:

```text
src/lib/digital-reception/
  orchestrator.ts
  policies.ts
  usage.ts
  booking-tools.ts
  channels/
    website.ts
    instagram.ts
    whatsapp.ts
    sms.ts
```

This layer may orchestrate engines/services but must not own:

- slot calculation;
- booking concurrency;
- pricing;
- service truth;
- loyalty truth.

Provider adapters are infrastructure.

When a **second real tenant** adopts Digital Reception, extract stable transport contracts into the planned Notification Engine package instead of duplicating Blumen code.

This avoids both extremes:

- no Blumen-specific hack;
- no premature multi-month engine rewrite.

---

## 17. Required invariants

1. **Tenant isolation** on every channel event and booking tool call.
2. **Webhook idempotency** by provider message/event ID.
3. **Booking idempotency** on confirmation.
4. **Atomic availability re-check** before final booking.
5. AI cannot write an appointment directly.
6. AI cannot invent price, duration or availability.
7. Provider credentials are server-only and encrypted/referenced securely.
8. Conversation window/template rules are enforced by code, not prompt.
9. Monthly usage caps are enforced server-side.
10. AI medical/safety boundary for laser/skin questions:
    - may relay salon-approved factual instructions;
    - does not diagnose;
    - contraindication/medical-risk questions escalate to staff.
11. Opt-out/consent state must be respected for proactive messaging.
12. All outbound booking links are tenant-scoped, signed and expiring.

---

## 18. Pilot phases

### P0 — Discovery / provider gate

Collect:

- Blumen phone carrier/package;
- current SMS/CRM provider and API documentation;
- current Fresha/other booking exports;
- Instagram Professional / Meta Business ownership;
- WhatsApp Business ownership and current number state;
- service list, variants, prices, durations, staff/resources;
- working hours, breaks, leave;
- client export;
- approved FAQ and safety/contraindication copy.

**Exit gate:** we know which number/provider can trigger missed-call SMS and whether Fresha remains live during transition.

---

### P1 — Funnel + canonical data

- create Blumen tenant;
- reproduce brand identity in Marysoll theme;
- booking above the fold;
- remove phone-first booking funnel;
- import/verify services/prices/durations/resources;
- configure availability;
- PWA owner/admin install;
- test guest booking end-to-end.

**Exit gate:** Blumen can run booking from Marysoll without any AI or Meta channel.

---

### P2 — AI safety refactor

- migrate DeepSeek model alias;
- replace prompt-based slot inference with Booking tools;
- create BookingIntent + signed CTA;
- usage metering;
- per-tenant limits;
- conversation summary/history strategy;
- safety/escalation policy.

**Exit gate:** AI cannot produce a booking result not confirmed by Booking domain.

---

### P3 — Instagram + WhatsApp

- Meta app configuration;
- Instagram webhook/send adapter;
- WhatsApp Cloud API webhook/send adapter;
- token/account health checks;
- inbound event idempotency;
- website handoff CTA;
- test message windows/templates.

**Exit gate:** real Blumen test accounts complete question → availability → booking.

---

### P4 — SMS + missed call

- connect current SMS provider if viable;
- otherwise choose API-capable Serbian route/provider;
- inbound SMS only if the provider supports it;
- telephony missed-call event integration;
- cooldown to prevent repeated SMS on multiple calls;
- transport ledger.

**Exit gate:** a missed call can reliably generate one booking-link SMS without owner action.

---

### P5 — Client migration / rollout

- import and dedupe ~3,000 clients;
- pilot announcement to a small segment;
- verify unsubscribe/complaints/delivery;
- full operational announcement;
- start “online booking only” behavior.

---

## 19. Success metrics

Measure before and after. Do not judge the pilot only by whether APIs work.

Core KPIs:

```text
self_service_booking_rate
manual_booking_rate
calls_per_100_bookings
DMs_requiring_owner
AI_handoff_rate
booking_link_conversion
booking_intent_expiry_rate
double_booking_count         target = 0
AI_invalid_slot_count        target = 0
communication_cost_per_booking
AI_cost_per_booking
```

Suggested pilot goals, not guarantees:

- clear month-over-month reduction in owner-handled booking;
- majority of new bookings self-service after behavior migration;
- zero bookings created from an unverified AI-only slot;
- communication cost materially below the labor/time saved.

---

## 20. Explicitly out of scope for Blumen v0.1

- AI voice receptionist;
- Viber paid sender/chatbot;
- cold Instagram outreach;
- bulk WhatsApp marketing;
- full Fresha bi-directional sync unless a concrete API/business case is proven;
- broad T4/T6 engine rewrite;
- medical diagnosis or individualized treatment eligibility decisions;
- unlimited communications bundled into $49.

---

## 21. Go / no-go decision

### GO

The pilot is technically feasible and fits the existing Marysoll architecture **if** we keep the boundaries above.

Instagram + WhatsApp AI integration is realistic.

SMS is realistic once an API-capable provider is confirmed.

Missed-call automation is realistic only after the phone/provider discovery gate.

Viber is not commercially compatible with a $49 single-tenant pilot under current public pricing.

### Most important technical work before channel integration

Do **not** begin with Meta webhooks.

First make the AI use canonical Booking tools rather than embedding recent appointments into its prompt.

That change is what makes this statement true:

> AI understands the client; Marysoll decides what is true.

---

## 22. Commercial pilot recommendation

For Blumen:

```text
Now / first pilot month         $19
After production launch         $49 / month

Included:
- Marysoll site + booking
- branded Blumen funnel
- website AI assistant
- Instagram Digital Reception
- WhatsApp Digital Reception
- up to 1,000 AI replies/month
- 1,500 RSD monthly communication transport credit
  (~300 SMS segments at his stated ~5 RSD rate)

Not included:
- one-time 3,000-client messaging campaign
- Viber business fees
- AI voice/call minutes
- communication usage beyond included credit
- third-party provider setup/license fees that cannot fit the pilot envelope
```

Treat $49 as a **founding / early-adopter price**, not the permanent public price for future Digital Reception tenants.

Future public pricing should be revised after 30–60 days of real usage data.

---

## 23. Sources / verification snapshot

Repository:
- https://github.com/CikaDraza/marysoll-platform/blob/main/docs/ARHITEKTURA-ENGINES.md
- https://github.com/CikaDraza/marysoll-platform/blob/main/src/app/api/ai/conversation/route.ts
- https://github.com/CikaDraza/marysoll-platform/blob/main/src/lib/ai/chat-agent.ts
- https://github.com/CikaDraza/marysoll-platform/blob/main/src/lib/ai/agents.ts
- https://github.com/CikaDraza/marysoll-platform/blob/main/src/models/Tenant.ts

Instagram / Meta:
- https://www.postman.com/meta/instagram/folder/uxudqu0/send-api
- https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api

WhatsApp:
- https://business.whatsapp.com/policy/
- https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api

Viber:
- https://www.forbusiness.viber.com/documents/business-messages.pdf
- https://www.forbusiness.viber.com/documents/chatbots.pdf

DeepSeek:
- https://api-docs.deepseek.com/quick_start/pricing
- https://api-docs.deepseek.com/updates/

Paddle:
- https://www.paddle.com/pricing
