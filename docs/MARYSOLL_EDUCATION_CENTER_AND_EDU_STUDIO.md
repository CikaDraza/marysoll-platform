# Marysoll Education Center — Public Routes and Edu Studio

**Status:** Planned architecture / product specification  
**Public product name:** **Edukativni centar**  
**Header navigation label:** **Edukacija**  
**Admin creator name:** **Edu Studio**  
**Implementation status:** Not scheduled in `TODO.md` yet  
**Canonical for the Edu arc:** [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md) — where this document and the arc document disagree, **the arc document wins**.

## Goal

Introduce a first-class education publishing surface for Marysoll tenants that have education capability.

The public experience should no longer present education primarily as a generic `blogs` area.

The new public routes are:

```text
/edukacija
/edukacija/[slug]
```

The Theme-9 header item **Edukacija** should eventually point to `/edukacija`.

## Important compatibility rule

Do **not** globally repurpose or delete existing `/blogs` and blog detail routes for every tenant.

Existing beauty tenants and older themes may still rely on blog behavior.

The migration should therefore be capability/theme-aware:

```text
tenant with education.catalog
  -> /edukacija
  -> /edukacija/[slug]

legacy / existing blog tenant
  -> existing blog routes remain valid
```

Where safe, legacy education links may redirect to the new route, but this must be a deliberate tenant-aware compatibility decision rather than a global route replacement.

---

## Phase 1 — Navigation compatibility, not shared storage

> ⚠️ **This supersedes the earlier "same content source" plan**, which proposed
> that `/edukacija` reuse the existing article storage and loader. That is no
> longer the direction. [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md) is
> canonical and locks the opposite: `/edukacija` reads **only** the new
> `EducationContent`, and `/blogs` continues over `NewsletterCampaign`,
> untouched.
>
> The old text is replaced rather than annotated because it was the single
> place in the docs from which an implementer could conclude that Blog and
> Education should share storage.

Blog and Education are **separate systems with separate storage**:

```text
BLOG
/blogs
/blogs/[slug]
        ↓
NewsletterCampaign  (existing system, unchanged)

EDUCATION
/edukacija
/edukacija/[slug]
        ↓
EducationContent  (new, authored in Edu Studio)
```

Phase 1 is therefore about **navigation only**. The Theme-9 `Edukacija` nav item
resolves three ways:

```text
Education Center available
+ education.catalog resolved
+ route/page ready
        → /edukacija

not ready, but the tenant legitimately uses existing blog content
        → /blogs

neither
        → the link is not shown
```

This is transition/navigation compatibility. It explicitly does **not** mean:

- `/blogs` and `/edukacija` reading the same posts;
- `NewsletterCampaign` becoming `EducationContent`;
- a global redirect from `/blogs` to `/edukacija`.

## Rule

The two domains stay apart because their purposes differ:

```text
BLOG / NEWSLETTER              EDUCATION CONTENT
marketing                      expert article · advice · guide
campaigns                      video · downloadable material
SEO posts                      public or private
email distribution             assigned to a client
promotions                     surfaces in Moj Prostor
salon content                  links to Guide / Program
```

Distribution stays a separate concern from authorship. Promoting a public
education piece by email does not move it into the newsletter domain:

```text
EducationContent
        ↓  [ Promote by email ]
NewsletterCampaign
```

Newsletter is the **distribution** channel; `EducationContent` remains the
source entity. Text is never copied between the two systems.

---

## Phase 2 — Edu Studio

A separate admin authoring surface should be introduced for educational content.

Canonical UI name:

**Edu Studio**

This is shorter and clearer than "Edukativni centar kreator".

Suggested workspace placement:

```text
Sadržaj
  -> Edu Studio
```

or, when workspace IA is capability-aware:

```text
Ponuda / Sadržaj
  -> Edu Studio
```

The final placement should follow the capability-aware workspace IA rather than being hardcoded into one tenant theme.

---

## Edu Studio responsibilities

Edu Studio should support creation and management of educational content such as:

- educational articles;
- topic-based materials;
- structured learning content;
- downloadable resources;
- future e-books;
- future video/material attachments;
- links to Education Offerings;
- publish/unpublish lifecycle;
- preview;
- SEO metadata;
- optional distribution/email promotion.

### Reuse, do not duplicate infrastructure blindly

The Newsletter system is a useful UX and implementation reference, but Edu Studio should **not** copy Newsletter business logic wholesale.

Reuse shared primitives where appropriate:

```text
editor primitives
layout/page composition primitives
media picker
draft/publish controls
preview
email/distribution primitives
```

Keep domain logic separate:

```text
NewsletterCampaign != EducationContent
```

An educational article may later be distributed through email, but the educational content remains the source entity and the newsletter remains a distribution/campaign entity.

---

## Suggested future domain shape

The exact schema is deferred, but the direction should remain:

```text
EducationContent / EducationMaterial
        |
        +-> topic / category
        +-> author
        +-> body / blocks
        +-> status
        +-> SEO
        +-> attachments
        +-> related EducationOffering
        +-> optional distribution references
```

Do not introduce `Service.isEducation`.

---

## Theme-9 relationship

Theme-9 public blocks can link into the Education Center:

```text
topicHub
featuredEducation
LatestEducation
professionalPath
```

Examples:

```text
/edukacija/procena-koze
/edukacija/aktivni-sastojci
/edukacija/spf-i-fotoprotekcija
```

The current Theme-9 route usage under `/blogs/...` should be treated as transitional.

---

## Navigation contract

For tenants with resolved education capability:

```text
Header: Edukacija
  -> /edukacija
```

For tenants without education capability, the public header must not expose Education Center routes unless a separate product decision explicitly allows a marketing/preview page.

Route existence and nav visibility should eventually use the same capability/page-readiness resolver.

---

## TODO relationship

Do not add the full implementation checklist to `TODO.md` yet.

When this work becomes active, add a scoped slice that references this document and explicitly separates:

1. new public routes;
2. compatibility with existing blog routes;
3. Theme-9 nav migration;
4. Edu Studio authoring surface;
5. optional distribution/email integration.
