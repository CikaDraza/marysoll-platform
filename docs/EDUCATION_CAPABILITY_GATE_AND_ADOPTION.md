# Education Capability Gate and Salon -> Salon + Edu Adoption

**Status:** Capability specification — **largely implemented** (superseded in parts)  
**Implementation status (2026-08-29):** capability resolution, sidebar discovery
state, entitled full-feature state, server/API authorization and the activation
flow now exist in code (T2B + Edu F0/F3A + EDU UI-2). The remaining unimplemented
items are the public `/edukacija` route gating and the adoption/analytics ideas.
The earlier "Not scheduled in `TODO.md` yet" line is obsolete — see
[TODO.md](TODO.md) and [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md).

> ⚠️ **This document is about the CAPABILITY gate: may this tenant use the
> Education domain at all.** It is not about the CONTENT gate — whether a given
> visitor may read one `EducationContent` body. Those are different gates with
> different authorities; the content access contract (`public` / `gated` /
> `private`) is canonical in
> [PANTA-EDU-CENTAR-ARC.md § Pristup sadržaju](PANTA-EDU-CENTAR-ARC.md#pristup-sadržaju--public--gated--private-zaključano-2026-08-29).
> Never use the bare word "gate" here without saying which one.

## Goal

Education features must be available only where the tenant is entitled to use them, while ordinary beauty salons should still be able to discover that the capability exists and learn how to activate it.

The solution must use capability gating, not a new hardcoded tenant type for every combination.

---

## Tenant combinations

The product needs to support at least:

```text
SALON ONLY
beauty capabilities
education.catalog = false

EDU ONLY
education.catalog = true
beauty/service capabilities may be false

SALON + EDU
beauty capabilities
+
education.catalog = true
```

Do not add a special vertical such as:

```text
"beauty_education"
```

only to represent the combination.

The existing capability model is the correct abstraction:

```text
resolved capability
=
platform available
∩ plan entitled
∩ tenant enabled
```

Education visibility should be driven primarily by resolved capability.

---

## Core capability

The initial public/admin Education Center gate should use:

```text
education.catalog
```

Future capabilities may independently control:

```text
education.inquiries
booking.education
```

This allows a tenant to publish education before it has inquiry or booking functionality.

---

## Full-access behavior

When `education.catalog` is resolved:

- public `/edukacija` routes are available (still unimplemented — UI-3; and the
  capability only decides whether the surface exists, never whether an individual
  content body may be read);
- Theme-9 can expose the **Edukacija** navigation item;
- workspace shows the full Education feature;
- Edu Studio is available;
- APIs/data loaders enforce the same capability;
- the tenant may be either Education-only or Salon + Education.

UI visibility alone is not authorization.

All writes and protected reads must enforce capability server-side.

---

## Beauty-only tenant discovery behavior

A salon without `education.catalog` may still see a **discovery/upgrade entry** in the workspace sidebar.

Suggested presentation:

```text
Edukativni centar   [NOVO]
```

Visual treatment:

- Marysoll purple accent/border;
- `NOVO` badge;
- clearly different from an enabled feature;
- no implication that the tenant already has access.

Click behavior:

```text
beauty-only salon
  -> Education feature information page
  -> explains the new Marysoll update
  -> explains what Education Center provides
  -> explains how the salon can become Salon + Edu
```

The click must not expose the actual editor or education data.

---

## Discovery surface vs feature surface

This distinction must remain explicit.

### Discovery state

```text
education.catalog = false
```

User may see:

- feature announcement;
- screenshots/examples;
- benefits;
- eligibility information;
- "How to activate" CTA;
- contact/upgrade request.

User must not get:

- Edu Studio editor;
- publishing APIs;
- Education Center management data;
- protected education routes intended for entitled tenants.

### Enabled state

```text
education.catalog = true
```

The same navigation area becomes the real feature entry.

The `NOVO` badge may remain for a limited release period, but the teaser/upgrade content disappears.

---

## Recommended sidebar behavior

Conceptually:

```text
if capability("education.catalog"):
    show Education nav -> real feature
else if tenant is eligible beauty salon:
    show Education nav -> discovery page
else:
    hide
```

Do not make the discovery page itself the authorization boundary.

Server/API checks remain authoritative.

---

## What Salon + Edu means

> **CURRENT/legacy transition only (revised 2026-09-04).** This section
> documents the already implemented same-tenant adoption flow used by the
> pilot. The product TARGET is one `AuthUser` with separate Salon and Education
> tenant/workspaces, sites, and domains. See `PANTA-EDU-CENTAR-ARC.md` H1–H4.

A salon that activates education does not stop being a beauty tenant.

It gains education capabilities in addition to its existing capabilities.

Example:

```text
services.catalog          true
booking.services          true
education.catalog         true
education.inquiries       true
booking.education         later / optional
```

This is the intended model for salons that want to:

- publish professional educational content;
- build authority around their expertise;
- offer courses, workshops or educational programs;
- collect interest/inquiries;
- later connect education to booking where appropriate.

---

## Upgrade / activation UX

The discovery page should explain the transition in product language, not technical capability language.

Suggested structure:

### Novi Marysoll dodatak

**Edukativni centar**

Publish professional educational content directly inside your Marysoll presence.

Possible benefits:

- educational articles and guides;
- structured topics;
- professional positioning;
- future education programs and inquiries;
- links between education and salon offers;
- future email/distribution support.

### How to get it

The exact commercial activation flow is deferred.

Possible future paths:

- included in a higher plan;
- add-on;
- manual activation during early rollout;
- application/contact request.

Do not hardcode pricing or entitlement rules until the commercial model is decided.

---

## Release / badge behavior

`NOVO` is a presentation concern, not a capability.

Avoid using the badge as a permanent state flag in tenant data unless a release-management requirement appears.

Prefer a platform-level release flag or UI configuration with a defined end date/version.

---

## Analytics worth adding later

When the discovery surface is implemented, measure:

```text
education_teaser_viewed
education_teaser_opened
education_activation_requested
education_capability_enabled
```

This will show whether salons actually want the feature before investing in deeper Education booking functionality.

---

## TODO relationship

Implementation status of the original checklist (2026-08-29):

1. capability resolution — ✅ implemented (`resolveTenantCapabilitySnapshot`);
2. sidebar discovery state — ✅ implemented (workspace selector + activation CTA);
3. entitled full-feature state — ✅ implemented for the admin workspace;
4. server/API authorization — ✅ implemented (`requireCapability`);
5. public route gating — ⬜ UI-3, together with the content access contract;
6. activation/upgrade flow — ✅ implemented (explicit, confirmed, idempotent);
7. analytics — ⬜ not started.

Active tracking lives in [TODO.md](TODO.md); this file stays the capability
rationale, not a status board.
