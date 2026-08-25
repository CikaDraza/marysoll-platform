# Skin Care Edukacija — Domain Product Partnership

**Status:** Planned / product input  
**Scope:** Skin Care Edukacija / Theme-9 / future Education, Consultation and Care domains  
**Owner of domain input:** Marina B. Stanisavljević  
**Implementation status:** Not scheduled in `TODO.md` yet

## Purpose

This document records Marina B. Stanisavljević's role and product input for the continued development of Skin Care Edukacija.

It is intentionally separate from the active engineering TODO. The points below are product/domain requirements and working principles. They should be converted into implementation tasks only when the corresponding slice is scheduled.

## Marina's four workstreams

### 1. Expert and educational modules

Marina will develop and refine content around real skin needs, including:

- skin barrier;
- specific skin states and needs;
- INCI literacy;
- understanding active ingredients;
- practical skincare routines;
- identifying and explaining marketing myths;
- educational content that builds trust without exaggerated promises.

### Product implication

This content belongs to the future **Education domain**, not to a generic blog feature.

The long-term structure should support:

```text
Education area
  -> topic
  -> module / article / material
  -> related offer / consultation / education
```

Content may later include articles, structured modules, downloadable materials, e-books, video and other educational formats.

---

### 2. Client journeys and consultation experience

Marina explicitly wants consultations, education and individual work to be separated from a generic salon-style booking experience.

The product principle is:

> Booking Engine provides availability and reservation infrastructure; it does not define the complete client experience.

The client journey should be able to evolve toward:

```text
educational content
  -> user identifies a relevant need
  -> relevant offer
  -> consultation / education
  -> availability
  -> short intake/context
  -> review
  -> consultation or education
  -> follow-up / recommendation / next educational step
```

This confirms the existing domain boundary:

```text
Consultation != Service
Education != Service
```

The platform must not model Marina's consultations as ordinary beauty salon services merely to reuse an existing Appointment flow.

---

### 3. Strategic positioning and communication

Skin Care Edukacija should consistently communicate:

- expertise;
- precision;
- care and responsibility;
- transparency;
- no false guarantees;
- no fabricated credentials;
- no invented testimonials or statistics;
- no aggressive trend-driven claims;
- clear distinction between education, recommendation and professional assessment.

These principles should later inform content governance and editorial validation.

## Editorial rule

Presentation defaults may provide neutral interface language, but they must never invent facts about Marina, her experience, qualifications, clients, outcomes, prices, dates or availability.

---

### 4. Domain QA and product feedback

Marina is not only a tenant who fills CMS fields.

She provides domain QA by:

- testing new flows;
- reviewing terminology;
- identifying where digital flows do not match real professional work;
- validating whether education and consultation features make sense in practice;
- giving feedback from both educator and client perspectives.

Engineering QA answers:

> Does the software work according to the specification?

Domain QA answers:

> Does the specification describe a useful and professionally credible way of working?

Both are required.

---

## Recommended role name

For external/profile use:

**Skincare Education Development Partner**

Alternative when a more product-oriented title is appropriate:

**Skincare Education & Domain Product Partner**

The role does not imply software engineering responsibility. It describes subject-matter contribution to the product, user journeys, educational system and domain validation.

---

## Input requested before Consultation / Intake implementation

Before implementing a detailed Consultation or Intake domain, obtain at least one real end-to-end example from Marina:

> How does one complete individual consultation work from the first visit to the website until the client receives the outcome/follow-up after the conversation?

The example should identify:

- what the client knows before booking;
- what Marina needs to know before the consultation;
- what the client chooses;
- what Marina reviews;
- what happens during the consultation;
- what is produced afterward;
- whether follow-up is needed;
- what information must remain private;
- what can become reusable educational content.

This example should drive the future Consultation / Intake / Care model instead of inventing a workflow from generic booking assumptions.

---

## Roadmap relationship

This document does **not** change the current active order.

Current work continues with Theme-9 completion first. Education, Consultation and Care work should reference this document when those slices become active.

`TODO.md` should receive concrete tasks only when implementation starts.
